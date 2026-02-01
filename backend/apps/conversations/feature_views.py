from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.conversations.feature_models import Favorite, BulkAction, TrendingTopic
from apps.conversations.feature_services import (
    FavoriteService, BulkActionService, EmailDigestService,
    AuditTrailService, TrendingService, UndoRedoService
)
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO

class FavoriteViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def my_favorites(self, request):
        favorites = FavoriteService.get_user_favorites(request.user)
        return Response({
            'conversations': [f.conversation.id for f in favorites if f.conversation],
            'decisions': [f.decision.id for f in favorites if f.decision]
        })
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        conv_id = request.data.get('conversation_id')
        dec_id = request.data.get('decision_id')
        
        if conv_id:
            conv = Conversation.objects.get(id=conv_id)
            is_favorite = FavoriteService.toggle_favorite(request.user, conversation=conv)
        elif dec_id:
            dec = Decision.objects.get(id=dec_id)
            is_favorite = FavoriteService.toggle_favorite(request.user, decision=dec)
        
        return Response({'is_favorite': is_favorite})

class BulkActionViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def execute(self, request):
        action_type = request.data.get('action_type')
        item_ids = request.data.get('item_ids', [])
        changes = request.data.get('changes', {})
        
        bulk_action = BulkActionService.create_bulk_action(
            request.user.organization,
            request.user,
            action_type,
            item_ids,
            changes
        )
        
        BulkActionService.execute_bulk_action(bulk_action)
        
        return Response({
            'id': bulk_action.id,
            'status': bulk_action.status,
            'items_count': len(item_ids)
        })

class ExportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def conversation_pdf(self, request):
        conv_id = request.query_params.get('id')
        conv = Conversation.objects.get(id=conv_id)
        
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 750, conv.title)
        
        p.setFont("Helvetica", 10)
        p.drawString(50, 730, f"Author: {conv.author.get_full_name()}")
        p.drawString(50, 715, f"Created: {conv.created_at.strftime('%Y-%m-%d')}")
        
        p.setFont("Helvetica", 11)
        y = 690
        for line in conv.content.split('\n')[:30]:
            p.drawString(50, y, line[:80])
            y -= 15
        
        p.save()
        buffer.seek(0)
        
        return FileResponse(buffer, as_attachment=True, filename=f"conversation_{conv_id}.pdf")
    
    @action(detail=False, methods=['get'])
    def decision_pdf(self, request):
        dec_id = request.query_params.get('id')
        dec = Decision.objects.get(id=dec_id)
        
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        
        p.setFont("Helvetica-Bold", 16)
        p.drawString(50, 750, dec.title)
        
        p.setFont("Helvetica", 10)
        p.drawString(50, 730, f"Status: {dec.get_status_display()}")
        p.drawString(50, 715, f"Decision Maker: {dec.decision_maker.get_full_name()}")
        
        p.setFont("Helvetica", 11)
        y = 690
        for line in dec.description.split('\n')[:30]:
            p.drawString(50, y, line[:80])
            y -= 15
        
        p.save()
        buffer.seek(0)
        
        return FileResponse(buffer, as_attachment=True, filename=f"decision_{dec_id}.pdf")

class EmailDigestViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def preview(self, request):
        frequency = request.query_params.get('frequency', 'weekly')
        content = EmailDigestService.get_digest_content(request.user, frequency)
        return Response(content)
    
    @action(detail=False, methods=['post'])
    def update_settings(self, request):
        digest, _ = request.user.email_digest.objects.get_or_create(user=request.user)
        digest.enabled = request.data.get('enabled', digest.enabled)
        digest.frequency = request.data.get('frequency', digest.frequency)
        digest.save()
        return Response({'status': 'updated'})

class TrendingViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def topics(self, request):
        TrendingService.update_trending_topics(request.user.organization)
        topics = TrendingService.get_trending_topics(request.user.organization)
        return Response([{
            'topic': t.topic,
            'mentions': t.mention_count,
            'trend_score': t.trend_score
        } for t in topics])

class UndoRedoViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def undo(self, request):
        action = UndoRedoService.undo(request.user.id)
        return Response({'action': action})
    
    @action(detail=False, methods=['post'])
    def redo(self, request):
        action = UndoRedoService.redo(request.user.id)
        return Response({'action': action})

class CommentThreadViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def create_thread(self, request):
        from apps.conversations.models import ConversationReply
        
        conv_id = request.data.get('conversation_id')
        content = request.data.get('content')
        parent_id = request.data.get('parent_id')
        
        conv = Conversation.objects.get(id=conv_id)
        parent = None
        if parent_id:
            parent = ConversationReply.objects.get(id=parent_id)
        
        reply = ConversationReply.objects.create(
            conversation=conv,
            author=request.user,
            content=content,
            parent_reply=parent
        )
        
        return Response({
            'id': reply.id,
            'content': reply.content,
            'author': reply.author.get_full_name(),
            'created_at': reply.created_at
        })
    
    @action(detail=False, methods=['get'])
    def thread(self, request):
        reply_id = request.query_params.get('id')
        from apps.conversations.models import ConversationReply
        
        reply = ConversationReply.objects.get(id=reply_id)
        threads = ConversationReply.objects.filter(parent_reply=reply).order_by('created_at')
        
        return Response([{
            'id': t.id,
            'content': t.content,
            'author': t.author.get_full_name(),
            'created_at': t.created_at
        } for t in threads])

class DecisionReminderViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def set_reminder(self, request):
        from apps.decisions.models import Decision
        
        dec_id = request.data.get('decision_id')
        days = request.data.get('days', 30)
        
        dec = Decision.objects.get(id=dec_id)
        dec.reminder_enabled = True
        dec.reminder_days = days
        dec.save()
        
        return Response({'status': 'reminder_set'})

class ConversationMergeViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def merge(self, request):
        source_id = request.data.get('source_id')
        target_id = request.data.get('target_id')
        
        source = Conversation.objects.get(id=source_id)
        target = Conversation.objects.get(id=target_id)
        
        # Move replies from source to target
        from apps.conversations.models import ConversationReply
        ConversationReply.objects.filter(conversation=source).update(conversation=target)
        
        # Update target content
        target.content += f"\n\n--- Merged from: {source.title} ---\n{source.content}"
        target.save()
        
        # Archive source
        source.is_archived = True
        source.save()
        
        return Response({'status': 'merged', 'target_id': target.id})
