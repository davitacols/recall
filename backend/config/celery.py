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
}