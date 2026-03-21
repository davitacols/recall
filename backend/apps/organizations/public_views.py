from django.core.exceptions import ValidationError
from django.core.validators import URLValidator, validate_email
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import PartnerInquiry, UserFeedback


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
        "internal_notes": inquiry.internal_notes,
        "source": inquiry.source,
        "submitted_at": inquiry.submitted_at,
        "contacted_at": inquiry.contacted_at,
        "owner_id": inquiry.owner_id,
        "owner_name": inquiry.owner.get_full_name() if inquiry.owner else None,
        "owner_email": inquiry.owner.email if inquiry.owner else None,
        "organization_name": getattr(inquiry.organization, "name", None),
        "submitted_by": inquiry.submitted_by.get_full_name() if inquiry.submitted_by else None,
    }


def _serialize_user_feedback(item):
    return {
        "id": item.id,
        "full_name": item.full_name,
        "email": item.email,
        "company_name": item.company_name,
        "role_title": item.role_title,
        "feedback_type": item.feedback_type,
        "sentiment": item.sentiment,
        "rating": item.rating,
        "current_page": item.current_page,
        "message": item.message,
        "consent_to_contact": item.consent_to_contact,
        "status": item.status,
        "internal_notes": item.internal_notes,
        "source": item.source,
        "submitted_at": item.submitted_at,
        "contacted_at": item.contacted_at,
        "owner_id": item.owner_id,
        "owner_name": item.owner.get_full_name() if item.owner else None,
        "owner_email": item.owner.email if item.owner else None,
        "organization_name": getattr(item.organization, "name", None),
        "submitted_by": item.submitted_by.get_full_name() if item.submitted_by else None,
    }


def _can_manage_public_inboxes(user):
    return bool(user and user.is_authenticated and (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)))


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def partner_inquiries(request):
    if request.method == "GET":
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        if not _can_manage_public_inboxes(request.user):
            return Response({"error": "Staff access required"}, status=status.HTTP_403_FORBIDDEN)

        inquiries = PartnerInquiry.objects.select_related("organization", "submitted_by", "owner").order_by("-submitted_at")

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


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def partner_inquiry_detail(request, inquiry_id):
    if not _can_manage_public_inboxes(request.user):
        return Response({"error": "Staff access required"}, status=status.HTTP_403_FORBIDDEN)

    inquiry = get_object_or_404(PartnerInquiry.objects.select_related("organization", "submitted_by", "owner"), id=inquiry_id)

    if request.method == "GET":
        return Response(_serialize_partner_inquiry(inquiry))

    update_fields = []
    valid_statuses = {choice[0] for choice in PartnerInquiry.STATUS_CHOICES}

    if "status" in request.data:
        next_status = _clean_text(request.data.get("status"), max_length=20)
        if next_status not in valid_statuses:
            return Response({"error": "Select a valid inquiry status."}, status=status.HTTP_400_BAD_REQUEST)
        if inquiry.status != next_status:
            inquiry.status = next_status
            update_fields.append("status")
        if next_status in {"contacted", "qualified"} and not inquiry.contacted_at:
            inquiry.contacted_at = timezone.now()
            update_fields.append("contacted_at")

    if "internal_notes" in request.data:
        internal_notes = str(request.data.get("internal_notes") or "").strip()
        if inquiry.internal_notes != internal_notes:
            inquiry.internal_notes = internal_notes
            update_fields.append("internal_notes")

    if request.data.get("assign_to_me") is True:
        if inquiry.owner_id != request.user.id:
            inquiry.owner = request.user
            update_fields.append("owner")
    elif request.data.get("clear_owner") is True:
        if inquiry.owner_id is not None:
            inquiry.owner = None
            update_fields.append("owner")

    if not update_fields:
        return Response(
            {
                "message": "No changes were needed.",
                "inquiry": _serialize_partner_inquiry(inquiry),
            }
        )

    inquiry.save(update_fields=list(dict.fromkeys(update_fields)))

    return Response(
        {
            "message": "Partner inquiry updated.",
            "inquiry": _serialize_partner_inquiry(inquiry),
        }
    )


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def user_feedback(request):
    if request.method == "GET":
        if not request.user or not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
        if not _can_manage_public_inboxes(request.user):
            return Response({"error": "Staff access required"}, status=status.HTTP_403_FORBIDDEN)

        feedback_items = UserFeedback.objects.select_related("organization", "submitted_by", "owner").order_by("-submitted_at")

        status_filter = _clean_text(request.query_params.get("status"), max_length=20)
        if status_filter:
            feedback_items = feedback_items.filter(status=status_filter)

        feedback_type = _clean_text(request.query_params.get("feedback_type"), max_length=40)
        if feedback_type:
            feedback_items = feedback_items.filter(feedback_type=feedback_type)

        sentiment = _clean_text(request.query_params.get("sentiment"), max_length=20)
        if sentiment:
            feedback_items = feedback_items.filter(sentiment=sentiment)

        query = _clean_text(request.query_params.get("q"), max_length=120)
        if query:
            feedback_items = feedback_items.filter(
                Q(full_name__icontains=query)
                | Q(email__icontains=query)
                | Q(company_name__icontains=query)
                | Q(role_title__icontains=query)
                | Q(message__icontains=query)
                | Q(current_page__icontains=query)
            )

        return Response([_serialize_user_feedback(item) for item in feedback_items[:100]])

    data = request.data or {}
    honeypot_value = _clean_text(data.get("fax_number"), max_length=120)
    if honeypot_value:
        return Response({"message": "Feedback received"}, status=status.HTTP_201_CREATED)

    submitted_by = request.user if request.user.is_authenticated else None
    organization = getattr(submitted_by, "organization", None) if submitted_by else None
    fallback_name = submitted_by.get_full_name() if submitted_by else ""
    fallback_email = getattr(submitted_by, "email", "") if submitted_by else ""
    fallback_company = getattr(organization, "name", "") if organization else ""

    full_name = _clean_text(data.get("full_name") or fallback_name, max_length=255)
    email = _clean_text(data.get("email") or fallback_email, max_length=255)
    company_name = _clean_text(data.get("company_name") or fallback_company, max_length=255)
    role_title = _clean_text(data.get("role_title"), max_length=255)
    feedback_type = _clean_text(data.get("feedback_type"), max_length=40)
    sentiment = _clean_text(data.get("sentiment"), max_length=20) or "neutral"
    current_page = _clean_text(data.get("current_page"), max_length=500)
    message = _clean_text(data.get("message"), max_length=4000)
    consent_to_contact = _as_bool(data.get("consent_to_contact"))

    try:
        rating = int(data.get("rating") or 0)
    except (TypeError, ValueError):
        rating = 0

    if not full_name or not email or not feedback_type or not message:
        return Response({"error": "Please complete the required fields before submitting feedback."}, status=status.HTTP_400_BAD_REQUEST)

    if len(message) < 24:
        return Response(
            {"error": "Please add a little more detail so the team can act on the feedback."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_feedback_types = {choice[0] for choice in UserFeedback.FEEDBACK_TYPE_CHOICES}
    if feedback_type not in valid_feedback_types:
        return Response({"error": "Select a valid feedback type."}, status=status.HTTP_400_BAD_REQUEST)

    valid_sentiments = {choice[0] for choice in UserFeedback.SENTIMENT_CHOICES}
    if sentiment not in valid_sentiments:
        return Response({"error": "Select a valid feedback sentiment."}, status=status.HTTP_400_BAD_REQUEST)

    if rating < 1 or rating > 5:
        return Response({"error": "Rating must be between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_email(email)
    except ValidationError:
        return Response({"error": "Enter a valid email address."}, status=status.HTTP_400_BAD_REQUEST)

    duplicate_cutoff = timezone.now() - timezone.timedelta(days=7)
    existing = (
        UserFeedback.objects.filter(
            email__iexact=email,
            message__iexact=message,
            feedback_type=feedback_type,
            submitted_at__gte=duplicate_cutoff,
        )
        .order_by("-submitted_at")
        .first()
    )
    if existing:
        return Response(
            {
                "message": "We already have this feedback in the queue and will review it from the existing submission.",
                "id": existing.id,
                "status": existing.status,
            },
            status=status.HTTP_200_OK,
        )

    item = UserFeedback.objects.create(
        submitted_by=submitted_by,
        organization=organization,
        full_name=full_name,
        email=email,
        company_name=company_name,
        role_title=role_title,
        feedback_type=feedback_type,
        sentiment=sentiment,
        rating=rating,
        current_page=current_page,
        message=message,
        consent_to_contact=consent_to_contact,
    )

    return Response(
        {
            "message": "Feedback received. Knoledgr will review it with the product team.",
            "id": item.id,
            "status": item.status,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def user_feedback_detail(request, feedback_id):
    if not _can_manage_public_inboxes(request.user):
        return Response({"error": "Staff access required"}, status=status.HTTP_403_FORBIDDEN)

    item = get_object_or_404(UserFeedback.objects.select_related("organization", "submitted_by", "owner"), id=feedback_id)

    if request.method == "GET":
        return Response(_serialize_user_feedback(item))

    update_fields = []
    valid_statuses = {choice[0] for choice in UserFeedback.STATUS_CHOICES}

    if "status" in request.data:
        next_status = _clean_text(request.data.get("status"), max_length=20)
        if next_status not in valid_statuses:
            return Response({"error": "Select a valid feedback status."}, status=status.HTTP_400_BAD_REQUEST)
        if item.status != next_status:
            item.status = next_status
            update_fields.append("status")
        if next_status in {"contacted", "resolved"} and not item.contacted_at:
            item.contacted_at = timezone.now()
            update_fields.append("contacted_at")

    if "internal_notes" in request.data:
        internal_notes = str(request.data.get("internal_notes") or "").strip()
        if item.internal_notes != internal_notes:
            item.internal_notes = internal_notes
            update_fields.append("internal_notes")

    if request.data.get("assign_to_me") is True:
        if item.owner_id != request.user.id:
            item.owner = request.user
            update_fields.append("owner")
    elif request.data.get("clear_owner") is True:
        if item.owner_id is not None:
            item.owner = None
            update_fields.append("owner")

    if not update_fields:
        return Response(
            {
                "message": "No changes were needed.",
                "feedback": _serialize_user_feedback(item),
            }
        )

    item.save(update_fields=list(dict.fromkeys(update_fields)))

    return Response(
        {
            "message": "Feedback updated.",
            "feedback": _serialize_user_feedback(item),
        }
    )
