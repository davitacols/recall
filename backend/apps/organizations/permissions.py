from enum import Enum
from functools import wraps
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework import status

class Permission(Enum):
    # User management
    MANAGE_USERS = 'manage_users'
    INVITE_USERS = 'invite_users'
    REMOVE_USERS = 'remove_users'
    CHANGE_USER_ROLE = 'change_user_role'
    
    # Project management
    CREATE_PROJECT = 'create_project'
    EDIT_PROJECT = 'edit_project'
    DELETE_PROJECT = 'delete_project'
    MANAGE_PROJECT_MEMBERS = 'manage_project_members'
    
    # Sprint management
    CREATE_SPRINT = 'create_sprint'
    EDIT_SPRINT = 'edit_sprint'
    DELETE_SPRINT = 'delete_sprint'
    
    # Issue management
    CREATE_ISSUE = 'create_issue'
    EDIT_ISSUE = 'edit_issue'
    DELETE_ISSUE = 'delete_issue'
    ASSIGN_ISSUE = 'assign_issue'
    
    # Decision management
    CREATE_DECISION = 'create_decision'
    EDIT_DECISION = 'edit_decision'
    LOCK_DECISION = 'lock_decision'
    APPROVE_DECISION = 'approve_decision'
    
    # Organization settings
    MANAGE_ORGANIZATION = 'manage_organization'
    VIEW_AUDIT_LOG = 'view_audit_log'
    MANAGE_INTEGRATIONS = 'manage_integrations'

ROLE_PERMISSIONS = {
    'admin': [p.value for p in Permission],
    'manager': [
        Permission.INVITE_USERS.value,
        Permission.REMOVE_USERS.value,
        Permission.CREATE_PROJECT.value,
        Permission.EDIT_PROJECT.value,
        Permission.MANAGE_PROJECT_MEMBERS.value,
        Permission.CREATE_SPRINT.value,
        Permission.EDIT_SPRINT.value,
        Permission.CREATE_ISSUE.value,
        Permission.EDIT_ISSUE.value,
        Permission.ASSIGN_ISSUE.value,
        Permission.CREATE_DECISION.value,
        Permission.EDIT_DECISION.value,
        Permission.APPROVE_DECISION.value,
        Permission.VIEW_AUDIT_LOG.value,
    ],
    'contributor': [
        Permission.CREATE_ISSUE.value,
        Permission.EDIT_ISSUE.value,
        Permission.CREATE_DECISION.value,
        Permission.EDIT_DECISION.value,
    ]
}

class HasPermission(BasePermission):
    def __init__(self, required_permission):
        self.required_permission = required_permission
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        user_permissions = ROLE_PERMISSIONS.get(request.user.role, [])
        return self.required_permission in user_permissions

def require_permission(permission):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                return Response({'error': 'Authentication required'}, 
                              status=status.HTTP_401_UNAUTHORIZED)
            
            user_permissions = ROLE_PERMISSIONS.get(request.user.role, [])
            if permission not in user_permissions:
                return Response({'error': 'Permission denied'}, 
                              status=status.HTTP_403_FORBIDDEN)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def get_user_permissions(user):
    """Get all permissions for a user based on their role"""
    return ROLE_PERMISSIONS.get(user.role, [])

def has_permission(user, permission):
    """Check if user has a specific permission"""
    return permission in get_user_permissions(user)
