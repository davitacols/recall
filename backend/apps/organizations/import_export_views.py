from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from django.contrib.auth import get_user_model
import csv
import json
import io

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
