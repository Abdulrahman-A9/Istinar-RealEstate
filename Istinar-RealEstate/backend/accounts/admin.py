from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class IstinarUserAdmin(UserAdmin):
    list_display = ("email", "username", "first_name", "last_name", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff", "is_superuser")
    search_fields = ("email", "username", "first_name", "last_name", "phone")
    fieldsets = UserAdmin.fieldsets + (("Istinar profile", {"fields": ("role", "phone", "avatar_url", "locale", "is_email_verified")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Istinar profile", {"fields": ("email", "role", "phone")}),)
