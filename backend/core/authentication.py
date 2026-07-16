from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings
from django.contrib.auth import get_user_model

User = get_user_model()

class SharedJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        """
        Attempts to find and return a user using the given validated token.
        If the user does not exist, it creates one (Just-In-Time Provisioning).
        """
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise AuthenticationFailed('Token contained no recognizable user identification', code='token_not_valid')

        try:
            user = User.objects.get(**{api_settings.USER_ID_FIELD: user_id})
        except User.DoesNotExist:
            # User doesn't exist in the local database, let's auto-provision them.
            # Extract info from the JWT payload
            email = validated_token.get('email', '')
            first_name = validated_token.get('first_name', '')
            last_name = validated_token.get('last_name', '')
            is_staff = validated_token.get('is_staff', False)
            
            if not email:
                raise AuthenticationFailed('Token contained no email, cannot auto-provision', code='token_not_valid')
            
            # Create the user locally
            user = User.objects.create(
                id=user_id,
                username=email, # Using email as username
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_staff=is_staff,
                is_superuser=is_staff, # If admin in main, make superuser here
            )

        if not user.is_active:
            raise AuthenticationFailed('User is inactive', code='user_inactive')

        # Auto-provision Employee record in Field Senses if it doesn't exist
        from core.models import Employee, Role, generate_employee_id
        from django.utils import timezone

        if not Employee.objects.filter(email=user.email).exists():
            # Determine role
            user_type = validated_token.get('user_type', 'user').upper()
            role_code = 'ADMIN' if user.is_staff else user_type
            
            # Fetch the Role object
            role = Role.objects.filter(roleCode=role_code).first()
            if not role:
                role = Role.objects.filter(roleCode='EMPLOYEE').first() # Fallback
                
            # Create the Employee record
            Employee.objects.create(
                id=user.id,
                employeeId=generate_employee_id(),
                fullName=f"{user.first_name} {user.last_name}".strip() or user.email.split('@')[0],
                email=user.email,
                roleId=role,
                mobileNumber='',
                password='', # Handled by SSO
                designation='SSO User',
                employmentType='Full-time',
                workMode='Field',
                joiningDate=timezone.now().date(),
                accountStatus=True
            )

        # Optionally, update user's role/is_staff if it has changed in the token
        is_staff_in_token = validated_token.get('is_staff', False)
        if user.is_staff != is_staff_in_token:
            user.is_staff = is_staff_in_token
            user.is_superuser = is_staff_in_token
            user.save(update_fields=['is_staff', 'is_superuser'])
            
            # Update Employee role if Admin status changed
            emp = Employee.objects.filter(email=user.email).first()
            if emp:
                if is_staff_in_token:
                    admin_role = Role.objects.filter(roleCode='ADMIN').first()
                    if admin_role:
                        emp.roleId = admin_role
                        emp.save(update_fields=['roleId'])
                else:
                    emp_role = Role.objects.filter(roleCode='EMPLOYEE').first()
                    if emp_role:
                        emp.roleId = emp_role
                        emp.save(update_fields=['roleId'])

        return user
