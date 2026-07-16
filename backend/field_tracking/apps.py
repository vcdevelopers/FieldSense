import sys
import os
from django.apps import AppConfig

class FieldTrackingConfig(AppConfig):
    name = 'field_tracking'

    def ready(self):
        # Prevent running scheduler twice or during management commands
        if os.environ.get('RUN_MAIN', None) != 'true' and 'runserver' in sys.argv:
            from field_tracking import scheduler
            scheduler.start()
