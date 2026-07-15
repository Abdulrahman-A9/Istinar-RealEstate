from rest_framework.test import APITestCase

from accounts.models import User


class AdminOverviewTests(APITestCase):
    def test_only_platform_admin_can_view_overview(self):
        customer = User.objects.create_user(email="customer@admin.local", username="customeradmin", password="TestPass123!", role=User.Role.CUSTOMER)
        self.client.force_authenticate(customer)
        self.assertEqual(self.client.get("/api/admin/overview/").status_code, 403)

        admin = User.objects.create_user(email="admin@admin.local", username="platformadmin", password="TestPass123!", role=User.Role.PLATFORM_ADMIN)
        self.client.force_authenticate(admin)
        response = self.client.get("/api/admin/overview/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("metrics", response.data)
