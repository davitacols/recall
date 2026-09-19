import tempfile

from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.notifications.file_views import delete_file, upload_file
from apps.organizations.models import Organization


User = get_user_model()


class LocalFileStorageTests(TestCase):
    def setUp(self):
        self.media_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.media_directory.cleanup)
        settings_override = self.settings(MEDIA_ROOT=self.media_directory.name)
        settings_override.enable()
        self.addCleanup(settings_override.disable)

        self.factory = APIRequestFactory()
        self.organization = Organization.objects.create(name="Local Files", slug="local-files")
        self.user = User.objects.create_user(
            username="local-file-user",
            email="files@example.com",
            password="Password1",
            organization=self.organization,
        )

    def test_upload_and_delete_use_organization_scoped_local_storage(self):
        uploaded_file = SimpleUploadedFile("evidence.txt", b"local storage evidence")
        upload_request = self.factory.post(
            "/api/files/upload/",
            {"file": uploaded_file},
            format="multipart",
        )
        force_authenticate(upload_request, user=self.user)

        upload_response = upload_file(upload_request)

        self.assertEqual(upload_response.status_code, 201)
        storage_name = upload_response.data["public_id"]
        self.assertTrue(storage_name.startswith("recall/local-files/"))
        self.assertTrue(default_storage.exists(storage_name))
        self.assertIn("/media/recall/local-files/", upload_response.data["url"])

        delete_request = self.factory.delete("/api/files/delete/")
        force_authenticate(delete_request, user=self.user)
        delete_response = delete_file(delete_request, storage_name)

        self.assertEqual(delete_response.status_code, 200)
        self.assertFalse(default_storage.exists(storage_name))

    def test_delete_rejects_paths_outside_the_users_organization(self):
        request = self.factory.delete("/api/files/delete/")
        force_authenticate(request, user=self.user)

        response = delete_file(request, "recall/another-workspace/private.txt")

        self.assertEqual(response.status_code, 400)

    def test_delete_rejects_parent_directory_traversal(self):
        request = self.factory.delete("/api/files/delete/")
        force_authenticate(request, user=self.user)

        response = delete_file(request, "recall/local-files/../another-workspace/private.txt")

        self.assertEqual(response.status_code, 400)
