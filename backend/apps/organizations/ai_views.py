from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .ai_service import AIService

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_summary(request):
    """Generate AI summary of content"""
    content = request.data.get('content', '')
    content_type = request.data.get('content_type', 'conversation')
    
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    summary = AIService.generate_summary(content, content_type)
    return Response({'summary': summary})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def suggest_related(request):
    """Get AI suggestions for related content"""
    content = request.data.get('content', '')
    content_type = request.data.get('content_type', 'conversation')
    
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    suggestions = AIService.suggest_related_content(content, content_type)
    return Response({'suggestions': suggestions})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extract_actions(request):
    """Extract action items from content"""
    content = request.data.get('content', '')
    
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    action_items = AIService.extract_action_items(content)
    return Response({'action_items': action_items})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def suggest_tags(request):
    """Suggest tags for content"""
    content = request.data.get('content', '')
    
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    tags = AIService.suggest_tags(content)
    return Response({'tags': tags})
