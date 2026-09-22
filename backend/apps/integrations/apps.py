from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.integrations'
    verbose_name = 'Integrations'

    def ready(self):
        # Celery's autodiscovery only imports each app's `tasks` module, so a
        # task defined anywhere else never registers and the worker answers
        # "unregistered task" for a job the web process happily queued.
        # Importing it here runs in the worker as well as the web process.
        from apps.integrations import import_tasks  # noqa: F401
