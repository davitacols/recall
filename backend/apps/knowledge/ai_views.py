from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .ai_service import AIService

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_search(request):
    """AI-powered knowledge search"""
    query = request.data.get('query')
    if not query:
        return Response({'error': 'Query is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        ai_service = AIService()
        answer = ai_service.search_knowledge(query, request.user.organization)
        return Response({'answer': answer})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ai_insights(request):
    """Generate AI insights from organizational data"""
    try:
        ai_service = AIService()
        insights = ai_service.generate_insights(request.user.organization)
        return Response({'insights': insights})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ai_summarize(request):
    """Summarize a conversation"""
    conversation_id = request.data.get('conversation_id')
    if not conversation_id:
        return Response({'error': 'conversation_id is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from apps.conversations.models import Conversation
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
        
        ai_service = AIService()
        summary = ai_service.summarize_conversation(conversation)
        return Response({'summary': summary})
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
