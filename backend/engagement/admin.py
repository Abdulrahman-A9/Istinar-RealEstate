from django.contrib import admin

from .models import Favorite, Interest, InteractionEvent


@admin.register(Interest)
class InterestAdmin(admin.ModelAdmin):
    list_display = ("full_name", "provider", "lot", "status", "source", "created_at")
    list_filter = ("status", "source")
    search_fields = ("full_name", "email", "phone", "provider__name", "lot__lot_number")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "lot", "created_at")


@admin.register(InteractionEvent)
class InteractionEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "provider", "lot", "user", "created_at")
    list_filter = ("event_type",)
