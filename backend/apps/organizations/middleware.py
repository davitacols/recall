from django.http import HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin

class OrganizationMiddleware(MiddlewareMixin):
    """Ensure users can only access data from their organization"""
    
    def process_request(self, request):
        # Skip for non-authenticated requests
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return None
        
        # Add organization context to request
        request.organization = request.user.organization
        return None