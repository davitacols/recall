from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from apps.organizations.models import User
from .models import EmailCampaign
from .tasks import send_marketing_campaign


def _is_campaign_admin(user):
    return getattr(user, 'role', '') in {'admin', 'manager'}


def _serialize_campaign(campaign):
    return {
        'id': campaign.id,
        'name': campaign.name,
        'subject': campaign.subject,
        'preheader': campaign.preheader,
        'body_html': campaign.body_html,
        'cta_label': campaign.cta_label,
        'cta_url': campaign.cta_url,
        'segment': campaign.segment,
        'status': campaign.status,
        'scheduled_for': campaign.scheduled_for,
        'sent_at': campaign.sent_at,
        'total_recipients': campaign.total_recipients,
        'sent_count': campaign.sent_count,
        'failed_count': campaign.failed_count,
        'suppressed_count': campaign.suppressed_count,
        'open_count': campaign.open_count,
        'click_count': campaign.click_count,
        'created_at': campaign.created_at,
        'updated_at': campaign.updated_at,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def campaign_list_create(request):
    if request.method == 'GET':
        if not _is_campaign_admin(request.user):
            return Response({'error': 'Admin or manager access required'}, status=status.HTTP_403_FORBIDDEN)
        campaigns = EmailCampaign.objects.filter(organization=request.user.organization)
        return Response([_serialize_campaign(c) for c in campaigns[:100]])

    if not _is_campaign_admin(request.user):
        return Response({'error': 'Admin or manager access required'}, status=status.HTTP_403_FORBIDDEN)

    required = ['name', 'subject', 'body_html']
    for field in required:
        if not request.data.get(field):
            return Response({'error': f'{field} is required'}, status=status.HTTP_400_BAD_REQUEST)

    campaign = EmailCampaign.objects.create(
        organization=request.user.organization,
        created_by=request.user,
        name=request.data.get('name'),
        subject=request.data.get('subject'),
        preheader=request.data.get('preheader', ''),
        body_html=request.data.get('body_html'),
        cta_label=request.data.get('cta_label', 'Open Knoledgr'),
        cta_url=request.data.get('cta_url', '/'),
        segment=request.data.get('segment', 'all_opted_in'),
        status='draft',
        scheduled_for=parse_datetime(request.data.get('scheduled_for')) if request.data.get('scheduled_for') else None,
    )
    return Response(_serialize_campaign(campaign), status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def campaign_detail(request, campaign_id):
    campaign = EmailCampaign.objects.filter(
        id=campaign_id,
        organization=request.user.organization,
    ).first()
    if not campaign:
        return Response({'error': 'Campaign not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        if not _is_campaign_admin(request.user):
            return Response({'error': 'Admin or manager access required'}, status=status.HTTP_403_FORBIDDEN)
        payload = _serialize_campaign(campaign)
        payload['recipient_stats'] = {
            'pending': campaign.recipients.filter(status='pending').count(),
            'sent': campaign.recipients.filter(status='sent').count(),
            'failed': campaign.recipients.filter(status='failed').count(),
            'suppressed': campaign.recipients.filter(status='suppressed').count(),
            'unsubscribed': campaign.recipients.filter(status='unsubscribed').count(),
        }
        return Response(payload)

    if not _is_campaign_admin(request.user):
        return Response({'error': 'Admin or manager access required'}, status=status.HTTP_403_FORBIDDEN)
    if campaign.status in {'sending', 'sent'}:
        return Response({'error': 'Cannot edit a sending/sent campaign'}, status=status.HTTP_400_BAD_REQUEST)

    editable_fields = ['name', 'subject', 'preheader', 'body_html', 'cta_label', 'cta_url', 'segment', 'scheduled_for']
    for field in editable_fields:
        if field in request.data:
            if field == 'scheduled_for':
                setattr(campaign, field, parse_datetime(request.data[field]) if request.data[field] else None)
            else:
                setattr(campaign, field, request.data[field])
    campaign.save()
    return Response(_serialize_campaign(campaign))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def campaign_send(request, campaign_id):
    if not _is_campaign_admin(request.user):
        return Response({'error': 'Admin or manager access required'}, status=status.HTTP_403_FORBIDDEN)

    campaign = EmailCampaign.objects.filter(
        id=campaign_id,
        organization=request.user.organization,
    ).first()
    if not campaign:
        return Response({'error': 'Campaign not found'}, status=status.HTTP_404_NOT_FOUND)
    if campaign.status in {'sending', 'sent'}:
        return Response({'error': 'Campaign already in progress or sent'}, status=status.HTTP_400_BAD_REQUEST)

    schedule_for = request.data.get('scheduled_for')
    if schedule_for:
        parsed = parse_datetime(schedule_for)
        if not parsed:
            return Response({'error': 'scheduled_for must be ISO datetime'}, status=status.HTTP_400_BAD_REQUEST)
        campaign.status = 'scheduled'
        campaign.scheduled_for = parsed
        campaign.save(update_fields=['status', 'scheduled_for', 'updated_at'])
        return Response({'message': 'Campaign scheduled', 'campaign_id': campaign.id, 'status': campaign.status})

    campaign.status = 'sending'
    campaign.save(update_fields=['status', 'updated_at'])
    send_marketing_campaign.delay(campaign.id)
    return Response({'message': 'Campaign queued', 'campaign_id': campaign.id, 'status': 'sending'})


@api_view(['GET'])
@permission_classes([AllowAny])
def unsubscribe_marketing(request, token):
    user = User.objects.filter(marketing_unsubscribe_token=token).first()
    if not user:
        return Response({'error': 'Invalid unsubscribe link'}, status=status.HTTP_404_NOT_FOUND)

    if not user.marketing_opt_in and user.marketing_unsubscribed_at:
        return Response({'message': 'Already unsubscribed'})

    user.marketing_opt_in = False
    user.marketing_unsubscribed_at = timezone.now()
    user.save(update_fields=['marketing_opt_in', 'marketing_unsubscribed_at'])
    return Response({'message': 'You have been unsubscribed from marketing emails'})
