from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .subscription_models import Plan, Subscription, Invoice, UsageLog

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def plans_list(request):
    plans = Plan.objects.filter(is_active=True)
    data = [{
        'id': p.id,
        'name': p.name,
        'display_name': p.get_name_display(),
        'price_per_user': str(p.price_per_user),
        'max_users': p.max_users,
        'storage_gb': p.storage_gb,
        'features': p.features
    } for p in plans]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_detail(request):
    try:
        sub = request.user.organization.subscription
        return Response({
            'id': sub.id,
            'plan': {
                'name': sub.plan.name,
                'display_name': sub.plan.get_name_display(),
                'price_per_user': str(sub.plan.price_per_user),
                'max_users': sub.plan.max_users,
                'storage_gb': sub.plan.storage_gb
            },
            'status': sub.status,
            'user_count': sub.user_count,
            'storage_used_mb': sub.storage_used_mb,
            'storage_limit_mb': sub.storage_limit_mb,
            'storage_percentage': round((sub.storage_used_mb / sub.storage_limit_mb) * 100, 2),
            'is_trial': sub.is_trial,
            'trial_end': sub.trial_end,
            'current_period_end': sub.current_period_end,
            'can_add_user': sub.can_add_user,
            'can_upload': sub.can_upload
        })
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upgrade_plan(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    
    plan_id = request.data.get('plan_id')
    try:
        plan = Plan.objects.get(id=plan_id)
        sub = request.user.organization.subscription
        sub.plan = plan
        sub.status = 'active'
        sub.save()
        return Response({'message': 'Plan upgraded successfully'})
    except (Plan.DoesNotExist, Subscription.DoesNotExist):
        return Response({'error': 'Invalid request'}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    if request.user.role != 'admin':
        return Response({'error': 'Admin only'}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        sub = request.user.organization.subscription
        sub.status = 'canceled'
        sub.save()
        return Response({'message': 'Subscription canceled'})
    except Subscription.DoesNotExist:
        return Response({'error': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoices_list(request):
    try:
        sub = request.user.organization.subscription
        invoices = sub.invoices.all()[:12]
        data = [{
            'id': inv.id,
            'amount': str(inv.amount),
            'status': inv.status,
            'period_start': inv.period_start,
            'period_end': inv.period_end,
            'due_date': inv.due_date,
            'paid_at': inv.paid_at,
            'invoice_pdf': inv.invoice_pdf
        } for inv in invoices]
        return Response(data)
    except Subscription.DoesNotExist:
        return Response([])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def usage_stats(request):
    try:
        sub = request.user.organization.subscription
        logs = sub.usage_logs.all()[:30]
        data = [{
            'user_count': log.user_count,
            'storage_used_mb': log.storage_used_mb,
            'logged_at': log.logged_at
        } for log in logs]
        return Response(data)
    except Subscription.DoesNotExist:
        return Response([])

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def check_limits(request):
    action = request.data.get('action')  # 'add_user' or 'upload_file'
    file_size_mb = request.data.get('file_size_mb', 0)
    
    try:
        sub = request.user.organization.subscription
        
        if action == 'add_user':
            if not sub.can_add_user:
                return Response({
                    'allowed': False,
                    'message': f'User limit reached ({sub.plan.max_users} users). Upgrade to add more.'
                })
        
        elif action == 'upload_file':
            if not sub.can_upload or (sub.storage_used_mb + file_size_mb) > sub.storage_limit_mb:
                return Response({
                    'allowed': False,
                    'message': f'Storage limit reached ({sub.plan.storage_gb}GB). Upgrade for more storage.'
                })
        
        return Response({'allowed': True})
    except Subscription.DoesNotExist:
        return Response({'allowed': False, 'message': 'No subscription found'}, status=status.HTTP_404_NOT_FOUND)
