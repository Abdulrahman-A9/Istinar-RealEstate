from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserSerializer
from realty.serializers import ProviderSummarySerializer
from .models import PlatformActivityLog, ProviderSubscription


class ProviderSubscriptionSerializer(serializers.ModelSerializer):
    provider = ProviderSummarySerializer(read_only=True)
    provider_id = serializers.PrimaryKeyRelatedField(source="provider", queryset=__import__("realty.models", fromlist=["Provider"]).Provider.objects.all(), write_only=True, required=False)

    class Meta:
        model = ProviderSubscription
        fields = ["id", "provider", "provider_id", "plan", "status", "billing_cycle", "starts_at", "ends_at", "usage_limits", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class PlatformActivityLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.display_name", read_only=True)

    class Meta:
        model = PlatformActivityLog
        fields = ["id", "actor_name", "event", "target_type", "target_id", "metadata", "created_at"]


class AdminUserSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["is_active", "is_staff"]
        read_only_fields = ["id", "is_staff", "is_email_verified", "date_joined"]
