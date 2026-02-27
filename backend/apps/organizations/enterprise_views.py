from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from .enterprise_models import (
    SSOConfig,
    AccountManager,
    TrainingProgram,
    SLAGuarantee,
    OnPremiseDeployment,
    CompliancePolicy,
    MarketplaceApp,
    InstalledMarketplaceApp,
    RolePermissionPolicy,
    EnterpriseIncident,
    ProjectPermissionScope,
    SLARule,
    IncidentEscalationRule,
    EnterpriseIncidentEscalation,
)
from .auditlog_models import AuditLog
from .permissions import Permission, ROLE_PERMISSIONS
from apps.agile.models import Project, Sprint, Issue, Blocker, DecisionImpact
from apps.notifications.utils import create_notification
from apps.business.models import Task
from apps.conversations.models import Conversation

@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def sso_config(request):
    """Get or configure SSO settings"""
    org = request.user.organization
    
    if request.method == 'GET':
        try:
            config = SSOConfig.objects.get(organization=org)
            return Response({
                'id': config.id,
                'provider': config.provider,
                'enabled': config.enabled,
                'entity_id': config.entity_id,
                'sso_url': config.sso_url,
                'auto_provision_users': config.auto_provision_users,
                'default_role': config.default_role,
            })
        except SSOConfig.DoesNotExist:
            return Response({'enabled': False})
    
    elif request.method in ['POST', 'PUT']:
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        config, created = SSOConfig.objects.get_or_create(organization=org)
        config.provider = request.data.get('provider', config.provider)
        config.enabled = request.data.get('enabled', config.enabled)
        config.entity_id = request.data.get('entity_id', config.entity_id)
        config.sso_url = request.data.get('sso_url', config.sso_url)
        config.x509_cert = request.data.get('x509_cert', config.x509_cert)
        config.auto_provision_users = request.data.get('auto_provision_users', config.auto_provision_users)
        config.default_role = request.data.get('default_role', config.default_role)
        config.save()
        
        return Response({'message': 'SSO configuration saved', 'id': config.id})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_manager_info(request):
    """Get account manager information"""
    org = request.user.organization
    
    try:
        manager = org.account_manager.first()
        if manager:
            return Response({
                'name': manager.user.full_name,
                'email': manager.user.email,
                'phone': manager.phone,
                'timezone': manager.timezone,
                'availability': manager.availability,
            })
    except:
        pass
    
    return Response({'message': 'No account manager assigned'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def training_programs(request):
    """List or create training programs"""
    org = request.user.organization
    
    if request.method == 'GET':
        programs = TrainingProgram.objects.filter(organization=org).order_by('-training_date')
        return Response([{
            'id': p.id,
            'title': p.title,
            'description': p.description,
            'training_date': p.training_date,
            'duration_hours': p.duration_hours,
            'location': p.location,
            'status': p.status,
            'trainer': p.trainer.full_name if p.trainer else None,
            'attendee_count': p.attendees.count(),
            'materials_url': p.materials_url,
            'recording_url': p.recording_url,
        } for p in programs])
    
    elif request.method == 'POST':
        if request.user.role not in ['admin', 'manager']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        program = TrainingProgram.objects.create(
            organization=org,
            title=request.data['title'],
            description=request.data.get('description', ''),
            training_date=request.data['training_date'],
            duration_hours=request.data.get('duration_hours', 2),
            location=request.data.get('location', ''),
            status=request.data.get('status', 'scheduled'),
        )
        
        return Response({'message': 'Training program created', 'id': program.id}, status=status.HTTP_201_CREATED)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def training_program_detail(request, pk):
    """Update training program"""
    program = get_object_or_404(TrainingProgram, pk=pk, organization=request.user.organization)
    
    if request.user.role not in ['admin', 'manager']:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    program.status = request.data.get('status', program.status)
    program.materials_url = request.data.get('materials_url', program.materials_url)
    program.recording_url = request.data.get('recording_url', program.recording_url)
    program.save()
    
    # Add attendees
    if 'attendee_ids' in request.data:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        attendees = User.objects.filter(id__in=request.data['attendee_ids'], organization=request.user.organization)
        program.attendees.set(attendees)
    
    return Response({'message': 'Training program updated'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sla_guarantees(request):
    """List SLA guarantees and performance"""
    org = request.user.organization
    
    guarantees = SLAGuarantee.objects.filter(organization=org)
    
    return Response([{
        'id': g.id,
        'metric': g.metric,
        'guaranteed_value': float(g.guaranteed_value),
        'actual_value': float(g.actual_value) if g.actual_value else None,
        'period_start': g.period_start,
        'period_end': g.period_end,
        'met': g.met,
        'notes': g.notes,
    } for g in guarantees])


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsAuthenticated])
def on_premise_deployment(request):
    """Get or manage on-premise deployment"""
    org = request.user.organization
    
    if request.method == 'GET':
        try:
            deployment = OnPremiseDeployment.objects.get(organization=org)
            return Response({
                'id': deployment.id,
                'status': deployment.status,
                'server_location': deployment.server_location,
                'server_specs': deployment.server_specs,
                'database_type': deployment.database_type,
                'version': deployment.version,
                'deployment_date': deployment.deployment_date,
                'last_update': deployment.last_update,
                'support_email': deployment.support_email,
                'support_phone': deployment.support_phone,
                'notes': deployment.notes,
            })
        except OnPremiseDeployment.DoesNotExist:
            return Response({'message': 'No on-premise deployment'})
    
    elif request.method == 'POST':
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        deployment = OnPremiseDeployment.objects.create(
            organization=org,
            server_location=request.data['server_location'],
            server_specs=request.data.get('server_specs', ''),
            database_type=request.data.get('database_type', 'PostgreSQL'),
            status='requested',
        )
        
        return Response({'message': 'On-premise deployment requested', 'id': deployment.id}, status=status.HTTP_201_CREATED)
    
    elif request.method == 'PUT':
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        deployment = get_object_or_404(OnPremiseDeployment, organization=org)
        deployment.status = request.data.get('status', deployment.status)
        deployment.version = request.data.get('version', deployment.version)
        deployment.support_email = request.data.get('support_email', deployment.support_email)
        deployment.support_phone = request.data.get('support_phone', deployment.support_phone)
        deployment.notes = request.data.get('notes', deployment.notes)
        deployment.save()
        
        return Response({'message': 'Deployment updated'})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def compliance_policy(request):
    """Get or update compliance and governance policy."""
    org = request.user.organization

    if request.method == 'GET':
        policy, _ = CompliancePolicy.objects.get_or_create(organization=org)
        return Response({
            'id': policy.id,
            'data_residency_region': policy.data_residency_region,
            'require_sso': policy.require_sso,
            'require_mfa': policy.require_mfa,
            'audit_export_enabled': policy.audit_export_enabled,
            'third_party_app_approval_required': policy.third_party_app_approval_required,
            'retention_days': policy.retention_days,
            'ip_allowlist': policy.ip_allowlist,
            'allowed_integrations': policy.allowed_integrations,
            'updated_at': policy.updated_at,
        })

    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    policy, _ = CompliancePolicy.objects.get_or_create(organization=org)
    for field in [
        'data_residency_region',
        'require_sso',
        'require_mfa',
        'audit_export_enabled',
        'third_party_app_approval_required',
        'retention_days',
        'ip_allowlist',
        'allowed_integrations',
    ]:
        if field in request.data:
            setattr(policy, field, request.data.get(field))
    policy.save()

    AuditLog.log(
        organization=org,
        user=request.user,
        action='settings_change',
        resource_type='compliance_policy',
        resource_id=policy.id,
        details={'updated_fields': list(request.data.keys())},
        request=request,
    )

    return Response({'message': 'Compliance policy updated', 'id': policy.id})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def marketplace_apps(request):
    """List marketplace apps with organization installation status."""
    org = request.user.organization
    installations = {
        i.app_id: i for i in InstalledMarketplaceApp.objects.filter(organization=org).select_related('app')
    }

    apps = MarketplaceApp.objects.filter(is_active=True).order_by('name')
    return Response([{
        'id': app.id,
        'slug': app.slug,
        'name': app.name,
        'description': app.description,
        'vendor': app.vendor,
        'category': app.category,
        'pricing': app.pricing,
        'docs_url': app.docs_url,
        'launch_path': app.launch_path,
        'installed': app.id in installations,
        'status': installations[app.id].status if app.id in installations else None,
        'installed_at': installations[app.id].installed_at if app.id in installations else None,
    } for app in apps])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def install_marketplace_app(request, app_id):
    """Install (or re-enable) marketplace app for the organization."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    org = request.user.organization
    app = get_object_or_404(MarketplaceApp, id=app_id, is_active=True)
    policy, _ = CompliancePolicy.objects.get_or_create(organization=org)
    if policy.third_party_app_approval_required and app.vendor.lower() != 'knoledgr':
        approved_apps = request.data.get('approved_app_ids', [])
        if app.id not in approved_apps:
            return Response(
                {'error': 'App requires explicit approval per organization policy'},
                status=status.HTTP_400_BAD_REQUEST
            )

    installation, created = InstalledMarketplaceApp.objects.get_or_create(
        organization=org,
        app=app,
        defaults={'installed_by': request.user, 'status': 'installed'},
    )
    if not created and installation.status != 'installed':
        installation.status = 'installed'
        installation.installed_by = request.user
        installation.save(update_fields=['status', 'installed_by', 'updated_at'])

    AuditLog.log(
        organization=org,
        user=request.user,
        action='create',
        resource_type='marketplace_installation',
        resource_id=installation.id,
        details={'app_slug': app.slug, 'app_name': app.name},
        request=request,
    )

    return Response({'message': 'App installed', 'installation_id': installation.id})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def uninstall_marketplace_app(request, app_id):
    """Uninstall marketplace app from organization."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    org = request.user.organization
    app = get_object_or_404(MarketplaceApp, id=app_id)
    installation = get_object_or_404(InstalledMarketplaceApp, organization=org, app=app)
    installation.delete()

    AuditLog.log(
        organization=org,
        user=request.user,
        action='delete',
        resource_type='marketplace_installation',
        details={'app_slug': app.slug, 'app_name': app.name},
        request=request,
    )

    return Response({'message': 'App uninstalled'})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def role_permission_policy(request):
    """Get or update organization role permission overrides."""
    org = request.user.organization

    if request.method == 'GET':
        policy, _ = RolePermissionPolicy.objects.get_or_create(organization=org)
        return Response({
            'id': policy.id,
            'role_overrides': policy.role_overrides,
            'require_admin_approval_for_delete': policy.require_admin_approval_for_delete,
            'available_permissions': [p.value for p in Permission],
            'default_role_permissions': ROLE_PERMISSIONS,
        })

    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    payload = request.data.get('role_overrides') or {}
    cleaned = {}
    valid_permissions = {p.value for p in Permission}
    for role in ['admin', 'manager', 'contributor']:
        role_payload = payload.get(role) or {}
        add = [p for p in role_payload.get('add', []) if p in valid_permissions]
        remove = [p for p in role_payload.get('remove', []) if p in valid_permissions]
        cleaned[role] = {'add': add, 'remove': remove}

    policy, _ = RolePermissionPolicy.objects.get_or_create(organization=org)
    policy.role_overrides = cleaned
    if 'require_admin_approval_for_delete' in request.data:
        policy.require_admin_approval_for_delete = bool(request.data.get('require_admin_approval_for_delete'))
    policy.save()

    AuditLog.log(
        organization=org,
        user=request.user,
        action='settings_change',
        resource_type='role_permission_policy',
        resource_id=policy.id,
        details={'role_overrides': cleaned},
        request=request,
    )
    return Response({'message': 'Role permission policy updated', 'id': policy.id})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portfolio_report(request):
    """Cross-project portfolio health summary."""
    org = request.user.organization
    today = timezone.now().date()

    projects = Project.objects.filter(organization=org).order_by('name')
    project_rows = []

    for project in projects:
        issues = Issue.objects.filter(project=project)
        issue_count = issues.count()
        done_count = issues.filter(status='done').count()
        active_sprints = Sprint.objects.filter(project=project, organization=org, status='active').count()
        overdue_issues = issues.filter(due_date__lt=today).exclude(status='done').count()
        blockers = Blocker.objects.filter(organization=org, sprint__project=project, status='active').count()
        dependency_blockers = Blocker.objects.filter(
            organization=org,
            sprint__project=project,
            status='active',
            blocker_type='dependency',
        ).count()
        decision_dependency_impacts = DecisionImpact.objects.filter(
            organization=org,
            issue__project=project,
            impact_type__in=['blocks', 'delays'],
        ).count()
        completion = round((done_count / issue_count) * 100, 1) if issue_count else 0.0

        risk_score = min(
            100,
            (overdue_issues * 12)
            + (blockers * 14)
            + (dependency_blockers * 18)
            + (decision_dependency_impacts * 10)
            + (0 if active_sprints else 8),
        )
        project_rows.append({
            'project_id': project.id,
            'project_name': project.name,
            'project_key': project.key,
            'issue_count': issue_count,
            'done_count': done_count,
            'completion_percent': completion,
            'active_sprints': active_sprints,
            'overdue_issues': overdue_issues,
            'active_blockers': blockers,
            'dependency_blockers': dependency_blockers,
            'decision_dependency_impacts': decision_dependency_impacts,
            'dependency_density': round(
                ((dependency_blockers + decision_dependency_impacts) / issue_count), 2
            ) if issue_count else 0.0,
            'risk_score': risk_score,
        })

    portfolio_totals = {
        'projects': len(project_rows),
        'issues': sum(row['issue_count'] for row in project_rows),
        'done': sum(row['done_count'] for row in project_rows),
        'active_sprints': sum(row['active_sprints'] for row in project_rows),
        'overdue_issues': sum(row['overdue_issues'] for row in project_rows),
        'active_blockers': sum(row['active_blockers'] for row in project_rows),
        'dependency_blockers': sum(row['dependency_blockers'] for row in project_rows),
        'decision_dependency_impacts': sum(row['decision_dependency_impacts'] for row in project_rows),
    }
    portfolio_totals['completion_percent'] = round(
        (portfolio_totals['done'] / portfolio_totals['issues']) * 100, 1
    ) if portfolio_totals['issues'] else 0.0

    return Response({
        'generated_at': timezone.now(),
        'totals': portfolio_totals,
        'projects': sorted(project_rows, key=lambda row: row['risk_score'], reverse=True),
        'top_dependency_projects': sorted(
            project_rows,
            key=lambda row: (row['dependency_blockers'] + row['decision_dependency_impacts']),
            reverse=True,
        )[:5],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def incident_center(request):
    """List open and recent enterprise incidents."""
    org = request.user.organization
    incidents = EnterpriseIncident.objects.filter(organization=org).order_by('-created_at')[:50]
    return Response([{
        'id': incident.id,
        'source_key': incident.source_key,
        'incident_type': incident.incident_type,
        'severity': incident.severity,
        'status': incident.status,
        'title': incident.title,
        'description': incident.description,
        'source_payload': incident.source_payload,
        'created_at': incident.created_at,
        'resolved_at': incident.resolved_at,
    } for incident in incidents])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def run_incident_automation(request):
    """Evaluate SLA and delivery signals, create incidents, notify admins."""
    if request.user.role not in ['admin', 'manager']:
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

    org = request.user.organization
    today = timezone.now().date()
    created_incidents = []
    severity_rank = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}

    stale_blockers = Blocker.objects.filter(
        organization=org,
        status='active',
        created_at__date__lte=today - timedelta(days=3),
    ).select_related('sprint')

    for blocker in stale_blockers:
        source_key = f"blocker:{blocker.id}"
        incident, created = EnterpriseIncident.objects.get_or_create(
            organization=org,
            source_key=source_key,
            status='open',
            defaults={
                'incident_type': 'blocker_spike',
                'severity': 'high' if (today - blocker.created_at.date()).days >= 7 else 'medium',
                'title': f"Stale blocker: {blocker.title}",
                'description': 'Blocker has remained active for more than 3 days.',
                'source_payload': {
                    'blocker_id': blocker.id,
                    'sprint_id': blocker.sprint_id,
                    'days_open': (today - blocker.created_at.date()).days,
                },
            },
        )
        if created:
            created_incidents.append(incident)

    rules = SLARule.objects.filter(organization=org, enabled=True)
    for rule in rules:
        lookback_start = today - timedelta(days=rule.lookback_days)
        sla_breaches = SLAGuarantee.objects.filter(
            organization=org,
            metric=rule.metric,
            period_end__gte=lookback_start,
        ).filter(
            Q(met=False) | Q(actual_value__lt=rule.threshold_percent)
        )
        for sla in sla_breaches:
            source_key = f"sla-rule:{rule.id}:sla:{sla.id}"
            incident, created = EnterpriseIncident.objects.get_or_create(
                organization=org,
                source_key=source_key,
                status='open',
                defaults={
                    'incident_type': 'sla_risk',
                    'severity': rule.severity,
                    'title': f"SLA risk ({rule.name}): {sla.metric}",
                    'description': 'SLA rule threshold breached for the configured lookback window.',
                    'source_payload': {
                        'sla_id': sla.id,
                        'rule_id': rule.id,
                        'metric': sla.metric,
                        'threshold_percent': float(rule.threshold_percent),
                        'guaranteed_value': float(sla.guaranteed_value),
                        'actual_value': float(sla.actual_value) if sla.actual_value is not None else None,
                        'period_start': sla.period_start.isoformat(),
                        'period_end': sla.period_end.isoformat(),
                    },
                },
            )
            if created:
                created_incidents.append(incident)

    escalation_rules = IncidentEscalationRule.objects.filter(organization=org, enabled=True).order_by('escalation_delay_minutes')
    open_incidents = EnterpriseIncident.objects.filter(organization=org, status='open')
    for incident in open_incidents:
        incident_age_minutes = max(0, int((timezone.now() - incident.created_at).total_seconds() // 60))
        for rule in escalation_rules:
            if rule.incident_type and rule.incident_type != incident.incident_type:
                continue
            if severity_rank.get(incident.severity, 0) < severity_rank.get(rule.min_severity, 0):
                continue
            if incident_age_minutes < rule.escalation_delay_minutes:
                continue
            if EnterpriseIncidentEscalation.objects.filter(incident=incident, rule=rule).exists():
                continue

            assignee = org.users.filter(role=rule.assign_to_role, is_active=True).order_by('id').first()
            if not assignee:
                assignee = org.users.filter(role='admin', is_active=True).order_by('id').first()
            task_id = None
            blocker_id = None

            if rule.create_task:
                task = Task.objects.create(
                    organization=org,
                    title=f"Escalation: {incident.title}",
                    description=f"Auto-created from incident #{incident.id}\n\n{incident.description}",
                    priority='high' if incident.severity in ['high', 'critical'] else 'medium',
                    assigned_to=assignee,
                    due_date=today + timedelta(days=2 if incident.severity in ['high', 'critical'] else 5),
                )
                task_id = task.id

            if rule.create_blocker:
                sprint = Sprint.objects.filter(organization=org, status='active').order_by('-start_date').first()
                blocker_owner = assignee or request.user
                convo = Conversation.objects.create(
                    organization=org,
                    author=blocker_owner,
                    post_type='update',
                    title=f"Incident Escalation: {incident.title}"[:255],
                    content=(incident.description or 'Incident escalation generated by enterprise automation.'),
                    priority='high' if incident.severity in ['high', 'critical'] else 'medium',
                )
                blocker = Blocker.objects.create(
                    organization=org,
                    conversation=convo,
                    sprint=sprint,
                    title=f"Escalated Incident: {incident.title}"[:255],
                    description=incident.description or 'Auto-created blocker from enterprise incident escalation.',
                    blocker_type='decision',
                    blocked_by=blocker_owner,
                )
                blocker_id = blocker.id

            EnterpriseIncidentEscalation.objects.create(
                incident=incident,
                rule=rule,
                task_id=task_id,
                blocker_id=blocker_id,
                notes='Auto-escalated by incident automation workflow',
            )

            if rule.notify_admins:
                for admin_user in org.users.filter(role='admin', is_active=True):
                    create_notification(
                        user=admin_user,
                        notification_type='alert',
                        title='Incident escalated',
                        message=f'Incident "{incident.title}" escalated by rule "{rule.name}".',
                        link='/enterprise',
                    )

    if created_incidents:
        admins = org.users.filter(role='admin', is_active=True)
        for admin_user in admins:
            create_notification(
                user=admin_user,
                notification_type='alert',
                title='Enterprise incident automation alert',
                message=f'{len(created_incidents)} new incident(s) detected in enterprise monitoring.',
                link='/enterprise',
            )

    return Response({
        'created_count': len(created_incidents),
        'created_incidents': [{
            'id': incident.id,
            'title': incident.title,
            'incident_type': incident.incident_type,
            'severity': incident.severity,
        } for incident in created_incidents],
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def project_permission_scopes(request):
    """List or upsert project-level permission scopes."""
    org = request.user.organization
    if request.method == 'GET':
        project_id = request.query_params.get('project_id')
        scopes = ProjectPermissionScope.objects.filter(organization=org).select_related('project')
        if project_id:
            scopes = scopes.filter(project_id=project_id)
        return Response([{
            'id': scope.id,
            'project_id': scope.project_id,
            'project_name': scope.project.name,
            'project_key': scope.project.key,
            'role': scope.role,
            'allowed_permissions': scope.allowed_permissions,
            'denied_permissions': scope.denied_permissions,
            'updated_at': scope.updated_at,
        } for scope in scopes])

    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    project = get_object_or_404(Project, id=request.data.get('project_id'), organization=org)
    role = request.data.get('role')
    if role not in ['admin', 'manager', 'contributor']:
        return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

    valid_permissions = {p.value for p in Permission}
    allowed = [p for p in request.data.get('allowed_permissions', []) if p in valid_permissions]
    denied = [p for p in request.data.get('denied_permissions', []) if p in valid_permissions]
    scope, _ = ProjectPermissionScope.objects.update_or_create(
        organization=org,
        project=project,
        role=role,
        defaults={
            'allowed_permissions': allowed,
            'denied_permissions': denied,
        },
    )
    return Response({'message': 'Project permission scope saved', 'id': scope.id})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sla_rules(request):
    """List or create SLA rules."""
    org = request.user.organization
    if request.method == 'GET':
        rules = SLARule.objects.filter(organization=org).order_by('name')
        return Response([{
            'id': rule.id,
            'name': rule.name,
            'metric': rule.metric,
            'threshold_percent': float(rule.threshold_percent),
            'lookback_days': rule.lookback_days,
            'severity': rule.severity,
            'enabled': rule.enabled,
            'auto_notify_admins': rule.auto_notify_admins,
            'auto_create_incident': rule.auto_create_incident,
            'updated_at': rule.updated_at,
        } for rule in rules])

    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    rule = SLARule.objects.create(
        organization=org,
        name=request.data.get('name', 'SLA Rule'),
        metric=request.data.get('metric', 'uptime'),
        threshold_percent=request.data.get('threshold_percent', 99.90),
        lookback_days=request.data.get('lookback_days', 30),
        severity=request.data.get('severity', 'high'),
        enabled=bool(request.data.get('enabled', True)),
        auto_notify_admins=bool(request.data.get('auto_notify_admins', True)),
        auto_create_incident=bool(request.data.get('auto_create_incident', True)),
    )
    return Response({'message': 'SLA rule created', 'id': rule.id}, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def sla_rule_detail(request, rule_id):
    """Update or delete SLA rule."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    rule = get_object_or_404(SLARule, id=rule_id, organization=request.user.organization)
    if request.method == 'DELETE':
        rule.delete()
        return Response({'message': 'SLA rule deleted'})

    for field in ['name', 'metric', 'threshold_percent', 'lookback_days', 'severity', 'enabled', 'auto_notify_admins', 'auto_create_incident']:
        if field in request.data:
            setattr(rule, field, request.data.get(field))
    rule.save()
    return Response({'message': 'SLA rule updated'})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def incident_escalation_rules(request):
    """List or create incident escalation rules."""
    org = request.user.organization
    if request.method == 'GET':
        rules = IncidentEscalationRule.objects.filter(organization=org).order_by('escalation_delay_minutes', 'name')
        return Response([{
            'id': rule.id,
            'name': rule.name,
            'enabled': rule.enabled,
            'incident_type': rule.incident_type,
            'min_severity': rule.min_severity,
            'escalation_delay_minutes': rule.escalation_delay_minutes,
            'create_task': rule.create_task,
            'create_blocker': rule.create_blocker,
            'notify_admins': rule.notify_admins,
            'assign_to_role': rule.assign_to_role,
            'updated_at': rule.updated_at,
        } for rule in rules])

    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    rule = IncidentEscalationRule.objects.create(
        organization=org,
        name=request.data.get('name', 'Escalation Rule'),
        enabled=bool(request.data.get('enabled', True)),
        incident_type=request.data.get('incident_type', ''),
        min_severity=request.data.get('min_severity', 'high'),
        escalation_delay_minutes=request.data.get('escalation_delay_minutes', 0),
        create_task=bool(request.data.get('create_task', True)),
        create_blocker=bool(request.data.get('create_blocker', False)),
        notify_admins=bool(request.data.get('notify_admins', True)),
        assign_to_role=request.data.get('assign_to_role', 'admin'),
    )
    return Response({'message': 'Escalation rule created', 'id': rule.id}, status=status.HTTP_201_CREATED)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def incident_escalation_rule_detail(request, rule_id):
    """Update or delete an incident escalation rule."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    rule = get_object_or_404(IncidentEscalationRule, id=rule_id, organization=request.user.organization)
    if request.method == 'DELETE':
        rule.delete()
        return Response({'message': 'Escalation rule deleted'})

    for field in [
        'name', 'enabled', 'incident_type', 'min_severity', 'escalation_delay_minutes',
        'create_task', 'create_blocker', 'notify_admins', 'assign_to_role'
    ]:
        if field in request.data:
            setattr(rule, field, request.data.get(field))
    rule.save()
    return Response({'message': 'Escalation rule updated'})
