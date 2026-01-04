# Integration Guide: Add Trigger Calls to Models

## 1. Update Issue Model (apps/agile/models.py)

Add to Issue.save() method:

```python
def save(self, *args, **kwargs):
    is_new = self.pk is None
    super().save(*args, **kwargs)
    
    # Trigger automation
    from apps.organizations.automation_engine import trigger_automation
    
    if is_new:
        trigger_automation(self, 'issue_created', self.reporter)
    else:
        trigger_automation(self, 'issue_updated', self.reporter)
    
    # Record metrics
    from apps.organizations.analytics_engine import AnalyticsEngine
    if is_new:
        AnalyticsEngine.record_metric(
            self.organization,
            'issue_count',
            1,
            {'project_id': self.project_id}
        )
```

## 2. Update Decision Model (apps/decisions/models.py)

Add to Decision.save() method:

```python
def save(self, *args, **kwargs):
    is_new = self.pk is None
    super().save(*args, **kwargs)
    
    # Trigger automation
    from apps.organizations.automation_engine import trigger_automation
    
    if is_new:
        trigger_automation(self, 'decision_created', self.decision_maker)
    
    if self.is_locked and not self.locked_at:
        self.locked_at = timezone.now()
        trigger_automation(self, 'decision_locked', self.locked_by)
    
    # Record metrics
    from apps.organizations.analytics_engine import AnalyticsEngine
    if is_new:
        AnalyticsEngine.record_metric(
            self.organization,
            'decision_count',
            1
        )
```

## 3. Update Sprint Model (apps/agile/models.py)

Add status field and save method:

```python
# Add to Sprint model
status = models.CharField(
    max_length=20,
    choices=[('planning', 'Planning'), ('active', 'Active'), ('completed', 'Completed')],
    default='planning'
)

def save(self, *args, **kwargs):
    from django.utils import timezone
    from apps.organizations.automation_engine import trigger_automation
    
    # Check if sprint is starting
    if self.status == 'active' and self.pk:
        old_sprint = Sprint.objects.get(pk=self.pk)
        if old_sprint.status != 'active':
            trigger_automation(self, 'sprint_started', None)
    
    # Check if sprint is ending
    if self.status == 'completed' and self.pk:
        old_sprint = Sprint.objects.get(pk=self.pk)
        if old_sprint.status != 'completed':
            trigger_automation(self, 'sprint_ended', None)
    
    super().save(*args, **kwargs)
```

## 4. Update Comment Model (apps/conversations/models.py)

Add to Comment.save() method:

```python
def save(self, *args, **kwargs):
    is_new = self.pk is None
    super().save(*args, **kwargs)
    
    if is_new:
        from apps.organizations.automation_engine import trigger_automation
        trigger_automation(self, 'comment_added', self.author)
```

## 5. Register Service Worker (frontend/src/index.js)

Add after ReactDOM.render():

```javascript
// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed'));
  });
}
```

## 6. Add Offline Detection (frontend/src/App.js)

Add to App component:

```javascript
useEffect(() => {
  const handleOnline = () => {
    console.log('Back online');
    // Sync data
  };
  
  const handleOffline = () => {
    console.log('Offline');
    // Show offline indicator
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

## 7. Add Rate Limiting Middleware (backend/config/settings.py)

Add to MIDDLEWARE:

```python
MIDDLEWARE = [
    # ... existing middleware
    'django_ratelimit.middleware.RatelimitMiddleware',
]

# Rate limiting settings
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'
RATELIMIT_VIEW = '10/m'  # 10 requests per minute per view
```

## 8. Add Notification Triggers (apps/conversations/collaboration_views.py)

Update mention endpoint:

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_mention(request, comment_id):
    # ... existing code
    
    # Send notification
    from apps.notifications.models import Notification
    Notification.objects.create(
        user=mentioned_user,
        title='You were mentioned',
        message=f'{request.user.username} mentioned you in a comment',
        notification_type='mention'
    )
```

## 9. Seed Automation Templates

Run:
```bash
python manage.py seed_automation_templates
```

## 10. Create Scheduled Tasks (backend/config/celery.py)

Add periodic tasks:

```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    'record-daily-metrics': {
        'task': 'apps.organizations.tasks.record_daily_metrics',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
    'sync-integrations': {
        'task': 'apps.organizations.tasks.sync_integrations',
        'schedule': crontab(minute=0),  # Every hour
    },
    'send-reminders': {
        'task': 'apps.decisions.tasks.send_decision_reminders',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
    },
}
```

## Summary of Changes

| Component | Change | Priority |
|-----------|--------|----------|
| Issue Model | Add trigger calls | Critical |
| Decision Model | Add trigger calls | Critical |
| Sprint Model | Add status + trigger calls | Critical |
| Comment Model | Add trigger calls | Critical |
| Service Worker | Register in index.js | Important |
| App.js | Add offline detection | Important |
| Settings | Add rate limiting | Important |
| Collaboration Views | Add notifications | Important |
| Celery | Add scheduled tasks | Nice to have |

All changes are minimal and focused on integration only.
