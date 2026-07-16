import os
import django
import sys
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from field_tracking.models import SiteVisitFormTemplate

def run():
    template = SiteVisitFormTemplate.objects.filter(is_active=True).first()
    if template:
        print(json.dumps(template.schema, indent=4))
    else:
        print("No template found.")

if __name__ == '__main__':
    run()
