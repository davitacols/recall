from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .enterprise_models import SSOConfig, AccountManager, TrainingProgram, SLAGuarantee, OnPremiseDeployment

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
