import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from field_tracking.models import VisitLog

log = VisitLog.objects.order_by('-check_in_time').first()
if log:
    log.report_data = {
        "doc_checklist": "Maintained",
        "attendance": "Up to Date",
        "daily_logs": "Updated",
        "log_auth": "Yes",
        "machinery_availability": "Yes",
        "machinery_condition": "Good",
        "machinery_maintenance": "",
        "consumables": "Adequate",
        "uniform_status": "Properly Dressed",
        "id_cards": "Issued & Displayed",
        "esic_mediclaim": "Active",
        "daily_briefing": "Yes",
        "night_round": "Yes",
        "round_observations": "Everything was in order.",
        "outstanding_dues": "None",
        "dues_details": "",
        "invoice_status": "Submitted",
        "other_issues": "No issues found.",
        "corrective_actions": "N/A"
    }
    log.save()
    print(f"Updated VisitLog {log.id} with mock report_data.")
else:
    print("No VisitLog found to update.")
