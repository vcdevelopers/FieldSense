from rest_framework.permissions import BasePermission, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied, AuthenticationFailed
from core.models import Employee, RolePermission


def check_site_scope_validity(request, target_site_id=None):
    """
    Validates field_site_scope for sensitive write actions.
    Re-validates token claims against Employee.current_site_scope in DB to guard against stale scope after transfer.
    """
    field_role = getattr(request, 'field_role', None)
    if field_role == 'EMPLOYEE':
        emp = Employee.objects.filter(id=request.user.id).first()
        if not emp or not emp.accountStatus:
            raise AuthenticationFailed('Employee account is inactive or missing', code='user_inactive')

        db_scope = [str(s) for s in (emp.current_site_scope or [])]
        token_scope = [str(s) for s in getattr(request, 'field_site_scope', [])]

        if target_site_id and str(target_site_id) not in db_scope:
            raise PermissionDenied('Operation denied: target site ID is outside employee active site scope.')

        if db_scope and token_scope and set(token_scope) != set(db_scope):
            raise PermissionDenied('Stale site scope detected. Token re-authentication required.')


def scope_queryset_for_user(qs, request, employee_field='employee'):
    """
    Filters querysets at the DB level based on user role:
    - EMPLOYEE: strictly filtered to self (request.user.id) and site scope if applicable.
    - MANAGER: filtered to site scope if set.
    - ADMIN / superuser: all records.
    """
    if not request.user or not request.user.is_authenticated:
        return qs.none()

    if request.user.is_superuser:
        return qs

    field_role = getattr(request, 'field_role', None)
    if field_role == 'EMPLOYEE':
        lookup = {f"{employee_field}__id": request.user.id}
        return qs.filter(**lookup)

    field_site_scope = getattr(request, 'field_site_scope', [])
    if field_site_scope and '*' not in field_site_scope:
        # If queryset model has site_id or site field, filter by site scope
        if hasattr(qs.model, 'site_id'):
            return qs.filter(site_id__in=field_site_scope)
        elif hasattr(qs.model, 'site'):
            return qs.filter(site__id__in=field_site_scope)

    return qs


class EnforceRolePermission(BasePermission):
    """
    Enforces RolePermission module permissions and site scope constraints.
    """
    module_name = None

    def __init__(self, module_name=None):
        if module_name:
            self.module_name = module_name

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        field_role = getattr(request, 'field_role', None)
        if not field_role:
            return True

        module = getattr(view, 'module_name', self.module_name)
        if not module:
            return True

        role_perm = RolePermission.objects.filter(
            roleId__roleCode=field_role,
            module=module,
        ).first()

        if not role_perm:
            if field_role == 'EMPLOYEE' and request.method not in SAFE_METHODS:
                return False
            return True

        if request.method in SAFE_METHODS:
            if not role_perm.view:
                return False
        elif request.method == 'POST':
            if not role_perm.create:
                return False
        elif request.method in ['PUT', 'PATCH']:
            if not role_perm.edit:
                return False
        elif request.method == 'DELETE':
            if not role_perm.delete:
                return False

        if field_role == 'EMPLOYEE':
            check_site_scope_validity(request)

        return True
