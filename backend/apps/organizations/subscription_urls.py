from django.urls import path
from . import subscription_views

urlpatterns = [
    path('plans/', subscription_views.plans_list),
    path('subscription/', subscription_views.subscription_detail),
    path('subscription/upgrade/', subscription_views.upgrade_plan),
    path('subscription/cancel/', subscription_views.cancel_subscription),
    path('invoices/', subscription_views.invoices_list),
    path('usage/', subscription_views.usage_stats),
    path('check-limits/', subscription_views.check_limits),
]
