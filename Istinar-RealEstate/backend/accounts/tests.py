from django.urls import reverse
from rest_framework.test import APITestCase

from .models import User


class RegistrationTests(APITestCase):
    def test_registers_customer_and_returns_tokens(self):
        response = self.client.post(reverse("register"), {
            "email": "new@example.com",
            "password": "SecurePass123!",
            "first_name": "مها",
            "role": "customer",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertIn("access", response.data)
        self.assertEqual(User.objects.get(email="new@example.com").username, "new")
