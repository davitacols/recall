import stripe
from django.conf import settings
from .subscription_models import Subscription, Invoice, Plan
from django.utils import timezone
from datetime import timedelta

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    
    @staticmethod
    def create_customer(organization, email):
        """Create Stripe customer"""
        customer = stripe.Customer.create(
            email=email,
            name=organization.name,
            metadata={'organization_id': organization.id}
        )
        return customer.id
    
    @staticmethod
    def create_subscription(organization, plan, payment_method_id):
        """Create Stripe subscription"""
        try:
            sub = organization.subscription
            
            # Create customer if doesn't exist
            if not sub.stripe_customer_id:
                sub.stripe_customer_id = StripeService.create_customer(
                    organization, 
                    organization.created_by.email
                )
                sub.save()
            
            # Attach payment method
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=sub.stripe_customer_id
            )
            
            # Set as default payment method
            stripe.Customer.modify(
                sub.stripe_customer_id,
                invoice_settings={'default_payment_method': payment_method_id}
            )
            
            # Get Stripe price ID for plan
            price_id = StripeService.get_price_id(plan)
            
            # Create subscription
            stripe_sub = stripe.Subscription.create(
                customer=sub.stripe_customer_id,
                items=[{'price': price_id, 'quantity': sub.user_count}],
                metadata={'organization_id': organization.id}
            )
            
            # Update local subscription
            sub.stripe_subscription_id = stripe_sub.id
            sub.status = 'active'
            sub.current_period_start = timezone.now()
            sub.current_period_end = timezone.now() + timedelta(days=30)
            sub.save()
            
            return stripe_sub
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def update_subscription_quantity(subscription, new_quantity):
        """Update subscription quantity when users are added/removed"""
        if not subscription.stripe_subscription_id:
            return
        
        try:
            stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                items=[{
                    'id': stripe_sub['items']['data'][0].id,
                    'quantity': new_quantity
                }]
            )
            subscription.user_count = new_quantity
            subscription.save()
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def cancel_subscription(subscription):
        """Cancel Stripe subscription"""
        if not subscription.stripe_subscription_id:
            return
        
        try:
            stripe.Subscription.delete(subscription.stripe_subscription_id)
            subscription.status = 'canceled'
            subscription.save()
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def change_plan(subscription, new_plan):
        """Change subscription plan"""
        if not subscription.stripe_subscription_id:
            return
        
        try:
            stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
            new_price_id = StripeService.get_price_id(new_plan)
            
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                items=[{
                    'id': stripe_sub['items']['data'][0].id,
                    'price': new_price_id,
                    'quantity': subscription.user_count
                }],
                proration_behavior='always_invoice'
            )
            
            subscription.plan = new_plan
            subscription.save()
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def get_price_id(plan):
        """Get Stripe price ID for plan"""
        price_ids = {
            'starter': settings.STRIPE_STARTER_PRICE_ID,
            'professional': settings.STRIPE_PROFESSIONAL_PRICE_ID,
            'enterprise': settings.STRIPE_ENTERPRISE_PRICE_ID,
        }
        return price_ids.get(plan.name)
    
    @staticmethod
    def create_checkout_session(organization, plan, success_url, cancel_url, user_email):
        """Create Stripe Checkout session"""
        try:
            sub = organization.subscription
            
            # Create customer if doesn't exist
            if not sub.stripe_customer_id:
                sub.stripe_customer_id = StripeService.create_customer(
                    organization,
                    user_email
                )
                sub.save()
            
            price_id = StripeService.get_price_id(plan)
            
            session = stripe.checkout.Session.create(
                customer=sub.stripe_customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': sub.user_count,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={'organization_id': organization.id}
            )
            
            return session
            
        except stripe.error.StripeError as e:
            raise Exception(f"Stripe error: {str(e)}")
    
    @staticmethod
    def handle_webhook(payload, sig_header):
        """Handle Stripe webhook events"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
            
            if event['type'] == 'invoice.paid':
                StripeService.handle_invoice_paid(event['data']['object'])
            
            elif event['type'] == 'invoice.payment_failed':
                StripeService.handle_payment_failed(event['data']['object'])
            
            elif event['type'] == 'customer.subscription.deleted':
                StripeService.handle_subscription_deleted(event['data']['object'])
            
            return True
            
        except stripe.error.SignatureVerificationError:
            return False
    
    @staticmethod
    def handle_invoice_paid(invoice_data):
        """Handle successful payment"""
        org_id = invoice_data['metadata'].get('organization_id')
        if not org_id:
            return
        
        try:
            from apps.users.models import Organization
            org = Organization.objects.get(id=org_id)
            sub = org.subscription
            
            # Create invoice record
            Invoice.objects.create(
                subscription=sub,
                amount=invoice_data['amount_paid'] / 100,
                status='paid',
                period_start=timezone.datetime.fromtimestamp(invoice_data['period_start']),
                period_end=timezone.datetime.fromtimestamp(invoice_data['period_end']),
                due_date=timezone.datetime.fromtimestamp(invoice_data['due_date']),
                paid_at=timezone.now(),
                stripe_invoice_id=invoice_data['id'],
                invoice_pdf=invoice_data.get('invoice_pdf', '')
            )
            
            # Update subscription status
            sub.status = 'active'
            sub.save()
            
        except Exception as e:
            print(f"Error handling invoice paid: {e}")
    
    @staticmethod
    def handle_payment_failed(invoice_data):
        """Handle failed payment"""
        org_id = invoice_data['metadata'].get('organization_id')
        if not org_id:
            return
        
        try:
            from apps.users.models import Organization
            org = Organization.objects.get(id=org_id)
            sub = org.subscription
            sub.status = 'past_due'
            sub.save()
        except Exception as e:
            print(f"Error handling payment failed: {e}")
    
    @staticmethod
    def handle_subscription_deleted(subscription_data):
        """Handle subscription cancellation"""
        org_id = subscription_data['metadata'].get('organization_id')
        if not org_id:
            return
        
        try:
            from apps.users.models import Organization
            org = Organization.objects.get(id=org_id)
            sub = org.subscription
            sub.status = 'canceled'
            sub.save()
        except Exception as e:
            print(f"Error handling subscription deleted: {e}")
