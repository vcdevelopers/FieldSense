import os, sys, json, datetime
from django.utils import timezone

from django.utils import timezone
from field_tracking.models import VisitLog, AdHocMeeting

end = timezone.now()
start = end - datetime.timedelta(days=90)
moms = AdHocMeeting.objects.filter(created_at__range=(start, end)).exclude(report_data__isnull=True).exclude(report_data={})
visits = VisitLog.objects.filter(check_in_time__range=(start, end)).exclude(report_data__isnull=True).exclude(report_data={})

red_flags = []
all_logs = []

for m in moms: 
    all_logs.append({'emp': m.employee.username, 'date': m.created_at.strftime('%Y-%m-%d'), 'type': 'MOM', 'client': m.client_name, 'data': m.report_data})
    if isinstance(m.report_data, dict): 
        for k, v in m.report_data.items(): 
            if isinstance(v, str) and any(f in v for f in ['Not Maintained', 'Requires Repair', 'Shortage']): 
                red_flags.append({'date': m.created_at.strftime('%Y-%m-%d'), 'emp': m.employee.username, 'site': m.client_name, 'issue': v, 'flag': 'Not Maintained' if 'Not Maintained' in v else ('Requires Repair' if 'Requires Repair' in v else 'Shortage')})

for v in visits:
    site_name = v.site.name if hasattr(v, 'site') and v.site else 'Unknown'
    all_logs.append({'emp': v.employee.username, 'date': v.check_in_time.strftime('%Y-%m-%d'), 'type': 'Visit', 'client': site_name, 'data': v.report_data})
    if isinstance(v.report_data, dict): 
        for key, val in v.report_data.items(): 
            if isinstance(val, str) and any(f in val for f in ['Not Maintained', 'Requires Repair', 'Shortage']): 
                red_flags.append({'date': v.check_in_time.strftime('%Y-%m-%d'), 'emp': v.employee.username, 'site': site_name, 'issue': val, 'flag': 'Not Maintained' if 'Not Maintained' in val else ('Requires Repair' if 'Requires Repair' in val else 'Shortage')})

print('--- RED FLAGS ---')
print(json.dumps(red_flags, indent=2))
print('\n--- LOGS ---')
for emp in set([l['emp'] for l in all_logs]):
    print(f"\nEmployee: {emp}")
    emp_logs = [l for l in all_logs if l['emp'] == emp]
    for log in emp_logs:
        print(f"[{log['date']}] {log['type']} @ {log['client']}")
        try:
            print("  DATA:", json.dumps(log['data']))
        except:
            print("  DATA:", str(log['data']))
