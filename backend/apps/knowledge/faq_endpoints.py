from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from apps.knowledge.faq_models import FAQ, FAQFeedback
from apps.conversations.models import Conversation

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def faq_list(request):
    """List FAQs or generate from resolved questions"""
    if request.method == 'GET':
        faqs = FAQ.objects.filter(organization=request.user.organization)
        
        search = request.GET.get('search', '')
        if search:
            faqs = faqs.filter(Q(question__icontains=search) | Q(answer__icontains=search))
        
        return Response([{
            'id': f.id,
            'question': f.question,
            'answer': f.answer,
            'helpful_count': f.helpful_count,
            'unhelpful_count': f.unhelpful_count,
            'view_count': f.view_count,
            'created_at': f.created_at.isoformat()
        } for f in faqs])
    
    # POST - Generate FAQs from resolved questions
    resolved_questions = Conversation.objects.filter(
        organization=request.user.organization,
        post_type='question',
        is_closed=True
    ).order_by('-view_count')[:20]
    
    created_count = 0
    for conv in resolved_questions:
        if not FAQ.objects.filter(source_conversation=conv).exists():
            FAQ.objects.create(
                organization=request.user.organization,
                question=conv.title,
                answer=conv.closure_summary or conv.content,
                source_conversation=conv,
                created_by=conv.author
            )
            created_count += 1
    
    return Response({'message': f'Generated {created_count} FAQs from resolved questions'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def faq_detail(request, faq_id):
    """Get FAQ and increment view count"""
    try:
        faq = FAQ.objects.get(id=faq_id, organization=request.user.organization)
        faq.view_count += 1
        faq.save(update_fields=['view_count'])
        
        return Response({
            'id': faq.id,
            'question': faq.question,
            'answer': faq.answer,
            'helpful_count': faq.helpful_count,
            'unhelpful_count': faq.unhelpful_count,
            'view_count': faq.view_count,
            'created_at': faq.created_at.isoformat()
        })
    except FAQ.DoesNotExist:
        return Response({'error': 'FAQ not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def faq_feedback(request, faq_id):
    """Rate FAQ as helpful or unhelpful"""
    try:
        faq = FAQ.objects.get(id=faq_id, organization=request.user.organization)
    except FAQ.DoesNotExist:
        return Response({'error': 'FAQ not found'}, status=status.HTTP_404_NOT_FOUND)
    
    is_helpful = request.data.get('is_helpful')
    if is_helpful is None:
        return Response({'error': 'is_helpful required'}, status=status.HTTP_400_BAD_REQUEST)
    
    feedback, created = FAQFeedback.objects.get_or_create(
        faq=faq,
        user=request.user,
        defaults={'is_helpful': is_helpful}
    )
    
    if not created:
        old_helpful = feedback.is_helpful
        feedback.is_helpful = is_helpful
        feedback.save()
        
        if old_helpful and not is_helpful:
            faq.helpful_count -= 1
            faq.unhelpful_count += 1
        elif not old_helpful and is_helpful:
            faq.unhelpful_count -= 1
            faq.helpful_count += 1
    else:
        if is_helpful:
            faq.helpful_count += 1
        else:
            faq.unhelpful_count += 1
    
    faq.save(update_fields=['helpful_count', 'unhelpful_count'])
    
    return Response({'message': 'Feedback recorded'})
