import os, sys, django, re, json
sys.path.append(r'c:\field-senses-app-main\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from field_tracking.models import FormTemplate
obj, created = FormTemplate.objects.get_or_create(
    form_type='site_visit', 
    defaults={'name': 'Logicon Site Visit Report', 'is_active': True}
)

schema = [
    {
        "id": "q1",
        "type": "text",
        "label": "Service Delivery at Site / Issues",
        "required": True,
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "action_points",
        "type": "text",
        "label": "Action Points",
        "required": False,
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "responsibility",
        "type": "text",
        "label": "Responsibility",
        "required": False,
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "dates",
        "type": "text",
        "label": "Dates",
        "required": False,
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "status",
        "type": "text",
        "label": "Status",
        "required": False,
        "requirePhoto": True,
        "requireComment": True
    }
]

# Get the big schema from views.py
with open(r'c:\field-senses-app-main\backend\field_tracking\views.py', 'r', encoding='utf-8') as f:
    code = f.read()
    
# Extract the schema block from extend_schema
match = re.search(r'"schema":\s*(\[\s*\{.*?\}\s*\])', code, re.DOTALL)
if match:
    try:
        schema_str = match.group(1)
        schema_str = schema_str.replace('True', 'true').replace('False', 'false')
        schema = json.loads(schema_str)
        print("Successfully loaded schema from views.py")
    except Exception as e:
        print("Error parsing json:", e)
        # fallback to the hardcoded big schema directly!
        pass

# Fallback: Just define it directly since it's easy in Python
schema = [
    {
        "id": "service_delivery",
        "type": "radio",
        "label": "Service Delivery at Site / Issues",
        "options": ["Excellent", "Good", "Average", "Poor"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "action_points",
        "type": "text",
        "label": "Action Points",
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "responsibility",
        "type": "radio",
        "label": "Responsibility",
        "options": ["Logicon", "Client"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "closure_date",
        "type": "text",
        "label": "Closure Date",
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "client_feedback",
        "type": "radio",
        "label": "Client Feedback",
        "options": ["Excellent", "Good", "Average", "Poor"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "grooming",
        "type": "radio",
        "label": "Grooming",
        "options": ["Proper", "Improper", "Partial"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "knowledge_of_post",
        "type": "radio",
        "label": "Knowledge of Post",
        "options": ["Good", "Average", "Poor"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "site_training",
        "type": "radio",
        "label": "Site Training",
        "options": ["Completed", "Pending", "Not Required"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "turnout",
        "type": "radio",
        "label": "Turnout",
        "options": ["Good", "Average", "Poor"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "documents_maintained",
        "type": "radio",
        "label": "Documents Maintained",
        "options": ["Up to Date", "Incomplete", "Not Maintained"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "night_round_register",
        "type": "radio",
        "label": "Night Round Register",
        "options": ["Up to Date", "Incomplete", "Not Maintained"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "penalty",
        "type": "radio",
        "label": "Penalty",
        "options": ["Yes", "No"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "invoice_submitted",
        "type": "radio",
        "label": "Invoice Submitted",
        "options": ["Yes", "No"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "wages_paid",
        "type": "radio",
        "label": "Wages Paid",
        "options": ["Yes", "No"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "pf_esic_challan",
        "type": "radio",
        "label": "PF/ESIC Challan Submitted",
        "options": ["Yes", "No"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "statutory_compliance",
        "type": "radio",
        "label": "Statutory Compliance",
        "options": ["Yes", "No"],
        "requirePhoto": True,
        "requireComment": True
    },
    {
        "id": "any_other_issues",
        "type": "text",
        "label": "Any Other Issues",
        "requirePhoto": True,
        "requireComment": True
    }
]

obj.schema = schema
obj.save(update_fields=['schema'])
print("Schema saved successfully to db")
