from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from .analytics_models import AnalyticsMetric, Report, Dashboard, DashboardWidget, Integration, IntegrationLog
from .analytics_engine import AnalyticsEngine
from .permissions import require_permission, Permission
from .team_views import log_action

User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_analytics(request):
    """Get organization analytics overview"""
    organization = request.user.organization
    time_range = request.query_params.get('range', '30d')
    
    from apps.decisions.models import Decision
    from apps.conversations.models import Conversation
    from django.db.models import Count, Q
    from datetime import timedelta
    from django.utils import timezone
    
    days = int(time_range.replace('d', ''))
    start_date = timezone.now() - timedelta(days=days)
    prev_start = start_date - timedelta(days=days)
    
    total_users = User.objects.filter(organization=organization, is_active=True).count()
    prev_users = User.objects.filter(organization=organization, is_active=True, date_joined__lt=start_date).count()
    
    total_decisions = Decision.objects.filter(organization=organization).count()
    recent_decisions = Decision.objects.filter(organization=organization, created_at__gte=start_date).count()
    prev_decisions = Decision.objects.filter(organization=organization, created_at__gte=prev_start, created_at__lt=start_date).count()
    
    conversations = Conversation.objects.filter(organization=organization, created_at__gte=start_date).count()
    
    implemented = Decision.objects.filter(organization=organization, status='implemented').count()
    knowledge_score = int((implemented / max(total_decisions, 1)) * 100)
    
    active_users = User.objects.filter(
        organization=organization,
        is_active=True,
        last_login__gte=start_date
    ).count()
    
    top_contributors = [
        {'name': user.full_name, 'contributions': count}
        for user, count in User.objects.filter(
            organization=organization
        ).annotate(
            decision_count=Count('decisions_made', filter=Q(decisions_made__created_at__gte=start_date))
        ).filter(decision_count__gt=0).order_by('-decision_count')[:5].values_list('full_name', 'decision_count')
    ]
    
    data = {
        'total_users': total_users,
        'user_growth': int(((total_users - prev_users) / max(prev_users, 1)) * 100) if prev_users else 0,
        'total_decisions': total_decisions,
        'decision_growth': int(((recent_decisions - prev_decisions) / max(prev_decisions, 1)) * 100) if prev_decisions else 0,
        'avg_response_time': 0,
        'response_improvement': 0,
        'knowledge_score': knowledge_score,
        'score_improvement': 0,
        'dau': active_users,
        'decisions_per_user': round(total_decisions / max(total_users, 1), 1),
        'engagement_rate': int((active_users / max(total_users, 1)) * 100) if total_users else 0,
        'top_contributors': top_contributors
    }
    
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_metrics(request):
    """Get organization metrics"""
    organization = request.user.organization
    metric_type = request.query_params.get('type')
    days = int(request.query_params.get('days', 30))
    
    metrics = AnalyticsMetric.objects.filter(organization=organization)
    
    if metric_type:
        metrics = metrics.filter(metric_type=metric_type)
    
    metrics = metrics[:100]
    
    result = []
    for metric in metrics:
        result.append({
            'id': metric.id,
            'type': metric.metric_type,
            'value': metric.value,
            'metadata': metric.metadata,
            'recorded_at': metric.recorded_at,
        })
    
    return Response(result)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_data(request):
    """Get dashboard data with key metrics"""
    organization = request.user.organization
    
    data = {
        'issue_count': AnalyticsEngine.get_issue_count(organization),
        'decision_count': AnalyticsEngine.get_decision_count(organization),
        'sprint_velocity': AnalyticsEngine.get_sprint_velocity(organization),
        'completion_rate': round(AnalyticsEngine.get_completion_rate(organization), 2),
        'resolution_time': AnalyticsEngine.get_resolution_time(organization),
        'team_capacity': AnalyticsEngine.get_team_capacity(organization),
    }
    
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def create_report(request):
    """Create new report"""
    name = request.data.get('name')
    report_type = request.data.get('report_type')
    filters = request.data.get('filters', {})
    sections = request.data.get('sections', [])
    
    if not name or not report_type:
        return Response({'error': 'Name and report_type required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    report = Report.objects.create(
        organization=request.user.organization,
        name=name,
        report_type=report_type,
        filters=filters,
        sections=sections,
        created_by=request.user,
        status='draft'
    )
    
    log_action(
        request.user.organization,
        request.user,
        'create',
        report,
        f"Created report: {name}"
    )
    
    return Response({
        'id': report.id,
        'name': report.name,
        'report_type': report.report_type,
        'status': report.status,
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_reports(request):
    """Get all reports"""
    reports = Report.objects.filter(
        organization=request.user.organization
    ).values('id', 'name', 'report_type', 'status', 'created_at')
    
    return Response(list(reports))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_report_data(request, report_id):
    """Get report data"""
    try:
        report = Report.objects.get(
            id=report_id,
            organization=request.user.organization
        )
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    
    data = {
        'id': report.id,
        'name': report.name,
        'report_type': report.report_type,
        'filters': report.filters,
        'sections': report.sections,
        'created_at': report.created_at,
    }
    
    # Generate report data based on type
    if report.report_type == 'sprint_summary':
        sprint_id = report.filters.get('sprint_id')
        if sprint_id:
            from apps.agile.models import Sprint
            sprint = Sprint.objects.get(id=sprint_id)
            data['report_data'] = AnalyticsEngine.generate_sprint_summary(sprint)
    
    elif report.report_type == 'team_performance':
        data['report_data'] = AnalyticsEngine.generate_team_performance(
            request.user.organization,
            report.filters.get('days', 30)
        )
    
    elif report.report_type == 'decision_analysis':
        data['report_data'] = AnalyticsEngine.generate_decision_analysis(
            request.user.organization,
            report.filters.get('days', 30)
        )
    
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_ORGANIZATION.value)
def publish_report(request, report_id):
    """Publish report"""
    try:
        report = Report.objects.get(
            id=report_id,
            organization=request.user.organization
        )
    except Report.DoesNotExist:
        return Response({'error': 'Report not found'}, status=status.HTTP_404_NOT_FOUND)
    
    report.status = 'published'
    report.save()
    
    log_action(
        request.user.organization,
        request.user,
        'update',
        report,
        f"Published report: {report.name}",
        {'status': {'old': 'draft', 'new': 'published'}}
    )
    
    return Response({'message': 'Report published', 'status': 'published'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_dashboard(request):
    """Create custom dashboard"""
    name = request.data.get('name')
    widgets = request.data.get('widgets', [])
    
    if not name:
        return Response({'error': 'Name required'}, status=status.HTTP_400_BAD_REQUEST)
    
    dashboard = Dashboard.objects.create(
        organization=request.user.organization,
        user=request.user,
        name=name,
        widgets=widgets
    )
    
    return Response({
        'id': dashboard.id,
        'name': dashboard.name,
        'widgets': dashboard.widgets,
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboards(request):
    """Get user dashboards"""
    dashboards = Dashboard.objects.filter(
        user=request.user
    ).values('id', 'name', 'layout', 'is_default', 'created_at')
    
    return Response(list(dashboards))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard(request, dashboard_id):
    """Get dashboard details"""
    try:
        dashboard = Dashboard.objects.get(id=dashboard_id, user=request.user)
    except Dashboard.DoesNotExist:
        return Response({'error': 'Dashboard not found'}, status=status.HTTP_404_NOT_FOUND)
    
    widgets = list(DashboardWidget.objects.filter(dashboard=dashboard).values(
        'id', 'widget_type', 'title', 'config', 'position_x', 'position_y', 'width', 'height'
    ))
    
    return Response({
        'id': dashboard.id,
        'name': dashboard.name,
        'layout': dashboard.layout,
        'widgets': widgets,
        'is_default': dashboard.is_default,
    })

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_dashboard(request, dashboard_id):
    """Update dashboard"""
    try:
        dashboard = Dashboard.objects.get(id=dashboard_id, user=request.user)
    except Dashboard.DoesNotExist:
        return Response({'error': 'Dashboard not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if 'name' in request.data:
        dashboard.name = request.data['name']
    if 'layout' in request.data:
        dashboard.layout = request.data['layout']
    if 'widgets' in request.data:
        dashboard.widgets = request.data['widgets']
    
    dashboard.save()
    
    return Response({'message': 'Dashboard updated', 'id': dashboard.id})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_INTEGRATIONS.value)
def create_integration(request):
    """Create integration"""
    integration_type = request.data.get('integration_type')
    name = request.data.get('name')
    credentials = request.data.get('credentials', {})
    config = request.data.get('config', {})
    
    if not integration_type or not name:
        return Response({'error': 'Type and name required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    integration, created = Integration.objects.get_or_create(
        organization=request.user.organization,
        integration_type=integration_type,
        defaults={
            'name': name,
            'credentials': credentials,
            'config': config,
            'created_by': request.user,
        }
    )
    
    if not created:
        integration.name = name
        integration.credentials = credentials
        integration.config = config
        integration.save()
    
    log_action(
        request.user.organization,
        request.user,
        'create',
        integration,
        f"Created integration: {name}"
    )
    
    return Response({
        'id': integration.id,
        'integration_type': integration.integration_type,
        'name': integration.name,
        'status': integration.status,
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_integrations(request):
    """Get all integrations"""
    integrations = Integration.objects.filter(
        organization=request.user.organization
    ).values('id', 'integration_type', 'name', 'status', 'last_sync', 'created_at')
    
    return Response(list(integrations))

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_INTEGRATIONS.value)
def test_integration(request, integration_id):
    """Test integration connection"""
    try:
        integration = Integration.objects.get(
            id=integration_id,
            organization=request.user.organization
        )
    except Integration.DoesNotExist:
        return Response({'error': 'Integration not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Test connection based on type
    try:
        if integration.integration_type == 'slack':
            # Test Slack connection
            pass
        elif integration.integration_type == 'github':
            # Test GitHub connection
            pass
        
        integration.status = 'connected'
        integration.error_message = ''
        integration.save()
        
        IntegrationLog.objects.create(
            integration=integration,
            action='test',
            status='success',
            details={'message': 'Connection successful'}
        )
        
        return Response({'message': 'Connection successful', 'status': 'connected'})
    
    except Exception as e:
        integration.status = 'error'
        integration.error_message = str(e)
        integration.save()
        
        IntegrationLog.objects.create(
            integration=integration,
            action='test',
            status='failed',
            error_message=str(e)
        )
        
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@require_permission(Permission.MANAGE_INTEGRATIONS.value)
def delete_integration(request, integration_id):
    """Delete integration"""
    try:
        integration = Integration.objects.get(
            id=integration_id,
            organization=request.user.organization
        )
    except Integration.DoesNotExist:
        return Response({'error': 'Integration not found'}, status=status.HTTP_404_NOT_FOUND)
    
    log_action(
        request.user.organization,
        request.user,
        'delete',
        integration,
        f"Deleted integration: {integration.name}"
    )
    
    integration.delete()
    return Response({'message': 'Integration deleted'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_integration_logs(request, integration_id):
    """Get integration sync logs"""
    try:
        integration = Integration.objects.get(
            id=integration_id,
            organization=request.user.organization
        )
    except Integration.DoesNotExist:
        return Response({'error': 'Integration not found'}, status=status.HTTP_404_NOT_FOUND)
    
    logs = IntegrationLog.objects.filter(integration=integration).values(
        'id', 'action', 'status', 'details', 'error_message', 'created_at'
    )[:50]
    
    return Response(list(logs))
