from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Sum, Q
from .time_tracking_models import WorkLog, TimeEstimate
from .models import Issue, Sprint, BurndownData

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def log_work(request, issue_id):
    """Log time spent on an issue"""
    try:
        issue = Issue.objects.get(id=issue_id, organization=request.user.organization)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=status.HTTP_404_NOT_FOUND)
    
    time_spent = request.data.get('time_spent_minutes')
    description = request.data.get('description', '')
    started_at = request.data.get('started_at', timezone.now())
    
    if not time_spent or time_spent <= 0:
        return Response({'error': 'Invalid time_spent_minutes'}, status=status.HTTP_400_BAD_REQUEST)
    
    work_log = WorkLog.objects.create(
        organization=request.user.organization,
        issue=issue,
        user=request.user,
        time_spent_minutes=time_spent,
        description=description,
        started_at=started_at
    )
    
    # Update issue time_spent
    issue.time_spent = (issue.time_spent or 0) + time_spent
    issue.save()
    
    # Update remaining estimate if exists
    if hasattr(issue, 'time_estimate') and issue.time_estimate.remaining_estimate_minutes:
        issue.time_estimate.remaining_estimate_minutes = max(0, issue.time_estimate.remaining_estimate_minutes - time_spent)
        issue.time_estimate.save()
    
    return Response({
        'id': work_log.id,
        'time_spent_minutes': work_log.time_spent_minutes,
        'description': work_log.description,
        'started_at': work_log.started_at,
        'user': work_log.user.email
    }, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_work_logs(request, issue_id):
    """Get all work logs for an issue"""
    try:
        issue = Issue.objects.get(id=issue_id, organization=request.user.organization)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=status.HTTP_404_NOT_FOUND)
    
    work_logs = WorkLog.objects.filter(issue=issue).select_related('user')
    
    return Response([{
        'id': log.id,
        'time_spent_minutes': log.time_spent_minutes,
        'description': log.description,
        'started_at': log.started_at,
        'user': log.user.email,
        'created_at': log.created_at
    } for log in work_logs])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_time_estimate(request, issue_id):
    """Set time estimate for an issue"""
    try:
        issue = Issue.objects.get(id=issue_id, organization=request.user.organization)
    except Issue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=status.HTTP_404_NOT_FOUND)
    
    original = request.data.get('original_estimate_minutes')
    remaining = request.data.get('remaining_estimate_minutes')
    
    estimate, created = TimeEstimate.objects.get_or_create(issue=issue)
    if original is not None:
        estimate.original_estimate_minutes = original
    if remaining is not None:
        estimate.remaining_estimate_minutes = remaining
    estimate.save()
    
    return Response({
        'original_estimate_minutes': estimate.original_estimate_minutes,
        'remaining_estimate_minutes': estimate.remaining_estimate_minutes
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_burndown_chart(request, sprint_id):
    """Get burndown chart data for a sprint"""
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get or create burndown data
    start_date = sprint.start_date
    end_date = sprint.end_date
    current_date = timezone.now().date()
    
    # Calculate total points
    total_points = sprint.issues.aggregate(total=Sum('story_points'))['total'] or 0
    
    # Generate ideal burndown line
    days = (end_date - start_date).days + 1
    ideal_line = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        remaining = total_points - (total_points * i / (days - 1)) if days > 1 else 0
        ideal_line.append({'date': date.isoformat(), 'remaining': round(remaining, 1)})
    
    # Get actual burndown data
    actual_line = []
    for i in range(days):
        date = start_date + timedelta(days=i)
        if date > current_date:
            break
        
        # Calculate remaining points at end of this day
        completed = sprint.issues.filter(
            status='done',
            status_changed_at__date__lte=date
        ).aggregate(total=Sum('story_points'))['total'] or 0
        
        remaining = total_points - completed
        
        # Store in database
        BurndownData.objects.update_or_create(
            organization=request.user.organization,
            sprint=sprint,
            date=date,
            defaults={
                'remaining_points': remaining,
                'completed_points': completed
            }
        )
        
        actual_line.append({'date': date.isoformat(), 'remaining': remaining})
    
    return Response({
        'sprint_name': sprint.name,
        'start_date': sprint.start_date,
        'end_date': sprint.end_date,
        'total_points': total_points,
        'ideal_line': ideal_line,
        'actual_line': actual_line
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sprint_time_tracking(request, sprint_id):
    """Get time tracking summary for a sprint"""
    try:
        sprint = Sprint.objects.get(id=sprint_id, organization=request.user.organization)
    except Sprint.DoesNotExist:
        return Response({'error': 'Sprint not found'}, status=status.HTTP_404_NOT_FOUND)
    
    issues = sprint.issues.all()
    
    # Calculate totals
    total_estimated = 0
    total_logged = 0
    total_remaining = 0
    
    issue_data = []
    for issue in issues:
        logged = issue.work_logs.aggregate(total=Sum('time_spent_minutes'))['total'] or 0
        estimated = issue.time_estimate.original_estimate_minutes if hasattr(issue, 'time_estimate') else None
        remaining = issue.time_estimate.remaining_estimate_minutes if hasattr(issue, 'time_estimate') else None
        
        if estimated:
            total_estimated += estimated
        total_logged += logged
        if remaining:
            total_remaining += remaining
        
        issue_data.append({
            'id': issue.id,
            'key': issue.key,
            'title': issue.title,
            'status': issue.status,
            'estimated_minutes': estimated,
            'logged_minutes': logged,
            'remaining_minutes': remaining
        })
    
    return Response({
        'sprint_name': sprint.name,
        'total_estimated_minutes': total_estimated,
        'total_logged_minutes': total_logged,
        'total_remaining_minutes': total_remaining,
        'issues': issue_data
    })
