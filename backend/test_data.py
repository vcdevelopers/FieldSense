import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.test import RequestFactory
from field_tracking.views import AdminLiveOverviewView
request = RequestFactory().get('/api/field-tracking/admin/live/', HTTP_X_USER_ROLE='ADMIN')
view = AdminLiveOverviewView.as_view()
response = view(request)
data = response.data

online_count = len([e for e in data if e['status'] != 'Offline'])
completed = sum(e.get('completed_events', 0) for e in data)
print(f'Online: {online_count}')
print(f'Completed: {completed}')
for e in data:
    if e['status'] != 'Offline' or e.get('completed_events'):
        print(f"{e['employee_name']} -> Status: {e['status']}, Completed: {e.get('completed_events')}")
