from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    plan = request.data.get('plan')
    price_ids = {
        'starter': settings.STRIPE_STARTER_PRICE_ID,
        'professional': settings.STRIPE_PROFESSIONAL_PRICE_ID,
        'enterprise': settings.STRIPE_ENTERPRISE_PRICE_ID
    }
    
    if plan not in price_ids or not price_ids[plan]:
        return Response({'error': 'Invalid plan'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = stripe.checkout.Session.create(
            customer_email=request.user.email,
            payment_method_types=['card'],
            line_items=[{
                'price': price_ids[plan],
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f"{settings.FRONTEND_URL}/subscription?success=true",
            cancel_url=f"{settings.FRONTEND_URL}/subscription?canceled=true",
            metadata={
                'organization_id': request.user.organization_id,
                'user_id': request.user.id
            }
        )
        return Response({'url': session.url})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_portal_session(request):
    try:
        org = request.user.organization
        if not org.stripe_customer_id:
            return Response({'error': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)
        
        session = stripe.billing_portal.Session.create(
            customer=org.stripe_customer_id,
            return_url=f"{settings.FRONTEND_URL}/subscription"
        )
        return Response({'url': session.url})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except:
        return Response(status=status.HTTP_400_BAD_REQUEST)
    
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        org_id = session['metadata']['organization_id']
        from apps.organizations.models import Organization
        org = Organization.objects.get(id=org_id)
        org.stripe_customer_id = session['customer']
        org.subscription_status = 'active'
        org.save()
    
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        from apps.organizations.models import Organization
        org = Organization.objects.get(stripe_customer_id=subscription['customer'])
        org.subscription_status = 'canceled'
        org.save()
    
    return Response({'status': 'success'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    org = request.user.organization
    return Response({
        'status': org.subscription_status,
        'plan': org.subscription_plan,
        'has_subscription': bool(org.stripe_customer_id)
    })
