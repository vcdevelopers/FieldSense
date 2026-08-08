import jwt
from datetime import datetime, timedelta, timezone
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Role, Employee, ProvisioningLog, RolePermission
from core.authentication import SharedJWTAuthentication, ServiceAccountAuthentication

User = get_user_model()


class FieldSensePhase2Tests(APITestCase):

    def setUp(self):
        # Create Roles
        self.role_admin = Role.objects.create(roleName="Admin", roleCode="ADMIN", roleType="Management", defaultDashboard="/admin", rolePriority=1)
        self.role_manager = Role.objects.create(roleName="Manager", roleCode="MANAGER", roleType="Management", defaultDashboard="/dashboard", rolePriority=2)
        self.role_employee = Role.objects.create(roleName="Employee", roleCode="EMPLOYEE", roleType="Execution", defaultDashboard="/employee-portal", rolePriority=3)
        self.role_sales = Role.objects.create(roleName="Sales", roleCode="SALES", roleType="Execution", defaultDashboard="/sales", rolePriority=3)

    def test_shared_jwt_auth_field_access_denied(self):
        """Token with field_access=False is rejected immediately before JIT logic."""
        auth = SharedJWTAuthentication()
        token = {
            "user_id": 9999,
            "email": "denied@test.com",
            "field_access": False,
        }
        with self.assertRaises(Exception) as ctx:
            auth.get_user(token)
        self.assertIn("Field tracking access denied", str(ctx.exception))

    def test_shared_jwt_auth_field_role_assignment(self):
        """Token with field_role='MANAGER' assigns MANAGER role to Employee."""
        auth = SharedJWTAuthentication()
        token = {
            "user_id": 8888,
            "email": "opsmgr@test.com",
            "first_name": "Ops",
            "last_name": "Manager",
            "is_staff": False,
            "field_access": True,
            "field_role": "MANAGER",
            "field_site_scope": ["101", "102"],
            "logicon_employee_id": 55,
        }
        user = auth.get_user(token)
        self.assertEqual(user.email, "opsmgr@test.com")

        emp = Employee.objects.get(email="opsmgr@test.com")
        self.assertEqual(emp.roleId.roleCode, "MANAGER")
        self.assertEqual(emp.logicon_employee_id, 55)
        self.assertEqual(emp.current_site_scope, ["101", "102"])

    def test_service_account_authentication(self):
        """ServiceAccountAuthentication validates user_type='service' tokens."""
        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": 9990,
            "user_type": "service",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }
        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        response = self.client.post(
            "/api/internal/provision-employee/",
            {
                "idempotency_key": "idempotent-test-001",
                "logicon_employee_id": 777,
                "email": "worker777@test.com",
                "first_name": "Field",
                "last_name": "Worker",
                "field_role": "EMPLOYEE",
                "field_site_scope": ["site-42"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "success")

        # Verify Employee provisioned
        emp = Employee.objects.get(logicon_employee_id=777)
        self.assertEqual(emp.email, "worker777@test.com")
        self.assertEqual(emp.current_site_scope, ["site-42"])

        # Idempotency check: repeated call with same key returns skipped
        resp2 = self.client.post(
            "/api/internal/provision-employee/",
            {
                "idempotency_key": "idempotent-test-001",
                "logicon_employee_id": 777,
            },
            format="json",
        )
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data["status"], "skipped")

    def test_deprovisioning_view(self):
        """DeprovisioningView deactivates employee and user."""
        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": 9990,
            "user_type": "service",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }
        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        # Provision first
        self.client.post(
            "/api/internal/provision-employee/",
            {
                "idempotency_key": "idempotent-test-002",
                "logicon_employee_id": 888,
                "email": "exit.worker@test.com",
            },
            format="json",
        )

        emp = Employee.objects.get(logicon_employee_id=888)
        self.assertTrue(emp.accountStatus)

        # Deprovision
        resp = self.client.post(
            "/api/internal/deprovision-employee/",
            {
                "idempotency_key": "idempotent-test-deprovision-001",
                "logicon_employee_id": 888,
                "reason": "employee_exited",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        emp.refresh_from_db()
        self.assertFalse(emp.accountStatus)

        user = User.objects.get(email="exit.worker@test.com")
        self.assertFalse(user.is_active)


    def test_stale_site_scope_rejection(self):
        """Check-in is rejected if token site scope differs from DB current_site_scope."""
        from core.permissions import check_site_scope_validity
        from rest_framework.exceptions import PermissionDenied

        user = User.objects.create(username="stale@test.com", email="stale@test.com")
        emp = Employee.objects.create(
            id=user.id,
            employeeId="EMP-STALE-1",
            fullName="Stale Worker",
            email="stale@test.com",
            joiningDate="2026-01-01",
            accountStatus=True,
            current_site_scope=["site-87"],  # Transferred to site-87
        )

        class DummyRequest:
            pass

        req = DummyRequest()
        req.user = user
        req.field_role = "EMPLOYEE"
        req.field_site_scope = ["site-42"]  # Old token site-42

        with self.assertRaises(PermissionDenied):
            check_site_scope_validity(req)
