from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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
        user = getattr(self.request, 'user', None)
        user_id = self.request.headers.get('X-User-Id')
        user_role = (getattr(self.request, 'field_role', None) or self.request.headers.get('X-User-Role') or '').upper()

        is_field_worker = (user_role == 'EMPLOYEE') or (user and getattr(user, 'user_type', '') == 'field')
        is_manager_or_admin = not is_field_worker or (user and (user.is_staff or user.is_superuser)) or user_id == 'admin'

        if is_manager_or_admin:
            return queryset
        elif user and user.is_authenticated:
            logicon_emp_id = getattr(self.request, 'logicon_employee_id', None)
            return queryset.filter(Q(email__iexact=user.email) | Q(logicon_employee_id=logicon_emp_id))

        return queryset.none()





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
        
        # Generate JWT Token for the standard User with explicit user claims
        refresh = RefreshToken.for_user(user)
        refresh['email'] = employee.email if employee else user.email
        refresh['first_name'] = user.first_name or (employee.fullName.split()[0] if employee and employee.fullName else '')
        refresh['last_name'] = user.last_name or (employee.fullName.split()[-1] if employee and employee.fullName and len(employee.fullName.split()) > 1 else '')
        if employee:
            refresh['logicon_employee_id'] = employee.logicon_employee_id
            refresh['field_role'] = roleCode
        
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


from django.conf import settings
from rest_framework.exceptions import PermissionDenied
from core.authentication import ServiceAccountAuthentication
from core.models import ProvisioningLog, Role, generate_employee_id
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class ProvisioningView(APIView):
    """
    Internal endpoint for Logicon to push-provision or update an Employee in FieldSense.
    Protected by ServiceAccountAuthentication and network IP check.
    """
    authentication_classes = [ServiceAccountAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        allowed_ips = getattr(settings, 'ALLOWED_INTERNAL_PROVISIONING_IPS', ['127.0.0.1', 'localhost', '*'])
        client_ip = get_client_ip(request)
        if '*' not in allowed_ips and client_ip not in allowed_ips:
            raise PermissionDenied('Access denied: client IP is not authorized for internal provisioning.')

        idempotency_key = request.data.get('idempotency_key')
        logicon_emp_id = request.data.get('logicon_employee_id')

        if not idempotency_key or not logicon_emp_id:
            return Response(
                {'detail': 'idempotency_key and logicon_employee_id are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_log = ProvisioningLog.objects.filter(idempotency_key=idempotency_key).first()
        if existing_log:
            return Response(
                {
                    'status': 'skipped',
                    'detail': 'Idempotency key already processed.',
                    'logicon_employee_id': logicon_emp_id,
                },
                status=status.HTTP_200_OK,
            )

        email = request.data.get('email', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        field_role_code = request.data.get('field_role', 'EMPLOYEE')
        deploy_id = request.data.get('logicon_deployment_id')
        site_scope = request.data.get('field_site_scope', [])

        if not email:
            email = f"emp-{logicon_emp_id}@logicon-employee.internal"

        role = Role.objects.filter(roleCode=field_role_code).first()
        if not role:
            role = Role.objects.filter(roleCode='EMPLOYEE').first()

        emp = Employee.objects.filter(logicon_employee_id=logicon_emp_id).first()
        if not emp:
            emp = Employee.objects.filter(email__iexact=email).first()

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User.objects.create(
                username=email,
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
            )
        else:
            user.is_active = True
            user.first_name = first_name or user.first_name
            user.last_name = last_name or user.last_name
            user.save(update_fields=['is_active', 'first_name', 'last_name'])

        if not emp:
            emp = Employee.objects.create(
                employeeId=generate_employee_id(),
                fullName=f"{first_name} {last_name}".strip() or email.split('@')[0],
                email=email,

                roleId=role,
                mobileNumber='',
                password='',
                designation='Deployed Field Worker',
                employmentType='Full-time',
                workMode='Field',
                joiningDate=timezone.now().date(),
                accountStatus=True,
                logicon_employee_id=logicon_emp_id,
                logicon_deployment_id=deploy_id,
                current_site_scope=site_scope,
            )
        else:
            emp.accountStatus = True
            emp.roleId = role or emp.roleId
            emp.logicon_employee_id = logicon_emp_id
            emp.logicon_deployment_id = deploy_id or emp.logicon_deployment_id
            emp.current_site_scope = site_scope
            emp.save(update_fields=[
                'accountStatus', 'roleId', 'logicon_employee_id',
                'logicon_deployment_id', 'current_site_scope'
            ])

        ProvisioningLog.objects.create(
            idempotency_key=idempotency_key,
            action='provision',
            logicon_employee_id=logicon_emp_id,
            result='success',
        )

        return Response(
            {
                'status': 'success',
                'logicon_employee_id': logicon_emp_id,
                'fieldsense_employee_id': emp.id,
            },
            status=status.HTTP_201_CREATED,
        )


class DeprovisioningView(APIView):
    """
    Internal endpoint for Logicon to deprovision an Employee in FieldSense upon exit/suspension.
    """
    authentication_classes = [ServiceAccountAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        allowed_ips = getattr(settings, 'ALLOWED_INTERNAL_PROVISIONING_IPS', ['127.0.0.1', 'localhost', '*'])
        client_ip = get_client_ip(request)
        if '*' not in allowed_ips and client_ip not in allowed_ips:
            raise PermissionDenied('Access denied: client IP is not authorized for internal provisioning.')

        idempotency_key = request.data.get('idempotency_key')
        logicon_emp_id = request.data.get('logicon_employee_id')

        if not idempotency_key or not logicon_emp_id:
            return Response(
                {'detail': 'idempotency_key and logicon_employee_id are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_log = ProvisioningLog.objects.filter(idempotency_key=idempotency_key).first()
        if existing_log:
            return Response(
                {
                    'status': 'skipped',
                    'detail': 'Idempotency key already processed.',
                    'logicon_employee_id': logicon_emp_id,
                },
                status=status.HTTP_200_OK,
            )

        emp = Employee.objects.filter(logicon_employee_id=logicon_emp_id).first()
        if emp:
            emp.accountStatus = False
            emp.save(update_fields=['accountStatus'])

            user = User.objects.filter(email__iexact=emp.email).first()
            if user:
                user.is_active = False
                user.save(update_fields=['is_active'])

                try:
                    from attendance.models import AttendanceRecord
                    AttendanceRecord.objects.filter(
                        employee=user,
                        check_out_time__isnull=True
                    ).update(
                        check_out_time=timezone.now(),
                        check_out_address='Auto-closed on employee deprovisioning/exit'
                    )
                except Exception:
                    pass


        ProvisioningLog.objects.create(
            idempotency_key=idempotency_key,
            action='deprovision',
            logicon_employee_id=logicon_emp_id,
            result='success',
        )

        return Response(
            {
                'status': 'success',
                'logicon_employee_id': logicon_emp_id,
            },
            status=status.HTTP_200_OK,
        )


class RevokeTokenView(APIView):
    """
    Internal endpoint for Logicon to push JTI claim revocations to FieldSense blocklist.
    """
    authentication_classes = [ServiceAccountAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        jti = request.data.get('jti')
        ttl = request.data.get('ttl', 86400)
        if not jti:
            return Response({'detail': 'jti is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from core.blocklist import blocklist_jti
        blocklist_jti(jti, int(ttl))
        return Response({'status': 'success', 'jti': jti}, status=status.HTTP_200_OK)


class RegisterHandoffCodeView(APIView):
    """
    Internal endpoint for Logicon backend to register a 60-second single-use handoff code.
    """
    authentication_classes = [ServiceAccountAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import HandoffCode
        from django.core.cache import cache
        code = request.data.get('code')
        tokens = request.data.get('tokens')
        if not code or not tokens:
            return Response({'detail': 'code and tokens are required.'}, status=status.HTTP_400_BAD_REQUEST)

        cache.set(f"handoff:{code}", tokens, timeout=60)
        HandoffCode.objects.update_or_create(
            code=code,
            defaults={
                'access_token': tokens.get('access', ''),
                'refresh_token': tokens.get('refresh', ''),
            }
        )
        return Response({'status': 'success', 'code': code}, status=status.HTTP_200_OK)


class ExchangeHandoffCodeView(APIView):
    """
    Exchanges a 60-second single-use handoff code for access and refresh JWT tokens.
    Deletes the code immediately upon retrieval (single-use enforcement).
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import HandoffCode
        from django.core.cache import cache
        from django.utils import timezone
        code = request.data.get('code')
        if not code:
            return Response({'detail': 'code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cache_key = f"handoff:{code}"
        cached_tokens = cache.get(cache_key)

        if cached_tokens:
            cache.delete(cache_key)
            HandoffCode.objects.filter(code=code).delete()
            return Response(cached_tokens, status=status.HTTP_200_OK)

        handoff = HandoffCode.objects.filter(code=code).first()

        if not handoff:
            return Response(
                {'detail': 'Handoff code is invalid, expired, or already used.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if (timezone.now() - handoff.created_at).total_seconds() > 60:
            handoff.delete()
            return Response(
                {'detail': 'Handoff code has expired.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tokens = {
            'access': handoff.access_token,
            'refresh': handoff.refresh_token,
        }
        handoff.delete()
        cache.delete(cache_key)
        return Response(tokens, status=status.HTTP_200_OK)






