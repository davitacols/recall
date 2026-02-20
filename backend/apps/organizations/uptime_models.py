from django.db import models
from django.utils import timezone

class UptimeLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('up', 'Up'),
        ('down', 'Down'),
        ('degraded', 'Degraded')
    ])
    response_time_ms = models.IntegerField(null=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    @staticmethod
    def get_uptime_percentage(days=30):
        """Calculate uptime percentage for last N days"""
        from datetime import timedelta
        start_date = timezone.now() - timedelta(days=days)
        
        total_logs = UptimeLog.objects.filter(timestamp__gte=start_date).count()
        if total_logs == 0:
            return 100.0
        
        up_logs = UptimeLog.objects.filter(
            timestamp__gte=start_date,
            status='up'
        ).count()
        
        return round((up_logs / total_logs) * 100, 2)
    
    @staticmethod
    def get_current_status():
        """Get current system status"""
        latest = UptimeLog.objects.first()
        if not latest:
            return 'unknown'
        
        # If last check was more than 5 minutes ago, status is unknown
        if (timezone.now() - latest.timestamp).seconds > 300:
            return 'unknown'
        
        return latest.status

class SecurityAudit(models.Model):
    audit_date = models.DateField()
    audit_type = models.CharField(max_length=50, choices=[
        ('penetration', 'Penetration Testing'),
        ('vulnerability', 'Vulnerability Assessment'),
        ('compliance', 'Compliance Audit'),
        ('code_review', 'Security Code Review')
    ])
    auditor = models.CharField(max_length=200)
    findings_count = models.IntegerField(default=0)
    critical_findings = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=[
        ('passed', 'Passed'),
        ('failed', 'Failed'),
        ('in_progress', 'In Progress')
    ])
    report_url = models.URLField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-audit_date']
    
    def __str__(self):
        return f"{self.get_audit_type_display()} - {self.audit_date}"
