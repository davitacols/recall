from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from .stripe_service import StripeService
from .subscription_models import Plan

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """Create Stripe Checkout session"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    
    plan_id = request.data.get('plan_id')
    
    try:
        plan = Plan.objects.get(id=plan_id)
        session = StripeService.create_checkout_session(
            organization=request.user.organization,
            plan=plan,
            success_url=request.data.get('success_url', 'http://localhost:3000/subscription/success'),
            cancel_url=request.data.get('cancel_url', 'http://localhost:3000/subscription'),
            user_email=request.user.email
        )
        
        return Response({
            'session_id': session.id,
            'url': session.url
        })
        
    except Plan.DoesNotExist:
        return Response({'error': 'Plan not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_with_payment_method(request):
    """Subscribe with payment method ID"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    
    plan_id = request.data.get('plan_id')
    payment_method_id = request.data.get('payment_method_id')
    
    try:
        plan = Plan.objects.get(id=plan_id)
        stripe_sub = StripeService.create_subscription(
            organization=request.user.organization,
            plan=plan,
            payment_method_id=payment_method_id
        )
        
        return Response({
            'message': 'Subscription created successfully',
            'subscription_id': stripe_sub.id
        })
        
    except Plan.DoesNotExist:
        return Response({'error': 'Plan not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_payment_method(request):
    """Update payment method"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    
    payment_method_id = request.data.get('payment_method_id')
    
    try:
        import stripe
        sub = request.user.organization.subscription
        
        # Attach new payment method
        stripe.PaymentMethod.attach(
            payment_method_id,
            customer=sub.stripe_customer_id
        )
        
        # Set as default
        stripe.Customer.modify(
            sub.stripe_customer_id,
            invoice_settings={'default_payment_method': payment_method_id}
        )
        
        return Response({'message': 'Payment method updated'})
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def stripe_webhook(request):
    """Handle Stripe webhook events"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    if StripeService.handle_webhook(payload, sig_header):
        return HttpResponse(status=200)
    else:
        return HttpResponse(status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_methods(request):
    """Get customer payment methods"""
    try:
        import stripe
        sub = request.user.organization.subscription
        
        if not sub.stripe_customer_id:
            return Response([])
        
        payment_methods = stripe.PaymentMethod.list(
            customer=sub.stripe_customer_id,
            type='card'
        )
        
        data = [{
            'id': pm.id,
            'brand': pm.card.brand,
            'last4': pm.card.last4,
            'exp_month': pm.card.exp_month,
            'exp_year': pm.card.exp_year
        } for pm in payment_methods.data]
        
        return Response(data)
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
