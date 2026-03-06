from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connections
from django.db.migrations.executor import MigrationExecutor
from urllib.parse import urlparse


class Command(BaseCommand):
    help = "Validate production security posture and deployment readiness."

    def add_arguments(self, parser):
        parser.add_argument(
            "--allow-pending-migrations",
            action="store_true",
            help="Do not fail when unapplied migrations are detected.",
        )

    def handle(self, *args, **options):
        failures = []
        warnings = []

        debug = bool(getattr(settings, "DEBUG", False))
        allowed_hosts = list(getattr(settings, "ALLOWED_HOSTS", []))
        cors_allow_all = bool(getattr(settings, "CORS_ALLOW_ALL_ORIGINS", False))
        cors_origins = list(getattr(settings, "CORS_ALLOWED_ORIGINS", []))
        csrf_origins = list(getattr(settings, "CSRF_TRUSTED_ORIGINS", []))
        frontend_url = str(getattr(settings, "FRONTEND_URL", "") or "").strip()
        required_origins = list(getattr(settings, "SECURITY_PREFLIGHT_REQUIRED_ORIGINS", []) or [])

        if debug:
            warnings.append("DEBUG is enabled.")

        if "*" in allowed_hosts:
            failures.append("ALLOWED_HOSTS contains wildcard '*'.")

        if cors_allow_all:
            failures.append("CORS_ALLOW_ALL_ORIGINS is enabled.")

        if not cors_origins:
            failures.append("CORS_ALLOWED_ORIGINS is empty.")

        if not csrf_origins:
            failures.append("CSRF_TRUSTED_ORIGINS is empty.")

        if not debug and frontend_url and not frontend_url.startswith("https://"):
            failures.append("FRONTEND_URL must use https:// in production.")

        if not debug and required_origins:
            missing_cors = [origin for origin in required_origins if origin not in cors_origins]
            if missing_cors:
                failures.append(
                    "CORS_ALLOWED_ORIGINS missing required origins: " + ", ".join(missing_cors)
                )

            missing_csrf = [origin for origin in required_origins if origin not in csrf_origins]
            if missing_csrf:
                failures.append(
                    "CSRF_TRUSTED_ORIGINS missing required origins: " + ", ".join(missing_csrf)
                )

            required_hosts = []
            for origin in required_origins:
                parsed = urlparse(origin)
                if parsed.hostname:
                    required_hosts.append(parsed.hostname)

            missing_hosts = []
            for host in required_hosts:
                if host in allowed_hosts:
                    continue
                # support wildcard suffix hosts like .example.com
                if any(
                    item.startswith(".") and host.endswith(item)
                    for item in allowed_hosts
                ):
                    continue
                missing_hosts.append(host)

            if missing_hosts:
                failures.append(
                    "ALLOWED_HOSTS missing required hosts: " + ", ".join(sorted(set(missing_hosts)))
                )

        # Cookie/security transport checks
        if not bool(getattr(settings, "SESSION_COOKIE_SECURE", False)):
            failures.append("SESSION_COOKIE_SECURE is not enabled.")
        if not bool(getattr(settings, "CSRF_COOKIE_SECURE", False)):
            failures.append("CSRF_COOKIE_SECURE is not enabled.")
        if not bool(getattr(settings, "SECURE_SSL_REDIRECT", False)):
            warnings.append("SECURE_SSL_REDIRECT is disabled.")
        if int(getattr(settings, "SECURE_HSTS_SECONDS", 0)) <= 0 and not debug:
            failures.append("SECURE_HSTS_SECONDS is not set for production.")

        # Bot protection checks
        turnstile_enabled = bool(getattr(settings, "TURNSTILE_ENABLED", False))
        turnstile_secret = str(getattr(settings, "TURNSTILE_SECRET_KEY", "") or "").strip()
        if turnstile_enabled and not turnstile_secret:
            failures.append("TURNSTILE_ENABLED=True but TURNSTILE_SECRET_KEY is missing.")
        if not turnstile_enabled:
            warnings.append("TURNSTILE_ENABLED is disabled.")

        # DRF throttle checks
        drf = getattr(settings, "REST_FRAMEWORK", {}) or {}
        throttle_classes = drf.get("DEFAULT_THROTTLE_CLASSES", [])
        throttle_rates = drf.get("DEFAULT_THROTTLE_RATES", {})
        if not throttle_classes:
            failures.append("REST_FRAMEWORK.DEFAULT_THROTTLE_CLASSES is empty.")
        if "anon" not in throttle_rates or "user" not in throttle_rates:
            failures.append("REST_FRAMEWORK.DEFAULT_THROTTLE_RATES must include anon and user.")

        # Google OAuth checks
        google_oauth_enabled = bool(getattr(settings, "GOOGLE_OAUTH_ENABLED", False))
        google_client_id = str(getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
        if google_oauth_enabled and not google_client_id:
            failures.append("GOOGLE_OAUTH_ENABLED=True but GOOGLE_CLIENT_ID is missing.")

        # Auth endpoint rate-limit checks
        auth_limits = getattr(settings, "AUTH_RATE_LIMITS", {}) or {}
        required_auth_limits = [
            "login",
            "google_login",
            "register",
            "forgot_password",
            "workspace_switch_code",
            "workspace_switch",
            "invite_send",
            "invite_resend",
        ]
        for key in required_auth_limits:
            cfg = auth_limits.get(key)
            if not isinstance(cfg, dict):
                failures.append(f"AUTH_RATE_LIMITS.{key} is missing.")
                continue
            limit = int(cfg.get("limit", 0))
            window = int(cfg.get("window", 0))
            if limit <= 0:
                failures.append(f"AUTH_RATE_LIMITS.{key}.limit must be > 0.")
            if window <= 0:
                failures.append(f"AUTH_RATE_LIMITS.{key}.window must be > 0.")

        # Response security headers checks
        permissions_policy = str(getattr(settings, "SECURITY_PERMISSIONS_POLICY", "") or "").strip()
        if not permissions_policy:
            failures.append("SECURITY_PERMISSIONS_POLICY is empty.")

        csp_enabled = bool(getattr(settings, "SECURITY_ENABLE_CSP", False))
        csp_policy = str(getattr(settings, "SECURITY_CSP_POLICY", "") or "").strip()
        if csp_enabled and not csp_policy:
            failures.append("SECURITY_ENABLE_CSP=True but SECURITY_CSP_POLICY is empty.")
        if not csp_enabled:
            warnings.append("SECURITY_ENABLE_CSP is disabled.")

        # Sentry monitoring checks
        sentry_dsn = str(getattr(settings, "SENTRY_DSN", "") or "").strip()
        if not sentry_dsn:
            warnings.append("SENTRY_DSN is not configured.")

        # Unapplied migrations check
        if not options.get("allow_pending_migrations", False):
            connection = connections["default"]
            executor = MigrationExecutor(connection)
            targets = executor.loader.graph.leaf_nodes()
            plan = executor.migration_plan(targets)
            if plan:
                failures.append(f"Unapplied migrations detected: {len(plan)} migration step(s).")

        if warnings:
            self.stdout.write(self.style.WARNING("Warnings:"))
            for item in warnings:
                self.stdout.write(self.style.WARNING(f" - {item}"))

        if failures:
            self.stdout.write(self.style.ERROR("Preflight failures:"))
            for item in failures:
                self.stdout.write(self.style.ERROR(f" - {item}"))
            raise CommandError("Security preflight failed.")

        self.stdout.write(self.style.SUCCESS("Security preflight passed."))
