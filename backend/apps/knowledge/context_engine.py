import logging
import re

from django.contrib.contenttypes.models import ContentType
from django.db.models import Count, Q

from apps.business.document_models import Document
from apps.business.models import Meeting, Task
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.unified_models import ContentLink, ContextPanel

logger = logging.getLogger(__name__)

STOP_WORDS = {
    'about', 'after', 'again', 'against', 'also', 'because', 'before', 'being',
    'between', 'could', 'first', 'from', 'have', 'into', 'needs', 'other',
    'should', 'since', 'still', 'than', 'that', 'their', 'there', 'these',
    'this', 'those', 'through', 'under', 'using', 'very', 'what', 'when',
    'where', 'which', 'while', 'with', 'would',
}

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
    def get_link_suggestions(content_object, organization, limit=6):
        """Return suggested links for a content object."""
        existing_links = ContextEngine._get_existing_link_targets(content_object, organization)
        source_terms = ContextEngine._extract_search_terms(content_object)
        suggestions = {}

        for candidate in ContextEngine._get_structured_candidates(content_object, organization):
            ContextEngine._register_suggestion(
                suggestions,
                content_object,
                candidate['target'],
                candidate['strength'],
                candidate['reason'],
                existing_links,
                is_direct_reference=candidate.get('is_direct_reference', False),
            )

        if source_terms:
            for model_class in (Conversation, Decision, Task, Document):
                for candidate in ContextEngine._search_candidate_objects(
                    model_class,
                    organization,
                    source_terms,
                    content_object,
                ):
                    similarity = ContextEngine._score_similarity_candidate(
                        content_object,
                        candidate,
                        source_terms,
                    )
                    if not similarity:
                        continue
                    strength, reason = similarity
                    ContextEngine._register_suggestion(
                        suggestions,
                        content_object,
                        candidate,
                        strength,
                        reason,
                        existing_links,
                        is_direct_reference=False,
                    )

        ordered = sorted(
            suggestions.values(),
            key=lambda item: (
                not item.get('is_direct_reference', False),
                -item.get('strength', 0),
                item.get('title', '').lower(),
            ),
        )
        return ordered[:limit]

    @staticmethod
    def apply_link_suggestions(content_object, organization, limit=3, min_strength=0.72):
        """Apply the strongest suggested links as auto-generated links."""
        applied = []
        suggestions = ContextEngine.get_link_suggestions(
            content_object,
            organization,
            limit=max(limit * 2, limit),
        )

        for suggestion in suggestions:
            if suggestion.get('strength', 0) < min_strength:
                continue
            target = ContextEngine._resolve_suggestion_target(suggestion, organization)
            if not target:
                continue

            ContextEngine._create_link(
                content_object,
                target,
                organization,
                link_type=suggestion.get('recommended_link_type', 'relates_to'),
                strength=suggestion.get('strength', 0.7),
                auto_generated=True,
            )
            applied.append(suggestion)
            if len(applied) >= limit:
                break

        return applied
    
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
        try:
            ContextEngine.apply_link_suggestions(
                content_object,
                organization,
                limit=4,
                min_strength=0.68,
            )
        except Exception as e:
            logger.error(f"Error auto-linking content: {e}")
    
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
    def _get_existing_link_targets(content_object, organization):
        content_type = ContentType.objects.get_for_model(content_object)
        links = ContentLink.objects.filter(
            organization=organization,
        ).filter(
            Q(source_content_type=content_type, source_object_id=content_object.id) |
            Q(target_content_type=content_type, target_object_id=content_object.id)
        ).select_related('source_content_type', 'target_content_type')

        existing = set()
        for link in links:
            if link.source_content_type_id == content_type.id and link.source_object_id == content_object.id:
                if link.target_object:
                    existing.add((ContextEngine._content_type_name(link.target_object), link.target_object_id))
            else:
                if link.source_object:
                    existing.add((ContextEngine._content_type_name(link.source_object), link.source_object_id))
        return existing

    @staticmethod
    def _get_structured_candidates(content_object, organization):
        candidates = []

        def add_candidate(target, reason, strength=0.9, is_direct_reference=True):
            if not target:
                return
            candidates.append({
                'target': target,
                'reason': reason,
                'strength': strength,
                'is_direct_reference': is_direct_reference,
            })

        if getattr(content_object, 'conversation_id', None):
            add_candidate(
                getattr(content_object, 'conversation', None),
                'Directly references its source conversation.',
                strength=0.98,
            )

        if getattr(content_object, 'decision_id', None):
            add_candidate(
                getattr(content_object, 'decision', None),
                'Already connected through a direct decision reference.',
                strength=0.97,
            )

        if isinstance(content_object, Conversation):
            for decision in Decision.objects.filter(
                organization=organization,
                conversation=content_object,
            )[:4]:
                add_candidate(decision, 'Derived from this conversation.', strength=0.96)
            for task in Task.objects.filter(
                organization=organization,
                conversation=content_object,
            )[:4]:
                add_candidate(task, 'Task already references this conversation.', strength=0.94)

        if isinstance(content_object, Decision):
            tasks = list(Task.objects.filter(
                organization=organization,
                decision=content_object,
            )[:4])
            for task in tasks:
                add_candidate(task, 'Task already references this decision.', strength=0.95)
            task_ids = [task.id for task in tasks]
            if task_ids:
                for document in Document.objects.filter(
                    organization=organization,
                    task_id__in=task_ids,
                )[:4]:
                    add_candidate(
                        document,
                        'Document belongs to a task already tied to this decision.',
                        strength=0.82,
                        is_direct_reference=False,
                    )

        if isinstance(content_object, Task):
            for document in Document.objects.filter(
                organization=organization,
                task_id=content_object.id,
            )[:4]:
                add_candidate(document, 'Document is already attached to this task.', strength=0.95)

        if isinstance(content_object, Document) and content_object.task_id:
            task = Task.objects.filter(
                organization=organization,
                id=content_object.task_id,
            ).select_related('decision', 'conversation').first()
            if task:
                add_candidate(task, 'Document is already attached to this task.', strength=0.98)
                if task.decision_id:
                    add_candidate(
                        task.decision,
                        'Attached task already traces back to this decision.',
                        strength=0.84,
                        is_direct_reference=False,
                    )
                if task.conversation_id:
                    add_candidate(
                        task.conversation,
                        'Attached task already traces back to this conversation.',
                        strength=0.81,
                        is_direct_reference=False,
                    )

        return candidates

    @staticmethod
    def _register_suggestion(
        suggestions,
        source_object,
        target_object,
        strength,
        reason,
        existing_links,
        is_direct_reference=False,
    ):
        if not target_object or not ContextEngine._is_supported_object(target_object):
            return

        target_content_type = ContextEngine._content_type_name(target_object)
        suggestion_key = (target_content_type, target_object.id)
        source_key = (ContextEngine._content_type_name(source_object), source_object.id)

        if suggestion_key == source_key or suggestion_key in existing_links:
            return

        suggestion = {
            'id': target_object.id,
            'content_type': target_content_type,
            'type': ContextEngine._object_kind(target_object),
            'title': getattr(target_object, 'title', str(target_object)),
            'preview': ContextEngine._build_preview_text(target_object),
            'strength': round(min(max(float(strength), 0.0), 1.0), 2),
            'reason': reason,
            'recommended_link_type': ContextEngine._recommended_link_type(source_object, target_object),
            'url': ContextEngine._object_url(target_object),
            'is_direct_reference': is_direct_reference,
        }

        existing = suggestions.get(suggestion_key)
        if not existing or suggestion['strength'] > existing.get('strength', 0):
            suggestions[suggestion_key] = suggestion

    @staticmethod
    def _score_similarity_candidate(source_object, target_object, source_terms):
        if not ContextEngine._is_supported_object(target_object):
            return None

        target_terms = set(ContextEngine._extract_search_terms(target_object))
        overlap = [term for term in source_terms if term in target_terms][:3]
        source_title = (getattr(source_object, 'title', '') or '').strip().lower()
        target_title = (getattr(target_object, 'title', '') or '').strip().lower()
        title_phrase_match = bool(
            source_title and target_title and (
                source_title in target_title or target_title in source_title
            )
        )

        if not overlap and not title_phrase_match:
            return None

        strength = 0.43 + min(len(overlap) * 0.12, 0.33)
        if title_phrase_match:
            strength += 0.08
        if ContextEngine._recommended_link_type(source_object, target_object) == 'implements':
            strength += 0.04

        if overlap:
            reason = f"Shares key terms: {', '.join(overlap)}."
        else:
            reason = 'Similar title language suggests related context.'

        return min(round(strength, 2), 0.88), reason

    @staticmethod
    def _search_candidate_objects(model_class, organization, source_terms, content_object):
        query = Q()
        field_names = ContextEngine._searchable_fields(model_class)
        for term in list(source_terms)[:6]:
            for field_name in field_names:
                query |= Q(**{f'{field_name}__icontains': term})

        if not query.children:
            return []

        queryset = model_class.objects.filter(organization=organization).filter(query)
        if isinstance(content_object, model_class):
            queryset = queryset.exclude(id=content_object.id)

        order_field = '-updated_at' if ContextEngine._has_field(model_class, 'updated_at') else '-created_at'
        return list(queryset.order_by(order_field)[:12])

    @staticmethod
    def _searchable_fields(model_class):
        candidate_fields = ('title', 'description', 'content', 'rationale', 'ai_summary', 'context_reason')
        return [field_name for field_name in candidate_fields if ContextEngine._has_field(model_class, field_name)]

    @staticmethod
    def _has_field(model_class, field_name):
        return any(field.name == field_name for field in model_class._meta.fields)

    @staticmethod
    def _extract_search_terms(content_object):
        terms = []
        seen = set()

        def add_term(term):
            cleaned = (term or '').strip().lower()
            if len(cleaned) < 4 or cleaned in STOP_WORDS or cleaned in seen:
                return
            seen.add(cleaned)
            terms.append(cleaned)

        keywords = getattr(content_object, 'ai_keywords', None) or []
        for keyword in keywords:
            add_term(str(keyword))

        text_fragments = [
            getattr(content_object, 'title', ''),
            getattr(content_object, 'description', ''),
            getattr(content_object, 'content', ''),
            getattr(content_object, 'rationale', ''),
            getattr(content_object, 'ai_summary', ''),
            getattr(content_object, 'context_reason', ''),
            getattr(content_object, 'why_this_matters', ''),
            getattr(content_object, 'plain_language_summary', ''),
        ]
        for token in re.findall(r'[a-z0-9]{4,}', ' '.join(fragment for fragment in text_fragments if fragment).lower()):
            add_term(token)

        return terms[:12]

    @staticmethod
    def _build_preview_text(content_object):
        for attribute in (
            'plain_language_summary',
            'description',
            'ai_summary',
            'rationale',
            'content',
            'context_reason',
            'why_this_matters',
        ):
            value = (getattr(content_object, attribute, '') or '').strip()
            if not value:
                continue
            return f"{value[:157]}..." if len(value) > 160 else value
        return ''

    @staticmethod
    def _recommended_link_type(source_object, target_object):
        source_type = ContextEngine._content_type_name(source_object)
        target_type = ContextEngine._content_type_name(target_object)
        pair = {source_type, target_type}

        if source_type == 'conversations.conversation' and target_type == 'decisions.decision':
            return 'derived_from'
        if pair == {'decisions.decision', 'business.task'}:
            return 'implements'
        if pair == {'decisions.decision', 'business.document'}:
            return 'references'
        if pair == {'business.task', 'business.document'}:
            return 'references'
        return 'relates_to'

    @staticmethod
    def _resolve_suggestion_target(suggestion, organization):
        content_type_name = suggestion.get('content_type')
        target_id = suggestion.get('id')
        if not content_type_name or not target_id:
            return None

        app_label, model = content_type_name.split('.')
        content_type = ContentType.objects.get(app_label=app_label, model=model)
        model_class = content_type.model_class()
        return model_class.objects.filter(
            id=target_id,
            organization=organization,
        ).first()

    @staticmethod
    def _is_supported_object(content_object):
        return isinstance(content_object, (Conversation, Decision, Task, Document))

    @staticmethod
    def _content_type_name(content_object):
        content_type = ContentType.objects.get_for_model(content_object)
        return f'{content_type.app_label}.{content_type.model}'

    @staticmethod
    def _object_kind(content_object):
        return content_object.__class__.__name__.lower()

    @staticmethod
    def _object_url(content_object):
        if isinstance(content_object, Conversation):
            return f'/conversations/{content_object.id}'
        if isinstance(content_object, Decision):
            return f'/decisions/{content_object.id}'
        if isinstance(content_object, Document):
            return f'/business/documents/{content_object.id}'
        if isinstance(content_object, Task):
            return '/business/tasks'
        return ''
    
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
