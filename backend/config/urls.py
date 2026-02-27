from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse
from apps.organizations.health import health_check, realtime_health_check

def websocket_unavailable(request):
    return HttpResponse(status=404)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/health/realtime/', realtime_health_check, name='realtime_health_check'),
    path('api/auth/', include('apps.users.urls')),
    path('api/conversations/', include('apps.conversations.urls')),
    path('api/recall/', include('apps.conversations.unified_urls')),
    path('api/decisions/', include('apps.decisions.urls')),
    path('api/decisions/fresh/', include('apps.decisions.urls_fresh')),
    path('api/knowledge/', include('apps.knowledge.urls')),
    path('api/recall/search/', include('apps.knowledge.bm25_urls')),
    path('api/organizations/', include('apps.organizations.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/files/', include('apps.notifications.file_urls')),
    path('api/analytics/', include('apps.agile.analytics_urls')),
    path('api/agile/', include('apps.agile.urls_fresh')),
    path('api/business/', include('apps.business.urls')),
    path('api/integrations/', include('apps.integrations.urls')),
    path('api/integrations/fresh/', include('apps.integrations.urls_fresh')),
    path('api/integrations/github/', include('apps.integrations.github_urls')),
    path('ws/notifications/', websocket_unavailable),
    path('ws/boards/<int:board_id>/', websocket_unavailable),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
elif hasattr(settings, 'MEDIA_ROOT'):
    # Serve media files in production when using filesystem storage
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
