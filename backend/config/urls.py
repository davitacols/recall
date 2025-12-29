from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from apps.organizations.health import health_check

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/auth/', include('apps.users.urls')),
    path('api/conversations/', include('apps.conversations.urls')),
    path('api/decisions/', include('apps.decisions.urls')),
    path('api/knowledge/', include('apps.knowledge.urls')),
    path('api/organizations/', include('apps.organizations.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
elif hasattr(settings, 'MEDIA_ROOT'):
    # Serve media files in production when using filesystem storage
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)