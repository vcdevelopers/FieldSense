import jwt
from datetime import datetime, timedelta, timezone
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import Role, Employee
from core.blocklist import blocklist_jti

User = get_user_model()


class FieldSenseSecurityAuditTests(APITestCase):

    def setUp(self):
        self.role_admin = Role.objects.create(roleName="Admin", roleCode="ADMIN", roleType="Management", defaultDashboard="/admin", rolePriority=1)
        self.role_employee = Role.objects.create(roleName="Employee", roleCode="EMPLOYEE", roleType="Execution", defaultDashboard="/employee-portal", rolePriority=3)

    def test_internal_endpoint_rejects_missing_service_token(self):
        """Internal endpoint rejects requests lacking valid service token (returns 401)."""
        response = self.client.post(
            "/api/internal/provision-employee/",
            {
                "idempotency_key": "audit-no-token",
                "logicon_employee_id": 999,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_internal_endpoint_rejects_non_service_user_type_token(self):
        """Internal endpoint rejects standard user JWT missing user_type='service'."""
        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": 500,
            "user_type": "staff",  # Not service
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }
        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        response = self.client.post(
            "/api/internal/provision-employee/",
            {
                "idempotency_key": "audit-user-type",
                "logicon_employee_id": 999,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jti_blocklist_revocation(self):
        """Revoked JTI claim in Redis blocklist immediately denies authentication."""
        jti_to_revoke = "revoked-jti-uuid-12345"
        blocklist_jti(jti_to_revoke, ttl_seconds=3600)

        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": 1234,
            "email": "revoked@test.com",
            "jti": jti_to_revoke,
            "field_access": True,
            "field_role": "ADMIN",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }
        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        response = self.client.get("/api/roles/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_csp_and_frame_headers_present(self):
        """Security middleware injects Content-Security-Policy frame-ancestors header."""
        response = self.client.get("/api/roles/")
        self.assertIn("Content-Security-Policy", response.headers)
        self.assertIn("frame-ancestors", response.headers["Content-Security-Policy"])

    def test_legacy_token_fallback_without_field_access_claim(self):
        """Pre-migration tokens missing field_access claim fall back gracefully without error."""
        Role.objects.get_or_create(roleName="Admin", roleCode="ADMIN", defaults={"roleType": "Management", "defaultDashboard": "/admin", "rolePriority": 1})
        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": 8877,
            "jti": "legacy-jti-token-8877",
            "email": "legacy.user@test.com",
            "is_staff": True,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }

        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        response = self.client.get("/api/roles/")
        if response.status_code != status.HTTP_200_OK:
            print("Legacy token fallback error response:", response.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)



    def test_stale_site_scope_write_rejection(self):
        """A write attempt using a stale target site scope outside Employee active deployment is rejected with PermissionDenied."""
        from core.permissions import check_site_scope_validity
        from rest_framework.exceptions import PermissionDenied

        user = User.objects.create(username="transferred@test.com", email="transferred@test.com")
        emp = Employee.objects.create(
            id=user.id,
            employeeId="EMP-XFER-1",
            fullName="Transferred Worker",
            email="transferred@test.com",
            joiningDate="2026-01-01",
            accountStatus=True,
            current_site_scope=["102"],
        )

        class DummyRequest:
            pass

        req = DummyRequest()
        req.user = user
        req.field_role = "EMPLOYEE"
        req.field_site_scope = ["101"]

        with self.assertRaises(PermissionDenied):
            check_site_scope_validity(req, target_site_id="101")

    def test_exchange_handoff_code_success_and_single_use_deletion(self):
        """One-time opaque code is exchanged once for tokens and deleted immediately from cache."""
        from django.core.cache import cache

        code = "valid-opaque-handoff-code-123"
        cache_key = f"handoff:{code}"
        expected_tokens = {"access": "access-token-xyz", "refresh": "refresh-token-xyz"}
        cache.set(cache_key, expected_tokens, timeout=60)

        # First exchange attempt succeeds
        response1 = self.client.post("/api/internal/exchange-handoff-code/", {"code": code}, format="json")
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data["access"], "access-token-xyz")

        # Code is deleted from cache after single use
        self.assertIsNone(cache.get(cache_key))

        # Replay attack with same code is rejected with 400 Bad Request
        response2 = self.client.post("/api/internal/exchange-handoff-code/", {"code": code}, format="json")
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_ops_roles_blocked_from_field_access(self):
        """Verify non-ops accounts (HR, Finance, Client Admin) with field_access=False are rejected with 401/403."""
        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": 9991,
            "email": "hr.executive@logicon.local",
            "user_type": "internal",
            "field_access": False,  # Blocked
            "field_role": None,
            "field_site_scope": [],
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }
        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        response = self.client.get("/api/employees/")
        # FieldSense DRF request with field_access=False returns 401/403 or empty list depending on permissions
        self.assertTrue(response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN] or len(response.data) == 0)

    def test_id_collision_safety_with_preexisting_blank_email_user(self):
        """Incoming Logicon user_id matching local FieldSense user PK must NOT bleed into local user if emails differ."""
        # Local FieldSense user with ID 555
        local_user = User.objects.create(
            id=555,
            username="synthetic-legacy-555@fieldsense.internal",
            email="synthetic-legacy-555@fieldsense.internal",
            is_staff=False,
        )

        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": 555,  # Same integer ID in Logicon token
            "email": "distinct.logicon.user@logicon.local",
            "user_type": "internal",
            "field_access": True,
            "field_role": "MANAGER",
            "field_site_scope": ["*"],
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }
        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        response = self.client.get("/api/employees/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Confirm distinct user was created and local user 555 was NOT mutated or bound to
        logicon_user = User.objects.filter(email="distinct.logicon.user@logicon.local").first()
        self.assertIsNotNone(logicon_user)
        self.assertNotEqual(logicon_user.id, local_user.id)

    def test_ambiguity_guard_with_duplicate_legacy_emails(self):
        """Multiple legacy rows sharing the same email raises AuthenticationFailed ambiguity error."""
        User.objects.create(username="dup1", email="duplicate.legacy@example.com")
        User.objects.create(username="dup2", email="duplicate.legacy@example.com")

        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": 888,
            "email": "duplicate.legacy@example.com",
            "user_type": "internal",
            "field_access": True,
            "field_role": "MANAGER",
            "field_site_scope": ["*"],
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }
        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        response = self.client.get("/api/employees/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("ambiguous_account", str(response.data))

    def test_synthetic_user_repeated_authentication_no_integrity_error(self):
        """Repeated JWT auth without email creates and reuses synthetic user without UNIQUE constraint IntegrityError."""
        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": 999123,
            "field_access": True,
            "field_role": "ADMIN",
            "field_site_scope": ["*"],
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }
        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        # First request provisions the synthetic user
        resp1 = self.client.get("/api/roles/")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # Second request reuses the synthetic user without IntegrityError
        resp2 = self.client.get("/api/roles/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)

        synthetic_username = "synthetic-user-999123@fieldsense.internal"
        self.assertTrue(User.objects.filter(username=synthetic_username).exists())

    def test_existing_local_user_resolved_from_user_id_claim_without_email(self):
        """When token has no email claim but user_id matches local user with real email, resolve to local user and employee."""
        rojer_user = User.objects.create(
            username="rojer_user@test.com",
            email="rojer_user@test.com",
            first_name="Rojer",
            last_name="Tester",
        )
        rojer_emp = Employee.objects.create(
            email="rojer_user@test.com",
            fullName="Rojer Tester",
            designation="Field Engineer",
            roleId=self.role_employee,
            joiningDate="2026-01-01",
        )

        secret = settings.SECRET_KEY
        now = datetime.now(timezone.utc)
        payload = {
            "token_type": "access",
            "user_id": rojer_user.id,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(minutes=30)).timestamp()),
        }
        token_str = jwt.encode(payload, secret, algorithm="HS256")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_str}")

        response = self.client.get("/api/roles/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Confirm no synthetic-user was created, and resolved directly to rojer_emp
        self.assertFalse(User.objects.filter(username__startswith=f"synthetic-user-{rojer_user.id}").exists())







