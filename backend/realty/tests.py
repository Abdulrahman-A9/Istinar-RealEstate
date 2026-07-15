from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Development, Lot, Provider, ProviderMembership


class RealtyApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@test.local", username="owner", password="TestPass123!", role=User.Role.PROVIDER_OWNER)
        self.provider = Provider.objects.create(owner=self.owner, name="شركة اختبار", slug="test-provider", status=Provider.Status.APPROVED)
        ProviderMembership.objects.create(provider=self.provider, user=self.owner, role=ProviderMembership.Role.OWNER)
        self.development = Development.objects.create(provider=self.provider, name="مخطط اختبار", slug="test-development", city="حائل", status=Development.Status.PUBLISHED, visibility=Development.Visibility.PUBLIC, published_at=timezone.now())
        self.lot = Lot.objects.create(development=self.development, lot_number="101", polygon=[[0, 0], [10, 0], [10, 10]], area=Decimal("300"), price=Decimal("400000"), usage_type=Lot.UsageType.COMMERCIAL, status=Lot.Status.AVAILABLE)

    def test_public_catalog_includes_published_development_and_lot(self):
        development_response = self.client.get("/api/developments/")
        lot_response = self.client.get("/api/lots/?development=test-development&status=available")
        self.assertEqual(development_response.status_code, 200)
        self.assertEqual(len(development_response.data["results"]), 1)
        self.assertEqual(lot_response.status_code, 200)
        self.assertEqual(lot_response.data["results"][0]["lot_number"], "101")

    def test_provider_owner_can_add_lot(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post("/api/lots/", {
            "development": str(self.development.id), "lot_number": "102", "polygon": [[12, 0], [20, 0], [20, 8]],
            "area": "280", "price": "350000", "usage_type": "commercial", "status": "available",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Lot.objects.filter(development=self.development).count(), 2)
