from django.db import models
from django.utils import timezone
from datetime import timedelta
from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation, Reaction
from apps.decisions.models import Decision
from apps.agile.models import Sprint, Issue

class AnalyticsEngine:
    """Analytics and metrics tracking"""
    
    @staticmethod
    def get_decision_outcomes(org_id, days=90):
        """Get decision success metrics"""
        cutoff_date = timezone.now() - timedelta(days=days)
        
        decisions = Decision.objects.filter(
            organization_id=org_id,
            decided_at__gte=cutoff_date
        )
        
        total = decisions.count()
        implemented = decisions.filter(status='implemented').count()
        rejected = decisions.filter(status='rejected').count()
        
        return {
            'total': total,
            'implemented': implemented,
            'rejected': rejected,
            'success_rate': (implemented / total * 100) if total > 0 else 0,
            'rejection_rate': (rejected / total * 100) if total > 0 else 0,
        }
    
    @staticmethod
    def get_team_velocity(org_id, sprint_id=None):
        """Get team velocity metrics"""
        if sprint_id:
            sprints = Sprint.objects.filter(id=sprint_id)
        else:
            sprints = Sprint.objects.filter(
                project__organization_id=org_id
            ).order_by('-end_date')[:5]
        
        velocities = []
        for sprint in sprints:
            completed = Issue.objects.filter(
                sprint=sprint,
                status='completed'
            ).count()
            
            total = Issue.objects.filter(sprint=sprint).count()
            
            velocities.append({
                'sprint_id': sprint.id,
                'sprint_name': sprint.name,
                'completed': completed,
                'total': total,
                'velocity': (completed / total * 100) if total > 0 else 0,
            })
        
        return velocities
    
    @staticmethod
    def get_engagement_metrics(org_id, days=30):
        """Get engagement analytics"""
        cutoff_date = timezone.now() - timedelta(days=days)
        
        conversations = Conversation.objects.filter(
            organization_id=org_id,
            created_at__gte=cutoff_date
        )
        
        total_views = conversations.aggregate(
            total=models.Sum('view_count')
        )['total'] or 0
        
        total_replies = conversations.aggregate(
            total=models.Sum('reply_count')
        )['total'] or 0
        
        reactions = Reaction.objects.filter(
            conversation__organization_id=org_id,
            created_at__gte=cutoff_date
        ).values('reaction_type').annotate(count=models.Count('id'))
        
        reaction_breakdown = {r['reaction_type']: r['count'] for r in reactions}
        
        return {
            'total_conversations': conversations.count(),
            'total_views': total_views,
            'total_replies': total_replies,
            'avg_views_per_conversation': (total_views / conversations.count()) if conversations.count() > 0 else 0,
            'reactions': reaction_breakdown,
        }
    
    @staticmethod
    def get_user_activity(org_id, user_id=None, days=30):
        """Get user activity metrics"""
        cutoff_date = timezone.now() - timedelta(days=days)
        
        if user_id:
            users = User.objects.filter(id=user_id)
        else:
            users = User.objects.filter(organization_id=org_id)
        
        activities = []
        for user in users:
            conversations_created = Conversation.objects.filter(
                author=user,
                created_at__gte=cutoff_date
            ).count()
            
            decisions_made = Decision.objects.filter(
                decision_maker=user,
                created_at__gte=cutoff_date
            ).count()
            
            reactions_given = Reaction.objects.filter(
                user=user,
                created_at__gte=cutoff_date
            ).count()
            
            activities.append({
                'user_id': user.id,
                'user_name': user.get_full_name(),
                'conversations_created': conversations_created,
                'decisions_made': decisions_made,
                'reactions_given': reactions_given,
                'total_activity': conversations_created + decisions_made + reactions_given,
            })
        
        return sorted(activities, key=lambda x: x['total_activity'], reverse=True)
    
    @staticmethod
    def get_memory_health(org_id):
        """Get organizational memory health score"""
        conversations = Conversation.objects.filter(organization_id=org_id)
        
        total = conversations.count()
        if total == 0:
            return 0
        
        # Factors: coverage, engagement, recency
        archived = conversations.filter(is_archived=True).count()
        recent = conversations.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        avg_views = conversations.aggregate(
            avg=models.Avg('view_count')
        )['avg'] or 0
        
        coverage_score = (total / 100) * 20  # Max 20 points
        engagement_score = min(avg_views / 10, 30)  # Max 30 points
        recency_score = (recent / total * 100) * 0.5  # Max 50 points
        
        health_score = min(coverage_score + engagement_score + recency_score, 100)
        
        return {
            'overall_score': int(health_score),
            'total_conversations': total,
            'archived_conversations': archived,
            'recent_conversations': recent,
            'avg_engagement': int(avg_views),
        }
    
    @staticmethod
    def get_trending_topics(org_id, limit=10):
        """Get trending topics"""
        cutoff_date = timezone.now() - timedelta(days=7)
        
        conversations = Conversation.objects.filter(
            organization_id=org_id,
            created_at__gte=cutoff_date
        ).values('tags__name').annotate(
            count=models.Count('id'),
            total_views=models.Sum('view_count')
        ).order_by('-total_views')[:limit]
        
        return [
            {
                'topic': c['tags__name'],
                'count': c['count'],
                'engagement': c['total_views'],
            }
            for c in conversations if c['tags__name']
        ]


class DecisionOutcomeTracker:
    """Track decision outcomes and lessons learned"""
    
    @staticmethod
    def record_outcome(decision_id, success, notes=''):
        """Record decision outcome"""
        decision = Decision.objects.get(id=decision_id)
        decision.was_successful = success
        decision.review_completed_at = timezone.now()
        decision.impact_review_notes = notes
        decision.save()
    
    @staticmethod
    def get_lessons_learned(org_id, limit=20):
        """Get lessons learned from decisions"""
        decisions = Decision.objects.filter(
            organization_id=org_id,
            review_completed_at__isnull=False,
            lessons_learned__isnull=False
        ).exclude(lessons_learned='').order_by('-review_completed_at')[:limit]
        
        return [
            {
                'decision_id': d.id,
                'title': d.title,
                'success': d.was_successful,
                'lessons': d.lessons_learned,
                'reviewed_at': d.review_completed_at,
            }
            for d in decisions
        ]
