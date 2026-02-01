"""
Unified API Endpoints for Conversations, Decisions, and Knowledge
Implements best practices for context-aware recall
"""
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, action, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, F, Prefetch
from django.utils import timezone
from datetime import timedelta

from .models import Conversation, ConversationReply, ActionItem, Tag, Bookmark, Reaction
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    ConversationCreateSerializer, ConversationUpdateSerializer,
    ActionItemSerializer, ActionItemCreateSerializer, ActionItemUpdateSerializer,
    BookmarkSerializer, ReactionSerializer, TagSerializer, ConversationReplySerializer
)
from .context_manager import ContextManager
from apps.decisions.models import Decision
from apps.organizations.activity import log_activity


class StandardPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


@permission_classes([IsAuthenticated])
@api_view(['GET', 'POST'])
def conversations_list(request):
    """List or create conversations with context"""
    if request.method == 'GET':
        queryset = Conversation.objects.filter(
            organization=request.user.organization,
            is_archived=False,
            is_draft=False
        ).select_related('author', 'owner').prefetch_related('tags', 'mentioned_users')
        
        # Filters
        post_type = request.GET.get('type')
        if post_type:
            queryset = queryset.filter(post_type=post_type)
        
        priority = request.GET.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)
        
        status_label = request.GET.get('status')
        if status_label:
            queryset = queryset.filter(status_label=status_label)
        
        # Search
        search = request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search) |
                Q(ai_summary__icontains=search)
            )
        
        # Sorting
        sort_by = request.GET.get('sort', '-created_at')
        queryset = queryset.order_by(sort_by)
        
        paginator = StandardPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = ConversationListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ConversationCreateSerializer(data=request.data)
        if serializer.is_valid():
            conversation = serializer.save(
                organization=request.user.organization,
                author=request.user
            )
            
            # Parse mentions and tags
            from .mention_parser import parse_mentions_and_tags
            mentioned_users, tags = parse_mentions_and_tags(
                serializer.validated_data.get('content', ''),
                request.user.organization
            )
            conversation.mentioned_users.set(mentioned_users)
            conversation.tags.set(tags)
            
            # Log activity
            log_activity(
                organization=request.user.organization,
                actor=request.user,
                action_type='conversation_created',
                content_object=conversation,
                title=conversation.title,
                post_type=conversation.post_type
            )
            
            # Trigger AI processing
            try:
                from .tasks import process_conversation_ai
                process_conversation_ai.delay(conversation.id)
            except Exception:
                pass
            
            response_serializer = ConversationDetailSerializer(conversation)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@permission_classes([IsAuthenticated])
@api_view(['GET', 'PUT', 'DELETE'])
def conversation_detail(request, conversation_id):
    """Get, update, or delete conversation with full context"""
    try:
        conversation = Conversation.objects.select_related(
            'author', 'owner'
        ).prefetch_related(
            'tags', 'mentioned_users', 'replies', 'action_items'
        ).get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        # Update view count
        Conversation.objects.filter(id=conversation_id).update(
            view_count=F('view_count') + 1
        )
        
        serializer = ConversationDetailSerializer(conversation)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        if conversation.author != request.user:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ConversationUpdateSerializer(
            conversation,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            
            # Clear cache
            ContextManager.get_conversation_context.cache_clear()
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        if conversation.author != request.user:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        conversation.delete()
        return Response({'message': 'Deleted'}, status=status.HTTP_204_NO_CONTENT)


@permission_classes([IsAuthenticated])
@api_view(['GET', 'POST'])
def conversation_replies(request, conversation_id):
    """Get or create replies for conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        replies = ConversationReply.objects.filter(
            conversation=conversation
        ).select_related('author').prefetch_related('mentioned_users')
        
        serializer = ConversationReplySerializer(replies, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        reply = ConversationReply.objects.create(
            conversation=conversation,
            author=request.user,
            content=request.data.get('content'),
            parent_reply_id=request.data.get('parent_reply_id')
        )
        
        # Parse mentions
        from .mention_parser import parse_mentions_and_tags
        mentioned_users, _ = parse_mentions_and_tags(
            request.data.get('content', ''),
            request.user.organization
        )
        reply.mentioned_users.set(mentioned_users)
        
        # Update reply count
        Conversation.objects.filter(id=conversation_id).update(
            reply_count=F('reply_count') + 1
        )
        
        serializer = ConversationReplySerializer(reply)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@permission_classes([IsAuthenticated])
@api_view(['GET'])
def conversation_context(request, conversation_id):
    """Get full context for a conversation"""
    context = ContextManager.get_conversation_context(
        conversation_id,
        request.user.organization_id
    )
    
    if not context:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response(context)


@permission_classes([IsAuthenticated])
@api_view(['GET'])
def conversation_timeline(request, conversation_id):
    """Get timeline of conversation events"""
    timeline = ContextManager.get_conversation_timeline(
        conversation_id,
        request.user.organization_id
    )
    
    if not timeline:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response({'timeline': timeline})


@permission_classes([IsAuthenticated])
@api_view(['GET', 'POST'])
def action_items(request, conversation_id):
    """Get or create action items for conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        items = ActionItem.objects.filter(
            conversation=conversation
        ).select_related('assignee')
        
        serializer = ActionItemSerializer(items, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = ActionItemCreateSerializer(data=request.data)
        if serializer.is_valid():
            item = serializer.save(conversation=conversation)
            response_serializer = ActionItemSerializer(item)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@permission_classes([IsAuthenticated])
@api_view(['PUT', 'DELETE'])
def action_item_detail(request, action_item_id):
    """Update or delete action item"""
    try:
        item = ActionItem.objects.get(id=action_item_id)
    except ActionItem.DoesNotExist:
        return Response(
            {'error': 'Action item not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'PUT':
        serializer = ActionItemUpdateSerializer(item, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        item.delete()
        return Response({'message': 'Deleted'}, status=status.HTTP_204_NO_CONTENT)


@permission_classes([IsAuthenticated])
@api_view(['POST'])
def link_conversation_to_decision(request, conversation_id):
    """Link conversation to a decision"""
    decision_id = request.data.get('decision_id')
    
    if not decision_id:
        return Response(
            {'error': 'decision_id required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    success = ContextManager.link_conversation_to_decision(
        conversation_id,
        decision_id,
        request.user.organization_id
    )
    
    if success:
        return Response({'message': 'Linked successfully'})
    
    return Response(
        {'error': 'Failed to link'},
        status=status.HTTP_400_BAD_REQUEST
    )


@permission_classes([IsAuthenticated])
@api_view(['GET'])
def bookmarks_list(request):
    """Get user's bookmarks"""
    bookmarks = Bookmark.objects.filter(
        user=request.user
    ).select_related('conversation')
    
    serializer = BookmarkSerializer(bookmarks, many=True)
    return Response(serializer.data)


@permission_classes([IsAuthenticated])
@api_view(['POST'])
def create_bookmark(request, conversation_id):
    """Create bookmark for conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    bookmark, created = Bookmark.objects.get_or_create(
        user=request.user,
        conversation=conversation,
        defaults={'note': request.data.get('note', '')}
    )
    
    if not created:
        bookmark.note = request.data.get('note', '')
        bookmark.save()
    
    serializer = BookmarkSerializer(bookmark)
    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )


@permission_classes([IsAuthenticated])
@api_view(['DELETE'])
def delete_bookmark(request, bookmark_id):
    """Delete bookmark"""
    try:
        bookmark = Bookmark.objects.get(id=bookmark_id, user=request.user)
        bookmark.delete()
        return Response({'message': 'Deleted'}, status=status.HTTP_204_NO_CONTENT)
    except Bookmark.DoesNotExist:
        return Response(
            {'error': 'Bookmark not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@permission_classes([IsAuthenticated])
@api_view(['POST'])
def add_reaction(request, conversation_id):
    """Add reaction to conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    reaction_type = request.data.get('reaction_type')
    if reaction_type not in ['agree', 'unsure', 'concern']:
        return Response(
            {'error': 'Invalid reaction type'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    reaction, created = Reaction.objects.update_or_create(
        conversation=conversation,
        user=request.user,
        defaults={'reaction_type': reaction_type}
    )
    
    serializer = ReactionSerializer(reaction)
    return Response(
        serializer.data,
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )


@permission_classes([IsAuthenticated])
@api_view(['GET'])
def conversation_reactions(request, conversation_id):
    """Get reactions for conversation"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    reactions = Reaction.objects.filter(
        conversation=conversation
    ).values('reaction_type').annotate(count=Count('id'))
    
    user_reaction = None
    try:
        user_reaction = Reaction.objects.get(
            conversation=conversation,
            user=request.user
        ).reaction_type
    except Reaction.DoesNotExist:
        pass
    
    return Response({
        'reactions': list(reactions),
        'user_reaction': user_reaction
    })


@permission_classes([IsAuthenticated])
@api_view(['GET'])
def tags_list(request):
    """Get all tags for organization"""
    tags = Tag.objects.filter(
        organization=request.user.organization
    ).order_by('-usage_count')
    
    serializer = TagSerializer(tags, many=True)
    return Response(serializer.data)


@permission_classes([IsAuthenticated])
@api_view(['POST'])
def close_conversation(request, conversation_id):
    """Close conversation with summary"""
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    conversation.is_closed = True
    conversation.closed_at = timezone.now()
    conversation.closure_summary = request.data.get('summary', '')
    conversation.next_steps = request.data.get('next_steps', '')
    conversation.owner_id = request.data.get('owner_id')
    conversation.save()
    
    serializer = ConversationDetailSerializer(conversation)
    return Response(serializer.data)


@permission_classes([IsAuthenticated])
@api_view(['GET'])
def context_summary(request, conversation_id):
    """Get concise context summary"""
    summary = ContextManager.get_context_summary(
        conversation_id,
        request.user.organization_id
    )
    
    if not summary:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    return Response(summary)


@permission_classes([IsAuthenticated])
@api_view(['GET'])
def export_conversation_pdf(request):
    """Export conversation to PDF"""
    conversation_id = request.GET.get('id')
    if not conversation_id:
        return Response(
            {'error': 'id parameter required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            organization=request.user.organization
        )
    except Conversation.DoesNotExist:
        return Response(
            {'error': 'Conversation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Generate PDF content
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#000000',
        spaceAfter=30,
    )
    story.append(Paragraph(conversation.title, title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Metadata
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontSize=10,
        textColor='#666666',
    )
    story.append(Paragraph(f"<b>Author:</b> {conversation.author.username}", meta_style))
    story.append(Paragraph(f"<b>Created:</b> {conversation.created_at.strftime('%Y-%m-%d %H:%M')}", meta_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Content
    content_style = styles['BodyText']
    story.append(Paragraph(conversation.content.replace('\n', '<br/>'), content_style))
    
    doc.build(story)
    buffer.seek(0)
    
    from django.http import FileResponse
    return FileResponse(
        buffer,
        as_attachment=True,
        filename=f"conversation_{conversation_id}.pdf",
        content_type='application/pdf'
    )


@permission_classes([IsAuthenticated])
@api_view(['GET'])
def export_decision_pdf(request):
    """Export decision to PDF"""
    decision_id = request.GET.get('id')
    if not decision_id:
        return Response(
            {'error': 'id parameter required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        decision = Decision.objects.get(
            id=decision_id,
            organization=request.user.organization
        )
    except Decision.DoesNotExist:
        return Response(
            {'error': 'Decision not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Generate PDF content
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#000000',
        spaceAfter=30,
    )
    story.append(Paragraph(decision.title, title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Metadata
    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontSize=10,
        textColor='#666666',
    )
    story.append(Paragraph(f"<b>Status:</b> {decision.status}", meta_style))
    story.append(Paragraph(f"<b>Impact:</b> {decision.impact_level}", meta_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Description
    content_style = styles['BodyText']
    story.append(Paragraph(f"<b>Description:</b>", styles['Heading2']))
    story.append(Paragraph(decision.description.replace('\n', '<br/>'), content_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Rationale
    story.append(Paragraph(f"<b>Rationale:</b>", styles['Heading2']))
    story.append(Paragraph(decision.rationale.replace('\n', '<br/>'), content_style))
    
    doc.build(story)
    buffer.seek(0)
    
    from django.http import FileResponse
    return FileResponse(
        buffer,
        as_attachment=True,
        filename=f"decision_{decision_id}.pdf",
        content_type='application/pdf'
    )
