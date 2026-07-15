from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, response, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView

from engagement.models import InteractionEvent
from realty.permissions import can_access_lot
from .models import EntrepreneurProAccess, OpportunityAnalysis, UsageLimit
from .serializers import OpportunityAnalysisSerializer, UsageLimitSerializer
from .services import build_opportunity_result


def has_active_pro(user):
    now = timezone.now()
    return EntrepreneurProAccess.objects.filter(user=user, payment_status="paid").filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now)).exists()


class OpportunityAnalysisViewSet(viewsets.ModelViewSet):
    serializer_class = OpportunityAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return OpportunityAnalysis.objects.filter(user=self.request.user).select_related("lot", "lot__development", "lot__development__provider")

    @transaction.atomic
    def perform_create(self, serializer):
        usage, _ = UsageLimit.objects.select_for_update().get_or_create(
            user=self.request.user,
            feature=UsageLimit.Feature.OPPORTUNITY_ANALYSIS,
            defaults={"free_limit": 2},
        )
        if not has_active_pro(self.request.user) and usage.remaining <= 0:
            raise ValidationError({"detail": "Your free analysis allowance is used. Upgrade to Pro to continue."})
        lot = serializer.validated_data["lot"]
        if not can_access_lot(self.request.user, lot):
            raise ValidationError({"lot_id": "This lot is not available for analysis."})
        result = build_opportunity_result(
            lot,
            business_type=serializer.validated_data["business_type"],
            budget=serializer.validated_data["budget"],
            business_model=serializer.validated_data.get("business_model", ""),
            target_segment=serializer.validated_data.get("target_segment", ""),
            project_stage=serializer.validated_data.get("project_stage", ""),
            inputs=serializer.validated_data.get("inputs", {}),
        )
        analysis = serializer.save(user=self.request.user, **result)
        if not has_active_pro(self.request.user):
            usage.used_count += 1
            usage.save(update_fields=["used_count", "updated_at"])
        InteractionEvent.objects.create(
            provider=lot.development.provider,
            development=lot.development,
            lot=lot,
            user=self.request.user,
            event_type=InteractionEvent.EventType.ANALYZE,
            payload={"business_type": analysis.business_type, "score": analysis.score},
        )

class UsageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        limits = UsageLimit.objects.filter(user=request.user)
        return response.Response({
            "limits": UsageLimitSerializer(limits, many=True).data,
            "pro_active": has_active_pro(request.user),
        })
