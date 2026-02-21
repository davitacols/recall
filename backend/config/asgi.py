import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path
from apps.agile.consumers import BoardConsumer
from apps.notifications.consumers import NotificationConsumer
from config.ws_auth import JWTAuthMiddleware

django_asgi_app = get_asgi_application()

websocket_urlpatterns = [
    path('ws/boards/<int:board_id>/', BoardConsumer.as_asgi()),
    path('ws/notifications/', NotificationConsumer.as_asgi()),
]

try:
    from channels.layers import get_channel_layer
    channel_layer = get_channel_layer()
except Exception:
    channel_layer = None

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
