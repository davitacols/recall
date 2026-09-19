from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.organizations.models import Organization
from apps.users.views import _build_auth_payload, _user_avatar_url, profile


User = get_user_model()


class ProfileAvatarTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.organization = Organization.objects.create(name="Avatar Test", slug="avatar-test")
        self.user = User.objects.create_user(
            username="avatar-user",
            email="avatar@example.com",
            password="Password1",
            organization=self.organization,
            full_name="Avatar User",
            avatar_url="https://images.example.com/avatar.png",
        )

    def test_profile_uses_remote_avatar_when_no_upload_exists(self):
        request = self.factory.get("/api/auth/profile/")
        force_authenticate(request, user=self.user)

        response = profile(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["avatar"], "https://images.example.com/avatar.png")

    def test_auth_payload_includes_avatar(self):
        payload = _build_auth_payload(self.user)

        self.assertEqual(payload["user"]["avatar"], "https://images.example.com/avatar.png")

    def test_uploaded_avatar_takes_precedence_and_relative_url_is_absolute(self):
        uploaded_avatar = SimpleNamespace(url="/media/avatars/uploaded.png")
        user = SimpleNamespace(avatar=uploaded_avatar, avatar_url="https://images.example.com/remote.png")
        request = self.factory.get("/api/auth/profile/")

        self.assertEqual(
            _user_avatar_url(user, request),
            "http://testserver/media/avatars/uploaded.png",
        )
