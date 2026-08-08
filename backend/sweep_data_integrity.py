import os
import django
from django.db.models import Count, Q

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Employee

User = get_user_model()

print("=== PART A: FIELDSENSE DATA INTEGRITY SWEEP ===")

# 1. Blank/Null Email Users
blank_users = User.objects.filter(Q(email='') | Q(email__isnull=True))
print(f"\n1. Blank/Null Email Users Count: {blank_users.count()}")
for u in blank_users:
    print(f"   - User ID: {u.id} | Username: {u.username} | Email: '{u.email}' | is_staff: {u.is_staff}")

# 2. Blank/Null Email Employees
blank_employees = Employee.objects.filter(Q(email='') | Q(email__isnull=True))
print(f"\n2. Blank/Null Email Employees Count: {blank_employees.count()}")
for e in blank_employees:
    print(f"   - Employee ID: {e.id} | EmpCode: {e.employeeId} | Name: '{e.fullName}' | Email: '{e.email}' | LogiconEmpId: {e.logicon_employee_id}")

# 3. Duplicate Case-Insensitive Emails in User table
dup_user_emails = (
    User.objects.exclude(email='')
    .values('email')
    .annotate(cnt=Count('id'))
    .filter(cnt__gt=1)
)
print(f"\n3. Duplicate Email Users Count: {dup_user_emails.count()}")
for d in dup_user_emails:
    users_with_email = User.objects.filter(email__iexact=d['email'])
    print(f"   - Email '{d['email']}' shared by {d['cnt']} users:")
    for u in users_with_email:
        print(f"      * User ID: {u.id} | Username: {u.username}")

# 4. Duplicate Case-Insensitive Emails in Employee table
dup_emp_emails = (
    Employee.objects.exclude(email='')
    .values('email')
    .annotate(cnt=Count('id'))
    .filter(cnt__gt=1)
)
print(f"\n4. Duplicate Email Employees Count: {dup_emp_emails.count()}")
for d in dup_emp_emails:
    emps_with_email = Employee.objects.filter(email__iexact=d['email'])
    print(f"   - Email '{d['email']}' shared by {d['cnt']} employees:")
    for e in emps_with_email:
        print(f"      * Employee ID: {e.id} | EmpCode: {e.employeeId} | Name: {e.fullName}")

# 5. Employees missing logicon_employee_id despite SSO/Logicon origin
missing_logicon_id = Employee.objects.filter(logicon_employee_id__isnull=True)
print(f"\n5. Employees with Null logicon_employee_id Count: {missing_logicon_id.count()}")
for e in missing_logicon_id:
    print(f"   - Employee ID: {e.id} | EmpCode: {e.employeeId} | Name: '{e.fullName}' | Email: '{e.email}'")
