from datetime import timedelta
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, response, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from accounts.models import User
from engagement.models import Interest, InteractionEvent
from realty.models import Development, Provider
from realty.permissions import is_platform_admin
from realty.views import managed_provider_ids
from .models import PlatformActivityLog, ProviderSubscription
from .serializers import AdminUserSerializer, PlatformActivityLogSerializer, ProviderSubscriptionSerializer


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ProviderSubscription.objects.select_related("provider")
        if is_platform_admin(self.request.user):
            return queryset
        return queryset.filter(provider_id__in=managed_provider_ids(self.request.user))

    def perform_create(self, serializer):
        if not is_platform_admin(self.request.user):
            raise PermissionDenied("Only platform administration can create subscriptions.")
        subscription = serializer.save()
        subscription.provider.plan = subscription.plan
        subscription.provider.save(update_fields=["plan", "updated_at"])
        PlatformActivityLog.objects.create(actor=self.request.user, event="subscription.created", target_type="provider_subscription", target_id=str(subscription.id))

    def perform_update(self, serializer):
        if not is_platform_admin(self.request.user):
            raise PermissionDenied("Only platform administration can change subscriptions.")
        subscription = serializer.save()
        subscription.provider.plan = subscription.plan
        subscription.provider.save(update_fields=["plan", "updated_at"])
        PlatformActivityLog.objects.create(actor=self.request.user, event="subscription.updated", target_type="provider_subscription", target_id=str(subscription.id))

    def perform_destroy(self, instance):
        if not is_platform_admin(self.request.user):
            raise PermissionDenied("Only platform administration can remove subscriptions.")
        instance.delete()


class AdminUserViewSet(viewsets.ModelViewSet):
    serializer_class = AdminUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.all().order_by("-date_joined")

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not is_platform_admin(request.user):
            raise PermissionDenied("Platform administrator access is required.")

    def perform_update(self, serializer):
        user = serializer.save()
        PlatformActivityLog.objects.create(actor=self.request.user, event="user.updated", target_type="user", target_id=str(user.id), metadata={"role": user.role, "active": user.is_active})

    def perform_create(self, serializer):
        raise PermissionDenied("Users create their accounts through registration.")


class AdminOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_platform_admin(request.user):
            raise PermissionDenied("Platform administrator access is required.")
        now = timezone.now()
        return response.Response({
            "metrics": {
                "providers": Provider.objects.count(),
                "pending_providers": Provider.objects.filter(status=Provider.Status.PENDING).count(),
                "published_developments": Development.objects.filter(status=Development.Status.PUBLISHED).count(),
                "users": User.objects.count(),
                "interests": Interest.objects.count(),
                "active_subscriptions": ProviderSubscription.objects.filter(status__in=["active", "trial"]).count(),
                "events_30_days": InteractionEvent.objects.filter(created_at__gte=now - timedelta(days=30)).count(),
            },
            "pending_providers": list(Provider.objects.filter(status=Provider.Status.PENDING).values("id", "name", "slug", "city", "provider_type", "created_at")[:8]),
            "recent_activity": PlatformActivityLogSerializer(PlatformActivityLog.objects.select_related("actor")[:12], many=True).data,
        })


class AdminProviderReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, provider_id):
        if not is_platform_admin(request.user):
            raise PermissionDenied("Platform administrator access is required.")
        provider = get_object_or_404(Provider, pk=provider_id)
        new_status = request.data.get("status")
        if new_status not in dict(Provider.Status.choices):
            return response.Response({"detail": "Use pending, approved, or suspended."}, status=status.HTTP_400_BAD_REQUEST)
        provider.status = new_status
        provider.save(update_fields=["status", "updated_at"])
        PlatformActivityLog.objects.create(actor=request.user, event="provider.status_updated", target_type="provider", target_id=str(provider.id), metadata={"status": new_status})
        return response.Response({"id": str(provider.id), "status": provider.status})
