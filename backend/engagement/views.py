from django.db.models import Q
from rest_framework import mixins, permissions, response, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView

from realty.permissions import can_access_lot, can_manage_leads, is_platform_admin, public_lot_query_matches
from realty.views import managed_provider_ids
from .models import Favorite, Interest, InteractionEvent
from .serializers import (
    CustomerInterestSerializer,
    FavoriteSerializer,
    InterestCreateSerializer,
    InteractionEventSerializer,
    ProviderInterestSerializer,
    ProviderInterestUpdateSerializer,
)


class InterestViewSet(viewsets.ModelViewSet):
    queryset = Interest.objects.select_related("provider", "lot", "lot__development", "lot__development__provider", "user")
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == "create":
            return queryset
        if is_platform_admin(self.request.user):
            return queryset
        provider_ids = managed_provider_ids(self.request.user)
        if provider_ids:
            return queryset.filter(Q(user=self.request.user) | Q(provider_id__in=provider_ids))
        return queryset.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return InterestCreateSerializer
        if self.action in {"update", "partial_update"}:
            return ProviderInterestUpdateSerializer
        if is_platform_admin(self.request.user) or managed_provider_ids(self.request.user):
            return ProviderInterestSerializer
        return CustomerInterestSerializer

    def get_permissions(self):
        return [permissions.AllowAny()] if self.action == "create" else [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        lot = serializer.validated_data["lot"]
        if not public_lot_query_matches(lot) or lot.status not in {"available", "negotiation"}:
            raise ValidationError({"lot_id": "This lot is not accepting public interest requests."})
        user = self.request.user if self.request.user.is_authenticated else None
        full_name = serializer.validated_data.get("full_name") or (user.display_name if user else "")
        if not full_name:
            raise ValidationError({"full_name": "Name is required for a guest request."})
        email = serializer.validated_data.get("email") or (user.email if user else "")
        interest = serializer.save(
            provider=lot.development.provider,
            user=user,
            full_name=full_name,
            email=email,
            status=Interest.Status.NEW,
            internal_note="",
        )
        InteractionEvent.objects.create(provider=interest.provider, development=lot.development, lot=lot, user=user, event_type=InteractionEvent.EventType.INTEREST, payload={"source": interest.source})

    def perform_update(self, serializer):
        interest = serializer.instance
        if not can_manage_leads(self.request.user, interest.provider):
            raise PermissionDenied("Only an authorised provider sales member can update this interest.")
        serializer.save()


class FavoriteViewSet(viewsets.ModelViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).select_related("lot", "lot__development", "lot__development__provider")

    def perform_create(self, serializer):
        lot = serializer.validated_data["lot"]
        if not can_access_lot(self.request.user, lot):
            raise PermissionDenied("You cannot save a lot that is not available to you.")
        favorite, created = Favorite.objects.get_or_create(user=self.request.user, lot=lot)
        if not created:
            raise ValidationError({"lot_id": "This lot is already in favorites."})
        InteractionEvent.objects.create(provider=lot.development.provider, development=lot.development, lot=lot, user=self.request.user, event_type=InteractionEvent.EventType.FAVORITE)
        serializer.instance = favorite


class InteractionEventViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = InteractionEventSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if is_platform_admin(self.request.user):
            return InteractionEvent.objects.all()
        if self.request.user.is_authenticated:
            return InteractionEvent.objects.filter(Q(user=self.request.user) | Q(provider_id__in=managed_provider_ids(self.request.user)))
        return InteractionEvent.objects.none()

    def get_permissions(self):
        return [permissions.AllowAny()] if self.action == "create" else [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        lot = serializer.validated_data["lot"]
        if not can_access_lot(self.request.user, lot):
            raise PermissionDenied("You cannot record an interaction for this lot.")
        event_type = serializer.validated_data["event_type"]
        if event_type not in {InteractionEvent.EventType.VIEW, InteractionEvent.EventType.COMPARE, InteractionEvent.EventType.SHARE}:
            raise ValidationError({"event_type": "This event type is generated by the system."})
        serializer.save(provider=lot.development.provider, development=lot.development, user=self.request.user if self.request.user.is_authenticated else None)


class CustomerDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from intelligence.models import OpportunityAnalysis, UsageLimit
        from intelligence.serializers import OpportunityAnalysisSerializer, UsageLimitSerializer

        favorites = Favorite.objects.filter(user=request.user).select_related("lot", "lot__development", "lot__development__provider")[:6]
        analyses = OpportunityAnalysis.objects.filter(user=request.user).select_related("lot", "lot__development", "lot__development__provider")[:6]
        interests = Interest.objects.filter(user=request.user).select_related("lot", "lot__development", "lot__development__provider")[:6]
        return response.Response({
            "user": {"id": request.user.id, "name": request.user.display_name, "role": request.user.role},
            "favorites": FavoriteSerializer(favorites, many=True).data,
            "analyses": OpportunityAnalysisSerializer(analyses, many=True).data,
            "interests": CustomerInterestSerializer(interests, many=True).data,
            "usage": UsageLimitSerializer(UsageLimit.objects.filter(user=request.user), many=True).data,
        })
