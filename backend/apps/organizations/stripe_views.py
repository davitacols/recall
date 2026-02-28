from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import stripe
from .subscription_models import Plan, Subscription
from .subscription_entitlements import get_or_create_subscription

stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    plan_name = request.data.get('plan')
    plan_id = request.data.get('plan_id')
    if not plan_name and plan_id:
        try:
            plan_name = Plan.objects.get(id=plan_id).name
        except Plan.DoesNotExist:
            plan_name = None

    price_ids = {
        'starter': settings.STRIPE_STARTER_PRICE_ID,
        'professional': settings.STRIPE_PROFESSIONAL_PRICE_ID,
        'enterprise': settings.STRIPE_ENTERPRISE_PRICE_ID
    }
    
    if plan_name not in price_ids or not price_ids[plan_name]:
        return Response({'error': 'Invalid plan'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        subscription = get_or_create_subscription(request.user.organization)
        session = stripe.checkout.Session.create(
            customer_email=request.user.email,
            payment_method_types=['card'],
            line_items=[{
                'price': price_ids[plan_name],
                'quantity': 1,
            }],
            mode='subscription',
            success_url=request.data.get('success_url') or f"{settings.FRONTEND_URL}/subscription?success=true",
            cancel_url=request.data.get('cancel_url') or f"{settings.FRONTEND_URL}/subscription?canceled=true",
            metadata={
                'organization_id': request.user.organization_id,
                'user_id': request.user.id,
                'plan_name': plan_name,
            }
        )
        if not subscription.stripe_customer_id and getattr(session, 'customer', None):
            subscription.stripe_customer_id = session.customer
            subscription.save(update_fields=['stripe_customer_id', 'updated_at'])
        return Response({'url': session.url})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_portal_session(request):
    try:
        subscription = get_or_create_subscription(request.user.organization)
        if not subscription.stripe_customer_id:
            return Response({'error': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)
        
        session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
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
        plan_name = session.get('metadata', {}).get('plan_name')
        plan = Plan.objects.filter(name=plan_name).first()
        sub = Subscription.objects.filter(organization_id=org_id).select_related('plan').first()
        if sub:
            sub.stripe_customer_id = session.get('customer') or sub.stripe_customer_id
            sub.status = 'active'
            if plan:
                sub.plan = plan
            sub.save()
    
    elif event['type'] == 'customer.subscription.deleted':
        stripe_sub = event['data']['object']
        sub = Subscription.objects.filter(stripe_customer_id=stripe_sub.get('customer')).first()
        if sub:
            sub.status = 'canceled'
            sub.save(update_fields=['status', 'updated_at'])
    
    return Response({'status': 'success'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    sub = get_or_create_subscription(request.user.organization)
    return Response({
        'status': sub.status,
        'plan': sub.plan.name,
        'has_subscription': bool(sub.stripe_customer_id)
    })
