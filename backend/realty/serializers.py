from rest_framework import serializers

from accounts.serializers import UserSerializer
from .models import Development, Lot, Provider, ProviderMembership


class ProviderSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Provider
        fields = ["id", "name", "slug", "provider_type", "description", "city", "logo_url", "cover_image_url", "primary_color", "accent_color", "plan", "is_featured"]


class ProviderPublicSerializer(serializers.ModelSerializer):
    development_count = serializers.SerializerMethodField()

    def get_development_count(self, obj):
        return getattr(obj, "development_count", obj.developments.filter(status="published", visibility="public").count())

    class Meta:
        model = Provider
        fields = ["id", "name", "slug", "provider_type", "description", "city", "contact_email", "contact_phone", "website", "logo_url", "cover_image_url", "primary_color", "accent_color", "subdomain", "plan", "is_featured", "development_count", "created_at"]


class ProviderSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    development_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    def get_development_count(self, obj):
        return getattr(obj, "development_count", obj.developments.count())

    def get_member_count(self, obj):
        return getattr(obj, "member_count", obj.memberships.count())

    class Meta:
        model = Provider
        fields = ["id", "owner", "name", "slug", "provider_type", "description", "city", "contact_email", "contact_phone", "website", "logo_url", "cover_image_url", "primary_color", "accent_color", "subdomain", "plan", "status", "is_featured", "development_count", "member_count", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "owner", "status", "plan", "is_featured", "created_at", "updated_at"]


class ProviderMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(source="user", queryset=__import__("accounts.models", fromlist=["User"]).User.objects.all(), write_only=True)

    class Meta:
        model = ProviderMembership
        fields = ["id", "provider", "user", "user_id", "role", "created_at"]
        read_only_fields = ["id", "created_at"]


class DevelopmentListSerializer(serializers.ModelSerializer):
    provider = ProviderSummarySerializer(read_only=True)
    total_lots = serializers.SerializerMethodField()
    available_lots = serializers.SerializerMethodField()
    starting_price = serializers.SerializerMethodField()

    def get_total_lots(self, obj):
        return obj.lots.count()

    def get_available_lots(self, obj):
        return obj.lots.filter(status="available", is_visible=True).count()

    def get_starting_price(self, obj):
        prices = [lot.price for lot in obj.lots.all() if lot.price is not None]
        return min(prices) if prices else None

    class Meta:
        model = Development
        fields = ["id", "provider", "name", "slug", "city", "district", "address", "description", "development_type", "cover_image_url", "plan_image_url", "amenities", "status", "visibility", "total_lots", "available_lots", "starting_price", "created_at", "updated_at"]


class DevelopmentDetailSerializer(DevelopmentListSerializer):
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7, read_only=True)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7, read_only=True)

    class Meta(DevelopmentListSerializer.Meta):
        fields = DevelopmentListSerializer.Meta.fields + ["latitude", "longitude", "published_at"]


class DevelopmentWriteSerializer(serializers.ModelSerializer):
    provider_id = serializers.PrimaryKeyRelatedField(source="provider", queryset=Provider.objects.all(), write_only=True, required=False)

    class Meta:
        model = Development
        fields = ["id", "provider_id", "name", "city", "district", "address", "latitude", "longitude", "description", "development_type", "cover_image_url", "plan_image_url", "amenities", "status", "visibility", "published_at"]
        read_only_fields = ["id"]


class LotSerializer(serializers.ModelSerializer):
    development_name = serializers.CharField(source="development.name", read_only=True)
    provider = ProviderSummarySerializer(source="development.provider", read_only=True)

    class Meta:
        model = Lot
        fields = ["id", "development", "development_name", "provider", "lot_number", "polygon", "area", "price", "usage_type", "status", "frontage", "street_width", "services", "description", "images", "metadata", "is_corner", "is_visible", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class LotPublicSerializer(serializers.ModelSerializer):
    development_name = serializers.CharField(source="development.name", read_only=True)
    development_slug = serializers.CharField(source="development.slug", read_only=True)
    provider = ProviderSummarySerializer(source="development.provider", read_only=True)

    class Meta:
        model = Lot
        fields = ["id", "development", "development_name", "development_slug", "provider", "lot_number", "polygon", "area", "price", "usage_type", "status", "frontage", "street_width", "services", "description", "images", "is_corner", "is_visible", "created_at", "updated_at"]
        read_only_fields = fields


class LotWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lot
        fields = ["id", "development", "lot_number", "polygon", "area", "price", "usage_type", "status", "frontage", "street_width", "services", "description", "images", "metadata", "is_corner", "is_visible"]
        read_only_fields = ["id"]
