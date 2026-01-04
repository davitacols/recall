from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .automation_models import AutomationRule, AutomationAction, AutomationExecution, AutomationTemplate
from .permissions import require_permission, Permission
from .team_views import log_action

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_automation_rules(request):
    """Get all automation rules"""
    rules = AutomationRule.objects.filter(
        organization=request.user.organization
    ).values('id', 'name', 'trigger_type', 'status', 'created_at')
    
    return Response(list(rules))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def create_automation_rule(request):
    """Create new automation rule"""
    name = request.data.get('name')
    trigger_type = request.data.get('trigger_type')
    trigger_conditions = request.data.get('trigger_conditions', {})
    actions = request.data.get('actions', [])
    
    if not name or not trigger_type:
        return Response({'error': 'Name and trigger_type required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    rule = AutomationRule.objects.create(
        organization=request.user.organization,
        name=name,
        trigger_type=trigger_type,
        trigger_conditions=trigger_conditions,
        created_by=request.user,
        status='draft'
    )
    
    # Create actions
    for idx, action in enumerate(actions):
        AutomationAction.objects.create(
            rule=rule,
            action_type=action.get('type'),
            config=action.get('config', {}),
            order=idx
        )
    
    log_action(
        request.user.organization,
        request.user,
        'create',
        rule,
        f"Created automation rule: {name}"
    )
    
    return Response({
        'id': rule.id,
        'name': rule.name,
        'trigger_type': rule.trigger_type,
        'status': rule.status,
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def activate_automation_rule(request, rule_id):
    """Activate automation rule"""
    try:
        rule = AutomationRule.objects.get(
            id=rule_id,
            organization=request.user.organization
        )
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)
    
    rule.status = 'active'
    rule.save()
    
    log_action(
        request.user.organization,
        request.user,
        'update',
        rule,
        f"Activated rule: {rule.name}",
        {'status': {'old': 'draft', 'new': 'active'}}
    )
    
    return Response({'message': 'Rule activated', 'status': 'active'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def pause_automation_rule(request, rule_id):
    """Pause automation rule"""
    try:
        rule = AutomationRule.objects.get(
            id=rule_id,
            organization=request.user.organization
        )
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)
    
    old_status = rule.status
    rule.status = 'paused'
    rule.save()
    
    log_action(
        request.user.organization,
        request.user,
        'update',
        rule,
        f"Paused rule: {rule.name}",
        {'status': {'old': old_status, 'new': 'paused'}}
    )
    
    return Response({'message': 'Rule paused', 'status': 'paused'})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def delete_automation_rule(request, rule_id):
    """Delete automation rule"""
    try:
        rule = AutomationRule.objects.get(
            id=rule_id,
            organization=request.user.organization
        )
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)
    
    log_action(
        request.user.organization,
        request.user,
        'delete',
        rule,
        f"Deleted rule: {rule.name}"
    )
    
    rule.delete()
    return Response({'message': 'Rule deleted'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_automation_executions(request, rule_id):
    """Get execution history for a rule"""
    try:
        rule = AutomationRule.objects.get(
            id=rule_id,
            organization=request.user.organization
        )
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)
    
    executions = AutomationExecution.objects.filter(rule=rule).values(
        'id', 'status', 'triggered_by__username', 'results', 'created_at', 'completed_at'
    )[:100]
    
    return Response(list(executions))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_automation_templates(request):
    """Get automation templates"""
    category = request.query_params.get('category')
    
    templates = AutomationTemplate.objects.all()
    if category:
        templates = templates.filter(category=category)
    
    return Response(list(templates.values(
        'id', 'name', 'description', 'category', 'trigger_type'
    )))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def create_rule_from_template(request, template_id):
    """Create automation rule from template"""
    try:
        template = AutomationTemplate.objects.get(id=template_id)
    except AutomationTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
    
    name = request.data.get('name', template.name)
    
    rule = AutomationRule.objects.create(
        organization=request.user.organization,
        name=name,
        trigger_type=template.trigger_type,
        trigger_conditions=template.trigger_conditions,
        created_by=request.user,
        status='draft'
    )
    
    # Create actions from template
    for idx, action in enumerate(template.actions):
        AutomationAction.objects.create(
            rule=rule,
            action_type=action.get('type'),
            config=action.get('config', {}),
            order=idx
        )
    
    log_action(
        request.user.organization,
        request.user,
        'create',
        rule,
        f"Created rule from template: {template.name}"
    )
    
    return Response({
        'id': rule.id,
        'name': rule.name,
        'trigger_type': rule.trigger_type,
        'status': rule.status,
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rule_details(request, rule_id):
    """Get detailed rule information"""
    try:
        rule = AutomationRule.objects.get(
            id=rule_id,
            organization=request.user.organization
        )
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)
    
    actions = list(AutomationAction.objects.filter(rule=rule).values(
        'id', 'action_type', 'config', 'order'
    ))
    
    return Response({
        'id': rule.id,
        'name': rule.name,
        'description': rule.description,
        'trigger_type': rule.trigger_type,
        'trigger_conditions': rule.trigger_conditions,
        'actions': actions,
        'status': rule.status,
        'created_at': rule.created_at,
        'updated_at': rule.updated_at,
    })

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def update_automation_rule(request, rule_id):
    """Update automation rule"""
    try:
        rule = AutomationRule.objects.get(
            id=rule_id,
            organization=request.user.organization
        )
    except AutomationRule.DoesNotExist:
        return Response({'error': 'Rule not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if 'name' in request.data:
        rule.name = request.data['name']
    if 'description' in request.data:
        rule.description = request.data['description']
    if 'trigger_conditions' in request.data:
        rule.trigger_conditions = request.data['trigger_conditions']
    
    rule.save()
    
    # Update actions if provided
    if 'actions' in request.data:
        AutomationAction.objects.filter(rule=rule).delete()
        for idx, action in enumerate(request.data['actions']):
            AutomationAction.objects.create(
                rule=rule,
                action_type=action.get('type'),
                config=action.get('config', {}),
                order=idx
            )
    
    log_action(
        request.user.organization,
        request.user,
        'update',
        rule,
        f"Updated rule: {rule.name}"
    )
    
    return Response({'message': 'Rule updated', 'id': rule.id})
