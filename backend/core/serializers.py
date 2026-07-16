from rest_framework import serializers
from .models import Role, Department, StatusMaster, Project, Employee, RolePermission, ReportingManager, RegistrationRequest, Task, Document, PermissionRequest

class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class StatusMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = StatusMaster
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = '__all__'

    def create(self, validated_data):
        raw_password = validated_data.pop('password', None)
        # Hash the password and include it in the initial create call
        # (password is a required field on Employee, so must be present)
        if raw_password:
            validated_data['password'] = make_password(raw_password)
        elif 'password' not in validated_data:
            # Fallback: create a hashed unusable password so field is never empty
            validated_data['password'] = make_password(None)
        employee = super().create(validated_data)
        self._sync_django_user(employee, raw_password)
        return employee

    def update(self, instance, validated_data):
        raw_password = validated_data.pop('password', None)
        if raw_password:
            validated_data['password'] = make_password(raw_password)
        employee = super().update(instance, validated_data)
        self._sync_django_user(employee, raw_password)
        return employee

    def _sync_django_user(self, employee, raw_password=None):
        user, created = User.objects.get_or_create(username=employee.email, defaults={
            'email': employee.email,
        })
        if employee.fullName:
            parts = employee.fullName.split(' ')
            user.first_name = parts[0]
            if len(parts) > 1:
                user.last_name = ' '.join(parts[1:])
        
        if raw_password:
            user.set_password(raw_password)
        elif employee.password:
            user.password = employee.password

        user.save()

class RolePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RolePermission
        fields = '__all__'

class ReportingManagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportingManager
        fields = '__all__'

class RegistrationRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistrationRequest
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    assignedEmployeeNames = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = '__all__'

    def get_assignedEmployeeNames(self, obj):
        return ", ".join(emp.fullName for emp in obj.assignedEmployees.all())

class TaskSerializer(serializers.ModelSerializer):
    projectName = serializers.CharField(source='project.name', read_only=True)
    assignedEmployeeNames = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = '__all__'

    def get_assignedEmployeeNames(self, obj):
        return ", ".join(emp.fullName for emp in obj.assignedEmployees.all())

class DocumentSerializer(serializers.ModelSerializer):
    uploadedByName = serializers.CharField(source='uploadedBy.fullName', read_only=True)

    class Meta:
        model = Document
        fields = '__all__'

class PermissionRequestSerializer(serializers.ModelSerializer):
    requesterName = serializers.CharField(source='requester.fullName', read_only=True)
    approverName = serializers.CharField(source='approver.fullName', read_only=True)

    class Meta:
        model = PermissionRequest
        fields = '__all__'

class AppUserRegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ['fullName', 'email', 'mobileNumber', 'password', 'roleId', 'departmentId']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        import datetime
        from django.contrib.auth.hashers import make_password
        
        # Provide defaults for required fields not coming from app
        validated_data.setdefault('designation', 'App User')
        validated_data.setdefault('employmentType', 'Full-time')
        validated_data.setdefault('workMode', 'Field')
        validated_data.setdefault('joiningDate', datetime.date.today())
        validated_data.setdefault('accountStatus', True)
        
        raw_password = validated_data.pop('password')
        validated_data['password'] = make_password(raw_password)
        
        employee = super().create(validated_data)
        
        # Sync to Django User
        from django.contrib.auth.models import User
        user, created = User.objects.get_or_create(username=employee.email, defaults={
            'email': employee.email,
        })
        if employee.fullName:
            parts = employee.fullName.split(' ')
            user.first_name = parts[0]
            if len(parts) > 1:
                user.last_name = ' '.join(parts[1:])
        user.set_password(raw_password)
        user.save()
        
        return employee

