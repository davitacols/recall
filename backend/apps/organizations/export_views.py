from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from .export_service import DataExportService
import json

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def export_data_endpoint(request):
    if request.user.role != 'admin':
        return Response({'error': 'Only admins can export data'}, status=403)
    
    data_type = request.data.get('type', 'all')  # conversations, decisions, projects, all
    format_type = request.data.get('format', 'json')  # json, csv
    
    service = DataExportService()
    
    try:
        if data_type == 'conversations':
            data = service.export_conversations(request.user.organization, format_type)
        elif data_type == 'decisions':
            data = service.export_decisions(request.user.organization, format_type)
        elif data_type == 'projects':
            data = service.export_projects(request.user.organization, format_type)
        elif data_type == 'all':
            data = json.dumps(service.export_all(request.user.organization), indent=2)
            format_type = 'json'
        else:
            return Response({'error': 'Invalid data type'}, status=400)
        
        # Create response with appropriate content type
        if format_type == 'json':
            response = HttpResponse(data, content_type='application/json')
            response['Content-Disposition'] = f'attachment; filename="{data_type}_export.json"'
        else:
            response = HttpResponse(data, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{data_type}_export.csv"'
        
        # Log export
        from .auditlog_models import AuditLog
        AuditLog.log(
            organization=request.user.organization,
            user=request.user,
            action='export',
            resource_type=data_type,
            details={'format': format_type},
            request=request
        )
        
        return response
    except Exception as e:
        return Response({'error': str(e)}, status=500)
