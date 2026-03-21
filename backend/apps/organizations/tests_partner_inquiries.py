from django.test import TestCase
from rest_framework.test import APIClient

from apps.organizations.models import Organization, PartnerInquiry, User


class PartnerInquiryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_client = APIClient()
        self.contributor_client = APIClient()

        self.org = Organization.objects.create(name="Partner Org", slug="partner-org")
        self.admin = User.objects.create_user(
            username="partner_admin",
            email="admin@partner.test",
            password="pass1234",
            organization=self.org,
            role="admin",
            full_name="Partner Admin",
        )
        self.contributor = User.objects.create_user(
            username="partner_contributor",
            email="contrib@partner.test",
            password="pass1234",
            organization=self.org,
            role="contributor",
            full_name="Partner Contributor",
        )

        self.admin_client.force_authenticate(user=self.admin)
        self.contributor_client.force_authenticate(user=self.contributor)

    def test_public_user_can_submit_partner_inquiry(self):
        response = self.client.post(
            "/api/organizations/partner-inquiries/",
            {
                "full_name": "Ada Lovelace",
                "work_email": "ada@agency.test",
                "company_name": "Analytical Agency",
                "role_title": "Founder",
                "partner_type": "agency",
                "website": "https://agency.test",
                "service_summary": "We help product and engineering teams clean up delivery systems and documentation.",
                "consent_to_contact": True,
                "fax_number": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(PartnerInquiry.objects.count(), 1)
        inquiry = PartnerInquiry.objects.get()
        self.assertEqual(inquiry.company_name, "Analytical Agency")
        self.assertEqual(inquiry.status, "new")

    def test_duplicate_partner_inquiry_returns_existing_record_message(self):
        PartnerInquiry.objects.create(
            full_name="Ada Lovelace",
            work_email="ada@agency.test",
            company_name="Analytical Agency",
            role_title="Founder",
            partner_type="agency",
            service_summary="We help client teams improve delivery and context handling.",
            consent_to_contact=True,
        )

        response = self.client.post(
            "/api/organizations/partner-inquiries/",
            {
                "full_name": "Ada Lovelace",
                "work_email": "ada@agency.test",
                "company_name": "Analytical Agency",
                "role_title": "Founder",
                "partner_type": "agency",
                "service_summary": "We help product and engineering teams clean up delivery systems and documentation.",
                "consent_to_contact": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(PartnerInquiry.objects.count(), 1)
        self.assertIn("already have your partner inquiry", response.data["message"])

    def test_admin_can_list_partner_inquiries(self):
        inquiry = PartnerInquiry.objects.create(
            full_name="Jamie Operator",
            work_email="jamie@ops.test",
            company_name="Ops Studio",
            role_title="Operator",
            partner_type="fractional",
            service_summary="We support portfolio companies with operating cadence and decision tracking.",
            consent_to_contact=True,
        )

        response = self.admin_client.get("/api/organizations/partner-inquiries/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], inquiry.id)

    def test_contributor_cannot_list_partner_inquiries(self):
        response = self.contributor_client.get("/api/organizations/partner-inquiries/")

        self.assertEqual(response.status_code, 403)
