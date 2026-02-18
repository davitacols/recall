from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .auditlog_models import AuditLog
from django.core.paginator import Paginator

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_logs_list(request):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can view audit logs'}, status=403)
    
    logs = AuditLog.objects.filter(organization=request.user.organization)
    
    # Filters
    action = request.GET.get('action')
    user_id = request.GET.get('user_id')
    resource_type = request.GET.get('resource_type')
    
    if action:
        logs = logs.filter(action=action)
    if user_id:
        logs = logs.filter(user_id=user_id)
    if resource_type:
        logs = logs.filter(resource_type=resource_type)
    
    # Pagination
    page = int(request.GET.get('page', 1))
    paginator = Paginator(logs, 50)
    page_obj = paginator.get_page(page)
    
    data = [{
        'id': log.id,
        'user': log.user.full_name if log.user else 'System',
        'user_id': log.user_id,
        'action': log.action,
        'resource_type': log.resource_type,
        'resource_id': log.resource_id,
        'details': log.details,
        'ip_address': log.ip_address,
        'created_at': log.created_at
    } for log in page_obj]
    
    return Response({
        'results': data,
        'count': paginator.count,
        'page': page,
        'total_pages': paginator.num_pages
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log_stats(request):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can view audit stats'}, status=403)
    
    from django.db.models import Count
    
    logs = AuditLog.objects.filter(organization=request.user.organization)
    
    by_action = logs.values('action').annotate(count=Count('id'))
    by_user = logs.values('user__full_name').annotate(count=Count('id')).order_by('-count')[:10]
    by_resource = logs.values('resource_type').annotate(count=Count('id'))
    
    return Response({
        'by_action': list(by_action),
        'by_user': list(by_user),
        'by_resource': list(by_resource),
        'total': logs.count()
    })
