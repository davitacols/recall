from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ConversationReply

@api_view(['PUT', 'DELETE'])
def reply_detail(request, reply_id):
    try:
        reply = ConversationReply.objects.get(
            id=reply_id,
            author=request.user
        )
        
        if request.method == 'PUT':
            reply.content = request.data.get('content', reply.content)
            reply.save()
            return Response({'message': 'Updated'})
        
        elif request.method == 'DELETE':
            reply.delete()
            return Response({'message': 'Deleted'})
            
    except ConversationReply.DoesNotExist:
        return Response({'error': 'Reply not found'}, status=status.HTTP_404_NOT_FOUND)
