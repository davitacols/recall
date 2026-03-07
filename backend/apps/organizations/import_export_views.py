from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from django.contrib.auth import get_user_model
import csv
import json
import io

from apps.organizations.platform_import_service import (
    SUPPORTED_PLATFORMS,
    build_preview_hash,
    import_platform_payload,
    preview_platform_payload,
    parse_uploaded_file,
    normalize_platform_payload,
)

User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_data(request):
    """Import data from CSV or JSON file"""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
    
    file = request.FILES.get('file')
    data_type = request.data.get('type')
    
    if not file:
        return Response({'error': 'File is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if not data_type:
        return Response({'error': 'Type is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        if file.name.endswith('.json'):
            data = json.load(file)
            imported = import_json_data(data, data_type, request.user.organization)
        elif file.name.endswith('.csv'):
            content = file.read().decode('utf-8')
            data = csv.DictReader(io.StringIO(content))
            imported = import_csv_data(list(data), data_type, request.user.organization)
        else:
            return Response({'error': 'Unsupported file format'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'message': f'Imported {imported} records', 'count': imported})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def import_platform_data(request):
    """Import project workflow and context from supported external platforms."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    upload = request.FILES.get('file')
    platform = (request.data.get('platform') or '').strip().lower()
    project_name = (request.data.get('project_name') or '').strip()
    include_context = str(request.data.get('include_context', 'true')).lower() != 'false'
    preview_hash = (request.data.get('preview_hash') or '').strip().lower()
    strict_preview = str(request.data.get('strict_preview', 'false')).lower() == 'true'

    if not upload:
        return Response({'error': 'File is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not platform:
        return Response({'error': 'Platform is required'}, status=status.HTTP_400_BAD_REQUEST)
    if platform not in SUPPORTED_PLATFORMS:
        return Response(
            {'error': f'Unsupported platform. Choose from: {", ".join(SUPPORTED_PLATFORMS)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        payload = parse_uploaded_file(upload)
        if strict_preview:
            if not preview_hash:
                return Response({'error': 'preview_hash is required when strict_preview=true'}, status=status.HTTP_400_BAD_REQUEST)
            normalized = normalize_platform_payload(
                platform=platform,
                payload=payload,
                project_name=project_name,
            )
            computed_hash = build_preview_hash(
                platform=platform,
                normalized=normalized,
                include_context=include_context,
            )
            if computed_hash != preview_hash:
                return Response(
                    {
                        'error': 'Preview no longer matches this file/options. Run preview again before importing.',
                        'expected_preview_hash': computed_hash,
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        result = import_platform_payload(
            organization=request.user.organization,
            user=request.user,
            platform=platform,
            payload=payload,
            project_name=project_name,
            include_context=include_context,
        )
        return Response(
            {
                'message': f'Successfully imported workflow from {platform}',
                'result': result,
            },
            status=status.HTTP_201_CREATED,
        )
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response({'error': f'Import failed: {exc}'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preview_platform_import(request):
    """Preview platform import mapping and inferred workflow without writing data."""
    if request.user.role != 'admin':
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    upload = request.FILES.get('file')
    platform = (request.data.get('platform') or '').strip().lower()
    project_name = (request.data.get('project_name') or '').strip()
    include_context = str(request.data.get('include_context', 'true')).lower() != 'false'

    if not upload:
        return Response({'error': 'File is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not platform:
        return Response({'error': 'Platform is required'}, status=status.HTTP_400_BAD_REQUEST)
    if platform not in SUPPORTED_PLATFORMS:
        return Response(
            {'error': f'Unsupported platform. Choose from: {", ".join(SUPPORTED_PLATFORMS)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        payload = parse_uploaded_file(upload)
        preview = preview_platform_payload(
            platform=platform,
            payload=payload,
            project_name=project_name,
            include_context=include_context,
        )
        return Response({'message': 'Preview generated', 'preview': preview}, status=status.HTTP_200_OK)
    except ValueError as exc:
        return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as exc:
        return Response({'error': f'Preview failed: {exc}'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_data(request):
    """Export data to CSV or JSON"""
    data_type = request.query_params.get('type')
    format_type = request.query_params.get('format', 'json')  # json or csv
    
    if not data_type:
        return Response({'error': 'Type parameter required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        data = get_export_data(data_type, request.user.organization)
        
        if format_type == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{data_type}_export.csv"'
            
            if data:
                writer = csv.DictWriter(response, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
            
            return response
        else:
            response = HttpResponse(json.dumps(data, indent=2, default=str), content_type='application/json')
            response['Content-Disposition'] = f'attachment; filename="{data_type}_export.json"'
            return response
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


def import_json_data(data, data_type, organization):
    """Import JSON data into database"""
    count = 0
    
    if data_type == 'conversations':
        from apps.conversations.models import Conversation
        for item in data:
            try:
                Conversation.objects.create(
                    organization=organization,
                    title=item.get('title', ''),
                    content=item.get('content', '')
                )
                count += 1
            except:
                pass
    
    elif data_type == 'decisions':
        from apps.decisions.models import Decision
        for item in data:
            try:
                Decision.objects.create(
                    organization=organization,
                    title=item.get('title', ''),
                    description=item.get('description', ''),
                    status=item.get('status', 'proposed')
                )
                count += 1
            except:
                pass
    
    elif data_type == 'goals':
        from apps.business.models import Goal
        for item in data:
            try:
                Goal.objects.create(
                    organization=organization,
                    title=item.get('title', ''),
                    description=item.get('description', ''),
                    status=item.get('status', 'not_started'),
                    priority=item.get('priority', 'medium')
                )
                count += 1
            except:
                pass
    
    return count


def import_csv_data(data, data_type, organization):
    """Import CSV data into database"""
    return import_json_data(data, data_type, organization)


def get_export_data(data_type, organization):
    """Get data for export"""
    
    if data_type == 'conversations':
        from apps.conversations.models import Conversation
        items = Conversation.objects.filter(organization=organization).values(
            'id', 'title', 'content', 'created_at'
        )
    
    elif data_type == 'decisions':
        from apps.decisions.models import Decision
        items = Decision.objects.filter(organization=organization).values(
            'id', 'title', 'description', 'status', 'created_at'
        )
    
    elif data_type == 'knowledge':
        from apps.knowledge.models import KnowledgeEntry
        items = KnowledgeEntry.objects.filter(organization=organization).values(
            'id', 'title', 'content', 'created_at'
        )
    
    elif data_type == 'goals':
        from apps.business.models import Goal
        items = Goal.objects.filter(organization=organization).values(
            'id', 'title', 'description', 'status', 'priority', 'created_at'
        )
    
    elif data_type == 'meetings':
        from apps.business.models import Meeting
        items = Meeting.objects.filter(organization=organization).values(
            'id', 'title', 'description', 'meeting_date', 'duration', 'created_at'
        )
    
    elif data_type == 'tasks':
        from apps.business.models import Task
        items = Task.objects.filter(organization=organization).values(
            'id', 'title', 'description', 'status', 'priority', 'created_at'
        )
    
    else:
        return []
    
    return list(items)
