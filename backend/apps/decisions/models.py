from django.db import models
from django.core.validators import MinLengthValidator
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.organizations.models import User, Organization
from apps.conversations.models import Conversation

class Decision(models.Model):
    STATUS_CHOICES = [
        ('proposed', 'Proposed'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('implemented', 'Implemented'),
        ('cancelled', 'Cancelled'),
    ]
    
    IMPACT_LEVELS = [
        ('low', 'Low Impact'),
        ('medium', 'Medium Impact'),
        ('high', 'High Impact'),
        ('critical', 'Critical Impact'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='decisions',
        db_index=True
    )
    title = models.CharField(
        max_length=255, 
        validators=[MinLengthValidator(5)],
        db_index=True
    )
    description = models.TextField(validators=[MinLengthValidator(10)])
    
    decision_maker = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='decisions_made',
        db_index=True
    )
    stakeholders = models.ManyToManyField(
        User, 
        related_name='decisions_involved',
        blank=True
    )
    
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='proposed',
        db_index=True
    )
    rationale = models.TextField()
    impact_level = models.CharField(
        max_length=10, 
        choices=IMPACT_LEVELS, 
        default='medium'
    )
    impact_assessment = models.TextField(blank=True)
    
    context_reason = models.TextField(blank=True)
    if_this_fails = models.TextField(blank=True)
    confidence_level = models.IntegerField(null=True, blank=True)
    confidence_votes = models.JSONField(default=list, blank=True)
    
    alternatives_considered = models.JSONField(default=list, blank=True)
    tradeoffs = models.TextField(blank=True)
    code_links = models.JSONField(default=list, blank=True)
    plain_language_summary = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    implementation_deadline = models.DateTimeField(null=True, blank=True)
    implemented_at = models.DateTimeField(null=True, blank=True)
    
    reminder_enabled = models.BooleanField(default=True)
    reminder_days = models.IntegerField(default=30)
    last_reminded_at = models.DateTimeField(null=True, blank=True)
    
    extracted_by_ai = models.BooleanField(default=False)
    ai_confidence_score = models.FloatField(null=True, blank=True)
    
    outcome_notes = models.TextField(blank=True)
    success_metrics = models.JSONField(default=dict, blank=True)
    
    is_locked = models.BooleanField(default=False, db_index=True)
    locked_at = models.DateTimeField(null=True, blank=True)
    locked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locked_decisions'
    )
    lock_reason = models.TextField(blank=True)
    
    review_scheduled_at = models.DateTimeField(null=True, blank=True)
    review_completed_at = models.DateTimeField(null=True, blank=True)
    was_successful = models.BooleanField(null=True, blank=True)
    impact_review_notes = models.TextField(blank=True)
    lessons_learned = models.TextField(blank=True)
    
    sprint = models.ForeignKey(
        'agile.Sprint',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='decisions'
    )
    
    class Meta:
        db_table = 'decisions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', '-created_at']),
            models.Index(fields=['organization', 'decision_maker', '-created_at']),
            models.Index(fields=['organization', 'impact_level', '-created_at']),
            models.Index(fields=['decided_at']),
        ]
    
    def __str__(self):
        return f"{self.get_status_display()}: {self.title}"
    
    def save(self, *args, **kwargs):
        try:
            from apps.organizations.automation_engine import trigger_automation
            from apps.organizations.analytics_engine import AnalyticsEngine
            from apps.notifications.models import Notification
            
            is_new = self.pk is None
            
            if is_new:
                super().save(*args, **kwargs)
                trigger_automation(self, 'decision_created', self.decision_maker)
                AnalyticsEngine.record_metric(
                    self.organization,
                    'decision_count',
                    1
                )
            else:
                old_decision = Decision.objects.get(pk=self.pk)
                super().save(*args, **kwargs)
                
                if not old_decision.is_locked and self.is_locked:
                    self.locked_at = timezone.now()
                    self.save(update_fields=['locked_at'])
                    trigger_automation(self, 'decision_locked', self.locked_by)
                    
                    # Send notifications to stakeholders
                    for stakeholder in self.stakeholders.all():
                        if stakeholder.id != self.locked_by.id:
                            Notification.objects.create(
                                user=stakeholder,
                                notification_type='decision',
                                title=f'{self.locked_by.get_full_name()} locked a decision',
                                message=f'"{self.title}"',
                                link=f'/decisions/{self.id}'
                            )
        except Exception:
            super().save(*args, **kwargs)
    
    def approve(self, approved_by=None):
        self.status = 'approved'
        self.decided_at = timezone.now()
        self.save()
    
    def implement(self):
        self.status = 'implemented'
        self.implemented_at = timezone.now()
        self.save()
    
    @property
    def is_overdue(self):
        if not self.implementation_deadline:
            return False
        return (
            self.status in ['approved', 'under_review'] and 
            timezone.now() > self.implementation_deadline
        )
    
    @property
    def needs_reminder(self):
        if not self.reminder_enabled or self.status not in ['approved', 'under_review']:
            return False
        if not self.decided_at:
            return False
        
        days_since_approval = (timezone.now() - self.decided_at).days
        
        if days_since_approval >= self.reminder_days:
            if self.last_reminded_at:
                days_since_reminder = (timezone.now() - self.last_reminded_at).days
                return days_since_reminder >= 7
            return True
        return False

class DecisionTag(models.Model):
    name = models.CharField(max_length=50, db_index=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    color = models.CharField(max_length=7, default='#3B82F6')
    description = models.TextField(blank=True)
    
    usage_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_tags'
        unique_together = ['name', 'organization']
        ordering = ['-usage_count', 'name']
    
    def __str__(self):
        return self.name

class DecisionTagging(models.Model):
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE)
    tag = models.ForeignKey(DecisionTag, on_delete=models.CASCADE)
    tagged_by = models.ForeignKey(User, on_delete=models.CASCADE)
    tagged_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_tagging'
        unique_together = ['decision', 'tag']

Decision.add_to_class(
    'tags',
    models.ManyToManyField(
        DecisionTag,
        through=DecisionTagging,
        related_name='decisions',
        blank=True
    )
)

class Proposal(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('open', 'Open for Discussion'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    rationale = models.TextField(blank=True)
    proposed_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proposals_created')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    alternatives_considered = models.TextField(blank=True)
    risks = models.TextField(blank=True)
    accepted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='proposals_accepted')
    accepted_at = models.DateTimeField(null=True, blank=True)
    decision = models.OneToOneField(Decision, on_delete=models.SET_NULL, null=True, blank=True, related_name='proposal')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'proposals'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'status', '-created_at']),
        ]

# Auto-linking signal for decisions
@receiver(post_save, sender=Decision)
def auto_link_decision(sender, instance, created, **kwargs):
    if created:
        try:
            from apps.knowledge.context_engine import ContextEngine
            engine = ContextEngine()
            engine.auto_link_content(instance, instance.organization)
        except Exception:
            pass
