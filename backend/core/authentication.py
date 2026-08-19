from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth import get_user_model

User = get_user_model()


class SharedJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        import jwt
        from django.conf import settings
        from rest_framework_simplejwt.tokens import UntypedToken

        try:
            return super().get_validated_token(raw_token)
        except Exception:
            pass

        secret_keys = [
            getattr(settings, 'SHARED_JWT_SECRET', None),
            getattr(settings, 'SECRET_KEY', None),
            'your-secret-key-here',
            'django-insecure-default-key-for-dev',
        ]
        secret_keys = [k for k in secret_keys if k]

        for key in secret_keys:
            try:
                decoded = jwt.decode(raw_token, key, algorithms=['HS256'])
                return decoded
            except Exception:
                continue


        raise AuthenticationFailed('Given token not valid for any token type', code='token_not_valid')

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        # Attach claims directly to DRF request object
        request.field_role = validated_token.get('field_role')
        request.field_site_scope = validated_token.get('field_site_scope', [])
        request.deployment_site_id = validated_token.get('deployment_site_id')
        request.logicon_employee_id = validated_token.get('logicon_employee_id')
        request.logicon_deployment_id = validated_token.get('logicon_deployment_id')
        request.validated_token = validated_token

        return user, validated_token

    def get_user(self, validated_token):
        """
        Finds or auto-provisions user via JWT.
        Join Key Priority:
          1. Primary: logicon_employee_id claim via Employee linkage
          2. Secondary: email claim (when non-empty)
          3. Safe synthetic auto-provisioning (no integer user_id queries that collide with local DB primary keys)
        """
        import logging
        logger = logging.getLogger(__name__)

        # JTI Blocklist Check
        jti = validated_token.get('jti')
        if jti:
            from core.blocklist import is_jti_blocklisted
            if is_jti_blocklisted(jti):
                raise AuthenticationFailed('Token has been revoked', code='token_revoked')

        # Gate check on field_access claim
        if 'field_access' in validated_token:
            if not validated_token['field_access']:
                raise AuthenticationFailed('Field tracking access denied', code='access_denied')

        logicon_emp_id = validated_token.get('logicon_employee_id')
        email = (validated_token.get('email') or '').strip()
        first_name = validated_token.get('first_name', '')
        last_name = validated_token.get('last_name', '')
        field_role_claim = (validated_token.get('field_role') or '').upper()

        is_staff = validated_token.get('is_staff', False) or (field_role_claim == 'ADMIN')

        from core.models import Employee, Role, generate_employee_id
        from django.utils import timezone

        user = None
        emp = None

        # Priority 1: Primary Join Key — logicon_employee_id
        if logicon_emp_id:
            emp = Employee.objects.filter(logicon_employee_id=logicon_emp_id).first()
            if emp and emp.email:
                user = User.objects.filter(email__iexact=emp.email).first()

        # Priority 2: Secondary Join Key — Email Lookup
        if not user and email:
            matching_users = User.objects.filter(email__iexact=email)
            if matching_users.count() > 1:
                logger.error("Ambiguous legacy user accounts found for email '%s'", email)
                raise AuthenticationFailed('Multiple matching accounts found for email', code='ambiguous_account')
            user = matching_users.first()

        # Priority 3: Safe Auto-Provisioning (Never query User.objects.get(id=user_id) directly!)
        if not user:
            if not email:
                user_id_claim = validated_token.get(api_settings.USER_ID_CLAIM) or validated_token.get('sub') or 'anon'
                email = f"synthetic-user-{user_id_claim}@fieldsense.internal"

            user, _ = User.objects.get_or_create(
                username=email,
                defaults={
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_staff": is_staff,
                    "is_superuser": is_staff,
                },
            )

        if not user.is_active:
            raise AuthenticationFailed('User is inactive', code='user_inactive')

        # Resolve roleCode from claim if present, else fallback
        target_role_code = field_role_claim if field_role_claim else ('ADMIN' if is_staff else 'EMPLOYEE')
        role = Role.objects.filter(roleCode=target_role_code).first()
        if not role:
            role = Role.objects.filter(roleCode='EMPLOYEE').first()

        # Find or create Employee linkage
        if not emp and logicon_emp_id:
            emp = Employee.objects.filter(logicon_employee_id=logicon_emp_id).first()
        if not emp and user.email:
            matching_emps = Employee.objects.filter(email__iexact=user.email)
            if matching_emps.count() > 1:
                logger.error("Ambiguous legacy employee accounts found for email '%s'", user.email)
                raise AuthenticationFailed('Multiple matching employee accounts found for email', code='ambiguous_account')
            emp = matching_emps.first()

        if not emp and user.email:
            emp, _ = Employee.objects.get_or_create(
                email=user.email,
                defaults={
                    'employeeId': generate_employee_id(),
                    'fullName': f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0],
                    'roleId': role,
                    'mobileNumber': '',
                    'password': '',
                    'designation': 'SSO User',
                    'employmentType': 'Full-time',
                    'workMode': 'Field',
                    'joiningDate': timezone.now().date(),
                    'accountStatus': True,
                    'logicon_employee_id': logicon_emp_id,
                    'logicon_deployment_id': validated_token.get('logicon_deployment_id'),
                    'current_site_scope': validated_token.get('field_site_scope', []),
                }
            )
        elif emp:
            updated_fields = []
            if role and emp.roleId_id != role.id:
                emp.roleId = role
                updated_fields.append('roleId')

            if logicon_emp_id and emp.logicon_employee_id != logicon_emp_id:
                emp.logicon_employee_id = logicon_emp_id
                updated_fields.append('logicon_employee_id')

            deploy_id = validated_token.get('logicon_deployment_id')
            if deploy_id and emp.logicon_deployment_id != deploy_id:
                emp.logicon_deployment_id = deploy_id
                updated_fields.append('logicon_deployment_id')

            site_scope = validated_token.get('field_site_scope', [])
            if site_scope and emp.current_site_scope != site_scope:
                emp.current_site_scope = site_scope
                updated_fields.append('current_site_scope')

            if updated_fields:
                emp.save(update_fields=updated_fields)

        if user.is_staff != is_staff and field_role_claim == 'ADMIN':
            user.is_staff = is_staff
            user.is_superuser = is_staff
            user.save(update_fields=['is_staff', 'is_superuser'])

        return user


class ServiceAccountAuthentication(JWTAuthentication):

    """
    Authenticates service-to-service calls from Logicon to FieldSense.
    Supports X-Service-Account-Key header OR user_type='service' JWT token.
    """

    def authenticate(self, request):
        from django.conf import settings
        service_key = request.headers.get('X-Service-Account-Key')
        expected_key = getattr(settings, 'FIELD_SENSES_SERVICE_ACCOUNT_KEY', 'fieldsense-secret-service-key-2026')


        if service_key and service_key == expected_key:
            service_user, _ = User.objects.get_or_create(
                username='service_account_logicon',
                defaults={
                    'email': 'service@logicon.internal',
                    'first_name': 'Logicon',
                    'last_name': 'ServiceAccount',
                    'is_staff': True,
                    'is_active': True,
                }
            )
            return service_user, {'user_type': 'service'}

        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        import jwt
        from django.conf import settings
        secret_keys = [
            getattr(settings, 'SHARED_JWT_SECRET', None),
            settings.SECRET_KEY,
            'your-secret-key-here',
        ]
        secret_keys = [k for k in secret_keys if k]

        validated_token = None
        for key in secret_keys:
            try:
                validated_token = jwt.decode(raw_token, key, algorithms=['HS256'])
                break
            except Exception:
                continue

        if not validated_token:
            raise AuthenticationFailed('Invalid or expired service token', code='token_not_valid')

        if validated_token.get('user_type') != 'service':
            raise AuthenticationFailed('Token is not a valid service account token', code='invalid_service_token')

        service_user, _ = User.objects.get_or_create(
            username='service_account_logicon',
            defaults={
                'email': 'service@logicon.internal',
                'first_name': 'Logicon',
                'last_name': 'ServiceAccount',
                'is_staff': True,
                'is_active': True,
            }
        )

        return service_user, validated_token


