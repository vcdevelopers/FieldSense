from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Q
from .models import Role, Department, StatusMaster, Project, Employee, RolePermission, ReportingManager, RegistrationRequest, Task, Document, PermissionRequest
from .serializers import (
    RoleSerializer, DepartmentSerializer, StatusMasterSerializer, 
    ProjectSerializer, EmployeeSerializer, RolePermissionSerializer,
    ReportingManagerSerializer, RegistrationRequestSerializer, TaskSerializer, DocumentSerializer, PermissionRequestSerializer
)

class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer

    def create(self, request, *args, **kwargs):
        role_name = request.data.get('roleName', '').lower()
        role_code = request.data.get('roleCode', '').upper()
        if role_name in ['admin', 'system admin'] or role_code == 'ADMIN':
            return Response({"error": "Cannot create an Admin role."}, status=status.HTTP_403_FORBIDDEN)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.roleCode == 'ADMIN' or instance.roleName.lower() in ['admin', 'system admin']:
            return Response({"error": "Cannot modify an Admin role."}, status=status.HTTP_403_FORBIDDEN)
        
        role_name = request.data.get('roleName', '').lower()
        role_code = request.data.get('roleCode', '').upper()
        if role_name in ['admin', 'system admin'] or role_code == 'ADMIN':
            return Response({"error": "Cannot change role to an Admin role."}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.roleCode == 'ADMIN' or instance.roleName.lower() in ['admin', 'system admin']:
            return Response({"error": "Cannot delete an Admin role."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

class StatusMasterViewSet(viewsets.ModelViewSet):
    queryset = StatusMaster.objects.all()
    serializer_class = StatusMasterSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.headers.get('X-User-Id')
        user_role = self.request.headers.get('X-User-Role')
        
        if user_role == 'ADMIN' or user_id == 'admin':
            return queryset
        elif user_role == 'MANAGER':
            return queryset.filter(Q(id=user_id) | Q(reportingManager=user_id))
        elif user_id:
            return queryset.filter(id=user_id)
            
        return queryset

    def create(self, request, *args, **kwargs):
        role_id = request.data.get('roleId')
        if role_id:
            try:
                role = Role.objects.get(id=role_id)
                if role.roleCode == 'ADMIN' or role.roleName.lower() in ['admin', 'system admin']:
                    return Response({"error": "Cannot create an Admin or System Admin."}, status=status.HTTP_403_FORBIDDEN)
            except Role.DoesNotExist:
                pass
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.roleId and (instance.roleId.roleCode == 'ADMIN' or instance.roleId.roleName.lower() in ['admin', 'system admin']):
            return Response({"error": "Cannot modify an Admin or System Admin."}, status=status.HTTP_403_FORBIDDEN)
        
        role_id = request.data.get('roleId')
        if role_id:
            try:
                role = Role.objects.get(id=role_id)
                if role.roleCode == 'ADMIN' or role.roleName.lower() in ['admin', 'system admin']:
                    return Response({"error": "Cannot assign Admin or System Admin role."}, status=status.HTTP_403_FORBIDDEN)
            except Role.DoesNotExist:
                pass
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.roleId and (instance.roleId.roleCode == 'ADMIN' or instance.roleId.roleName.lower() in ['admin', 'system admin']):
            return Response({"error": "Cannot delete an Admin or System Admin."}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

class RolePermissionViewSet(viewsets.ModelViewSet):
    queryset = RolePermission.objects.all()
    serializer_class = RolePermissionSerializer

class ReportingManagerViewSet(viewsets.ModelViewSet):
    queryset = ReportingManager.objects.all()
    serializer_class = ReportingManagerSerializer

from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate

class LoginView(APIView):
    @extend_schema(
        tags=['field-tracking'],
        summary="Login & Get Employee Profile (with Token)",
        description="Verify credentials, retrieve basic profile information, and get JWT access/refresh tokens.",
        request=inline_serializer(
            name="LoginRequest",
            fields={
                "email": serializers.EmailField(),
                "password": serializers.CharField()
            }
        ),
        responses={
            200: inline_serializer(
                name="LoginResponse",
                fields={
                    "id": serializers.CharField(),
                    "employeeId": serializers.CharField(),
                    "fullName": serializers.CharField(),
                    "email": serializers.EmailField(),
                    "roleCode": serializers.CharField(),
                    "departmentId": serializers.CharField(allow_null=True),
                    "profilePhoto": serializers.CharField(allow_null=True),
                    "token": inline_serializer(
                        name="LoginTokenResponse",
                        fields={
                            "access": serializers.CharField(),
                            "refresh": serializers.CharField()
                        }
                    )
                }
            )
        }
    )
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        user = authenticate(username=email, password=password)
        
        if not user:
            return Response({"error": "Invalid username or password"}, status=status.HTTP_401_UNAUTHORIZED)
            
        employee = Employee.objects.filter(email=email).first()
        
        if not employee:
            # If standard Django user exists but no Employee profile is linked (e.g., standard superuser)
            refresh = RefreshToken.for_user(user)
            return Response({
                "id": str(user.id),
                "fullName": user.get_full_name() or user.username,
                "email": user.email,
                "roleCode": "ADMIN" if user.is_superuser else "NONE",
                "departmentId": "admin" if user.is_superuser else None,
                "employeeId": f"usr-{user.id}",
                "profilePhoto": None,
                "token": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh)
                }
            })
            
        if not employee.accountStatus:
            return Response({"error": "Account is disabled. Please contact administrator."}, status=status.HTTP_403_FORBIDDEN)
            
        roleCode = employee.roleId.roleCode if employee.roleId else "NONE"
        
        # Generate JWT Token for the standard User
        refresh = RefreshToken.for_user(user)
        
        return Response({
            "id": str(employee.id),
            "employeeId": employee.employeeId,
            "fullName": employee.fullName,
            "email": employee.email,
            "roleCode": roleCode,
            "departmentId": str(employee.departmentId.id) if employee.departmentId else None,
            "profilePhoto": employee.profilePhoto,
            "token": {
                "access": str(refresh.access_token),
                "refresh": str(refresh)
            }
        })

class RegistrationRequestViewSet(viewsets.ModelViewSet):
    queryset = RegistrationRequest.objects.all()
    serializer_class = RegistrationRequestSerializer

    def create(self, request, *args, **kwargs):
        email = request.data.get('email')
        if email:
            existing = RegistrationRequest.objects.filter(email=email).first()
            if existing and existing.status == 'rejected':
                existing.delete()
        return super().create(request, *args, **kwargs)

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.headers.get('X-User-Id')
        user_role = self.request.headers.get('X-User-Role')
        
        if user_role == 'ADMIN' or user_id == 'admin':
            pass
        elif user_role == 'MANAGER':
            team_ids = Employee.objects.filter(reportingManager=user_id).values_list('id', flat=True)
            queryset = queryset.filter(Q(assignedEmployees__id=user_id) | Q(assignedEmployees__id__in=team_ids)).distinct()
        elif user_id:
            queryset = queryset.filter(assignedEmployees__id=user_id).distinct()

        employeeId = self.request.query_params.get('employeeId')
        if employeeId:
            queryset = queryset.filter(assignedEmployees__id=employeeId).distinct()
        return queryset

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.headers.get('X-User-Id')
        user_role = self.request.headers.get('X-User-Role')

        if user_role == 'ADMIN' or user_id == 'admin':
            pass
        elif user_role == 'MANAGER':
            team_ids = Employee.objects.filter(reportingManager=user_id).values_list('id', flat=True)
            queryset = queryset.filter(Q(assignedEmployees__id=user_id) | Q(assignedEmployees__id__in=team_ids)).distinct()
        elif user_id:
            queryset = queryset.filter(assignedEmployees__id=user_id).distinct()

        employeeId = self.request.query_params.get('employeeId')
        if employeeId:
            queryset = queryset.filter(assignedEmployees__id=employeeId).distinct()
        
        projectId = self.request.query_params.get('projectId')
        if projectId:
            queryset = queryset.filter(project__id=projectId)
        
        return queryset

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.headers.get('X-User-Id')
        user_role = self.request.headers.get('X-User-Role')

        if user_role == 'ADMIN' or user_id == 'admin':
            pass
        elif user_role == 'MANAGER':
            team_ids = Employee.objects.filter(reportingManager=user_id).values_list('id', flat=True)
            queryset = queryset.filter(Q(uploadedBy__id=user_id) | Q(uploadedBy__id__in=team_ids))
        elif user_id:
            queryset = queryset.filter(uploadedBy__id=user_id)

        employeeId = self.request.query_params.get('employeeId')
        if employeeId:
            queryset = queryset.filter(uploadedBy__id=employeeId)
        return queryset

class PermissionRequestViewSet(viewsets.ModelViewSet):
    queryset = PermissionRequest.objects.all()
    serializer_class = PermissionRequestSerializer

    def perform_create(self, serializer):
        requester_id = self.request.data.get('requester')
        if requester_id:
            try:
                emp = Employee.objects.get(id=requester_id)
                if emp.reportingManager:
                    # reportingManager is string ID of the manager employee
                    try:
                        manager = Employee.objects.get(id=emp.reportingManager)
                        serializer.save(approver=manager)
                        return
                    except Employee.DoesNotExist:
                        pass
            except Employee.DoesNotExist:
                pass
        serializer.save()

    def get_queryset(self):
        queryset = super().get_queryset()
        user_id = self.request.headers.get('X-User-Id')
        user_role = self.request.headers.get('X-User-Role')

        if user_role == 'ADMIN' or user_id == 'admin':
            pass
        elif user_role == 'MANAGER':
            # Manager sees requests they made and requests to them
            queryset = queryset.filter(Q(requester__id=user_id) | Q(approver__id=user_id))
        elif user_id:
            # Employee sees only their own requests
            queryset = queryset.filter(requester__id=user_id)

        return queryset

from rest_framework.permissions import AllowAny
from .serializers import AppUserRegisterSerializer

class AppUserRegisterView(APIView):
    permission_classes = [AllowAny]
    
    @extend_schema(
        tags=['field-tracking'],
        summary="Register App User",
        description="Self-registration for mobile app users. Directly creates an Employee.",
        request=AppUserRegisterSerializer,
        responses={
            201: inline_serializer(
                name="AppUserRegisterResponse",
                fields={
                    "message": serializers.CharField(),
                    "employeeId": serializers.CharField()
                }
            )
        }
    )
    def post(self, request):
        serializer = AppUserRegisterSerializer(data=request.data)
        if serializer.is_valid():
            employee = serializer.save()
            return Response({
                "message": "User registered successfully",
                "employeeId": employee.employeeId
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

