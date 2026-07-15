from rest_framework import serializers

from realty.models import Lot
from realty.serializers import LotPublicSerializer
from .models import EntrepreneurProAccess, OpportunityAnalysis, UsageLimit


class UsageLimitSerializer(serializers.ModelSerializer):
    remaining = serializers.IntegerField(read_only=True)

    class Meta:
        model = UsageLimit
        fields = ["id", "feature", "free_limit", "used_count", "remaining", "reset_policy", "updated_at"]


class OpportunityAnalysisSerializer(serializers.ModelSerializer):
    lot = LotPublicSerializer(read_only=True)
    lot_id = serializers.PrimaryKeyRelatedField(source="lot", queryset=Lot.objects.all(), write_only=True)

    class Meta:
        model = OpportunityAnalysis
        fields = ["id", "lot", "lot_id", "business_type", "budget", "business_model", "target_segment", "project_stage", "inputs", "score", "recommendation", "confidence_note", "reasons", "risks", "next_steps", "analysis_output", "created_at"]
        read_only_fields = ["id", "score", "recommendation", "confidence_note", "reasons", "risks", "next_steps", "analysis_output", "created_at"]


class EntrepreneurProAccessSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntrepreneurProAccess
        fields = ["id", "plan_type", "payment_status", "usage_limits", "created_at", "expires_at"]
