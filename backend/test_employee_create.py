import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.serializers import EmployeeSerializer
from core.models import Employee
from django.contrib.auth.models import User

# Test data matching what the frontend sends
test_data = {
    "fullName": "Test Employee",
    "email": "testemployee999@example.com",
    "mobileNumber": "9876543210",
    "password": "TestPass@123",
    "designation": "Sales Executive",
    "workMode": "Field",
    "employmentType": "Full-time",
    "joiningDate": "2026-06-10",
    "travelMode": "Bike",
}

# Clean up any prior test
Employee.objects.filter(email="testemployee999@example.com").delete()
User.objects.filter(username="testemployee999@example.com").delete()

serializer = EmployeeSerializer(data=test_data)
if serializer.is_valid():
    emp = serializer.save()
    print(f"SUCCESS - Employee created!")
    print(f"   ID:       {emp.id}")
    print(f"   Name:     {emp.fullName}")
    print(f"   Email:    {emp.email}")
    print(f"   Password: {emp.password[:30]}...  (hashed)")
    
    # Verify Django User was synced
    try:
        u = User.objects.get(username=emp.email)
        from django.contrib.auth import authenticate
        auth_result = authenticate(username=emp.email, password="TestPass@123")
        print(f"   Django User: {u.username}")
        print(f"   Can login:   {'YES' if auth_result else 'NO - FAILED'}")
    except User.DoesNotExist:
        print("FAIL - Django User NOT created!")
else:
    print("FAIL - Serializer errors:")
    print(serializer.errors)

# Cleanup
Employee.objects.filter(email="testemployee999@example.com").delete()
User.objects.filter(username="testemployee999@example.com").delete()
