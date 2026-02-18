from django.contrib import admin
from .time_tracking_models import WorkLog, TimeEstimate

@admin.register(WorkLog)
class WorkLogAdmin(admin.ModelAdmin):
    list_display = ['issue', 'user', 'time_spent_minutes', 'started_at', 'created_at']
    list_filter = ['started_at', 'organization']
    search_fields = ['issue__key', 'user__email', 'description']
    date_hierarchy = 'started_at'

@admin.register(TimeEstimate)
class TimeEstimateAdmin(admin.ModelAdmin):
    list_display = ['issue', 'original_estimate_minutes', 'remaining_estimate_minutes', 'updated_at']
    search_fields = ['issue__key']
