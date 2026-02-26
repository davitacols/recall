from django.contrib.contenttypes.models import ContentType
from django.db.models import Q, Count
from apps.knowledge.unified_models import ContentLink, ContextPanel
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.business.models import Task, Meeting
import logging

logger = logging.getLogger(__name__)

class ContextEngine:
    """Central engine for computing and retrieving context across modules"""
    
    @staticmethod
    def get_context(content_object, organization):
        """Get unified context for any content object"""
        content_type = ContentType.objects.get_for_model(content_object)
        
        # Try to get cached context
        try:
            context = ContextPanel.objects.get(
                content_type=content_type,
                object_id=content_object.id,
                organization=organization
            )
            # Refresh if older than 1 hour
            from django.utils import timezone
            from datetime import timedelta
            if timezone.now() - context.last_computed > timedelta(hours=1):
                return ContextEngine.compute_context(content_object, organization)
            return context
        except ContextPanel.DoesNotExist:
            return ContextEngine.compute_context(content_object, organization)
    
    @staticmethod
    def compute_context(content_object, organization):
        """Compute fresh context for content"""
        content_type = ContentType.objects.get_for_model(content_object)
        
        # Get or create context panel
        context, _ = ContextPanel.objects.get_or_create(
            content_type=content_type,
            object_id=content_object.id,
            organization=organization
        )
        
        # Find related content through links
        links_from = ContentLink.objects.filter(
            source_content_type=content_type,
            source_object_id=content_object.id,
            organization=organization
        ).select_related('target_content_type')
        
        links_to = ContentLink.objects.filter(
            target_content_type=content_type,
            target_object_id=content_object.id,
            organization=organization
        ).select_related('source_content_type')
        
        # Categorize by content type
        related_conversations = []
        related_decisions = []
        related_tasks = []
        related_documents = []
        
        for link in list(links_from) + list(links_to):
            target = link.target_object if link.source_object_id == content_object.id else link.source_object
            if not target:
                continue
                
            item_data = {
                'id': target.id,
                'title': getattr(target, 'title', str(target)),
                'link_type': link.link_type,
                'strength': link.strength
            }
            
            model_name = target.__class__.__name__.lower()
            if 'conversation' in model_name:
                related_conversations.append(item_data)
            elif 'decision' in model_name:
                related_decisions.append(item_data)
            elif 'task' in model_name:
                related_tasks.append(item_data)
            elif 'document' in model_name:
                related_documents.append(item_data)
        
        # Find expert users
        expert_users = ContextEngine._find_experts(content_object, organization)
        
        # Find similar past items
        similar_items = ContextEngine._find_similar_items(content_object, organization)
        
        # Calculate risk indicators
        risk_indicators = ContextEngine._calculate_risks(content_object, similar_items, organization)
        
        # Update context panel
        context.related_conversations = related_conversations[:10]
        context.related_decisions = related_decisions[:10]
        context.related_tasks = related_tasks[:10]
        context.related_documents = related_documents[:10]
        context.expert_users = expert_users[:5]
        context.similar_past_items = similar_items[:5]
        context.risk_indicators = risk_indicators
        context.save()
        
        return context
    
    @staticmethod
    def _find_experts(content_object, organization):
        """Find users with expertise on this topic"""
        experts = []
        
        # Get keywords/topics from content
        keywords = []
        if hasattr(content_object, 'ai_keywords'):
            keywords = content_object.ai_keywords or []
        
        if not keywords:
            return experts
        
        # Find users who frequently work with these keywords
        from apps.organizations.models import User
        
        # Search in conversations
        for keyword in keywords[:3]:  # Top 3 keywords
            users = User.objects.filter(
                organization=organization,
                conversation__ai_keywords__contains=[keyword]
            ).annotate(
                relevance=Count('conversation')
            ).order_by('-relevance')[:3]
            
            for user in users:
                experts.append({
                    'user_id': user.id,
                    'name': user.get_full_name(),
                    'relevance_score': min(user.relevance / 10.0, 1.0),
                    'reason': f'Worked on {user.relevance} items about {keyword}'
                })
        
        return experts
    
    @staticmethod
    def _find_similar_items(content_object, organization):
        """Find similar past items with outcomes"""
        similar = []
        
        # Get keywords from current item
        keywords = []
        if hasattr(content_object, 'ai_keywords') and content_object.ai_keywords:
            keywords = content_object.ai_keywords
        
        if not keywords:
            return similar
        
        # Search for similar decisions with outcomes
        try:
            from django.db.models import Q
            decisions = Decision.objects.filter(
                organization=organization,
                status__in=['implemented', 'rejected']
            ).exclude(
                id=content_object.id if isinstance(content_object, Decision) else None
            ).order_by('-review_completed_at', '-implemented_at', '-created_at')[:5]
            
            for decision in decisions:
                similar.append({
                    'id': decision.id,
                    'type': 'decision',
                    'title': decision.title,
                    'outcome': decision.status,
                    'was_successful': decision.was_successful,
                    'similarity': 0.8,
                    'lessons': decision.lessons_learned
                })
        except Exception as e:
            logger.error(f"Error finding similar decisions: {e}")
        
        return similar
    
    @staticmethod
    def auto_link_content(content_object, organization):
        """Automatically create links to related content using AI"""
        content_type = ContentType.objects.get_for_model(content_object)
        
        # Get keywords and title for matching
        keywords = []
        title_words = []
        
        if hasattr(content_object, 'ai_keywords') and content_object.ai_keywords:
            keywords = content_object.ai_keywords
        
        if hasattr(content_object, 'title'):
            title_words = [w.lower() for w in content_object.title.split() if len(w) > 3]
        
        if not keywords and not title_words:
            return
        
        # Find related conversations
        try:
            from django.db.models import Q
            query = Q(organization=organization)
            
            if keywords:
                query &= Q(ai_keywords__overlap=keywords)
            elif title_words:
                for word in title_words[:3]:  # Top 3 words
                    query |= Q(title__icontains=word) | Q(content__icontains=word)
            
            conversations = Conversation.objects.filter(query).exclude(
                id=content_object.id if isinstance(content_object, Conversation) else None
            )[:5]
            
            for conv in conversations:
                # Calculate strength based on keyword overlap
                strength = 0.7
                if keywords and conv.ai_keywords:
                    overlap = len(set(keywords) & set(conv.ai_keywords))
                    strength = min(0.5 + (overlap * 0.15), 1.0)
                
                ContextEngine._create_link(
                    content_object, conv, organization,
                    link_type='relates_to',
                    strength=strength,
                    auto_generated=True
                )
        except Exception as e:
            logger.error(f"Error auto-linking conversations: {e}")
        
        # Find related decisions by title similarity
        try:
            query = Q(organization=organization)
            if title_words:
                for word in title_words[:3]:
                    query |= Q(title__icontains=word) | Q(description__icontains=word)
            
            decisions = Decision.objects.filter(query).exclude(
                id=content_object.id if isinstance(content_object, Decision) else None
            )[:5]
            
            for decision in decisions:
                ContextEngine._create_link(
                    content_object, decision, organization,
                    link_type='relates_to',
                    strength=0.6,
                    auto_generated=True
                )
        except Exception as e:
            logger.error(f"Error auto-linking decisions: {e}")
    
    @staticmethod
    def _create_link(source, target, organization, link_type='relates_to', strength=1.0, auto_generated=False):
        """Create a link between two content objects"""
        source_ct = ContentType.objects.get_for_model(source)
        target_ct = ContentType.objects.get_for_model(target)
        
        ContentLink.objects.get_or_create(
            organization=organization,
            source_content_type=source_ct,
            source_object_id=source.id,
            target_content_type=target_ct,
            target_object_id=target.id,
            defaults={
                'link_type': link_type,
                'strength': strength,
                'is_auto_generated': auto_generated
            }
        )
    
    @staticmethod
    def get_unified_timeline(organization, user=None, days=7):
        """Get unified activity timeline across all modules"""
        from apps.knowledge.unified_models import UnifiedActivity
        from django.utils import timezone
        from datetime import timedelta
        
        cutoff = timezone.now() - timedelta(days=days)
        
        activities = UnifiedActivity.objects.filter(
            organization=organization,
            created_at__gte=cutoff
        )
        
        if user:
            activities = activities.filter(user=user)
        
        return activities.select_related('user', 'content_type')[:50]

    @staticmethod
    def _calculate_risks(content_object, similar_items, organization):
        """Calculate risk indicators based on patterns"""
        risks = []
        
        # Check for similar failed items
        if similar_items:
            failed_count = sum(1 for item in similar_items if not item.get('was_successful'))
            if failed_count >= 2:
                risks.append(f"Similar items failed {failed_count} times in the past")
            reviewed_count = sum(1 for item in similar_items if item.get('was_successful') is not None)
            if reviewed_count >= 3:
                failure_rate = (failed_count / reviewed_count) * 100
                if failure_rate >= 50:
                    risks.append(f"High historical failure rate: {int(failure_rate)}% for similar reviewed items")
        
        # Check if decision without conversation
        if hasattr(content_object, 'conversation') and not content_object.conversation:
            risks.append("No prior discussion found - consider starting a conversation first")
        
        # Check for rushed timeline
        if hasattr(content_object, 'implementation_deadline'):
            from django.utils import timezone
            if content_object.implementation_deadline:
                days_until = (content_object.implementation_deadline - timezone.now()).days
                if days_until < 7:
                    risks.append(f"Short timeline: Only {days_until} days until deadline")
        
        # Check for missing stakeholders
        if hasattr(content_object, 'stakeholders'):
            try:
                count = content_object.stakeholders.count()
                if count == 0:
                    risks.append("No stakeholders assigned - consider involving key team members")
            except:
                pass
        
        # Check for high priority without rationale
        if hasattr(content_object, 'priority') and content_object.priority in ['high', 'urgent']:
            if hasattr(content_object, 'rationale'):
                if not content_object.rationale or len(content_object.rationale) < 50:
                    risks.append("High priority item needs detailed rationale")
        
        return risks
