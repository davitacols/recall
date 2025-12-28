from celery import shared_task
from django.utils import timezone
from .models import Decision

@shared_task
def check_decision_reminders():
    """Check and mark decisions that need reminders"""
    decisions = Decision.objects.filter(
        reminder_enabled=True,
        status='approved'
    )
    
    reminded_count = 0
    for decision in decisions:
        if decision.needs_reminder:
            decision.last_reminded_at = timezone.now()
            decision.save()
            reminded_count += 1
    
    return f"Reminded {reminded_count} decisions"
