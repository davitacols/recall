from django.apps import AppConfig


class DecisionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.decisions'
    verbose_name = 'Decisions'

    def ready(self):
        # Registers models that live outside models.py. They cannot be
        # imported there directly - locking.py imports Decision, so the import
        # would be circular - and nothing else loads them until the URLconf
        # does, which is after the test database has been built.
        #
        # That matters because the test settings disable migrations and build
        # the schema from the model registry. A model absent from the registry
        # at that moment gets no table, and any cascade through it fails with
        # "no such table" - which is how deleting a Decision could not be
        # tested at all, while working in production where migrations ran.
        from apps.decisions import locking  # noqa: F401
