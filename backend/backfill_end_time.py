import os
import django
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from field_tracking.models import AdHocMeeting

meetings = AdHocMeeting.objects.filter(status='Completed', end_time__isnull=True)
updated = 0
for m in meetings:
    if m.created_at:
        m.end_time = m.created_at + timedelta(minutes=45)
        m.save()
        updated += 1

print(f"Backfilled end_time for {updated} completed meetings.")
