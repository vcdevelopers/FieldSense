import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.test import RequestFactory
from field_tracking.views import AdminLiveOverviewView
import json

request = RequestFactory().get('/api/field-tracking/admin/live/', HTTP_X_USER_ROLE='ADMIN')
view = AdminLiveOverviewView.as_view()
response = view(request)
for emp in response.data:
    for t in emp['timeline']:
        print(f"{emp['employee_name']} - {t['type']} - id={t['id']} - attachment={t.get('attachment_url')} - report={bool(t.get('report_data'))}")
