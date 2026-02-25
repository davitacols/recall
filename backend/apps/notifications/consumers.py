import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from apps.organizations.models import User

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            token = self.scope['query_string'].decode().split('token=')[1]
            self.user = await self.get_user_from_token(token)
            if not self.user:
                await self.close()
                return
            
            # User-scoped room so each user only receives their own notifications.
            self.room_group_name = f'notifications_{self.user.id}'
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
        except:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def notification_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def get_user_from_token(self, token):
        try:
            access_token = AccessToken(token)
            user = User.objects.get(id=access_token['user_id'])
            return user
        except:
            return None
