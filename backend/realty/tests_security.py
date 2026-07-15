from decimal import Decimal

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from engagement.models import Interest
from realty.models import Development, Lot, Provider, ProviderMembership


class TenantSecurityTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(email="owner@security.local", username="security-owner", password="TestPass123!", role=User.Role.PROVIDER_OWNER)
        self.editor = User.objects.create_user(email="editor@security.local", username="security-editor", password="TestPass123!", role=User.Role.PROVIDER_STAFF)
        self.customer = User.objects.create_user(email="customer@security.local", username="security-customer", password="TestPass123!", role=User.Role.CUSTOMER)
        self.provider = Provider.objects.create(owner=self.owner, name="شركة محمية", slug="secured-provider", status=Provider.Status.APPROVED)
        ProviderMembership.objects.create(provider=self.provider, user=self.owner, role=ProviderMembership.Role.OWNER)
        ProviderMembership.objects.create(provider=self.provider, user=self.editor, role=ProviderMembership.Role.EDITOR)
        self.public_development = Development.objects.create(provider=self.provider, name="مخطط عام", slug="public-secured-development", city="حائل", status=Development.Status.PUBLISHED, visibility=Development.Visibility.PUBLIC, published_at=timezone.now())
        self.public_lot = Lot.objects.create(development=self.public_development, lot_number="PUB-1", area=Decimal("250"), price=Decimal("300000"), status=Lot.Status.AVAILABLE)
        self.private_development = Development.objects.create(provider=self.provider, name="مخطط خاص", slug="private-secured-development", city="حائل", status=Development.Status.DRAFT, visibility=Development.Visibility.PRIVATE)
        self.private_lot = Lot.objects.create(development=self.private_development, lot_number="PRIVATE-1", area=Decimal("250"), price=Decimal("300000"), status=Lot.Status.AVAILABLE)

    def test_editor_cannot_manage_team_or_promote_anyone(self):
        self.client.force_authenticate(self.editor)
        response = self.client.post(f"/api/providers/{self.provider.slug}/members/", {
            "provider": str(self.provider.id), "user_id": self.editor.id, "role": "owner",
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_customer_cannot_see_provider_internal_note(self):
        Interest.objects.create(provider=self.provider, lot=self.public_lot, user=self.customer, full_name="عميل", email=self.customer.email, internal_note="ملاحظة سرية لفريق المبيعات")
        self.client.force_authenticate(self.customer)
        response = self.client.get("/api/interests/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("internal_note", response.data["results"][0])

    def test_public_endpoints_do_not_expose_owner_profile(self):
        response = self.client.get(f"/api/providers/{self.provider.slug}/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("owner", response.data)

    def test_guest_cannot_target_private_lot_with_interest(self):
        response = self.client.post("/api/interests/", {"lot_id": str(self.private_lot.id), "full_name": "زائر", "email": "guest@example.com"}, format="json")
        self.assertEqual(response.status_code, 400)
