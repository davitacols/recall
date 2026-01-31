from rest_framework.permissions import BasePermission

class IsOrgMember(BasePermission):
    """Check if user belongs to the organization"""
    def has_permission(self, request, view):
        return hasattr(request.user, 'organization') and request.user.organization is not None

class IsProjectMember(BasePermission):
    """Check if user can access project"""
    def has_object_permission(self, request, view, obj):
        return obj.organization == request.user.organization

class IsProjectLead(BasePermission):
    """Check if user is project lead"""
    def has_object_permission(self, request, view, obj):
        return obj.lead == request.user

class CanDeleteProject(BasePermission):
    """Only admins can delete projects"""
    def has_permission(self, request, view):
        if request.method != 'DELETE':
            return True
        return hasattr(request.user, 'role') and request.user.role == 'admin'

class CanEditIssue(BasePermission):
    """User can edit issue if assigned or reporter"""
    def has_object_permission(self, request, view, obj):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return obj.assignee == request.user or obj.reporter == request.user or request.user.role == 'admin'

class CanEditSprint(BasePermission):
    """User can edit sprint if project lead or admin"""
    def has_object_permission(self, request, view, obj):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return obj.project.lead == request.user or request.user.role == 'admin'
