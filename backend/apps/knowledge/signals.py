from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from apps.conversations.models import Conversation
from apps.decisions.models import Decision
from apps.knowledge.unified_models import UnifiedActivity
from apps.knowledge.context_engine import ContextEngine

@receiver(post_save, sender=Conversation)
def track_conversation_activity(sender, instance, created, **kwargs):
    if created:
        UnifiedActivity.objects.create(
            organization=instance.organization,
            user=instance.author,
            activity_type='conversation_created',
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.id,
            title=instance.title,
            description=instance.content[:200]
        )
        if instance.ai_processed:
            try:
                ContextEngine.auto_link_content(instance, instance.organization)
            except:
                pass

@receiver(post_save, sender=Decision)
def track_decision_activity(sender, instance, created, **kwargs):
    if created:
        UnifiedActivity.objects.create(
            organization=instance.organization,
            user=instance.decision_maker,
            activity_type='decision_made',
            content_type=ContentType.objects.get_for_model(instance),
            object_id=instance.id,
            title=instance.title,
            description=instance.description[:200]
        )
        if instance.conversation:
            try:
                ContextEngine._create_link(
                    instance, instance.conversation,
                    instance.organization,
                    link_type='implements',
                    strength=1.0
                )
            except:
                pass
