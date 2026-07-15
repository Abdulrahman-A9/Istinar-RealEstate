import uuid

from django.conf import settings
from django.db import models

from realty.models import Provider, TimeStampedModel


class ProviderSubscription(TimeStampedModel):
    class Plan(models.TextChoices):
        BASIC = "basic", "Basic"
        PRO = "pro", "Pro"
        ENTERPRISE = "enterprise", "Enterprise"

    class Status(models.TextChoices):
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past due"
        CANCELLED = "cancelled", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.OneToOneField(Provider, related_name="subscription", on_delete=models.CASCADE)
    plan = models.CharField(max_length=16, choices=Plan.choices, default=Plan.BASIC)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.TRIAL)
    billing_cycle = models.CharField(max_length=16, default="monthly")
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    usage_limits = models.JSONField(default=dict, blank=True)


class PlatformActivityLog(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="platform_activity", on_delete=models.SET_NULL, null=True, blank=True)
    event = models.CharField(max_length=100)
    target_type = models.CharField(max_length=64, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
