from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RoleViewSet, DepartmentViewSet, StatusMasterViewSet,
    ProjectViewSet, EmployeeViewSet, RolePermissionViewSet,
    ReportingManagerViewSet, LoginView, RegistrationRequestViewSet,
    TaskViewSet, DocumentViewSet, PermissionRequestViewSet,
    AppUserRegisterView, ProvisioningView, DeprovisioningView,
    RevokeTokenView, ExchangeHandoffCodeView, RegisterHandoffCodeView
)

router = DefaultRouter()
router.register(r'roles', RoleViewSet)
router.register(r'departments', DepartmentViewSet)
router.register(r'status-masters', StatusMasterViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'employees', EmployeeViewSet)
router.register(r'role-permissions', RolePermissionViewSet)
router.register(r'reporting-managers', ReportingManagerViewSet)
router.register(r'registration-requests', RegistrationRequestViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'documents', DocumentViewSet)
router.register(r'permission-requests', PermissionRequestViewSet)

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='api-login'),
    path('app-register/', AppUserRegisterView.as_view(), name='api-app-register'),
    path('internal/provision-employee/', ProvisioningView.as_view(), name='internal-provision-employee'),
    path('internal/deprovision-employee/', DeprovisioningView.as_view(), name='internal-deprovision-employee'),
    path('internal/revoke-token/', RevokeTokenView.as_view(), name='internal-revoke-token'),
    path('internal/register-handoff-code/', RegisterHandoffCodeView.as_view(), name='internal-register-handoff-code'),
    path('internal/exchange-handoff-code/', ExchangeHandoffCodeView.as_view(), name='internal-exchange-handoff-code'),
    path('', include(router.urls)),
]




