from django.db import models
from django.utils import timezone
from apps.organizations.models import Organization, User
from apps.conversations.models import Conversation
from apps.decisions.models import Decision

class WorkflowTemplate(models.Model):
    """Workflow templates for common processes"""
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    trigger_type = models.CharField(max_length=50, choices=[
        ('conversation_created', 'Conversation Created'),
        ('decision_proposed', 'Decision Proposed'),
        ('issue_created', 'Issue Created'),
    ])
    actions = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'workflow_templates'


class WorkflowExecution(models.Model):
    """Track workflow executions"""
    
    template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE)
    trigger_id = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ])
    executed_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'workflow_executions'


class AutomationEngine:
    """Execute automated workflows"""
    
    @staticmethod
    def execute_workflow(template, trigger_data):
        """Execute workflow template"""
        execution = WorkflowExecution.objects.create(
            template=template,
            trigger_id=trigger_data.get('id'),
            status='running'
        )
        
        try:
            for action in template.actions:
                AutomationEngine.execute_action(action, trigger_data)
            
            execution.status = 'completed'
            execution.completed_at = timezone.now()
        except Exception as e:
            execution.status = 'failed'
            execution.error_message = str(e)
        
        execution.save()
        return execution
    
    @staticmethod
    def execute_action(action, trigger_data):
        """Execute single action"""
        action_type = action.get('type')
        
        if action_type == 'create_decision':
            AutomationEngine.create_decision_from_conversation(
                trigger_data.get('id'),
                action.get('config', {})
            )
        elif action_type == 'notify_users':
            AutomationEngine.notify_users(
                action.get('user_ids', []),
                action.get('message', '')
            )
        elif action_type == 'create_action_item':
            AutomationEngine.create_action_item(
                trigger_data.get('id'),
                action.get('config', {})
            )
        elif action_type == 'tag_content':
            AutomationEngine.tag_content(
                trigger_data.get('id'),
                action.get('tags', [])
            )
    
    @staticmethod
    def create_decision_from_conversation(conversation_id, config):
        """Auto-create decision from conversation"""
        conversation = Conversation.objects.get(id=conversation_id)
        
        Decision.objects.create(
            organization=conversation.organization,
            conversation=conversation,
            title=config.get('title', conversation.title),
            description=config.get('description', conversation.content),
            decision_maker=conversation.author,
            status='proposed',
            rationale=config.get('rationale', '')
        )
    
    @staticmethod
    def notify_users(user_ids, message):
        """Notify users"""
        from apps.notifications.models import Notification
        
        for user_id in user_ids:
            Notification.objects.create(
                user_id=user_id,
                title='Automated Notification',
                message=message,
                notification_type='automation'
            )
    
    @staticmethod
    def create_action_item(conversation_id, config):
        """Create action item"""
        from apps.conversations.models import ActionItem
        
        conversation = Conversation.objects.get(id=conversation_id)
        ActionItem.objects.create(
            conversation=conversation,
            title=config.get('title', 'Follow-up Action'),
            priority=config.get('priority', 'medium'),
            due_date=config.get('due_date')
        )
    
    @staticmethod
    def tag_content(content_id, tags):
        """Auto-tag content"""
        from apps.conversations.models import Tag
        
        conversation = Conversation.objects.get(id=content_id)
        for tag_name in tags:
            tag, _ = Tag.objects.get_or_create(
                name=tag_name,
                organization=conversation.organization
            )
            conversation.tags.add(tag)


class SmartNotificationEngine:
    """Smart notification system"""
    
    @staticmethod
    def should_notify(user, notification_type, context):
        """Determine if user should be notified"""
        from apps.conversations.models import UserPreferences
        
        try:
            prefs = user.preferences
        except UserPreferences.DoesNotExist:
            return True
        
        # Check quiet mode
        if prefs.quiet_mode:
            return False
        
        # Check muted topics
        if context.get('topic') in prefs.muted_topics:
            return False
        
        # Check muted post types
        if context.get('post_type') in prefs.muted_post_types:
            return False
        
        return True
    
    @staticmethod
    def batch_notifications(user, notifications, batch_size=5):
        """Batch notifications to reduce noise"""
        if len(notifications) <= batch_size:
            return notifications
        
        batches = []
        for i in range(0, len(notifications), batch_size):
            batch = notifications[i:i + batch_size]
            batches.append({
                'type': 'batch',
                'count': len(batch),
                'items': batch,
                'summary': f"You have {len(batch)} new updates"
            })
        
        return batches
    
    @staticmethod
    def get_notification_priority(notification_type, context):
        """Determine notification priority"""
        priority_map = {
            'decision_approved': 'high',
            'decision_rejected': 'high',
            'blocker_reported': 'critical',
            'mentioned': 'high',
            'reply': 'medium',
            'reaction': 'low',
        }
        
        return priority_map.get(notification_type, 'medium')


class DecisionTemplate(models.Model):
    """Decision templates for common decisions"""
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField()
    template_content = models.JSONField(default=dict)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_templates'
    
    @staticmethod
    def create_from_template(template_id, org_id, conversation_id, user):
        """Create decision from template"""
        template = DecisionTemplate.objects.get(id=template_id)
        conversation = Conversation.objects.get(id=conversation_id)
        
        decision_data = template.template_content.copy()
        decision_data.update({
            'organization_id': org_id,
            'conversation': conversation,
            'decision_maker': user,
        })
        
        return Decision.objects.create(**decision_data)
