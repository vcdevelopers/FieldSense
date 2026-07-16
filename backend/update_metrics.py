import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from field_tracking.models import AdHocMeeting
from field_tracking.utils import calculate_haversine_distance

meetings = AdHocMeeting.objects.all()
updated = 0
for m in meetings:
    if m.current_lat and m.current_lng and m.destination_lat and m.destination_lng:
        dist = calculate_haversine_distance(
            float(m.current_lat), float(m.current_lng),
            float(m.destination_lat), float(m.destination_lng)
        )
        m.distance_km = round(dist / 1000.0, 2)
        m.fuel_cost = round(m.distance_km * 8.0, 2)
        m.save()
        updated += 1

print(f"Updated {updated} meetings with distance and fuel cost.")
