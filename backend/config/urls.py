from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from drf_spectacular.utils import extend_schema_view, extend_schema

DecoratedTokenObtainPairView = extend_schema_view(
    post=extend_schema(tags=['field-tracking'], summary="Get JWT Auth Token")
)(TokenObtainPairView)

DecoratedTokenRefreshView = extend_schema_view(
    post=extend_schema(tags=['field-tracking'], summary="Refresh JWT Auth Token")
)(TokenRefreshView)

urlpatterns = [
    path('admin/', admin.site.urls),

    # Core app: employees, roles, departments, status-masters, projects
    path('api/', include('core.urls')),

    # CRM app: distributors, territories, sales-executives, sales-targets, distributor-links
    path('api/crm/', include('crm.urls')),

    # Inventory app: categories, uoms, products, locations, vendors
    path('api/inventory/', include('inventory.urls')),

    # Ops app: meetings, tracking-entries, employee-tasks, alerts
    path('api/ops/', include('ops.urls')),

    # Field Tracking App
    path('api/field-tracking/', include('field_tracking.urls')),

    # Attendance App
    path('api/attendance/', include('attendance.urls')),

    # JWT Auth Endpoints
    path('api/auth/token/', DecoratedTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', DecoratedTokenRefreshView.as_view(), name='token_refresh'),

    # OpenAPI Schema and Swagger UI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)