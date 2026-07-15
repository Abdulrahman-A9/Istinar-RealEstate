import uuid

from django.conf import settings
from django.db import models
from django.utils.text import slugify


def unique_slug(instance, value, field="slug"):
    base = slugify(value, allow_unicode=True)[:70] or "istinar"
    model = instance.__class__
    candidate = base
    index = 2
    while model.objects.exclude(pk=instance.pk).filter(**{field: candidate}).exists():
        candidate = f"{base}-{index}"
        index += 1
    return candidate


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Provider(TimeStampedModel):
    class Type(models.TextChoices):
        REAL_ESTATE_COMPANY = "real_estate_company", "Real estate company"
        BROKERAGE = "brokerage", "Brokerage office"
        DEVELOPER = "developer", "Developer"
        LAND_OWNER = "land_owner", "Land owner"

    class Plan(models.TextChoices):
        BASIC = "basic", "Basic"
        PRO = "pro", "Pro"
        ENTERPRISE = "enterprise", "Enterprise"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending review"
        APPROVED = "approved", "Approved"
        SUSPENDED = "suspended", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="owned_providers", on_delete=models.PROTECT)
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=90, unique=True, blank=True, allow_unicode=True)
    provider_type = models.CharField(max_length=32, choices=Type.choices, default=Type.REAL_ESTATE_COMPANY)
    description = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=32, blank=True)
    website = models.URLField(blank=True)
    logo_url = models.URLField(blank=True)
    cover_image_url = models.URLField(blank=True)
    primary_color = models.CharField(max_length=16, default="#0B695B")
    accent_color = models.CharField(max_length=16, default="#D8A84C")
    subdomain = models.SlugField(max_length=63, blank=True, null=True, unique=True)
    plan = models.CharField(max_length=16, choices=Plan.choices, default=Plan.BASIC)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    is_featured = models.BooleanField(default=False)

    class Meta:
        ordering = ["-is_featured", "name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProviderMembership(TimeStampedModel):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MANAGER = "manager", "Manager"
        EDITOR = "editor", "Editor"
        ANALYST = "analyst", "Analyst"

    provider = models.ForeignKey(Provider, related_name="memberships", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="provider_memberships", on_delete=models.CASCADE)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.EDITOR)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["provider", "user"], name="unique_provider_member")]
        ordering = ["provider__name", "user__email"]

    def __str__(self):
        return f"{self.provider} · {self.user}"


class Development(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_REVIEW = "in_review", "In review"
        PUBLISHED = "published", "Published"
        ARCHIVED = "archived", "Archived"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        UNLISTED = "unlisted", "Unlisted"
        PRIVATE = "private", "Private"

    class Type(models.TextChoices):
        RESIDENTIAL = "residential", "Residential"
        COMMERCIAL = "commercial", "Commercial"
        MIXED = "mixed", "Mixed use"
        INDUSTRIAL = "industrial", "Industrial"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(Provider, related_name="developments", on_delete=models.CASCADE)
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=120, unique=True, blank=True, allow_unicode=True)
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100, blank=True)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    description = models.TextField(blank=True)
    development_type = models.CharField(max_length=16, choices=Type.choices, default=Type.RESIDENTIAL)
    cover_image_url = models.URLField(blank=True)
    plan_image_url = models.URLField(blank=True)
    amenities = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.DRAFT)
    visibility = models.CharField(max_length=16, choices=Visibility.choices, default=Visibility.PUBLIC)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, f"{self.provider.name}-{self.name}")
        super().save(*args, **kwargs)

    @property
    def total_lots(self):
        return self.lots.count()

    def __str__(self):
        return f"{self.provider.name} · {self.name}"


class Lot(TimeStampedModel):
    class UsageType(models.TextChoices):
        RESIDENTIAL = "residential", "Residential"
        COMMERCIAL = "commercial", "Commercial"
        MIXED = "mixed", "Mixed"
        SERVICE = "service", "Service"

    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        RESERVED = "reserved", "Reserved"
        NEGOTIATION = "negotiation", "Under negotiation"
        SOLD = "sold", "Sold"
        UNAVAILABLE = "unavailable", "Unavailable"
        HIDDEN = "hidden", "Hidden"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    development = models.ForeignKey(Development, related_name="lots", on_delete=models.CASCADE)
    lot_number = models.CharField(max_length=48)
    polygon = models.JSONField(default=list, blank=True, help_text="Array of normalized x/y vertices.")
    area = models.DecimalField(max_digits=12, decimal_places=2)
    price = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    usage_type = models.CharField(max_length=16, choices=UsageType.choices, default=UsageType.RESIDENTIAL)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.AVAILABLE)
    frontage = models.CharField(max_length=100, blank=True)
    street_width = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    services = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    images = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_corner = models.BooleanField(default=False)
    is_visible = models.BooleanField(default=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["development", "lot_number"], name="unique_lot_number_per_development")]
        ordering = ["lot_number"]

    def __str__(self):
        return f"{self.development.name} · {self.lot_number}"
