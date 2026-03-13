from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.business.document_models import Document
from apps.organizations.models import Organization, User


class DocumentsFeatureTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org = Organization.objects.create(name="Docs Org", slug="docs-org")
        self.other_org = Organization.objects.create(name="Other Docs Org", slug="other-docs-org")
        self.user = User.objects.create_user(
            username="docs_user",
            email="docs@example.com",
            password="pass1234",
            organization=self.org,
            role="admin",
        )
        self.other_user = User.objects.create_user(
            username="other_docs_user",
            email="otherdocs@example.com",
            password="pass1234",
            organization=self.other_org,
            role="admin",
        )
        self.client.force_authenticate(user=self.user)

    def test_document_search_matches_description(self):
        Document.objects.create(
            organization=self.org,
            title="Runbook",
            description="Escalation path for payroll incidents",
            document_type="guide",
            content="Internal operating note",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get("/api/business/documents/search/?q=payroll")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Runbook")

    def test_document_file_requires_authentication(self):
        document = Document.objects.create(
            organization=self.org,
            title="Private file",
            description="Confidential",
            document_type="policy",
            content="private",
            file_data=b"secret-bytes",
            file_name="private.txt",
            file_type="text/plain",
            created_by=self.user,
            updated_by=self.user,
        )
        self.client.force_authenticate(user=None)

        response = self.client.get(f"/api/business/documents/{document.id}/file/")

        self.assertIn(response.status_code, [401, 403])

    def test_document_file_is_scoped_to_organization(self):
        document = Document.objects.create(
            organization=self.other_org,
            title="Other org file",
            description="Hidden",
            document_type="policy",
            content="cross-org",
            file_data=b"hidden-bytes",
            file_name="other.txt",
            file_type="text/plain",
            created_by=self.other_user,
            updated_by=self.other_user,
        )

        response = self.client.get(f"/api/business/documents/{document.id}/file/")

        self.assertEqual(response.status_code, 404)

    def test_document_create_accepts_file_upload(self):
        upload = SimpleUploadedFile("policy.txt", b"policy body", content_type="text/plain")

        response = self.client.post(
            "/api/business/documents/",
            {
                "title": "Security Policy",
                "description": "Uploaded policy",
                "document_type": "policy",
                "content": "source of truth",
                "file": upload,
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        document = Document.objects.get(id=response.data["id"])
        self.assertEqual(document.file_name, "policy.txt")
        self.assertEqual(bytes(document.file_data), b"policy body")
