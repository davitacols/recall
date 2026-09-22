from django.apps import AppConfig

class BusinessConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.business'

    def ready(self):
        import apps.business.signals
        # Registers the models in advanced_models.py. Nothing imports them at
        # app load, and the test settings build the schema from the model
        # registry rather than migrations - so their tables were missing, and
        # any query touching them failed with "no such table" depending on
        # whether some other test had imported the module first. A suite that
        # passes or fails on run order is worse than one that just fails.
        import apps.business.advanced_models  # noqa: F401
