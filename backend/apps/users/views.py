from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model, authenticate
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.cache import cache
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
import logging
import boto3
import secrets
import hashlib
from django.conf import settings
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from .auth_utils import (
    check_rate_limit,
    validate_email,
    validate_password,
    validate_username,
    generate_unique_org_username,
)
from .bot_protection import verify_turnstile_token
from apps.notifications.email_service import (
    send_password_reset_email,
    send_welcome_email,
    send_workspace_switch_code_email,
    build_frontend_url,
)
from apps.organizations.auditlog_models import AuditLog

User = get_user_model()
logger = logging.getLogger(__name__)
WORKSPACE_SWITCH_CODE_TTL_SECONDS = 600


def _workspace_switch_code_cache_key(user_id, org_slug):
    return f"workspace_switch_code:{user_id}:{org_slug}"


def _log_auth_audit(organization, user, resource_type, details, request, action='login'):
    try:
        AuditLog.log(
            organization=organization,
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=user.id if user else None,
            details=details or {},
            request=request,
        )
    except Exception:
        logger.exception("Failed to write auth audit log for resource_type=%s", resource_type)


def _log_auth_audit_throttled(organization, user, resource_type, details, request, throttle_key, ttl_seconds=300, action='login'):
    if not organization:
        return
    cache_key = f"auth_audit_throttle:{throttle_key}"
    if cache.get(cache_key):
        return
    cache.set(cache_key, 1, timeout=ttl_seconds)
    _log_auth_audit(organization, user, resource_type, details, request, action=action)


def _normalize_user_role(role):
    if role == 'member':
        return 'contributor'
    return role


def _build_auth_payload(user):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(user)
    refresh['organization_id'] = user.organization_id
    refresh['organization_slug'] = user.organization.slug

    return {
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
        'id_token': str(refresh.access_token),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'full_name': user.get_full_name(),
            'role': user.role,
            'organization_name': user.organization.name,
            'organization_slug': user.organization.slug,
        }
    }


def _resolve_google_user(email, preferred_org_slug=None):
    users_qs = User.objects.filter(email__iexact=email, is_active=True).select_related('organization')
    users = list(users_qs)

    if not users:
        from apps.organizations.models import Invitation

        invitation = (
            Invitation.objects
            .filter(email__iexact=email, is_accepted=False, expires_at__gt=timezone.now())
            .select_related('organization')
            .order_by('-created_at')
            .first()
        )
        if not invitation:
            return None

        existing_user = User.objects.filter(email__iexact=email, organization=invitation.organization).first()
        display_name = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
        if existing_user:
            user = existing_user
            user.is_active = True
            user.role = _normalize_user_role(invitation.role or 'contributor')
            if not user.full_name:
                user.full_name = display_name
            if not user.first_name:
                user.first_name = display_name.split()[0] if display_name else email.split('@')[0]
            user.set_unusable_password()
            user.save(update_fields=['is_active', 'role', 'full_name', 'first_name', 'password'])
        else:
            username = generate_unique_org_username(email, invitation.organization.slug)
            user = User.objects.create_user(
                username=username,
                email=email,
                password=None,
                organization=invitation.organization,
                full_name=display_name,
                first_name=display_name.split()[0] if display_name else email.split('@')[0],
                role=_normalize_user_role(invitation.role or 'contributor'),
            )
            user.set_unusable_password()
            user.save(update_fields=['password'])

        invitation.is_accepted = True
        invitation.accepted_at = timezone.now()
        invitation.save(update_fields=['is_accepted', 'accepted_at'])
        return user

    if preferred_org_slug:
        match = next((u for u in users if u.organization.slug == preferred_org_slug), None)
        if match:
            return match

    users.sort(
        key=lambda candidate: (
            1 if candidate.last_login else 0,
            candidate.last_login.timestamp() if candidate.last_login else 0,
            candidate.id,
        ),
        reverse=True,
    )
    return users[0]


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '')
    turnstile_token = request.data.get('turnstile_token')
    org_slug = (request.data.get('org_slug') or request.data.get('organization_slug') or request.data.get('organization') or '').strip().lower()
    preferred_org_slug = (request.data.get('preferred_org_slug') or '').strip().lower()
    
    if not username or not password:
        return Response({'error': 'Username and password required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Rate limiting
    if not check_rate_limit(username):
        logger.warning(f"Rate limit exceeded for login attempt: {username}")
        if '@' in username:
            matched_orgs = User.objects.filter(email__iexact=username, is_active=True).values_list('organization_id', flat=True).distinct()
            for org_id in matched_orgs:
                org_user = User.objects.filter(organization_id=org_id).only('organization').first()
                if not org_user:
                    continue
                throttled_hash = hashlib.sha256(f"{username}:{org_id}:login_rate_limited".encode()).hexdigest()[:16]
                _log_auth_audit_throttled(
                    organization=org_user.organization,
                    user=None,
                    resource_type='auth_login_rate_limited',
                    details={'input_is_email': True},
                    request=request,
                    throttle_key=throttled_hash,
                    ttl_seconds=600,
                )
        return Response(
            {'error': 'Too many login attempts. Try again later.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    ok, captcha_error = verify_turnstile_token(request, turnstile_token)
    if not ok:
        return Response({'error': captcha_error}, status=status.HTTP_400_BAD_REQUEST)
    
    # Input validation
    try:
        if '@' in username:
            validate_email(username)
        else:
            validate_username(username)
    except ValidationError as e:
        logger.warning(f"Invalid input for login: {username}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    user = None

    # Org-scoped login: prevent cross-organization account collisions by email.
    if org_slug:
        user_obj = None
        if '@' in username:
            user_obj = User.objects.filter(
                email__iexact=username,
                organization__slug=org_slug,
                is_active=True
            ).first()
        else:
            user_obj = User.objects.filter(
                username__iexact=username,
                organization__slug=org_slug,
                is_active=True
            ).first()

        if user_obj:
            user = authenticate(username=user_obj.username, password=password)
            if not user:
                _log_auth_audit_throttled(
                    organization=user_obj.organization,
                    user=user_obj,
                    resource_type='auth_login_failed',
                    details={'reason': 'invalid_credentials', 'org_slug': org_slug, 'org_scoped': True},
                    request=request,
                    throttle_key=f"org_login_failed:{user_obj.id}",
                    ttl_seconds=300,
                )
    else:
        # Backward compatibility: direct username login.
        user = authenticate(username=username, password=password)

        # Email login fallback without frontend org picker.
        # If multiple org accounts share the same email, resolve by password match,
        # then prefer the most recently active account when still ambiguous.
        if not user and '@' in username:
            matches = User.objects.filter(email__iexact=username, is_active=True).select_related('organization')
            matched_by_password = [candidate for candidate in matches if candidate.check_password(password)]

            if len(matched_by_password) == 1:
                user = matched_by_password[0]
            elif len(matched_by_password) > 1:
                preferred_match = None
                if preferred_org_slug:
                    preferred_match = next(
                        (candidate for candidate in matched_by_password if candidate.organization.slug == preferred_org_slug),
                        None,
                    )
                if preferred_match:
                    user = preferred_match
                else:
                    matched_by_password.sort(
                        key=lambda candidate: (
                            1 if candidate.last_login else 0,
                            candidate.last_login.timestamp() if candidate.last_login else 0,
                            candidate.id,
                        ),
                        reverse=True,
                    )
                    user = matched_by_password[0]
            elif matches.count() == 1:
                user = authenticate(username=matches.first().username, password=password)
    
    if user:
        logger.info(f"Successful login for user: {user.username}")
        _log_auth_audit(
            organization=user.organization,
            user=user,
            resource_type='auth_login',
            details={
                'method': 'password',
                'org_slug': user.organization.slug,
                'input_is_email': '@' in username,
            },
            request=request,
        )
        return Response(_build_auth_payload(user))
    
    logger.warning(f"Failed login attempt for: {username}")
    if '@' in username:
        matched_users = User.objects.filter(email__iexact=username, is_active=True).select_related('organization')
        for matched_user in matched_users:
            throttle_hash = hashlib.sha256(
                f"{username}:{matched_user.organization_id}:login_failed".encode()
            ).hexdigest()[:16]
            _log_auth_audit_throttled(
                organization=matched_user.organization,
                user=matched_user,
                resource_type='auth_login_failed',
                details={'reason': 'invalid_credentials', 'org_slug': matched_user.organization.slug, 'org_scoped': bool(org_slug)},
                request=request,
                throttle_key=throttle_hash,
                ttl_seconds=300,
            )
    return Response({'error': 'Invalid credentials'}, 
                   status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    credential = (request.data.get('credential') or '').strip()
    preferred_org_slug = (request.data.get('preferred_org_slug') or '').strip().lower()

    if not credential:
        return Response({'error': 'Google credential is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not settings.GOOGLE_CLIENT_ID:
        return Response({'error': 'Google Sign-In is not configured'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        id_info = google_id_token.verify_oauth2_token(
            credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception:
        return Response({'error': 'Invalid Google credential'}, status=status.HTTP_401_UNAUTHORIZED)

    if id_info.get('iss') not in ['accounts.google.com', 'https://accounts.google.com']:
        return Response({'error': 'Invalid Google issuer'}, status=status.HTTP_401_UNAUTHORIZED)

    email = (id_info.get('email') or '').strip().lower()
    email_verified = bool(id_info.get('email_verified'))
    if not email or not email_verified:
        return Response({'error': 'Google account email is not verified'}, status=status.HTTP_401_UNAUTHORIZED)

    user = _resolve_google_user(email=email, preferred_org_slug=preferred_org_slug)
    if not user:
        return Response(
            {'error': 'No workspace account found for this Google email. Ask an admin to invite you first.'},
            status=status.HTTP_404_NOT_FOUND
        )

    _log_auth_audit(
        organization=user.organization,
        user=user,
        resource_type='auth_login_google',
        details={
            'method': 'google',
            'org_slug': user.organization.slug,
            'google_sub': id_info.get('sub'),
        },
        request=request,
    )
    return Response(_build_auth_payload(user))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def team(request):
    """Get all team members in the user's organization"""
    organization = request.user.organization
    users = User.objects.filter(organization=organization).values(
        'id', 'username', 'email', 'full_name', 'role'
    )
    return Response(list(users))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def workspaces(request):
    user = request.user
    workspace_users = (
        User.objects.filter(email__iexact=user.email, is_active=True)
        .select_related('organization')
        .order_by('organization__name', 'id')
    )

    return Response({
        'current_org_slug': user.organization.slug,
        'workspaces': [
            {
                'org_id': wu.organization_id,
                'org_name': wu.organization.name,
                'org_slug': wu.organization.slug,
                'role': wu.role,
                'user_id': wu.id,
            }
            for wu in workspace_users
        ],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_workspace_switch_code(request):
    org_slug = (request.data.get('org_slug') or '').strip().lower()
    if not org_slug:
        return Response({'error': 'org_slug is required'}, status=status.HTTP_400_BAD_REQUEST)

    if not check_rate_limit(
        f"switch_workspace_code:{request.user.id}",
        action='switch_workspace_code',
        limit=20,
        window=3600,
    ):
        _log_auth_audit_throttled(
            organization=request.user.organization,
            user=request.user,
            resource_type='workspace_switch_code_rate_limited',
            details={'reason': 'rate_limited'},
            request=request,
            throttle_key=f"switch_code_rate_limited:{request.user.id}",
            ttl_seconds=600,
        )
        return Response({'error': 'Too many code requests. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    target_user = User.objects.filter(
        email__iexact=request.user.email,
        organization__slug=org_slug,
        is_active=True
    ).select_related('organization').first()
    if not target_user:
        _log_auth_audit_throttled(
            organization=request.user.organization,
            user=request.user,
            resource_type='workspace_switch_code_failed',
            details={'reason': 'workspace_not_found', 'target_org_slug': org_slug},
            request=request,
            throttle_key=f"switch_code_missing_workspace:{request.user.id}:{org_slug}",
            ttl_seconds=300,
        )
        return Response({'error': 'Workspace not found for this account'}, status=status.HTTP_404_NOT_FOUND)

    otp_code = f"{secrets.randbelow(1000000):06d}"
    cache.set(
        _workspace_switch_code_cache_key(request.user.id, org_slug),
        {'code': otp_code, 'target_user_id': target_user.id},
        timeout=WORKSPACE_SWITCH_CODE_TTL_SECONDS,
    )

    sent = send_workspace_switch_code_email(request.user, target_user.organization.name, otp_code)
    if not sent:
        _log_auth_audit_throttled(
            organization=request.user.organization,
            user=request.user,
            resource_type='workspace_switch_code_failed',
            details={'reason': 'email_send_failed', 'target_org_slug': org_slug},
            request=request,
            throttle_key=f"switch_code_email_failed:{request.user.id}:{org_slug}",
            ttl_seconds=300,
        )
        return Response({'error': 'Unable to send verification code right now'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    _log_auth_audit(
        organization=request.user.organization,
        user=request.user,
        resource_type='workspace_switch_code_requested',
        details={
            'target_org_slug': org_slug,
            'target_org_name': target_user.organization.name,
            'expires_in_seconds': WORKSPACE_SWITCH_CODE_TTL_SECONDS,
        },
        request=request,
    )

    return Response({
        'message': 'Verification code sent',
        'expires_in_seconds': WORKSPACE_SWITCH_CODE_TTL_SECONDS,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def switch_workspace(request):
    org_slug = (request.data.get('org_slug') or '').strip().lower()
    password = request.data.get('password') or ''
    otp_code = (request.data.get('otp_code') or '').strip()

    if not org_slug:
        return Response({'error': 'org_slug is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not password and not otp_code:
        return Response({'error': 'Provide password or otp_code'}, status=status.HTTP_400_BAD_REQUEST)

    if not check_rate_limit(f"switch_workspace:{request.user.id}", action='switch_workspace', limit=30, window=3600):
        _log_auth_audit_throttled(
            organization=request.user.organization,
            user=request.user,
            resource_type='workspace_switch_rate_limited',
            details={'reason': 'rate_limited'},
            request=request,
            throttle_key=f"switch_workspace_rate_limited:{request.user.id}",
            ttl_seconds=600,
        )
        return Response({'error': 'Too many workspace switch attempts. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    target_user = User.objects.filter(
        email__iexact=request.user.email,
        organization__slug=org_slug,
        is_active=True
    ).first()
    if not target_user:
        _log_auth_audit_throttled(
            organization=request.user.organization,
            user=request.user,
            resource_type='workspace_switch_failed',
            details={'reason': 'workspace_not_found', 'target_org_slug': org_slug},
            request=request,
            throttle_key=f"switch_workspace_missing:{request.user.id}:{org_slug}",
            ttl_seconds=300,
        )
        return Response({'error': 'Workspace not found for this account'}, status=status.HTTP_404_NOT_FOUND)

    authenticated = None
    if otp_code:
        cached_data = cache.get(_workspace_switch_code_cache_key(request.user.id, org_slug))
        if not cached_data:
            _log_auth_audit_throttled(
                organization=request.user.organization,
                user=request.user,
                resource_type='workspace_switch_failed',
                details={'reason': 'otp_missing_or_expired', 'target_org_slug': org_slug, 'verification_method': 'otp'},
                request=request,
                throttle_key=f"switch_workspace_otp_expired:{request.user.id}:{org_slug}",
                ttl_seconds=300,
            )
            return Response({'error': 'Invalid or expired verification code'}, status=status.HTTP_401_UNAUTHORIZED)
        if cached_data.get('code') != otp_code or cached_data.get('target_user_id') != target_user.id:
            _log_auth_audit_throttled(
                organization=request.user.organization,
                user=request.user,
                resource_type='workspace_switch_failed',
                details={'reason': 'otp_invalid', 'target_org_slug': org_slug, 'verification_method': 'otp'},
                request=request,
                throttle_key=f"switch_workspace_otp_invalid:{request.user.id}:{org_slug}",
                ttl_seconds=300,
            )
            return Response({'error': 'Invalid or expired verification code'}, status=status.HTTP_401_UNAUTHORIZED)
        cache.delete(_workspace_switch_code_cache_key(request.user.id, org_slug))
        authenticated = target_user
    else:
        authenticated = authenticate(username=target_user.username, password=password)
        if not authenticated:
            _log_auth_audit_throttled(
                organization=request.user.organization,
                user=request.user,
                resource_type='workspace_switch_failed',
                details={'reason': 'invalid_credentials', 'target_org_slug': org_slug, 'verification_method': 'password'},
                request=request,
                throttle_key=f"switch_workspace_password_invalid:{request.user.id}:{org_slug}",
                ttl_seconds=300,
            )
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    logger.info("Workspace switch for user email=%s to org=%s", request.user.email, org_slug)
    _log_auth_audit(
        organization=authenticated.organization,
        user=authenticated,
        resource_type='workspace_switch',
        details={
            'from_org_slug': request.user.organization.slug,
            'to_org_slug': authenticated.organization.slug,
            'verification_method': 'otp' if otp_code else 'password',
        },
        request=request,
    )
    return Response(_build_auth_payload(authenticated))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    refresh_token = (request.data.get('refresh_token') or '').strip()

    if refresh_token:
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            logger.warning("Failed to blacklist refresh token on logout for user_id=%s", request.user.id)

    _log_auth_audit(
        organization=request.user.organization,
        user=request.user,
        resource_type='auth_logout',
        details={'all_devices': False},
        request=request,
        action='logout',
    )
    return Response({'message': 'Logged out'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_all(request):
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

        outstanding = OutstandingToken.objects.filter(user=request.user)
        blacklisted_count = 0
        for token in outstanding:
            _, created = BlacklistedToken.objects.get_or_create(token=token)
            if created:
                blacklisted_count += 1
    except Exception:
        logger.exception("Failed to blacklist all refresh tokens for user_id=%s", request.user.id)
        return Response({'error': 'Failed to revoke sessions'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    _log_auth_audit(
        organization=request.user.organization,
        user=request.user,
        resource_type='auth_logout_all',
        details={'all_devices': True, 'blacklisted_tokens': blacklisted_count},
        request=request,
        action='logout',
    )
    return Response({'message': 'Logged out from all devices', 'revoked_sessions': blacklisted_count}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile(request):
    user = request.user
    
    avatar_url = None
    if user.avatar:
        avatar_url = user.avatar.url if not settings.DEBUG else request.build_absolute_uri(user.avatar.url)
    
    org_logo_url = None
    if user.organization.logo:
        org_logo_url = user.organization.logo.url if not settings.DEBUG else request.build_absolute_uri(user.organization.logo.url)
    
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'full_name': user.get_full_name(),
        'bio': user.bio,
        'role': user.role,
        'timezone': user.timezone,
        'avatar': avatar_url,
        'organization_name': user.organization.name,
        'organization_slug': user.organization.slug,
        'organization_logo': org_logo_url,
        'organization_color': user.organization.primary_color,
        'onboarding_completed': user.onboarding_completed,
        'first_conversation_created': user.first_conversation_created,
        'first_teammate_invited': user.first_teammate_invited,
        'first_decision_made': user.first_decision_made
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    email = request.data.get('email', '').strip()
    password = request.data.get('password', '')
    turnstile_token = request.data.get('turnstile_token')
    token = request.data.get('token')
    organization_name = request.data.get('organization', '').strip()
    full_name = (request.data.get('full_name') or '').strip()
    
    # Rate limiting
    if not check_rate_limit(f'register:{email}'):
        logger.warning(f"Rate limit exceeded for registration: {email}")
        return Response(
            {'error': 'Too many registration attempts. Try again later.'},
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )
    ok, captcha_error = verify_turnstile_token(request, turnstile_token)
    if not ok:
        return Response({'error': captcha_error}, status=status.HTTP_400_BAD_REQUEST)
    
    # Input validation
    try:
        validate_email(email)
        validate_password(password)
    except ValidationError as e:
        logger.warning(f"Invalid input for registration: {email}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    # Organization registration
    if organization_name and not token:
        if not all([email, password, organization_name]):
            return Response({'error': 'Email, password, and organization name required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        free_email_domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
                             'aol.com', 'icloud.com', 'mail.com', 'protonmail.com', 
                             'zoho.com', 'yandex.com']
        email_domain = email.split('@')[-1].lower()
        if email_domain in free_email_domains:
            return Response({'error': 'Please use a company email address'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        if len(organization_name) < 2:
            return Response({'error': 'Organization name must be at least 2 characters'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.organizations.models import Organization
            import re
            
            org_slug = re.sub(r'[^a-z0-9-]', '', organization_name.lower().replace(' ', '-'))
            
            if Organization.objects.filter(slug=org_slug).exists():
                return Response({'error': 'Organization name already exists'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            org = Organization.objects.create(name=organization_name, slug=org_slug)
            
            username = generate_unique_org_username(email, org_slug)
            display_name = full_name or email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                organization=org,
                full_name=display_name,
                first_name=display_name.split()[0] if display_name else email.split('@')[0],
                role='admin'
            )
            
            logger.info(f"New organization created: {organization_name} by {email}")
            try:
                send_welcome_email(user)
            except Exception:
                logger.exception("Failed to send welcome email to %s", email)
            
            return Response({
                'message': 'Organization created successfully',
                'username': user.username
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({'error': 'Registration failed'}, 
                           status=status.HTTP_400_BAD_REQUEST)
    
    # Invitation registration
    if token:
        if not all([email, password, token]):
            return Response({'error': 'Email, password, and invitation token required'}, 
                           status=status.HTTP_400_BAD_REQUEST)
        
        try:
            from apps.organizations.models import Invitation
            try:
                invitation = Invitation.objects.get(token=token, email=email, is_accepted=False)
            except Invitation.DoesNotExist:
                return Response({'error': 'Invalid or expired invitation'}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            existing_user = User.objects.filter(
                email__iexact=email,
                organization=invitation.organization
            ).first()

            display_name = full_name or email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
            if existing_user and existing_user.is_active:
                return Response({'error': 'User already exists in this organization'}, 
                               status=status.HTTP_400_BAD_REQUEST)

            if existing_user:
                user = existing_user
                user.set_password(password)
                user.is_active = True
                user.role = _normalize_user_role(invitation.role or 'contributor')
                user.full_name = display_name or user.full_name
                user.first_name = display_name.split()[0] if display_name else user.first_name
                user.save(update_fields=['password', 'is_active', 'role', 'full_name', 'first_name'])
            else:
                username = generate_unique_org_username(email, invitation.organization.slug)
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    organization=invitation.organization,
                    full_name=display_name,
                    first_name=display_name.split()[0] if display_name else email.split('@')[0],
                    role=_normalize_user_role(invitation.role or 'contributor')
                )
            
            invitation.is_accepted = True
            invitation.accepted_at = timezone.now()
            invitation.save()
            
            logger.info(f"User registered via invitation: {email}")
            try:
                send_welcome_email(user)
            except Exception:
                logger.exception("Failed to send welcome email to invited user %s", email)
            
            return Response({
                'message': 'Account created successfully',
                'username': user.username
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({'error': 'Registration failed'}, 
                           status=status.HTTP_400_BAD_REQUEST)
    
    return Response({'error': 'Invalid registration request'}, 
                   status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    email = (request.data.get('email') or '').strip().lower()
    turnstile_token = request.data.get('turnstile_token')
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
    if not check_rate_limit(f'forgot_password:{email}', limit=10, window=3600):
        return Response({'error': 'Too many attempts. Try again later.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
    ok, captcha_error = verify_turnstile_token(request, turnstile_token)
    if not ok:
        return Response({'error': captcha_error}, status=status.HTTP_400_BAD_REQUEST)

    # Always return success to avoid email enumeration.
    generic_response = {
        'message': 'If an account exists for this email, a password reset link has been sent.'
    }

    try:
        validate_email(email)
    except ValidationError:
        return Response(generic_response, status=status.HTTP_200_OK)

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if not user:
        return Response(generic_response, status=status.HTTP_200_OK)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    reset_url = build_frontend_url(f"/reset-password?uid={uid}&token={token}")

    try:
        send_password_reset_email(user, reset_url)
    except Exception:
        logger.exception("Failed to send password reset email to %s", email)

    return Response(generic_response, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    uid = request.data.get('uid')
    token = request.data.get('token')
    password = request.data.get('password', '')
    confirm_password = request.data.get('confirm_password', '')

    if not uid or not token or not password:
        return Response(
            {'error': 'uid, token, and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if confirm_password and password != confirm_password:
        return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(password)
    except ValidationError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except Exception:
        return Response({'error': 'Invalid or expired reset link'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'Invalid or expired reset link'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(password)
    user.save(update_fields=['password'])

    return Response({'message': 'Password has been reset successfully'}, status=status.HTTP_200_OK)
