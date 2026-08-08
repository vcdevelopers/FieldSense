import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Employee

User = get_user_model()

print("=== EXECUTING PART A DATA REMEDIATION ===")

# 1. Remediate blank email Users
u4 = User.objects.filter(id=4, email='').first()
if u4:
    u4.email = 'synthetic-user-4@fieldsense.internal'
    u4.username = 'synthetic-user-4'
    u4.save()
    print("Fixed User ID 4 -> synthetic-user-4@fieldsense.internal")

u5 = User.objects.filter(id=5, email='').first()
if u5:
    u5.email = 'synthetic-user-5@fieldsense.internal'
    u5.username = 'synthetic-user-5'
    u5.save()
    print("Fixed User ID 5 -> synthetic-user-5@fieldsense.internal")

# 2. Remediate blank email Employee EMP-1010
emp_1010 = Employee.objects.filter(employeeId='EMP-1010', email='').first()
if emp_1010:
    emp_1010.delete()
    print("Deleted orphaned blank Employee record EMP-1010")

# 3. Populate logicon_employee_id for known provisioned employees
EMP_MAPPINGS = {
    'abc@gmail.com': 1004,
    'ankur123@gmail.com': 1005,
    'rojertester@gmail.com': 1007,
    'suresh.desai@example.com': 1008,
}

for email, logicon_id in EMP_MAPPINGS.items():
    emp = Employee.objects.filter(email__iexact=email).first()
    if emp:
        emp.logicon_employee_id = logicon_id
        emp.save()
        print(f"Populated logicon_employee_id={logicon_id} for {email}")

print("=== REMEDIATION COMPLETE ===")
