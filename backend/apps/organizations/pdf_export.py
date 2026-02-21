from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from io import BytesIO
from apps.business.document_models import Document
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_document_pdf(request, pk):
    try:
        document = Document.objects.get(pk=pk, organization=request.user.organization)
    except Document.DoesNotExist:
        return Response({'error': 'Document not found'}, status=status.HTTP_404_NOT_FOUND)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor='#1a1a1a',
        spaceAfter=30,
        alignment=TA_CENTER
    )
    story.append(Paragraph(document.title, title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Metadata
    meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=10, textColor='#666666')
    story.append(Paragraph(f"Type: {document.get_document_type_display()}", meta_style))
    story.append(Paragraph(f"Version: {document.version}", meta_style))
    story.append(Paragraph(f"Created: {document.created_at.strftime('%Y-%m-%d')}", meta_style))
    if document.created_by:
        story.append(Paragraph(f"Author: {document.created_by.full_name}", meta_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Description
    if document.description:
        story.append(Paragraph(document.description, styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
    
    # Content
    if document.content:
        for para in document.content.split('\n\n'):
            if para.strip():
                story.append(Paragraph(para.replace('\n', '<br/>'), styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
    
    doc.build(story)
    buffer.seek(0)
    
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{document.title}.pdf"'
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_conversation_pdf(request, pk):
    try:
        conversation = Conversation.objects.get(pk=pk, organization=request.user.organization)
    except Conversation.DoesNotExist:
        return Response({'error': 'Conversation not found'}, status=status.HTTP_404_NOT_FOUND)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=20, spaceAfter=20)
    story.append(Paragraph(conversation.title, title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Metadata
    meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=10, textColor='#666666')
    story.append(Paragraph(f"Author: {conversation.author.full_name}", meta_style))
    story.append(Paragraph(f"Created: {conversation.created_at.strftime('%Y-%m-%d %H:%M')}", meta_style))
    story.append(Paragraph(f"Type: {conversation.get_post_type_display()}", meta_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Content
    for para in conversation.content.split('\n\n'):
        if para.strip():
            story.append(Paragraph(para.replace('\n', '<br/>'), styles['Normal']))
            story.append(Spacer(1, 0.1*inch))
    
    # AI Summary
    if conversation.ai_summary:
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("<b>AI Summary:</b>", styles['Heading2']))
        story.append(Paragraph(conversation.ai_summary, styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{conversation.title}.pdf"'
    return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_decision_pdf(request, pk):
    try:
        decision = Decision.objects.get(pk=pk, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=status.HTTP_404_NOT_FOUND)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=20, spaceAfter=20)
    story.append(Paragraph(decision.title, title_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Metadata
    meta_style = ParagraphStyle('Meta', parent=styles['Normal'], fontSize=10, textColor='#666666')
    story.append(Paragraph(f"Status: {decision.get_status_display()}", meta_style))
    story.append(Paragraph(f"Type: {decision.get_decision_type_display()}", meta_style))
    if decision.decision_maker:
        story.append(Paragraph(f"Decision Maker: {decision.decision_maker.full_name}", meta_style))
    story.append(Paragraph(f"Created: {decision.created_at.strftime('%Y-%m-%d')}", meta_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Description
    if decision.description:
        story.append(Paragraph("<b>Description:</b>", styles['Heading2']))
        for para in decision.description.split('\n\n'):
            if para.strip():
                story.append(Paragraph(para.replace('\n', '<br/>'), styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
    
    # Context
    if decision.context:
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("<b>Context:</b>", styles['Heading2']))
        story.append(Paragraph(decision.context, styles['Normal']))
    
    # Outcome
    if decision.outcome:
        story.append(Spacer(1, 0.2*inch))
        story.append(Paragraph("<b>Outcome:</b>", styles['Heading2']))
        story.append(Paragraph(decision.outcome, styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{decision.title}.pdf"'
    return response

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def export_bulk_pdf(request):
    """Export multiple items to a single PDF"""
    item_type = request.data.get('type')  # 'documents', 'conversations', 'decisions'
    ids = request.data.get('ids', [])
    
    if not ids:
        return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75*inch, bottomMargin=0.75*inch)
    story = []
    styles = getSampleStyleSheet()
    
    if item_type == 'documents':
        documents = Document.objects.filter(id__in=ids, organization=request.user.organization)
        for document in documents:
            story.append(Paragraph(document.title, styles['Heading1']))
            story.append(Spacer(1, 0.2*inch))
            if document.content:
                for para in document.content.split('\n\n'):
                    if para.strip():
                        story.append(Paragraph(para.replace('\n', '<br/>'), styles['Normal']))
            story.append(PageBreak())
    
    elif item_type == 'conversations':
        conversations = Conversation.objects.filter(id__in=ids, organization=request.user.organization)
        for conv in conversations:
            story.append(Paragraph(conv.title, styles['Heading1']))
            story.append(Spacer(1, 0.2*inch))
            for para in conv.content.split('\n\n'):
                if para.strip():
                    story.append(Paragraph(para.replace('\n', '<br/>'), styles['Normal']))
            story.append(PageBreak())
    
    elif item_type == 'decisions':
        decisions = Decision.objects.filter(id__in=ids, organization=request.user.organization)
        for decision in decisions:
            story.append(Paragraph(decision.title, styles['Heading1']))
            story.append(Spacer(1, 0.2*inch))
            if decision.description:
                for para in decision.description.split('\n\n'):
                    if para.strip():
                        story.append(Paragraph(para.replace('\n', '<br/>'), styles['Normal']))
            story.append(PageBreak())
    
    doc.build(story)
    buffer.seek(0)
    
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="export.pdf"'
    return response
