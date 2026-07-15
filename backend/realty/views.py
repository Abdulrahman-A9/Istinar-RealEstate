from django.db.models import Count, Min, Q
from django.utils import timezone
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView

from .models import Development, Lot, Provider, ProviderMembership
from .permissions import allowed_team_roles, can_manage_provider, can_manage_provider_team, is_platform_admin, public_lot_query
from .serializers import (
    DevelopmentDetailSerializer,
    DevelopmentListSerializer,
    DevelopmentWriteSerializer,
    LotSerializer,
    LotPublicSerializer,
    LotWriteSerializer,
    ProviderPublicSerializer,
    ProviderMembershipSerializer,
    ProviderSerializer,
)


def managed_provider_ids(user):
    if not user or not user.is_authenticated:
        return []
    if is_platform_admin(user):
        return Provider.objects.values_list("id", flat=True)
    return Provider.objects.filter(Q(owner=user) | Q(memberships__user=user)).values_list("id", flat=True).distinct()


class ProviderViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderSerializer
    lookup_field = "slug"

    def get_queryset(self):
        queryset = Provider.objects.select_related("owner").annotate(
            development_count=Count("developments", distinct=True),
            member_count=Count("memberships", distinct=True),
        )
        if self.action in {"list", "retrieve"}:
            allowed = Q(status=Provider.Status.APPROVED)
            if self.request.user.is_authenticated:
                allowed |= Q(pk__in=managed_provider_ids(self.request.user))
            return queryset.filter(allowed)
        return queryset.filter(pk__in=managed_provider_ids(self.request.user)) if not is_platform_admin(self.request.user) else queryset

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        return ProviderPublicSerializer if self.action in {"list", "retrieve"} else ProviderSerializer

    def perform_create(self, serializer):
        if self.request.user.role not in {"provider_owner", "platform_admin"} and not self.request.user.is_superuser:
            raise PermissionDenied("Only provider owners can create a provider profile.")
        provider = serializer.save(owner=self.request.user, status=Provider.Status.PENDING)
        ProviderMembership.objects.get_or_create(provider=provider, user=self.request.user, defaults={"role": ProviderMembership.Role.OWNER})

    def perform_update(self, serializer):
        if not can_manage_provider(self.request.user, serializer.instance):
            raise PermissionDenied("You cannot edit this provider.")
        serializer.save()

    def perform_destroy(self, instance):
        if not is_platform_admin(self.request.user):
            raise PermissionDenied("Provider profiles can only be removed by a platform administrator.")
        instance.delete()

    @decorators.action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        providers = self.get_queryset().filter(pk__in=managed_provider_ids(request.user))
        return response.Response(self.get_serializer(providers, many=True).data)

    @decorators.action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticated])
    def members(self, request, slug=None):
        provider = self.get_object()
        if not can_manage_provider_team(request.user, provider):
            raise PermissionDenied("You cannot manage this provider team.")
        if request.method == "GET":
            return response.Response(ProviderMembershipSerializer(provider.memberships.select_related("user"), many=True).data)
        serializer = ProviderMembershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data["provider"] != provider:
            raise ValidationError({"provider": "Provider does not match this route."})
        if serializer.validated_data["role"] not in allowed_team_roles(request.user, provider):
            raise PermissionDenied("You cannot assign that team role.")
        membership = serializer.save()
        return response.Response(ProviderMembershipSerializer(membership).data, status=status.HTTP_201_CREATED)


class DevelopmentViewSet(viewsets.ModelViewSet):
    lookup_field = "slug"

    def get_queryset(self):
        queryset = Development.objects.select_related("provider", "provider__owner").prefetch_related("lots")
        provider = self.request.query_params.get("provider")
        if provider:
            queryset = queryset.filter(provider__slug=provider)
        city = self.request.query_params.get("city")
        if city:
            queryset = queryset.filter(city__icontains=city)
        development_type = self.request.query_params.get("type")
        if development_type:
            queryset = queryset.filter(development_type=development_type)

        if self.action in {"list", "retrieve"}:
            public = Q(status=Development.Status.PUBLISHED, visibility=Development.Visibility.PUBLIC, provider__status=Provider.Status.APPROVED)
            if self.request.user.is_authenticated:
                public |= Q(provider_id__in=managed_provider_ids(self.request.user))
            return queryset.filter(public)
        return queryset.filter(provider_id__in=managed_provider_ids(self.request.user)) if not is_platform_admin(self.request.user) else queryset

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return DevelopmentWriteSerializer
        if self.action == "retrieve":
            return DevelopmentDetailSerializer
        return DevelopmentListSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        provider = serializer.validated_data.get("provider")
        if not provider:
            providers = list(managed_provider_ids(self.request.user))
            if len(providers) != 1:
                raise ValidationError({"provider_id": "Select a provider for this development."})
            provider = Provider.objects.get(pk=providers[0])
        if not can_manage_provider(self.request.user, provider):
            raise PermissionDenied("You cannot create a development for this provider.")
        published_at = timezone.now() if serializer.validated_data.get("status") == Development.Status.PUBLISHED else None
        serializer.save(provider=provider, published_at=published_at)

    def perform_update(self, serializer):
        if not can_manage_provider(self.request.user, serializer.instance.provider):
            raise PermissionDenied("You cannot edit this development.")
        if serializer.validated_data.get("provider") and serializer.validated_data["provider"] != serializer.instance.provider:
            if not can_manage_provider(self.request.user, serializer.validated_data["provider"]):
                raise PermissionDenied("You cannot transfer this development.")
        if serializer.validated_data.get("status") == Development.Status.PUBLISHED and not serializer.instance.published_at:
            serializer.save(published_at=timezone.now())
        else:
            serializer.save()

    def perform_destroy(self, instance):
        if not can_manage_provider(self.request.user, instance.provider):
            raise PermissionDenied("You cannot archive this development.")
        instance.status = Development.Status.ARCHIVED
        instance.save(update_fields=["status", "updated_at"])


class LotViewSet(viewsets.ModelViewSet):
    queryset = Lot.objects.select_related("development", "development__provider")

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params
        if params.get("development"):
            queryset = queryset.filter(development__slug=params["development"])
        if params.get("provider"):
            queryset = queryset.filter(development__provider__slug=params["provider"])
        for key in ("status", "usage_type"):
            if params.get(key):
                queryset = queryset.filter(**{key: params[key]})
        if params.get("min_price"):
            queryset = queryset.filter(price__gte=params["min_price"])
        if params.get("max_price"):
            queryset = queryset.filter(price__lte=params["max_price"])
        if params.get("min_area"):
            queryset = queryset.filter(area__gte=params["min_area"])
        if params.get("max_area"):
            queryset = queryset.filter(area__lte=params["max_area"])
        if params.get("corner") in {"true", "1"}:
            queryset = queryset.filter(is_corner=True)

        if self.action in {"list", "retrieve", "view"}:
            public = public_lot_query()
            if self.request.user.is_authenticated:
                public |= Q(development__provider_id__in=managed_provider_ids(self.request.user))
            return queryset.filter(public)
        return queryset.filter(development__provider_id__in=managed_provider_ids(self.request.user)) if not is_platform_admin(self.request.user) else queryset

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return LotWriteSerializer
        return LotPublicSerializer

    def get_permissions(self):
        if self.action in {"list", "retrieve", "view"}:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        development = serializer.validated_data["development"]
        if not can_manage_provider(self.request.user, development.provider):
            raise PermissionDenied("You cannot add lots to this development.")
        serializer.save()

    def perform_update(self, serializer):
        if not can_manage_provider(self.request.user, serializer.instance.development.provider):
            raise PermissionDenied("You cannot edit this lot.")
        if serializer.validated_data.get("development") and not can_manage_provider(self.request.user, serializer.validated_data["development"].provider):
            raise PermissionDenied("You cannot move this lot.")
        serializer.save()

    def perform_destroy(self, instance):
        if not can_manage_provider(self.request.user, instance.development.provider):
            raise PermissionDenied("You cannot delete this lot.")
        instance.is_visible = False
        instance.status = Lot.Status.HIDDEN
        instance.save(update_fields=["is_visible", "status", "updated_at"])

    @decorators.action(detail=True, methods=["post"], permission_classes=[permissions.AllowAny])
    def view(self, request, slug=None, pk=None):
        lot = self.get_object()
        from engagement.models import InteractionEvent
        InteractionEvent.objects.create(
            provider=lot.development.provider,
            development=lot.development,
            lot=lot,
            user=request.user if request.user.is_authenticated else None,
            event_type=InteractionEvent.EventType.VIEW,
            payload={"source": request.data.get("source", "public")},
        )
        return response.Response({"recorded": True})


class ProviderDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        provider_id = request.query_params.get("provider")
        providers = Provider.objects.filter(pk__in=managed_provider_ids(request.user))
        if provider_id:
            providers = providers.filter(pk=provider_id)
        provider = providers.first()
        if not provider:
            raise PermissionDenied("No provider workspace is available for this user.")

        from engagement.models import Interest, InteractionEvent
        developments = provider.developments.all()
        lots = Lot.objects.filter(development__provider=provider)
        interest_count = Interest.objects.filter(provider=provider).count()
        views = InteractionEvent.objects.filter(provider=provider, event_type=InteractionEvent.EventType.VIEW).count()
        top_lots = lots.annotate(
            interest_count=Count("interests", distinct=True),
            view_count=Count("events", filter=Q(events__event_type="view"), distinct=True),
        ).order_by("-interest_count", "-view_count")[:5]
        return response.Response({
            "provider": ProviderSerializer(provider).data,
            "metrics": {
                "developments": developments.count(),
                "lots": lots.count(),
                "available_lots": lots.filter(status=Lot.Status.AVAILABLE, is_visible=True).count(),
                "interests": interest_count,
                "views": views,
                "conversion_rate": round((interest_count / views) * 100, 1) if views else 0,
            },
            "top_lots": LotSerializer(top_lots, many=True).data,
            "recent_interests": list(Interest.objects.filter(provider=provider).select_related("lot", "user").order_by("-created_at").values("id", "full_name", "email", "phone", "status", "lot__lot_number", "created_at")[:8]),
        })
