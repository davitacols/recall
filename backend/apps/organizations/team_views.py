from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from .models import Organization
from .permissions import require_permission, Permission, get_user_permissions
from .workflow_models import AuditLog, TeamWorkflow, WorkflowInstance, WorkflowApproval

User = get_user_model()

def log_action(organization, user, action, obj, description, changes=None):
    """Log an action to audit log"""
    content_type = ContentType.objects.get_for_model(obj)
    AuditLog.objects.create(
        organization=organization,
        user=user,
        action=action,
        content_type=content_type,
        object_id=obj.id,
        description=description,
        changes=changes or {}
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_members(request):
    """Get all team members with their roles and permissions"""
    organization = request.user.organization
    members = User.objects.filter(organization=organization).values(
        'id', 'username', 'email', 'full_name', 'role', 'last_active'
    )
    
    result = []
    for member in members:
        member['permissions'] = get_user_permissions(
            User.objects.get(id=member['id'])
        )
        result.append(member)
    
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_role_info(request, user_id):
    """Get detailed role and permission info for a user"""
    try:
        user = User.objects.get(id=user_id, organization=request.user.organization)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'full_name': user.full_name,
        'role': user.role,
        'permissions': get_user_permissions(user),
        'last_active': user.last_active,
        'joined_at': user.date_joined,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.CHANGE_USER_ROLE.value)
def change_user_role(request, user_id):
    """Change a user's role"""
    try:
        user = User.objects.get(id=user_id, organization=request.user.organization)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    new_role = request.data.get('role')
    if new_role not in ['admin', 'manager', 'contributor']:
        return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)
    
    old_role = user.role
    user.role = new_role
    user.save()
    
    log_action(
        request.user.organization,
        request.user,
        'role_change',
        user,
        f"Changed role from {old_role} to {new_role}",
        {'role': {'old': old_role, 'new': new_role}}
    )
    
    return Response({
        'message': 'Role updated',
        'user_id': user.id,
        'new_role': new_role,
        'permissions': get_user_permissions(user)
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.REMOVE_USERS.value)
def remove_user(request, user_id):
    """Remove a user from organization"""
    try:
        user = User.objects.get(id=user_id, organization=request.user.organization)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if user.id == request.user.id:
        return Response({'error': 'Cannot remove yourself'}, status=status.HTTP_400_BAD_REQUEST)
    
    log_action(
        request.user.organization,
        request.user,
        'remove',
        user,
        f"Removed user {user.email} from organization"
    )
    
    user.delete()
    return Response({'message': 'User removed'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.VIEW_AUDIT_LOG.value)
def get_audit_logs(request):
    """Get audit logs for organization"""
    organization = request.user.organization
    
    # Filters
    action = request.query_params.get('action')
    user_id = request.query_params.get('user_id')
    days = int(request.query_params.get('days', 30))
    
    logs = AuditLog.objects.filter(organization=organization)
    
    if action:
        logs = logs.filter(action=action)
    if user_id:
        logs = logs.filter(user_id=user_id)
    
    # Last N days
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(days=days)
    logs = logs.filter(created_at__gte=cutoff)
    
    logs = logs[:1000]  # Limit to 1000 most recent
    
    result = []
    for log in logs:
        result.append({
            'id': log.id,
            'action': log.action,
            'user': log.user.username if log.user else 'System',
            'description': log.description,
            'changes': log.changes,
            'created_at': log.created_at,
            'object_type': log.content_type.model,
        })
    
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_activity(request, user_id):
    """Get activity log for a specific user"""
    try:
        user = User.objects.get(id=user_id, organization=request.user.organization)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    logs = AuditLog.objects.filter(
        organization=request.user.organization,
        user=user
    )[:100]
    
    result = []
    for log in logs:
        result.append({
            'id': log.id,
            'action': log.action,
            'description': log.description,
            'created_at': log.created_at,
            'object_type': log.content_type.model,
        })
    
    return Response(result)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def create_team_workflow(request):
    """Create a new team workflow"""
    name = request.data.get('name')
    workflow_type = request.data.get('workflow_type')
    stages = request.data.get('stages', [])
    approver_ids = request.data.get('approver_ids', [])
    
    if not name or not workflow_type:
        return Response({'error': 'Name and workflow_type required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    workflow = TeamWorkflow.objects.create(
        organization=request.user.organization,
        name=name,
        workflow_type=workflow_type,
        stages=stages,
        created_by=request.user,
        status='draft'
    )
    
    # Add approvers
    if approver_ids:
        approvers = User.objects.filter(
            id__in=approver_ids,
            organization=request.user.organization
        )
        workflow.approvers.set(approvers)
    
    log_action(
        request.user.organization,
        request.user,
        'create',
        workflow,
        f"Created workflow: {name}"
    )
    
    return Response({
        'id': workflow.id,
        'name': workflow.name,
        'workflow_type': workflow.workflow_type,
        'status': workflow.status,
        'stages': workflow.stages,
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def activate_workflow(request, workflow_id):
    """Activate a workflow"""
    try:
        workflow = TeamWorkflow.objects.get(
            id=workflow_id,
            organization=request.user.organization
        )
    except TeamWorkflow.DoesNotExist:
        return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)
    
    workflow.status = 'active'
    workflow.save()
    
    log_action(
        request.user.organization,
        request.user,
        'update',
        workflow,
        f"Activated workflow: {workflow.name}",
        {'status': {'old': 'draft', 'new': 'active'}}
    )
    
    return Response({'message': 'Workflow activated', 'status': 'active'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_workflows(request):
    """Get all team workflows"""
    workflows = TeamWorkflow.objects.filter(
        organization=request.user.organization
    ).values('id', 'name', 'workflow_type', 'status', 'created_at')
    
    return Response(list(workflows))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_workflow_instances(request, workflow_id):
    """Get instances of a workflow"""
    try:
        workflow = TeamWorkflow.objects.get(
            id=workflow_id,
            organization=request.user.organization
        )
    except TeamWorkflow.DoesNotExist:
        return Response({'error': 'Workflow not found'}, status=status.HTTP_404_NOT_FOUND)
    
    instances = WorkflowInstance.objects.filter(workflow=workflow).values(
        'id', 'status', 'current_stage', 'created_at', 'completed_at'
    )
    
    return Response(list(instances))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_workflow_step(request, instance_id):
    """Approve a workflow step"""
    try:
        instance = WorkflowInstance.objects.get(id=instance_id)
    except WorkflowInstance.DoesNotExist:
        return Response({'error': 'Workflow instance not found'}, 
                       status=status.HTTP_404_NOT_FOUND)
    
    comment = request.data.get('comment', '')
    
    # Get current approval
    try:
        approval = WorkflowApproval.objects.get(
            workflow_instance=instance,
            stage_index=instance.current_stage,
            approver=request.user
        )
    except WorkflowApproval.DoesNotExist:
        return Response({'error': 'No approval required from you'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    approval.status = 'approved'
    approval.comment = comment
    approval.decided_at = timezone.now()
    approval.save()
    
    # Check if all approvals for this stage are done
    pending = WorkflowApproval.objects.filter(
        workflow_instance=instance,
        stage_index=instance.current_stage,
        status='pending'
    ).count()
    
    if pending == 0:
        # Move to next stage
        if instance.current_stage < len(instance.workflow.stages) - 1:
            instance.current_stage += 1
            instance.status = 'in_progress'
        else:
            instance.status = 'completed'
            instance.completed_at = timezone.now()
        instance.save()
    
    return Response({'message': 'Approval recorded', 'instance_status': instance.status})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_workflow_step(request, instance_id):
    """Reject a workflow step"""
    try:
        instance = WorkflowInstance.objects.get(id=instance_id)
    except WorkflowInstance.DoesNotExist:
        return Response({'error': 'Workflow instance not found'}, 
                       status=status.HTTP_404_NOT_FOUND)
    
    comment = request.data.get('comment', '')
    
    try:
        approval = WorkflowApproval.objects.get(
            workflow_instance=instance,
            stage_index=instance.current_stage,
            approver=request.user
        )
    except WorkflowApproval.DoesNotExist:
        return Response({'error': 'No approval required from you'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    approval.status = 'rejected'
    approval.comment = comment
    approval.decided_at = timezone.now()
    approval.save()
    
    instance.status = 'rejected'
    instance.save()
    
    return Response({'message': 'Workflow rejected', 'instance_status': 'rejected'})
