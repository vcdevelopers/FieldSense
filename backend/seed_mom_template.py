import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from field_tracking.models import MOMFormTemplate

def seed():
    schema = [
        {
            "id": "service_delivery_issues",
            "type": "text",
            "label": "Service Delivery at Site / Issues",
            "requirePhoto": False,
            "requireComment": False
        },
        {
            "id": "action_points",
            "type": "text",
            "label": "Action Points",
            "requirePhoto": False,
            "requireComment": True
        },
        {
            "id": "responsibility",
            "type": "text",
            "label": "Responsibility",
            "requirePhoto": False,
            "requireComment": False
        },
        {
            "id": "plan_date",
            "type": "text",
            "label": "Plan Date (DD/MM/YYYY)",
            "requirePhoto": False,
            "requireComment": False
        },
        {
            "id": "actual_date",
            "type": "text",
            "label": "Actual Date (DD/MM/YYYY)",
            "requirePhoto": False,
            "requireComment": False
        },
        {
            "id": "status",
            "type": "radio",
            "label": "Status",
            "options": ["Open", "Closed", "In Progress"],
            "requirePhoto": False,
            "requireComment": False
        },
        {
            "id": "remarks",
            "type": "text",
            "label": "Remarks",
            "requirePhoto": False,
            "requireComment": False
        }
    ]

    template, created = MOMFormTemplate.objects.get_or_create(
        name="Minutes of Meeting (MOM)",
        defaults={
            "schema": schema,
            "is_active": True,
            "is_global": True,
            "client_type": None
        }
    )

    if not created:
        template.schema = schema
        template.save()

    print("MOM Form Template seeded successfully.")

if __name__ == '__main__':
    seed()
