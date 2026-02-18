import json
import csv
from io import StringIO
from django.http import HttpResponse
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.agile.models import Project, Issue, Sprint

class DataExportService:
    @staticmethod
    def export_conversations(organization, format='json'):
        conversations = Conversation.objects.filter(organization=organization).prefetch_related('messages')
        
        data = []
        for conv in conversations:
            messages = [{
                'author': msg.author.full_name,
                'content': msg.content,
                'created_at': msg.created_at.isoformat()
            } for msg in conv.messages.all()]
            
            data.append({
                'id': conv.id,
                'title': conv.title,
                'description': conv.description,
                'created_by': conv.created_by.full_name if conv.created_by else None,
                'created_at': conv.created_at.isoformat(),
                'messages': messages
            })
        
        if format == 'json':
            return json.dumps(data, indent=2)
        elif format == 'csv':
            output = StringIO()
            writer = csv.writer(output)
            writer.writerow(['ID', 'Title', 'Description', 'Created By', 'Created At', 'Message Count'])
            for item in data:
                writer.writerow([
                    item['id'],
                    item['title'],
                    item['description'],
                    item['created_by'],
                    item['created_at'],
                    len(item['messages'])
                ])
            return output.getvalue()
    
    @staticmethod
    def export_decisions(organization, format='json'):
        decisions = Decision.objects.filter(organization=organization)
        
        data = [{
            'id': dec.id,
            'title': dec.title,
            'description': dec.description,
            'status': dec.status,
            'decision_type': dec.decision_type,
            'created_by': dec.created_by.full_name if dec.created_by else None,
            'created_at': dec.created_at.isoformat(),
            'locked_at': dec.locked_at.isoformat() if dec.locked_at else None
        } for dec in decisions]
        
        if format == 'json':
            return json.dumps(data, indent=2)
        elif format == 'csv':
            output = StringIO()
            writer = csv.writer(output)
            writer.writerow(['ID', 'Title', 'Status', 'Type', 'Created By', 'Created At'])
            for item in data:
                writer.writerow([
                    item['id'],
                    item['title'],
                    item['status'],
                    item['decision_type'],
                    item['created_by'],
                    item['created_at']
                ])
            return output.getvalue()
    
    @staticmethod
    def export_projects(organization, format='json'):
        projects = Project.objects.filter(organization=organization)
        
        data = []
        for proj in projects:
            issues = Issue.objects.filter(project=proj)
            sprints = Sprint.objects.filter(project=proj)
            
            data.append({
                'id': proj.id,
                'name': proj.name,
                'key': proj.key,
                'description': proj.description,
                'created_at': proj.created_at.isoformat(),
                'issue_count': issues.count(),
                'sprint_count': sprints.count(),
                'issues': [{
                    'key': issue.key,
                    'title': issue.title,
                    'status': issue.status,
                    'priority': issue.priority
                } for issue in issues]
            })
        
        if format == 'json':
            return json.dumps(data, indent=2)
        elif format == 'csv':
            output = StringIO()
            writer = csv.writer(output)
            writer.writerow(['ID', 'Name', 'Key', 'Issue Count', 'Sprint Count', 'Created At'])
            for item in data:
                writer.writerow([
                    item['id'],
                    item['name'],
                    item['key'],
                    item['issue_count'],
                    item['sprint_count'],
                    item['created_at']
                ])
            return output.getvalue()
    
    @staticmethod
    def export_all(organization, format='json'):
        """Export all data"""
        return {
            'conversations': json.loads(DataExportService.export_conversations(organization, 'json')),
            'decisions': json.loads(DataExportService.export_decisions(organization, 'json')),
            'projects': json.loads(DataExportService.export_projects(organization, 'json'))
        }
