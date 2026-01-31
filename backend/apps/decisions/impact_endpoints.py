from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from apps.decisions.impact_models import DecisionMetric, MetricDataPoint
from apps.decisions.models import Decision

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def decision_metrics(request, decision_id):
    """List or create metrics for a decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    if request.method == 'GET':
        metrics = decision.metrics.all()
        return Response([{
            'id': m.id,
            'name': m.name,
            'type': m.metric_type,
            'baseline_value': m.baseline_value,
            'baseline_date': m.baseline_date.isoformat(),
            'current_value': m.current_value,
            'current_date': m.current_date.isoformat() if m.current_date else None,
            'target_value': m.target_value,
            'target_date': m.target_date.isoformat() if m.target_date else None,
            'unit': m.unit,
            'impact': m.current_value - m.baseline_value if m.current_value else None,
            'impact_percentage': ((m.current_value - m.baseline_value) / m.baseline_value * 100) if m.current_value and m.baseline_value else None
        } for m in metrics])
    
    # POST - Create metric
    metric = DecisionMetric.objects.create(
        organization=request.user.organization,
        decision=decision,
        name=request.data['name'],
        metric_type=request.data.get('type', 'custom'),
        description=request.data.get('description', ''),
        baseline_value=request.data['baseline_value'],
        baseline_date=request.data['baseline_date'],
        target_value=request.data.get('target_value'),
        target_date=request.data.get('target_date'),
        unit=request.data.get('unit', ''),
        created_by=request.user
    )
    
    return Response({'id': metric.id, 'name': metric.name})

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def metric_detail(request, metric_id):
    """Get, update, or delete metric"""
    try:
        metric = DecisionMetric.objects.get(id=metric_id, organization=request.user.organization)
    except DecisionMetric.DoesNotExist:
        return Response({'error': 'Metric not found'}, status=404)
    
    if request.method == 'GET':
        data_points = metric.data_points.all().order_by('recorded_date')
        return Response({
            'id': metric.id,
            'name': metric.name,
            'type': metric.metric_type,
            'description': metric.description,
            'baseline_value': metric.baseline_value,
            'baseline_date': metric.baseline_date.isoformat(),
            'current_value': metric.current_value,
            'current_date': metric.current_date.isoformat() if metric.current_date else None,
            'target_value': metric.target_value,
            'target_date': metric.target_date.isoformat() if metric.target_date else None,
            'unit': metric.unit,
            'data_points': [{
                'value': dp.value,
                'date': dp.recorded_date.isoformat(),
                'recorded_by': dp.recorded_by.get_full_name()
            } for dp in data_points]
        })
    
    if request.method == 'PUT':
        metric.current_value = request.data.get('current_value', metric.current_value)
        metric.current_date = request.data.get('current_date', metric.current_date)
        metric.target_value = request.data.get('target_value', metric.target_value)
        metric.target_date = request.data.get('target_date', metric.target_date)
        metric.save()
        return Response({'message': 'Metric updated'})
    
    if request.method == 'DELETE':
        metric.delete()
        return Response({'message': 'Metric deleted'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def record_metric_data(request, metric_id):
    """Record a data point for metric"""
    try:
        metric = DecisionMetric.objects.get(id=metric_id, organization=request.user.organization)
    except DecisionMetric.DoesNotExist:
        return Response({'error': 'Metric not found'}, status=404)
    
    data_point = MetricDataPoint.objects.create(
        metric=metric,
        value=request.data['value'],
        recorded_date=request.data.get('recorded_date', timezone.now().date()),
        recorded_by=request.user
    )
    
    # Update metric current value
    metric.current_value = data_point.value
    metric.current_date = data_point.recorded_date
    metric.save()
    
    return Response({'id': data_point.id, 'value': data_point.value})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def decision_impact_report(request, decision_id):
    """Get impact report for decision"""
    try:
        decision = Decision.objects.get(id=decision_id, organization=request.user.organization)
    except Decision.DoesNotExist:
        return Response({'error': 'Decision not found'}, status=404)
    
    metrics = decision.metrics.all()
    
    impact_summary = {
        'total_metrics': metrics.count(),
        'metrics_on_track': 0,
        'metrics_off_track': 0,
        'avg_impact_percentage': 0,
        'metrics': []
    }
    
    impact_percentages = []
    
    for m in metrics:
        if m.current_value and m.baseline_value:
            impact_pct = (m.current_value - m.baseline_value) / m.baseline_value * 100
            impact_percentages.append(impact_pct)
            
            on_track = True
            if m.target_value:
                if m.baseline_value < m.target_value:
                    on_track = m.current_value >= m.target_value
                else:
                    on_track = m.current_value <= m.target_value
            
            if on_track:
                impact_summary['metrics_on_track'] += 1
            else:
                impact_summary['metrics_off_track'] += 1
            
            impact_summary['metrics'].append({
                'name': m.name,
                'type': m.metric_type,
                'baseline': m.baseline_value,
                'current': m.current_value,
                'target': m.target_value,
                'impact_percentage': round(impact_pct, 2),
                'on_track': on_track,
                'unit': m.unit
            })
    
    if impact_percentages:
        impact_summary['avg_impact_percentage'] = round(sum(impact_percentages) / len(impact_percentages), 2)
    
    return Response(impact_summary)
