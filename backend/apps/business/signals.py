from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.business.models import Goal, Meeting, Task
from apps.agile.models import Project, Issue
from apps.knowledge.context_engine import ContextEngine

@receiver(post_save, sender=Goal)
def auto_link_goal(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content('business.goal', instance.id, instance.organization)

@receiver(post_save, sender=Meeting)
def auto_link_meeting(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content('business.meeting', instance.id, instance.organization)

@receiver(post_save, sender=Task)
def auto_link_task(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content('business.task', instance.id, instance.organization)

@receiver(post_save, sender=Project)
def auto_link_project(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content('agile.project', instance.id, instance.organization)

@receiver(post_save, sender=Issue)
def auto_link_issue(sender, instance, created, **kwargs):
    if created:
        engine = ContextEngine()
        engine.auto_link_content('agile.issue', instance.id, instance.organization)
