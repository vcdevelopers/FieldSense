import os
import django
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from field_tracking.models import SiteVisitFormTemplate

def run():
    comprehensive_schema = [
        # 1. Documentation & Records
        {
            "id": "site_operations_checklist",
            "type": "radio",
            "label": "Site Operations Checklist",
            "options": ["Maintained", "Not Maintained", "Partial"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "attendance_register",
            "type": "radio",
            "label": "Attendance Register",
            "options": ["Up to Date", "Incomplete", "Not Maintained"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "daily_logbooks",
            "type": "radio",
            "label": "Daily Logbooks",
            "options": ["Updated", "Pending Entries", "Not Available"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "logbooks_authorization",
            "type": "radio",
            "label": "Daily Logbooks & Checklist Authorisation by operations",
            "options": ["Yes", "No"],
            "requirePhoto": True,
            "requireComment": True
        },
        
        # 2. Housekeeping & Equipment
        {
            "id": "housekeeping_machineries",
            "type": "radio",
            "label": "Housekeeping Machineries (Vacuum Cleaner, Scrubber, Jet Machine, etc.) Availability",
            "options": ["Yes", "No"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "working_condition",
            "type": "radio",
            "label": "Working Condition",
            "options": ["Good", "Requires Repair", "Not Functional"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "maintenance_description",
            "type": "text",
            "label": "Under maintenance Description",
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "consumables_tools",
            "type": "radio",
            "label": "Consumables/Tools",
            "options": ["Adequate", "Shortage", "Pending Indent"],
            "requirePhoto": True,
            "requireComment": True
        },
        
        # 3. Staff & Compliance
        {
            "id": "uniform_status",
            "type": "radio",
            "label": "Uniform Status",
            "options": ["Properly Dressed", "Partial", "Not Compliant"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "id_cards",
            "type": "radio",
            "label": "ID Cards",
            "options": ["Issued & Displayed", "Pending", "Not Issued"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "esic_mediclaim",
            "type": "radio",
            "label": "ESIC & Mediclaim Coverage",
            "options": ["Active", "Pending", "Not Available"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "daily_briefing",
            "type": "radio",
            "label": "Daily Briefing Conducted",
            "options": ["Yes", "No"],
            "requirePhoto": True,
            "requireComment": True
        },
        
        # 4. Operations & Monitoring
        {
            "id": "night_round",
            "type": "radio",
            "label": "Night Round Conducted",
            "options": ["Yes", "No"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "observations_rounds",
            "type": "text",
            "label": "Observations from Rounds (if any)",
            "requirePhoto": True,
            "requireComment": True
        },
        
        # 5. Financial & Admin
        {
            "id": "outstanding_dues",
            "type": "radio",
            "label": "Outstanding Dues (if any) - Add Details in Comment",
            "options": ["None", "Yes"],
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "invoice_submission",
            "type": "radio",
            "label": "Invoice Submission Status",
            "options": ["Submitted", "Pending"],
            "requirePhoto": True,
            "requireComment": True
        },
        
        # 6 & 7. Observations and Actions
        {
            "id": "other_observations",
            "type": "text",
            "label": "Other Observations / Issues",
            "requirePhoto": True,
            "requireComment": True
        },
        {
            "id": "corrective_actions",
            "type": "text",
            "label": "Corrective & Preventive Actions Suggested",
            "requirePhoto": True,
            "requireComment": True
        }
    ]

    template, created = SiteVisitFormTemplate.objects.get_or_create(
        is_active=True,
        defaults={'name': 'Logicon Site Visit Report'}
    )
    
    template.schema = comprehensive_schema
    template.save()
    print("Successfully populated the Logicon Site Visit Form template!")

if __name__ == '__main__':
    run()
