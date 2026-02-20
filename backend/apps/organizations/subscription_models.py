from django.db import models
from django.utils import timezone

class Plan(models.Model):
    PLAN_TYPES = [
        ('starter', 'Starter'),
        ('professional', 'Professional'),
        ('enterprise', 'Enterprise'),
    ]
    
    name = models.CharField(max_length=50, choices=PLAN_TYPES, unique=True)
    price_per_user = models.DecimalField(max_digits=10, decimal_places=2)
    max_users = models.IntegerField(null=True, blank=True)  # None = unlimited
    storage_gb = models.IntegerField()
    features = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.get_name_display()

class Subscription(models.Model):
    STATUS_CHOICES = [
        ('trial', 'Trial'),
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('canceled', 'Canceled'),
        ('expired', 'Expired'),
    ]
    
    organization = models.OneToOneField('organizations.Organization', on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='trial')
    user_count = models.IntegerField(default=0)
    storage_used_mb = models.BigIntegerField(default=0)
    
    trial_start = models.DateTimeField(null=True, blank=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(default=timezone.now)
    current_period_end = models.DateTimeField(null=True, blank=True)
    
    stripe_customer_id = models.CharField(max_length=255, blank=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.organization.name} - {self.plan.name}"
    
    @property
    def is_trial(self):
        return self.status == 'trial' and self.trial_end and timezone.now() < self.trial_end
    
    @property
    def can_add_user(self):
        if self.plan.max_users is None:
            return True
        return self.user_count < self.plan.max_users
    
    @property
    def storage_limit_mb(self):
        return self.plan.storage_gb * 1024
    
    @property
    def can_upload(self):
        return self.storage_used_mb < self.storage_limit_mb

class Invoice(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('open', 'Open'),
        ('paid', 'Paid'),
        ('void', 'Void'),
    ], default='draft')
    
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    due_date = models.DateTimeField()
    paid_at = models.DateTimeField(null=True, blank=True)
    
    stripe_invoice_id = models.CharField(max_length=255, blank=True)
    invoice_pdf = models.URLField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Invoice {self.id} - {self.subscription.organization.name}"

class UsageLog(models.Model):
    subscription = models.ForeignKey(Subscription, on_delete=models.CASCADE, related_name='usage_logs')
    user_count = models.IntegerField()
    storage_used_mb = models.BigIntegerField()
    logged_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-logged_at']
