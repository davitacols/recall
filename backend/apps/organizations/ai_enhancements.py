from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.business.document_models import Document
import anthropic

def get_ai_client():
    if not settings.ANTHROPIC_API_KEY:
        return None
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_summarize(request):
    """Auto-summarize long conversations/documents"""
    content = request.data.get('content', '')
    title = request.data.get('title', '')
    
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    client = get_ai_client()
    if not client:
        return Response({'error': 'AI not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": f"Summarize this in 2-3 sentences:\n\nTitle: {title}\n\n{content[:3000]}"
            }]
        )
        
        summary = message.content[0].text
        
        return Response({
            'summary': summary,
            'word_count': len(content.split()),
            'summary_word_count': len(summary.split())
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def smart_suggestions(request):
    """Generate smart suggestions based on context"""
    content = request.data.get('content', '')
    context_type = request.data.get('type', 'conversation')  # conversation, decision, document
    
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    client = get_ai_client()
    if not client:
        return Response({'error': 'AI not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    prompts = {
        'conversation': 'Based on this conversation, suggest 3 action items and 3 related topics to explore:',
        'decision': 'Based on this decision, suggest 3 potential risks and 3 follow-up actions:',
        'document': 'Based on this document, suggest 3 key takeaways and 3 related documents to create:'
    }
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=400,
            messages=[{
                "role": "user",
                "content": f"{prompts.get(context_type, prompts['conversation'])}\n\n{content[:2000]}"
            }]
        )
        
        suggestions_text = message.content[0].text
        
        # Parse suggestions
        lines = [l.strip() for l in suggestions_text.split('\n') if l.strip()]
        
        return Response({
            'suggestions': lines,
            'context_type': context_type
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sentiment_analysis(request):
    """Analyze sentiment of content"""
    content = request.data.get('content', '')
    
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    client = get_ai_client()
    if not client:
        return Response({'error': 'AI not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": f"""Analyze the sentiment of this text. Respond in JSON format:
{{
  "sentiment": "positive/negative/neutral/mixed",
  "confidence": 0.0-1.0,
  "tone": "professional/casual/urgent/concerned/excited",
  "key_emotions": ["emotion1", "emotion2"]
}}

Text: {content[:1500]}"""
            }]
        )
        
        import json
        result = message.content[0].text
        
        # Try to parse JSON, fallback to simple response
        try:
            sentiment_data = json.loads(result)
        except:
            sentiment_data = {
                'sentiment': 'neutral',
                'confidence': 0.5,
                'tone': 'professional',
                'key_emotions': []
            }
        
        return Response(sentiment_data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_tag(request):
    """Generate tags automatically from content"""
    content = request.data.get('content', '')
    title = request.data.get('title', '')
    
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    client = get_ai_client()
    if not client:
        return Response({'error': 'AI not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=150,
            messages=[{
                "role": "user",
                "content": f"""Generate 5-8 relevant tags for this content. Return only comma-separated tags, no explanation.

Title: {title}
Content: {content[:1500]}"""
            }]
        )
        
        tags_text = message.content[0].text.strip()
        tags = [t.strip() for t in tags_text.split(',') if t.strip()]
        
        # Clean tags (remove quotes, hashtags, etc)
        tags = [t.replace('#', '').replace('"', '').replace("'", '').lower() for t in tags]
        
        return Response({
            'tags': tags[:8],
            'count': len(tags)
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def batch_ai_process(request):
    """Process content with all AI features at once"""
    content = request.data.get('content', '')
    title = request.data.get('title', '')
    item_type = request.data.get('type', 'conversation')
    
    if not content:
        return Response({'error': 'Content required'}, status=status.HTTP_400_BAD_REQUEST)
    
    client = get_ai_client()
    if not client:
        return Response({'error': 'AI not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": f"""Analyze this content and provide:
1. A 2-3 sentence summary
2. 5-8 relevant tags (comma-separated)
3. Sentiment (positive/negative/neutral/mixed)
4. 3 key action items or suggestions

Title: {title}
Content: {content[:2500]}

Format your response as:
SUMMARY: [summary]
TAGS: [tags]
SENTIMENT: [sentiment]
ACTIONS:
- [action 1]
- [action 2]
- [action 3]"""
            }]
        )
        
        response_text = message.content[0].text
        
        # Parse response
        result = {
            'summary': '',
            'tags': [],
            'sentiment': 'neutral',
            'actions': []
        }
        
        for line in response_text.split('\n'):
            line = line.strip()
            if line.startswith('SUMMARY:'):
                result['summary'] = line.replace('SUMMARY:', '').strip()
            elif line.startswith('TAGS:'):
                tags_text = line.replace('TAGS:', '').strip()
                result['tags'] = [t.strip().lower() for t in tags_text.split(',') if t.strip()]
            elif line.startswith('SENTIMENT:'):
                result['sentiment'] = line.replace('SENTIMENT:', '').strip().lower()
            elif line.startswith('- '):
                result['actions'].append(line.replace('- ', '').strip())
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_ai_to_item(request, item_type, item_id):
    """Apply AI processing to existing conversation/decision/document"""
    
    try:
        if item_type == 'conversation':
            item = Conversation.objects.get(id=item_id, organization=request.user.organization)
            content = item.content
            title = item.title
        elif item_type == 'decision':
            item = Decision.objects.get(id=item_id, organization=request.user.organization)
            content = item.description
            title = item.title
        elif item_type == 'document':
            item = Document.objects.get(id=item_id, organization=request.user.organization)
            content = item.content
            title = item.title
        else:
            return Response({'error': 'Invalid type'}, status=status.HTTP_400_BAD_REQUEST)
    except:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Process with batch AI
    client = get_ai_client()
    if not client:
        return Response({'error': 'AI not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    try:
        message = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=800,
            messages=[{
                "role": "user",
                "content": f"""Analyze this content and provide:
1. A 2-3 sentence summary
2. 5-8 relevant tags (comma-separated)
3. Sentiment (positive/negative/neutral/mixed)
4. 3 key action items

Title: {title}
Content: {content[:2500]}

Format as:
SUMMARY: [summary]
TAGS: [tags]
SENTIMENT: [sentiment]
ACTIONS:
- [action 1]
- [action 2]
- [action 3]"""
            }]
        )
        
        response_text = message.content[0].text
        
        # Parse and save
        result = {'summary': '', 'tags': [], 'sentiment': 'neutral', 'actions': []}
        
        for line in response_text.split('\n'):
            line = line.strip()
            if line.startswith('SUMMARY:'):
                result['summary'] = line.replace('SUMMARY:', '').strip()
            elif line.startswith('TAGS:'):
                tags_text = line.replace('TAGS:', '').strip()
                result['tags'] = [t.strip().lower() for t in tags_text.split(',') if t.strip()]
            elif line.startswith('SENTIMENT:'):
                result['sentiment'] = line.replace('SENTIMENT:', '').strip().lower()
            elif line.startswith('- '):
                result['actions'].append(line.replace('- ', '').strip())
        
        # Save to item
        if item_type == 'conversation':
            item.ai_summary = result['summary']
            item.ai_keywords = result['tags']
            item.ai_processed = True
            item.save()
        elif item_type == 'decision':
            item.ai_summary = result['summary']
            item.save()
        elif item_type == 'document':
            item.ai_summary = result['summary']
            item.save()
        
        return Response(result)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
