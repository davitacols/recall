from django.http import HttpResponse

class MediaNotFoundMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # If it's a media file request that returns 404, return 204 instead
        if request.path.startswith('/media/') and response.status_code == 404:
            return HttpResponse(status=204)
        
        return response
