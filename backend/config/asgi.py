import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import path
from apps.agile.consumers import BoardConsumer
from apps.notifications.consumers import NotificationsConsumer
from config.ws_auth import JWTAuthMiddleware

django_asgi_app = get_asgi_application()

websocket_urlpatterns = [
    path('ws/boards/<int:board_id>/', BoardConsumer.as_asgi()),
    path('ws/notifications/', NotificationsConsumer.as_asgi()),
]

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
