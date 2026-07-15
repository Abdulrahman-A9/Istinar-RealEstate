from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        PLATFORM_ADMIN = "platform_admin", "Platform admin"
        PROVIDER_OWNER = "provider_owner", "Provider owner"
        PROVIDER_STAFF = "provider_staff", "Provider staff"
        CUSTOMER = "customer", "Customer"
        ENTREPRENEUR = "entrepreneur", "Entrepreneur"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.CUSTOMER)
    phone = models.CharField(max_length=32, blank=True)
    avatar_url = models.URLField(blank=True)
    locale = models.CharField(max_length=10, default="ar")
    is_email_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    @property
    def display_name(self):
        return self.get_full_name().strip() or self.username or self.email.split("@")[0]
