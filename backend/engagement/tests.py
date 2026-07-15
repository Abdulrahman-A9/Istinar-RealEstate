from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from .models import Interest
from realty.models import Development, Lot, Provider


class EngagementTests(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(email="provider@lead.local", username="providerlead", password="TestPass123!", role=User.Role.PROVIDER_OWNER)
        provider = Provider.objects.create(owner=owner, name="شركة طلبات", slug="lead-provider", status=Provider.Status.APPROVED)
        development = Development.objects.create(provider=provider, name="مخطط طلبات", slug="lead-development", city="حائل", status=Development.Status.PUBLISHED, visibility=Development.Visibility.PUBLIC, published_at=timezone.now())
        self.lot = Lot.objects.create(development=development, lot_number="L-1", area=Decimal("200"), price=Decimal("300000"), status=Lot.Status.AVAILABLE)

    def test_guest_can_submit_interest_for_available_lot(self):
        response = self.client.post("/api/interests/", {
            "lot_id": str(self.lot.id), "full_name": "عميل جديد", "email": "lead@example.com", "phone": "0500000000", "message": "أرغب بالتواصل",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Interest.objects.count(), 1)
