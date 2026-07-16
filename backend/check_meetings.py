import os
import django
import sys
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from field_tracking.models import AdHocMeeting
from core.models import Employee
from django.contrib.auth.models import User

import json

def get_data():
    output = []
    today = date.today()
    meetings = AdHocMeeting.objects.filter(date=today).values(
        'id', 'employee__email', 'client_name', 'location_name', 'current_lat', 'current_lng', 'destination_lat', 'destination_lng', 'status'
    )
    for m in meetings:
        output.append(m)
    
    print(json.dumps(output, indent=2, default=str))

if __name__ == "__main__":
    get_data()
