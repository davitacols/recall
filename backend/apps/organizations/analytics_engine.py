from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q, Avg
from .analytics_models import AnalyticsMetric, Report
from apps.agile.models import Issue, Sprint
from apps.decisions.models import Decision
from apps.conversations.models import Conversation

class AnalyticsEngine:
    """Calculate and track analytics metrics"""
    
    @staticmethod
    def record_metric(organization, metric_type, value, metadata=None):
        """Record a metric"""
        AnalyticsMetric.objects.create(
            organization=organization,
            metric_type=metric_type,
            value=value,
            metadata=metadata or {}
        )
    
    @staticmethod
    def get_issue_count(organization, days=30):
        """Get issue count for period"""
        cutoff = timezone.now() - timedelta(days=days)
        count = Issue.objects.filter(
            organization=organization,
            created_at__gte=cutoff
        ).count()
        return count
    
    @staticmethod
    def get_decision_count(organization, days=30):
        """Get decision count for period"""
        cutoff = timezone.now() - timedelta(days=days)
        count = Decision.objects.filter(
            organization=organization,
            created_at__gte=cutoff
        ).count()
        return count
    
    @staticmethod
    def get_sprint_velocity(organization, sprint_id=None):
        """Calculate sprint velocity"""
        if sprint_id:
            sprint = Sprint.objects.get(id=sprint_id)
            completed = Issue.objects.filter(
                sprint=sprint,
                status='completed'
            ).count()
            return completed
        
        # Latest sprint
        sprint = Sprint.objects.filter(
            organization=organization
        ).order_by('-end_date').first()
        
        if not sprint:
            return 0
        
        completed = Issue.objects.filter(
            sprint=sprint,
            status='completed'
        ).count()
        return completed
    
    @staticmethod
    def get_completion_rate(organization, sprint_id=None):
        """Calculate completion rate"""
        if sprint_id:
            sprint = Sprint.objects.get(id=sprint_id)
            total = Issue.objects.filter(sprint=sprint).count()
            completed = Issue.objects.filter(
                sprint=sprint,
                status='completed'
            ).count()
        else:
            sprint = Sprint.objects.filter(
                organization=organization
            ).order_by('-end_date').first()
            
            if not sprint:
                return 0
            
            total = Issue.objects.filter(sprint=sprint).count()
            completed = Issue.objects.filter(
                sprint=sprint,
                status='completed'
            ).count()
        
        if total == 0:
            return 0
        
        return (completed / total) * 100
    
    @staticmethod
    def get_user_activity(organization, user_id=None, days=30):
        """Get user activity count"""
        from apps.conversations.models import Comment
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        cutoff = timezone.now() - timedelta(days=days)
        
        if user_id:
            user = User.objects.get(id=user_id)
            count = Comment.objects.filter(
                author=user,
                created_at__gte=cutoff
            ).count()
            return count
        
        # All users
        users = User.objects.filter(organization=organization)
        activity = {}
        for user in users:
            count = Comment.objects.filter(
                author=user,
                created_at__gte=cutoff
            ).count()
            activity[user.username] = count
        
        return activity
    
    @staticmethod
    def get_resolution_time(organization, days=30):
        """Get average issue resolution time"""
        cutoff = timezone.now() - timedelta(days=days)
        
        issues = Issue.objects.filter(
            organization=organization,
            status='completed',
            updated_at__gte=cutoff
        )
        
        if not issues.exists():
            return 0
        
        total_time = 0
        for issue in issues:
            if issue.created_at and issue.updated_at:
                delta = issue.updated_at - issue.created_at
                total_time += delta.total_seconds()
        
        avg_seconds = total_time / issues.count()
        avg_hours = avg_seconds / 3600
        return round(avg_hours, 2)
    
    @staticmethod
    def get_team_capacity(organization):
        """Get team capacity metrics"""
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        users = User.objects.filter(organization=organization)
        
        capacity = {
            'total_users': users.count(),
            'admins': users.filter(role='admin').count(),
            'managers': users.filter(role='manager').count(),
            'contributors': users.filter(role='contributor').count(),
        }
        
        return capacity
    
    @staticmethod
    def generate_sprint_summary(sprint):
        """Generate sprint summary report"""
        total_issues = Issue.objects.filter(sprint=sprint).count()
        completed = Issue.objects.filter(sprint=sprint, status='completed').count()
        in_progress = Issue.objects.filter(sprint=sprint, status='in_progress').count()
        blocked = Issue.objects.filter(sprint=sprint, status='blocked').count()
        
        completion_rate = (completed / total_issues * 100) if total_issues > 0 else 0
        
        return {
            'sprint_name': sprint.name,
            'total_issues': total_issues,
            'completed': completed,
            'in_progress': in_progress,
            'blocked': blocked,
            'completion_rate': round(completion_rate, 2),
            'velocity': completed,
        }
    
    @staticmethod
    def generate_team_performance(organization, days=30):
        """Generate team performance report"""
        from django.contrib.auth import get_user_model
        from apps.conversations.models import Comment
        
        User = get_user_model()
        cutoff = timezone.now() - timedelta(days=days)
        
        users = User.objects.filter(organization=organization)
        performance = []
        
        for user in users:
            comments = Comment.objects.filter(
                author=user,
                created_at__gte=cutoff
            ).count()
            
            issues_created = Issue.objects.filter(
                created_by=user,
                created_at__gte=cutoff
            ).count()
            
            issues_completed = Issue.objects.filter(
                assigned_to=user,
                status='completed',
                updated_at__gte=cutoff
            ).count()
            
            performance.append({
                'user': user.username,
                'comments': comments,
                'issues_created': issues_created,
                'issues_completed': issues_completed,
                'total_activity': comments + issues_created + issues_completed,
            })
        
        return sorted(performance, key=lambda x: x['total_activity'], reverse=True)
    
    @staticmethod
    def generate_project_overview(project):
        """Generate project overview report"""
        total_issues = Issue.objects.filter(project=project).count()
        completed = Issue.objects.filter(project=project, status='completed').count()
        
        sprints = Sprint.objects.filter(project=project)
        active_sprint = sprints.filter(status='active').first()
        
        return {
            'project_name': project.name,
            'total_issues': total_issues,
            'completed_issues': completed,
            'completion_rate': (completed / total_issues * 100) if total_issues > 0 else 0,
            'total_sprints': sprints.count(),
            'active_sprint': active_sprint.name if active_sprint else None,
        }
    
    @staticmethod
    def generate_decision_analysis(organization, days=30):
        """Generate decision analysis report"""
        cutoff = timezone.now() - timedelta(days=days)
        
        decisions = Decision.objects.filter(
            organization=organization,
            created_at__gte=cutoff
        )
        
        total = decisions.count()
        locked = decisions.filter(is_locked=True).count()
        approved = decisions.filter(status='approved').count()
        
        return {
            'total_decisions': total,
            'locked_decisions': locked,
            'approved_decisions': approved,
            'pending_decisions': total - approved,
            'lock_rate': (locked / total * 100) if total > 0 else 0,
        }
