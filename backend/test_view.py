import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from field_tracking.models import AdHocMeeting, VisitLog
from django.utils import timezone

target_date = timezone.datetime.strptime('2026-06-19', '%Y-%m-%d').date()

methan = User.objects.filter(email='methan@fieldops.com').first()
logicon = User.objects.filter(email='abc@gmail.com').first()

if methan and logicon:
    # Transfer back from methan to logicon
    meetings = AdHocMeeting.objects.filter(employee=methan, date=target_date)
    print(f"Reverting {meetings.count()} meetings back to Logicon")
    meetings.update(employee=logicon)

    visits = VisitLog.objects.filter(employee=methan, check_in_time__date=target_date)
    print(f"Reverting {visits.count()} visit logs back to Logicon")
    visits.update(employee=logicon)

print("Revert complete.")
