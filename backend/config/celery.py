import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('recall')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

app.conf.beat_schedule = {
    'check-decision-reminders': {
        'task': 'apps.decisions.tasks.check_decision_reminders',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
    },
    'decision-intelligence-sweep': {
        'task': 'apps.decisions.tasks.decision_intelligence_sweep',
        'schedule': crontab(hour=9, minute=5),  # Daily at 9:05 AM (after reminders)
    },
    'send-weekly-intelligence-digest': {
        'task': 'apps.decisions.tasks.send_weekly_intelligence_digest',
        'schedule': crontab(hour=9, minute=10, day_of_week='mon'),  # Mondays 9:10 AM
    },
    'send-hourly-notification-digests': {
        'task': 'apps.notifications.tasks.send_hourly_digests',
        'schedule': crontab(minute=0),  # Top of every hour
    },
    'send-daily-notification-digests': {
        'task': 'apps.notifications.tasks.send_daily_digests',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
    },
    'send-weekly-notification-digests': {
        'task': 'apps.notifications.tasks.send_weekly_digests',
        'schedule': crontab(hour=9, minute=0, day_of_week='mon'),  # Mondays at 9 AM
    },
    'send-scheduled-marketing-campaigns': {
        'task': 'apps.notifications.tasks.send_scheduled_marketing_campaigns',
        'schedule': crontab(minute='*/10'),  # Every 10 minutes
    },
    'train-org-knowledge-models-nightly': {
        'task': 'apps.knowledge.tasks.train_all_org_knowledge_models_nightly',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    'webhook-retry-sweep': {
        'task': 'apps.organizations.tasks.webhook_retry_sweep',
        'schedule': crontab(minute='*/2'),  # Every 2 minutes — backoff is in-task
    },
    'disable-failing-webhooks': {
        'task': 'apps.organizations.tasks.disable_failing_webhooks',
        'schedule': crontab(hour=3, minute=30),  # Nightly cleanup
    },
}
