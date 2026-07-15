from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.views import CurrentUserView, RegisterView
from engagement.views import CustomerDashboardView, FavoriteViewSet, InterestViewSet, InteractionEventViewSet
from intelligence.views import OpportunityAnalysisViewSet, UsageView
from platform_admin.views import AdminOverviewView, AdminProviderReviewView, AdminUserViewSet, SubscriptionViewSet
from realty.views import DevelopmentViewSet, LotViewSet, ProviderDashboardView, ProviderViewSet

router = DefaultRouter()
router.register("providers", ProviderViewSet, basename="provider")
router.register("developments", DevelopmentViewSet, basename="development")
router.register("lots", LotViewSet, basename="lot")
router.register("interests", InterestViewSet, basename="interest")
router.register("favorites", FavoriteViewSet, basename="favorite")
router.register("events", InteractionEventViewSet, basename="event")
router.register("analyses", OpportunityAnalysisViewSet, basename="analysis")
router.register("subscriptions", SubscriptionViewSet, basename="subscription")
router.register("admin/users", AdminUserViewSet, basename="admin-user")


def health(_request):
    return JsonResponse({"status": "ok", "service": "istinar-api"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/token/", TokenObtainPairView.as_view(), name="token"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/me/", CurrentUserView.as_view(), name="me"),
    path("api/dashboard/provider/", ProviderDashboardView.as_view(), name="provider-dashboard"),
    path("api/dashboard/customer/", CustomerDashboardView.as_view(), name="customer-dashboard"),
    path("api/dashboard/usage/", UsageView.as_view(), name="usage"),
    path("api/admin/overview/", AdminOverviewView.as_view(), name="admin-overview"),
    path("api/admin/providers/<uuid:provider_id>/review/", AdminProviderReviewView.as_view(), name="admin-provider-review"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
