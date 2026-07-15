from django.contrib import admin

from .models import Development, Lot, Provider, ProviderMembership


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "provider_type", "plan", "status", "city", "owner", "is_featured")
    list_filter = ("provider_type", "plan", "status", "is_featured")
    search_fields = ("name", "slug", "city", "owner__email")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Development)
class DevelopmentAdmin(admin.ModelAdmin):
    list_display = ("name", "provider", "city", "development_type", "status", "visibility", "created_at")
    list_filter = ("development_type", "status", "visibility", "city")
    search_fields = ("name", "slug", "provider__name", "city")


@admin.register(Lot)
class LotAdmin(admin.ModelAdmin):
    list_display = ("lot_number", "development", "usage_type", "status", "area", "price", "is_visible")
    list_filter = ("usage_type", "status", "is_visible", "is_corner")
    search_fields = ("lot_number", "development__name", "development__provider__name")


@admin.register(ProviderMembership)
class ProviderMembershipAdmin(admin.ModelAdmin):
    list_display = ("provider", "user", "role", "created_at")
    list_filter = ("role",)
