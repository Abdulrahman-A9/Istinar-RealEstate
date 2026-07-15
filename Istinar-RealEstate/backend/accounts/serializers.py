from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "username", "first_name", "last_name", "display_name", "phone", "avatar_url", "role", "locale", "is_email_verified", "date_joined"]
        read_only_fields = ["id", "role", "is_email_verified", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=[User.Role.CUSTOMER, User.Role.ENTREPRENEUR, User.Role.PROVIDER_OWNER], default=User.Role.CUSTOMER)
    username = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["email", "username", "password", "first_name", "last_name", "phone", "role"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        if not validated_data.get("username"):
            base = validated_data["email"].split("@")[0]
            username = base
            suffix = 2
            while User.objects.filter(username=username).exists():
                username = f"{base}{suffix}"
                suffix += 1
            validated_data["username"] = username
        return User.objects.create_user(password=password, **validated_data)
