from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.openapi import OpenApiParameter, OpenApiTypes
from rest_framework import serializers

SPECTACULAR_SETTINGS = {
    'TITLE': 'RECALL API',
    'DESCRIPTION': 'Organizational Memory & Decision Management System',
    'VERSION': '1.0.0',
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAuthenticated'],
    'SERVERS': [
        {'url': 'http://localhost:8000', 'description': 'Development'},
        {'url': 'https://api.recall.dev', 'description': 'Production'},
    ],
    'CONTACT': {
        'name': 'RECALL Support',
        'email': 'support@recall.dev',
    },
    'LICENSE': {
        'name': 'MIT',
    },
    'SECURITY': [
        {'bearerAuth': []},
    ],
    'COMPONENTS': {
        'securitySchemes': {
            'bearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            }
        }
    },
}
