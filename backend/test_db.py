import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from field_tracking.models import AdHocMeeting

for m in AdHocMeeting.objects.all():
    print(m.id, m.meeting_title, bool(m.report_data), m.visit_logs.exists(), m.report_data)
