from django.core.exceptions import ValidationError
from django.core.validators import URLValidator, validate_email
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import PartnerInquiry


def _clean_text(value, max_length=None):
    text = str(value or "").strip()
    if max_length:
        text = text[:max_length]
    return text


def _as_bool(value):
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _serialize_partner_inquiry(inquiry):
    return {
        "id": inquiry.id,
        "full_name": inquiry.full_name,
        "work_email": inquiry.work_email,
        "company_name": inquiry.company_name,
        "role_title": inquiry.role_title,
        "website": inquiry.website,
        "partner_type": inquiry.partner_type,
        "service_summary": inquiry.service_summary,
        "status": inquiry.status,
        "source": inquiry.source,
        "submitted_at": inquiry.submitted_at,
        "organization_name": getattr(inquiry.organization, "name", None),
        "submitted_by": inquiry.submitted_by.get_full_name() if inquiry.submitted_by else None,
    }


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def partner_inquiries(request):
    if request.method == "GET":
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        if getattr(request.user, "role", "") != "admin":
            return Response({"error": "Admin access required"}, status=status.HTTP_403_FORBIDDEN)

        inquiries = PartnerInquiry.objects.select_related("organization", "submitted_by").order_by("-submitted_at")

        status_filter = _clean_text(request.query_params.get("status"), max_length=20)
        if status_filter:
            inquiries = inquiries.filter(status=status_filter)

        partner_type = _clean_text(request.query_params.get("partner_type"), max_length=40)
        if partner_type:
            inquiries = inquiries.filter(partner_type=partner_type)

        query = _clean_text(request.query_params.get("q"), max_length=120)
        if query:
            inquiries = inquiries.filter(
                Q(full_name__icontains=query)
                | Q(work_email__icontains=query)
                | Q(company_name__icontains=query)
                | Q(role_title__icontains=query)
            )

        return Response([_serialize_partner_inquiry(inquiry) for inquiry in inquiries[:100]])

    data = request.data or {}
    honeypot_value = _clean_text(data.get("fax_number"), max_length=120)
    if honeypot_value:
        return Response({"message": "Partner inquiry received"}, status=status.HTTP_201_CREATED)

    full_name = _clean_text(data.get("full_name"), max_length=255)
    work_email = _clean_text(data.get("work_email"), max_length=255)
    company_name = _clean_text(data.get("company_name"), max_length=255)
    role_title = _clean_text(data.get("role_title"), max_length=255)
    website = _clean_text(data.get("website"), max_length=500)
    partner_type = _clean_text(data.get("partner_type"), max_length=40)
    service_summary = _clean_text(data.get("service_summary"), max_length=4000)
    consent_to_contact = _as_bool(data.get("consent_to_contact"))

    if not full_name or not work_email or not company_name or not role_title or not partner_type or not service_summary:
        return Response({"error": "Please complete all required fields."}, status=status.HTTP_400_BAD_REQUEST)

    if len(service_summary) < 24:
        return Response(
            {"error": "Please share a little more context about your practice or client work."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not consent_to_contact:
        return Response(
            {"error": "Consent is required before Knoledgr can contact you about the partner program."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_partner_types = {choice[0] for choice in PartnerInquiry.PARTNER_TYPE_CHOICES}
    if partner_type not in valid_partner_types:
        return Response({"error": "Select a valid partner type."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_email(work_email)
    except ValidationError:
        return Response({"error": "Enter a valid work email."}, status=status.HTTP_400_BAD_REQUEST)

    if website:
        try:
            URLValidator()(website)
        except ValidationError:
            return Response({"error": "Enter a valid website URL."}, status=status.HTTP_400_BAD_REQUEST)

    duplicate_cutoff = timezone.now() - timezone.timedelta(days=14)
    existing = (
        PartnerInquiry.objects.filter(
            work_email__iexact=work_email,
            company_name__iexact=company_name,
            submitted_at__gte=duplicate_cutoff,
        )
        .order_by("-submitted_at")
        .first()
    )
    if existing:
        return Response(
            {
                "message": "We already have your partner inquiry and will follow up from the existing request.",
                "id": existing.id,
                "status": existing.status,
            },
            status=status.HTTP_200_OK,
        )

    submitted_by = request.user if request.user.is_authenticated else None
    organization = getattr(submitted_by, "organization", None) if submitted_by else None

    inquiry = PartnerInquiry.objects.create(
        submitted_by=submitted_by,
        organization=organization,
        full_name=full_name,
        work_email=work_email,
        company_name=company_name,
        role_title=role_title,
        website=website,
        partner_type=partner_type,
        service_summary=service_summary,
        consent_to_contact=True,
    )

    return Response(
        {
            "message": "Partner inquiry received. Knoledgr will follow up with the next steps.",
            "id": inquiry.id,
            "status": inquiry.status,
        },
        status=status.HTTP_201_CREATED,
    )
