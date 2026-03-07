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
}
