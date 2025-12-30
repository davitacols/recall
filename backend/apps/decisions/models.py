from django.db import models
from django.core.validators import MinLengthValidator
from django.utils import timezone
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
    
    # Core fields
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
    
    # Decision makers and stakeholders
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
    
    # Decision details
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
    
    # High-impact additions
    context_reason = models.TextField(blank=True, help_text="Why are we even talking about this?")
    if_this_fails = models.TextField(blank=True, help_text="What happens if this doesn't work?")
    confidence_level = models.IntegerField(null=True, blank=True, help_text="1-10: How confident are you this will work?")
    confidence_votes = models.JSONField(default=list, blank=True, help_text="List of {user_id, vote, timestamp}")
    
    # Alternative options considered
    alternatives_considered = models.JSONField(default=list, blank=True)
    tradeoffs = models.TextField(blank=True, help_text="What are the tradeoffs?")
    code_links = models.JSONField(default=list, blank=True, help_text="Links to PRs, commits, docs")
    plain_language_summary = models.TextField(blank=True, help_text="Non-technical explanation")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    decided_at = models.DateTimeField(null=True, blank=True)
    implementation_deadline = models.DateTimeField(null=True, blank=True)
    implemented_at = models.DateTimeField(null=True, blank=True)
    
    # Reminder settings
    reminder_enabled = models.BooleanField(default=True)
    reminder_days = models.IntegerField(default=30, help_text="Days after approval to remind")
    last_reminded_at = models.DateTimeField(null=True, blank=True)
    
    # AI extraction metadata
    extracted_by_ai = models.BooleanField(default=False)
    ai_confidence_score = models.FloatField(null=True, blank=True)
    
    # Decision outcome tracking
    outcome_notes = models.TextField(blank=True)
    success_metrics = models.JSONField(default=dict, blank=True)
    
    # Phase 2: Decision Locking
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
    
    # Phase 2: Impact Review
    review_scheduled_at = models.DateTimeField(null=True, blank=True)
    review_completed_at = models.DateTimeField(null=True, blank=True)
    was_successful = models.BooleanField(null=True, blank=True)
    impact_review_notes = models.TextField(blank=True)
    lessons_learned = models.TextField(blank=True)
    
    # Sprint linking
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
    
    def approve(self, approved_by=None):
        """Approve the decision"""
        self.status = 'approved'
        self.decided_at = timezone.now()
        self.save()
    
    def implement(self):
        """Mark decision as implemented"""
        self.status = 'implemented'
        self.implemented_at = timezone.now()
        self.save()
    
    @property
    def is_overdue(self):
        """Check if implementation is overdue"""
        if not self.implementation_deadline:
            return False
        return (
            self.status in ['approved', 'under_review'] and 
            timezone.now() > self.implementation_deadline
        )
    
    @property
    def needs_reminder(self):
        """Check if decision needs a reminder"""
        if not self.reminder_enabled or self.status not in ['approved', 'under_review']:
            return False
        if not self.decided_at:
            return False
        
        days_since_approval = (timezone.now() - self.decided_at).days
        
        # Check if it's time for reminder
        if days_since_approval >= self.reminder_days:
            # Check if already reminded recently (within 7 days)
            if self.last_reminded_at:
                days_since_reminder = (timezone.now() - self.last_reminded_at).days
                return days_since_reminder >= 7
            return True
        return False

class DecisionTag(models.Model):
    name = models.CharField(max_length=50, db_index=True)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    color = models.CharField(max_length=7, default='#3B82F6')  # Hex color
    description = models.TextField(blank=True)
    
    # Usage tracking
    usage_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_tags'
        unique_together = ['name', 'organization']
        ordering = ['-usage_count', 'name']
    
    def __str__(self):
        return self.name

class DecisionTagging(models.Model):
    """Through model for Decision-Tag relationship with metadata"""
    decision = models.ForeignKey(Decision, on_delete=models.CASCADE)
    tag = models.ForeignKey(DecisionTag, on_delete=models.CASCADE)
    tagged_by = models.ForeignKey(User, on_delete=models.CASCADE)
    tagged_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'decision_tagging'
        unique_together = ['decision', 'tag']

# Add the many-to-many relationship to Decision
Decision.add_to_class(
    'tags',
    models.ManyToManyField(
        DecisionTag,
        through=DecisionTagging,
        related_name='decisions',
        blank=True
    )
)