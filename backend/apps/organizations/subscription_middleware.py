from django.http import JsonResponse
from django.utils import timezone
from .subscription_models import Subscription

class SubscriptionLimitMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if request.user.is_authenticated and hasattr(request.user, 'organization'):
            try:
                sub = request.user.organization.subscription
                
                # Check if trial expired
                if sub.is_trial and sub.trial_end and sub.trial_end < timezone.now():
                    sub.status = 'expired'
                    sub.save()
                    return JsonResponse({
                        'error': 'Trial expired. Please upgrade to continue.'
                    }, status=402)
                
                # Check if subscription is active
                if sub.status not in ['trial', 'active']:
                    return JsonResponse({
                        'error': 'Subscription inactive. Please contact support.'
                    }, status=402)
                
            except Subscription.DoesNotExist:
                pass
        
        response = self.get_response(request)
        return response
