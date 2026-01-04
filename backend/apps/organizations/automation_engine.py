from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from .automation_models import AutomationRule, AutomationExecution, AutomationTemplate
from .team_views import log_action
import json

class AutomationEngine:
    """Execute automation rules and actions"""
    
    @staticmethod
    def check_trigger(rule, obj, trigger_type):
        """Check if trigger conditions match"""
        if rule.trigger_type != trigger_type:
            return False
        
        conditions = rule.trigger_conditions
        if not conditions:
            return True
        
        # Simple condition matching
        for field, expected_value in conditions.items():
            if not hasattr(obj, field):
                return False
            
            actual_value = getattr(obj, field)
            operator = conditions.get(f'{field}_operator', 'equals')
            
            if operator == 'equals' and actual_value != expected_value:
                return False
            elif operator == 'contains' and expected_value not in str(actual_value):
                return False
            elif operator == 'gt' and actual_value <= expected_value:
                return False
            elif operator == 'lt' and actual_value >= expected_value:
                return False
        
        return True
    
    @staticmethod
    def execute_rule(rule, obj, user=None):
        """Execute a rule and its actions"""
        if rule.status != 'active':
            return None
        
        content_type = ContentType.objects.get_for_model(obj)
        execution = AutomationExecution.objects.create(
            rule=rule,
            content_type=content_type,
            object_id=obj.id,
            triggered_by=user,
            status='running'
        )
        
        results = {}
        try:
            for action_config in rule.action_configs.all().order_by('order'):
                result = AutomationEngine.execute_action(action_config, obj, user)
                results[action_config.action_type] = result
                
                if not result.get('success'):
                    execution.status = 'failed'
                    execution.error_message = result.get('message', 'Action failed')
                    execution.save()
                    return execution
            
            execution.status = 'success'
            execution.results = results
            execution.completed_at = timezone.now()
            execution.save()
            
            log_action(
                rule.organization,
                user,
                'create',
                execution,
                f"Automation rule executed: {rule.name}"
            )
            
        except Exception as e:
            execution.status = 'failed'
            execution.error_message = str(e)
            execution.completed_at = timezone.now()
            execution.save()
        
        return execution
    
    @staticmethod
    def execute_action(action_config, obj, user):
        """Execute a single action"""
        action_type = action_config.action_type
        config = action_config.config
        
        try:
            if action_type == 'assign_issue':
                return AutomationEngine._assign_issue(obj, config, user)
            elif action_type == 'change_status':
                return AutomationEngine._change_status(obj, config, user)
            elif action_type == 'add_label':
                return AutomationEngine._add_label(obj, config, user)
            elif action_type == 'send_notification':
                return AutomationEngine._send_notification(obj, config, user)
            elif action_type == 'create_comment':
                return AutomationEngine._create_comment(obj, config, user)
            elif action_type == 'move_to_sprint':
                return AutomationEngine._move_to_sprint(obj, config, user)
            elif action_type == 'lock_decision':
                return AutomationEngine._lock_decision(obj, config, user)
            elif action_type == 'create_issue':
                return AutomationEngine._create_issue(obj, config, user)
            elif action_type == 'webhook':
                return AutomationEngine._webhook(obj, config, user)
            else:
                return {'success': False, 'message': f'Unknown action type: {action_type}'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def _assign_issue(obj, config, user):
        """Assign issue to user"""
        from apps.agile.models import Issue
        if not isinstance(obj, Issue):
            return {'success': False, 'message': 'Object is not an issue'}
        
        assignee_id = config.get('assignee_id')
        if not assignee_id:
            return {'success': False, 'message': 'No assignee specified'}
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            assignee = User.objects.get(id=assignee_id)
            obj.assigned_to = assignee
            obj.save()
            return {'success': True, 'message': f'Assigned to {assignee.username}'}
        except User.DoesNotExist:
            return {'success': False, 'message': 'Assignee not found'}
    
    @staticmethod
    def _change_status(obj, config, user):
        """Change object status"""
        new_status = config.get('status')
        if not new_status:
            return {'success': False, 'message': 'No status specified'}
        
        if hasattr(obj, 'status'):
            obj.status = new_status
            obj.save()
            return {'success': True, 'message': f'Status changed to {new_status}'}
        return {'success': False, 'message': 'Object has no status field'}
    
    @staticmethod
    def _add_label(obj, config, user):
        """Add label to object"""
        label_name = config.get('label')
        if not label_name:
            return {'success': False, 'message': 'No label specified'}
        
        if hasattr(obj, 'labels'):
            obj.labels.add(label_name)
            return {'success': True, 'message': f'Added label: {label_name}'}
        return {'success': False, 'message': 'Object does not support labels'}
    
    @staticmethod
    def _send_notification(obj, config, user):
        """Send notification"""
        recipient_id = config.get('recipient_id')
        message = config.get('message', f'Notification for {obj}')
        
        from apps.notifications.models import Notification
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        try:
            recipient = User.objects.get(id=recipient_id)
            Notification.objects.create(
                user=recipient,
                title='Automation',
                message=message,
                notification_type='automation'
            )
            return {'success': True, 'message': f'Notification sent to {recipient.username}'}
        except User.DoesNotExist:
            return {'success': False, 'message': 'Recipient not found'}
    
    @staticmethod
    def _create_comment(obj, config, user):
        """Create comment on object"""
        from apps.conversations.models import Comment
        
        comment_text = config.get('text', 'Automated comment')
        
        try:
            Comment.objects.create(
                conversation_id=obj.id if hasattr(obj, 'id') else None,
                author=user,
                text=comment_text
            )
            return {'success': True, 'message': 'Comment created'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def _move_to_sprint(obj, config, user):
        """Move issue to sprint"""
        from apps.agile.models import Issue, Sprint
        
        if not isinstance(obj, Issue):
            return {'success': False, 'message': 'Object is not an issue'}
        
        sprint_id = config.get('sprint_id')
        if not sprint_id:
            return {'success': False, 'message': 'No sprint specified'}
        
        try:
            sprint = Sprint.objects.get(id=sprint_id)
            obj.sprint = sprint
            obj.save()
            return {'success': True, 'message': f'Moved to sprint: {sprint.name}'}
        except Sprint.DoesNotExist:
            return {'success': False, 'message': 'Sprint not found'}
    
    @staticmethod
    def _lock_decision(obj, config, user):
        """Lock decision"""
        from apps.decisions.models import Decision
        
        if not isinstance(obj, Decision):
            return {'success': False, 'message': 'Object is not a decision'}
        
        obj.is_locked = True
        obj.locked_by = user
        obj.locked_at = timezone.now()
        obj.save()
        return {'success': True, 'message': 'Decision locked'}
    
    @staticmethod
    def _create_issue(obj, config, user):
        """Create new issue"""
        from apps.agile.models import Issue
        
        title = config.get('title', 'Auto-created issue')
        description = config.get('description', '')
        
        try:
            issue = Issue.objects.create(
                title=title,
                description=description,
                created_by=user,
                organization=user.organization
            )
            return {'success': True, 'message': f'Issue created: {issue.id}'}
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    @staticmethod
    def _webhook(obj, config, user):
        """Call webhook"""
        import requests
        
        url = config.get('url')
        if not url:
            return {'success': False, 'message': 'No webhook URL specified'}
        
        try:
            payload = {
                'object_type': obj.__class__.__name__,
                'object_id': obj.id,
                'triggered_by': user.username if user else 'system'
            }
            response = requests.post(url, json=payload, timeout=5)
            return {'success': response.status_code < 400, 'message': f'Webhook called: {response.status_code}'}
        except Exception as e:
            return {'success': False, 'message': str(e)}

def trigger_automation(obj, trigger_type, user=None):
    """Trigger automation rules for an object"""
    from .models import Organization
    
    if not hasattr(obj, 'organization'):
        return []
    
    organization = obj.organization
    rules = AutomationRule.objects.filter(
        organization=organization,
        trigger_type=trigger_type,
        status='active'
    )
    
    executions = []
    for rule in rules:
        if AutomationEngine.check_trigger(rule, obj, trigger_type):
            execution = AutomationEngine.execute_rule(rule, obj, user)
            if execution:
                executions.append(execution)
    
    return executions
