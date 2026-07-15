from django.contrib import admin

from .models import PlatformActivityLog, ProviderSubscription


@admin.register(ProviderSubscription)
class ProviderSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("provider", "plan", "status", "billing_cycle", "starts_at", "ends_at")
    list_filter = ("plan", "status", "billing_cycle")


@admin.register(PlatformActivityLog)
class PlatformActivityLogAdmin(admin.ModelAdmin):
    list_display = ("event", "actor", "target_type", "target_id", "created_at")
    list_filter = ("event", "target_type")
    search_fields = ("event", "target_id", "actor__email")
