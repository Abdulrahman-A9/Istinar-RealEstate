from rest_framework import serializers

from accounts.serializers import UserSerializer
from realty.models import Lot
from realty.serializers import LotPublicSerializer, ProviderSummarySerializer
from .models import Favorite, Interest, InteractionEvent


class InterestCreateSerializer(serializers.ModelSerializer):
    lot_id = serializers.PrimaryKeyRelatedField(source="lot", queryset=Lot.objects.all(), write_only=True)
    full_name = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Interest
        fields = ["lot_id", "full_name", "email", "phone", "message", "source"]


class CustomerInterestSerializer(serializers.ModelSerializer):
    provider = ProviderSummarySerializer(read_only=True)
    lot = LotPublicSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Interest
        fields = ["id", "provider", "lot", "user", "full_name", "email", "phone", "message", "source", "status", "created_at", "updated_at"]
        read_only_fields = fields


class ProviderInterestSerializer(CustomerInterestSerializer):
    class Meta(CustomerInterestSerializer.Meta):
        fields = CustomerInterestSerializer.Meta.fields + ["internal_note"]


class ProviderInterestUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interest
        fields = ["status", "internal_note"]


class FavoriteSerializer(serializers.ModelSerializer):
    lot = LotPublicSerializer(read_only=True)
    lot_id = serializers.PrimaryKeyRelatedField(source="lot", queryset=Lot.objects.all(), write_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "lot", "lot_id", "created_at"]
        read_only_fields = ["id", "created_at"]


class InteractionEventSerializer(serializers.ModelSerializer):
    lot_id = serializers.PrimaryKeyRelatedField(source="lot", queryset=Lot.objects.all(), write_only=True)

    class Meta:
        model = InteractionEvent
        fields = ["id", "lot_id", "event_type", "payload", "created_at"]
        read_only_fields = ["id", "created_at"]
