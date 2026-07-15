from django.db.models import Q
from rest_framework.permissions import BasePermission

from .models import Development, Lot, Provider, ProviderMembership


def is_platform_admin(user):
    return bool(user and user.is_authenticated and (user.is_superuser or user.role == "platform_admin"))


def can_manage_provider(user, provider):
    if is_platform_admin(user):
        return True
    if not user or not user.is_authenticated:
        return False
    return provider.owner_id == user.id or ProviderMembership.objects.filter(provider=provider, user=user, role__in=["owner", "manager", "editor"]).exists()


def member_role(user, provider):
    if not user or not user.is_authenticated:
        return None
    if provider.owner_id == user.id:
        return ProviderMembership.Role.OWNER
    return ProviderMembership.objects.filter(provider=provider, user=user).values_list("role", flat=True).first()


def can_manage_provider_team(user, provider):
    return is_platform_admin(user) or member_role(user, provider) in {ProviderMembership.Role.OWNER, ProviderMembership.Role.MANAGER}


def allowed_team_roles(user, provider):
    if is_platform_admin(user):
        return {choice for choice, _ in ProviderMembership.Role.choices}
    role = member_role(user, provider)
    if role == ProviderMembership.Role.OWNER:
        return {ProviderMembership.Role.MANAGER, ProviderMembership.Role.EDITOR, ProviderMembership.Role.ANALYST}
    if role == ProviderMembership.Role.MANAGER:
        return {ProviderMembership.Role.EDITOR, ProviderMembership.Role.ANALYST}
    return set()


def can_manage_leads(user, provider):
    return is_platform_admin(user) or member_role(user, provider) in {
        ProviderMembership.Role.OWNER,
        ProviderMembership.Role.MANAGER,
        ProviderMembership.Role.EDITOR,
    }


def public_lot_query():
    return (
        Q(is_visible=True)
        & ~Q(status=Lot.Status.HIDDEN)
        & Q(
            development__status=Development.Status.PUBLISHED,
            development__visibility=Development.Visibility.PUBLIC,
            development__provider__status=Provider.Status.APPROVED,
        )
    )


def can_access_lot(user, lot):
    if public_lot_query_matches(lot):
        return True
    return can_manage_provider(user, lot.development.provider)


def public_lot_query_matches(lot):
    return bool(
        lot.is_visible
        and lot.status != Lot.Status.HIDDEN
        and lot.development.status == Development.Status.PUBLISHED
        and lot.development.visibility == Development.Visibility.PUBLIC
        and lot.development.provider.status == Provider.Status.APPROVED
    )


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return is_platform_admin(request.user)
