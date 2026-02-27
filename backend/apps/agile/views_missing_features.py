"""
Additional views for missing Jira features
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import (
    Issue, IssueAttachment, SavedFilter, IssueTemplate, 
    Release, Component, ProjectCategory, Column
)
from .serializers import (
    IssueAttachmentSerializer, SavedFilterSerializer, IssueTemplateSerializer,
    ReleaseSerializer, ComponentSerializer, ProjectCategorySerializer
)
from apps.organizations.permissions import has_project_permission, Permission
from apps.notifications.models import Notification


# Attachments
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_attachment(request, issue_id):
    try:
        issue = get_object_or_404(Issue, id=issue_id, organization=request.user.organization)
        if not has_project_permission(request.user, Permission.EDIT_ISSUE.value, issue.project_id):
            return Response({'error': 'Permission denied for this project'}, status=403)
        file = request.FILES.get('file')
        
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        
        # Ensure media directory exists
        import os
        from django.conf import settings
        media_root = settings.MEDIA_ROOT
        if not os.path.exists(media_root):
            os.makedirs(media_root, exist_ok=True)
        
        attachment = IssueAttachment.objects.create(
            issue=issue,
            file=file,
            filename=file.name,
            uploaded_by=request.user,
            file_size=file.size,
            content_type=file.content_type
        )

        recipients = set(issue.watchers.exclude(id=request.user.id).values_list('id', flat=True))
        if issue.assignee_id and issue.assignee_id != request.user.id:
            recipients.add(issue.assignee_id)
        if issue.reporter_id and issue.reporter_id != request.user.id:
            recipients.add(issue.reporter_id)
        actor = request.user.get_full_name() or request.user.username
        for user_id in recipients:
            Notification.objects.create(
                user_id=user_id,
                notification_type='task',
                title=f'Attachment added to {issue.key}',
                message=f'{actor} uploaded "{attachment.filename}" on "{issue.title}"',
                link=f'/issues/{issue.id}',
            )
        
        return Response(IssueAttachmentSerializer(attachment).data, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_attachments(request, issue_id):
    issue = get_object_or_404(Issue, id=issue_id, organization=request.user.organization)
    if not has_project_permission(request.user, Permission.EDIT_ISSUE.value, issue.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)
    attachments = issue.attachments.all()
    return Response(IssueAttachmentSerializer(attachments, many=True).data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_attachment(request, attachment_id):
    attachment = get_object_or_404(IssueAttachment, id=attachment_id, issue__organization=request.user.organization)
    if not has_project_permission(request.user, Permission.EDIT_ISSUE.value, attachment.issue.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)
    attachment.file.delete()
    attachment.delete()
    return Response(status=204)


# Watchers
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def watch_issue(request, issue_id):
    issue = get_object_or_404(Issue, id=issue_id, organization=request.user.organization)
    if not has_project_permission(request.user, Permission.EDIT_ISSUE.value, issue.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)
    issue.watchers.add(request.user)
    return Response({'watching': True})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unwatch_issue(request, issue_id):
    issue = get_object_or_404(Issue, id=issue_id, organization=request.user.organization)
    if not has_project_permission(request.user, Permission.EDIT_ISSUE.value, issue.project_id):
        return Response({'error': 'Permission denied for this project'}, status=403)
    issue.watchers.remove(request.user)
    return Response({'watching': False})


# Bulk Operations
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_update_issues(request):
    issue_ids = request.data.get('issue_ids', [])
    updates = request.data.get('updates', {})
    
    allowed_fields = ['status', 'assignee_id', 'priority', 'sprint_id']
    updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    issues = Issue.objects.filter(id__in=issue_ids, organization=request.user.organization)
    allowed_issue_ids = [
        issue.id for issue in issues
        if has_project_permission(request.user, Permission.EDIT_ISSUE.value, issue.project_id)
    ]
    issues = issues.filter(id__in=allowed_issue_ids)
    count = issues.update(**updates)
    
    return Response({'updated': count, 'issues': allowed_issue_ids})


# Saved Filters
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def saved_filters(request):
    if request.method == 'GET':
        filters = SavedFilter.objects.filter(
            Q(user=request.user) | Q(is_public=True),
            organization=request.user.organization
        )
        return Response(SavedFilterSerializer(filters, many=True).data)
    
    elif request.method == 'POST':
        filter_obj = SavedFilter.objects.create(
            user=request.user,
            organization=request.user.organization,
            name=request.data['name'],
            filter_params=request.data['filter_params'],
            is_public=request.data.get('is_public', False)
        )
        return Response(SavedFilterSerializer(filter_obj).data, status=201)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_saved_filter(request, filter_id):
    filter_obj = get_object_or_404(SavedFilter, id=filter_id, user=request.user)
    filter_obj.delete()
    return Response(status=204)


# Issue Templates
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def issue_templates(request):
    if request.method == 'GET':
        project_id = request.query_params.get('project_id')
        templates = IssueTemplate.objects.filter(organization=request.user.organization)
        if project_id:
            templates = templates.filter(Q(project_id=project_id) | Q(project__isnull=True))
        return Response(IssueTemplateSerializer(templates, many=True).data)
    
    elif request.method == 'POST':
        template = IssueTemplate.objects.create(
            organization=request.user.organization,
            project_id=request.data.get('project_id'),
            name=request.data['name'],
            issue_type=request.data['issue_type'],
            title_template=request.data['title_template'],
            description_template=request.data['description_template'],
            default_priority=request.data.get('default_priority', 'medium'),
            default_labels=request.data.get('default_labels', [])
        )
        return Response(IssueTemplateSerializer(template).data, status=201)


# Releases
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def releases(request, project_id):
    if request.method == 'GET':
        releases = Release.objects.filter(project_id=project_id)
        return Response(ReleaseSerializer(releases, many=True).data)
    
    elif request.method == 'POST':
        release = Release.objects.create(
            project_id=project_id,
            name=request.data['name'],
            version=request.data['version'],
            release_date=request.data.get('release_date'),
            status=request.data.get('status', 'unreleased'),
            description=request.data.get('description', '')
        )
        return Response(ReleaseSerializer(release).data, status=201)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_release(request, release_id):
    release = get_object_or_404(Release, id=release_id)
    for key, value in request.data.items():
        setattr(release, key, value)
    release.save()
    return Response(ReleaseSerializer(release).data)


# Components
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def components(request, project_id):
    if request.method == 'GET':
        components = Component.objects.filter(project_id=project_id)
        return Response(ComponentSerializer(components, many=True).data)
    
    elif request.method == 'POST':
        component = Component.objects.create(
            project_id=project_id,
            name=request.data['name'],
            description=request.data.get('description', ''),
            lead_id=request.data.get('lead_id')
        )
        return Response(ComponentSerializer(component).data, status=201)


# Project Categories
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def project_categories(request):
    if request.method == 'GET':
        categories = ProjectCategory.objects.filter(organization=request.user.organization)
        return Response(ProjectCategorySerializer(categories, many=True).data)
    
    elif request.method == 'POST':
        category = ProjectCategory.objects.create(
            organization=request.user.organization,
            name=request.data['name'],
            description=request.data.get('description', ''),
            color=request.data.get('color', '#4F46E5')
        )
        return Response(ProjectCategorySerializer(category).data, status=201)


# WIP Limit Validation
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_wip_limit(request, column_id):
    column = get_object_or_404(Column, id=column_id)
    return Response({
        'wip_limit': column.wip_limit,
        'current_count': column.issues.filter(status__in=['in_progress', 'in_review']).count(),
        'at_limit': column.is_at_wip_limit()
    })
