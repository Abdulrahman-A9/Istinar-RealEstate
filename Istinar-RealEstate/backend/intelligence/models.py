import uuid

from django.conf import settings
from django.db import models

from realty.models import Lot, TimeStampedModel


class UsageLimit(TimeStampedModel):
    class Feature(models.TextChoices):
        OPPORTUNITY_ANALYSIS = "opportunity_analysis", "Opportunity analysis"
        LOT_COMPARISON = "lot_comparison", "Lot comparison"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="usage_limits", on_delete=models.CASCADE)
    feature = models.CharField(max_length=40, choices=Feature.choices)
    free_limit = models.PositiveIntegerField(default=2)
    used_count = models.PositiveIntegerField(default=0)
    reset_policy = models.CharField(max_length=40, default="lifetime_free_allowance")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "feature"], name="unique_usage_limit")]

    @property
    def remaining(self):
        return max(self.free_limit - self.used_count, 0)


class EntrepreneurProAccess(TimeStampedModel):
    class Plan(models.TextChoices):
        SINGLE_REPORT = "single_report", "Single report"
        PRO = "pro", "Pro"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        EXPIRED = "expired", "Expired"
        REFUNDED = "refunded", "Refunded"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="pro_accesses", on_delete=models.CASCADE)
    plan_type = models.CharField(max_length=24, choices=Plan.choices)
    payment_status = models.CharField(max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    usage_limits = models.JSONField(default=dict, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]


class OpportunityAnalysis(TimeStampedModel):
    class Recommendation(models.TextChoices):
        STRONG_FIT = "strong_fit", "Strong fit"
        PROMISING = "promising", "Promising with checks"
        REVIEW = "review", "Needs further review"
        NOT_RECOMMENDED = "not_recommended", "Not recommended now"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="opportunity_analyses", on_delete=models.CASCADE)
    lot = models.ForeignKey(Lot, related_name="opportunity_analyses", on_delete=models.CASCADE)
    business_type = models.CharField(max_length=120)
    budget = models.DecimalField(max_digits=14, decimal_places=2)
    business_model = models.CharField(max_length=120, blank=True)
    target_segment = models.CharField(max_length=120, blank=True)
    project_stage = models.CharField(max_length=100, blank=True)
    inputs = models.JSONField(default=dict, blank=True)
    score = models.PositiveSmallIntegerField()
    recommendation = models.CharField(max_length=24, choices=Recommendation.choices)
    confidence_note = models.CharField(max_length=255, default="Preliminary, based on the inputs available in Istinar.")
    reasons = models.JSONField(default=list, blank=True)
    risks = models.JSONField(default=list, blank=True)
    next_steps = models.JSONField(default=list, blank=True)
    analysis_output = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
