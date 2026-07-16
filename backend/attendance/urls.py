from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeCheckInView,
    EmployeeCheckOutView,
    TodayAttendanceView,
    AttendanceRecordViewSet,
    AdminDashboardAttendanceView
)

router = DefaultRouter()
router.register(r'records', AttendanceRecordViewSet, basename='attendance-records')

urlpatterns = [
    path('check-in/', EmployeeCheckInView.as_view(), name='attendance-checkin'),
    path('check-out/', EmployeeCheckOutView.as_view(), name='attendance-checkout'),
    path('today/', TodayAttendanceView.as_view(), name='attendance-today'),
    path('admin/dashboard/', AdminDashboardAttendanceView.as_view(), name='attendance-admin-dashboard'),
    path('', include(router.urls)),
]
