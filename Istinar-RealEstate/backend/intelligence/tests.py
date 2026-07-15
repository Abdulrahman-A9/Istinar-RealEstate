from decimal import Decimal
from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from .models import EntrepreneurProAccess, OpportunityAnalysis, UsageLimit
from realty.models import Development, Lot, Provider


class OpportunityAnalysisTests(APITestCase):
    def setUp(self):
        owner = User.objects.create_user(email="owner@analysis.local", username="analysisowner", password="TestPass123!", role=User.Role.PROVIDER_OWNER)
        self.user = User.objects.create_user(email="investor@analysis.local", username="analysisinvestor", password="TestPass123!", role=User.Role.ENTREPRENEUR)
        provider = Provider.objects.create(owner=owner, name="شركة تحليل", slug="analysis-provider", status=Provider.Status.APPROVED)
        development = Development.objects.create(provider=provider, name="مخطط تحليل", slug="analysis-development", city="حائل", status=Development.Status.PUBLISHED, visibility=Development.Visibility.PUBLIC, published_at=timezone.now())
        self.lot = Lot.objects.create(development=development, lot_number="C-1", area=Decimal("280"), price=Decimal("350000"), usage_type=Lot.UsageType.COMMERCIAL, status=Lot.Status.AVAILABLE, is_corner=True, frontage="طريق رئيسي", street_width=Decimal("30"))

    def test_analysis_is_created_and_consumes_free_allowance(self):
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/analyses/", {"lot_id": str(self.lot.id), "business_type": "Coffee shop", "budget": "1000000", "inputs": {"estimated_competitors": 3, "neighborhood_fit": 76}}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertGreaterEqual(response.data["score"], 60)
        self.assertEqual(OpportunityAnalysis.objects.count(), 1)
        self.assertEqual(UsageLimit.objects.get(user=self.user, feature="opportunity_analysis").used_count, 1)

    def test_expired_pro_access_does_not_bypass_usage_limit(self):
        UsageLimit.objects.create(user=self.user, feature="opportunity_analysis", free_limit=1, used_count=1)
        EntrepreneurProAccess.objects.create(user=self.user, plan_type="pro", payment_status="paid", expires_at=timezone.now() - timedelta(days=1))
        self.client.force_authenticate(self.user)
        response = self.client.post("/api/analyses/", {"lot_id": str(self.lot.id), "business_type": "Coffee shop", "budget": "1000000"}, format="json")
        self.assertEqual(response.status_code, 400)
