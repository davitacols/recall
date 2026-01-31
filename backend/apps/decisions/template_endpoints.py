from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from apps.decisions.template_models import DecisionTemplate

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def templates_list(request):
    """List templates or create new template"""
    if request.method == 'GET':
        template_type = request.GET.get('type')
        templates = DecisionTemplate.objects.filter(organization=request.user.organization)
        
        if template_type:
            templates = templates.filter(template_type=template_type)
        
        return Response([{
            'id': t.id,
            'name': t.name,
            'type': t.template_type,
            'description': t.description,
            'fields_count': len(t.fields),
            'created_by': t.created_by.get_full_name(),
            'created_at': t.created_at.isoformat()
        } for t in templates])
    
    # POST - Create template
    template = DecisionTemplate.objects.create(
        organization=request.user.organization,
        name=request.data['name'],
        template_type=request.data.get('type', 'custom'),
        description=request.data.get('description', ''),
        fields=request.data.get('fields', []),
        created_by=request.user
    )
    
    return Response({'id': template.id, 'name': template.name})

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def template_detail(request, template_id):
    """Get, update, or delete template"""
    try:
        template = DecisionTemplate.objects.get(id=template_id, organization=request.user.organization)
    except DecisionTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=404)
    
    if request.method == 'GET':
        return Response({
            'id': template.id,
            'name': template.name,
            'type': template.template_type,
            'description': template.description,
            'fields': template.fields,
            'created_by': template.created_by.get_full_name(),
            'created_at': template.created_at.isoformat()
        })
    
    if request.method == 'PUT':
        template.name = request.data.get('name', template.name)
        template.description = request.data.get('description', template.description)
        template.fields = request.data.get('fields', template.fields)
        template.save()
        return Response({'message': 'Template updated'})
    
    if request.method == 'DELETE':
        template.delete()
        return Response({'message': 'Template deleted'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def default_templates(request):
    """Get default templates for organization"""
    return Response({
        'templates': [
            {
                'name': 'Technical Decision',
                'type': 'technical',
                'fields': [
                    {'name': 'problem', 'label': 'Problem Statement', 'type': 'text', 'required': True},
                    {'name': 'options', 'label': 'Options Considered', 'type': 'textarea', 'required': True},
                    {'name': 'chosen', 'label': 'Chosen Option', 'type': 'text', 'required': True},
                    {'name': 'rationale', 'label': 'Rationale', 'type': 'textarea', 'required': True},
                    {'name': 'tradeoffs', 'label': 'Trade-offs', 'type': 'textarea', 'required': False},
                ]
            },
            {
                'name': 'Process Decision',
                'type': 'process',
                'fields': [
                    {'name': 'current_process', 'label': 'Current Process', 'type': 'textarea', 'required': True},
                    {'name': 'issue', 'label': 'Issue with Current Process', 'type': 'textarea', 'required': True},
                    {'name': 'new_process', 'label': 'New Process', 'type': 'textarea', 'required': True},
                    {'name': 'impact', 'label': 'Expected Impact', 'type': 'textarea', 'required': True},
                ]
            },
            {
                'name': 'Budget Decision',
                'type': 'budget',
                'fields': [
                    {'name': 'amount', 'label': 'Budget Amount', 'type': 'number', 'required': True},
                    {'name': 'purpose', 'label': 'Purpose', 'type': 'textarea', 'required': True},
                    {'name': 'justification', 'label': 'Justification', 'type': 'textarea', 'required': True},
                    {'name': 'expected_roi', 'label': 'Expected ROI', 'type': 'text', 'required': False},
                ]
            },
        ]
    })
