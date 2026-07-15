import uuid

from django.conf import settings
from django.db import models

from realty.models import Development, Lot, Provider, TimeStampedModel


class Interest(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        BOOKED = "booked", "booked"
        CLOSED = "closed", "Closed"
        LOST = "lost", "Lost"

    class Source(models.TextChoices):
        PUBLIC = "public", "Public page"
        PROVIDER_LINK = "provider_link", "Provider link"
        COMPARISON = "comparison", "Comparison"
        ANALYSIS = "analysis", "Opportunity analysis"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(Provider, related_name="interests", on_delete=models.CASCADE)
    lot = models.ForeignKey(Lot, related_name="interests", on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="interests", on_delete=models.SET_NULL, null=True, blank=True)
    full_name = models.CharField(max_length=160)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=32, blank=True)
    message = models.TextField(blank=True)
    source = models.CharField(max_length=24, choices=Source.choices, default=Source.PUBLIC)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW)
    internal_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} · {self.provider.name}"


class Favorite(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="favorites", on_delete=models.CASCADE)
    lot = models.ForeignKey(Lot, related_name="favorited_by", on_delete=models.CASCADE)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "lot"], name="unique_user_lot_favorite")]
        ordering = ["-created_at"]


class InteractionEvent(TimeStampedModel):
    class EventType(models.TextChoices):
        VIEW = "view", "Lot viewed"
        FAVORITE = "favorite", "Lot favorited"
        COMPARE = "compare", "Lot compared"
        ANALYZE = "analyze", "Lot analyzed"
        INTEREST = "interest", "Interest submitted"
        SHARE = "share", "Lot shared"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(Provider, related_name="events", on_delete=models.CASCADE)
    development = models.ForeignKey(Development, related_name="events", on_delete=models.SET_NULL, null=True, blank=True)
    lot = models.ForeignKey(Lot, related_name="events", on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="interaction_events", on_delete=models.SET_NULL, null=True, blank=True)
    event_type = models.CharField(max_length=16, choices=EventType.choices)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["provider", "event_type", "created_at"]), models.Index(fields=["lot", "event_type"])]
