import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from field_tracking.models import SiteVisitFormTemplate

schema = [
    {
        "id": "doc_checklist",
        "type": "radio",
        "label": "Site Documentation Checklist & Registers",
        "options": ["Maintained", "Not Maintained"]
    },
    {
        "id": "attendance",
        "type": "radio",
        "label": "Attendance records in ERP application",
        "options": ["Up to Date", "Pending"]
    },
    {
        "id": "daily_logs",
        "type": "radio",
        "label": "Log Book & Daily Activity Report (DAR)",
        "options": ["Updated", "Not Updated"]
    },
    {
        "id": "log_auth",
        "type": "radio",
        "label": "Proper authentication of Log/Register",
        "options": ["Yes", "No"]
    },
    {
        "id": "machinery_availability",
        "type": "radio",
        "label": "Availability of Machinery/Equipment",
        "options": ["Yes", "No"]
    },
    {
        "id": "machinery_condition",
        "type": "radio",
        "label": "Condition of Machinery/Equipment",
        "options": ["Good", "Fair", "Needs Repair"]
    },
    {
        "id": "machinery_maintenance",
        "type": "text",
        "label": "Details if maintenance required"
    },
    {
        "id": "consumables",
        "type": "radio",
        "label": "Availability of Consumables/Material",
        "options": ["Adequate", "Low Stock", "Out of Stock"]
    },
    {
        "id": "uniform_status",
        "type": "radio",
        "label": "Uniform Status",
        "options": ["Properly Dressed", "Improper/Missing Items"]
    },
    {
        "id": "id_cards",
        "type": "radio",
        "label": "ID Cards",
        "options": ["Issued & Displayed", "Not Issued", "Not Displayed"]
    },
    {
        "id": "esic_mediclaim",
        "type": "radio",
        "label": "ESIC/Mediclaim Check (if applicable)",
        "options": ["Active", "Pending", "N/A"]
    },
    {
        "id": "daily_briefing",
        "type": "radio",
        "label": "Conducting daily briefing/training",
        "options": ["Yes", "No"]
    },
    {
        "id": "night_round",
        "type": "radio",
        "label": "Night Round by site supervisor/manager",
        "options": ["Yes", "No"]
    },
    {
        "id": "round_observations",
        "type": "text",
        "label": "Key observations during rounds"
    },
    {
        "id": "outstanding_dues",
        "type": "radio",
        "label": "Status of outstanding dues",
        "options": ["None", "Pending Payment"]
    },
    {
        "id": "dues_details",
        "type": "text",
        "label": "Details of outstanding dues (if any)"
    },
    {
        "id": "invoice_status",
        "type": "radio",
        "label": "Submission of Monthly Invoices",
        "options": ["Submitted", "Pending"]
    },
    {
        "id": "other_issues",
        "type": "text",
        "label": "Any other critical issues identified"
    },
    {
        "id": "corrective_actions",
        "type": "text",
        "label": "Corrective actions recommended"
    }
]

template, created = SiteVisitFormTemplate.objects.get_or_create(
    is_active=True,
    defaults={'name': 'Logicon Site Visit Report'}
)
template.schema = schema
template.save()

print("Form template successfully pre-populated!")
