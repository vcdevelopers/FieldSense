import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from field_tracking.models import AdHocMeeting
from field_tracking.serializers import AdHocMeetingSerializer

for m in AdHocMeeting.objects.all()[:5]:
    print(f"ID: {m.id} | {m.meeting_title} | status: {m.status}")
    print(f"  current_lat/lng: {m.current_lat}, {m.current_lng}")
    print(f"  destination_lat/lng: {m.destination_lat}, {m.destination_lng}")
    serializer = AdHocMeetingSerializer(m, context={})
    data = serializer.data
    print(f"  => eta_time: {data.get('eta_time')}")
    print(f"  => total_distance: {data.get('total_distance')}")
    print(f"  => traffic_status: {data.get('traffic_status')}")
    print()
