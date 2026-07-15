from django.contrib import admin

from .models import EntrepreneurProAccess, OpportunityAnalysis, UsageLimit


@admin.register(OpportunityAnalysis)
class OpportunityAnalysisAdmin(admin.ModelAdmin):
    list_display = ("user", "lot", "business_type", "score", "recommendation", "created_at")
    list_filter = ("recommendation", "business_type")
    search_fields = ("user__email", "lot__lot_number", "business_type")


@admin.register(UsageLimit)
class UsageLimitAdmin(admin.ModelAdmin):
    list_display = ("user", "feature", "used_count", "free_limit", "reset_policy")
    list_filter = ("feature",)


@admin.register(EntrepreneurProAccess)
class EntrepreneurProAccessAdmin(admin.ModelAdmin):
    list_display = ("user", "plan_type", "payment_status", "expires_at", "created_at")
    list_filter = ("plan_type", "payment_status")
