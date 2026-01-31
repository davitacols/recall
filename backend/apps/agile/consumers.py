import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from apps.agile.models import Board, Issue

class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.board_group_name = f'board_{self.board_id}'
        
        await self.channel_layer.group_add(
            self.board_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.board_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data['type'] == 'issue_moved':
            await self.issue_moved(data)

    async def issue_moved(self, event):
        await self.channel_layer.group_send(
            self.board_group_name,
            {
                'type': 'issue_update',
                'issue_id': event['issue_id'],
                'column_id': event['column_id'],
                'status': event['status']
            }
        )

    async def issue_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'issue_moved',
            'issue_id': event['issue_id'],
            'column_id': event['column_id'],
            'status': event['status']
        }))
