from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SiteListView, DailyRouteCreateView, TodayRouteView, CheckInView, 
    AdminLiveOverviewView, SiteVisitFormTemplateView, MOMFormTemplateView, VisitLogUpdateView, 
    AuditLogListView, OfflineSyncView, AdHocMeetingListCreateView, 
    AdHocMeetingDetailView,
    EmployeeProfileAPIView, AdminEmployeeProfileAPIView,
    LiveEmployeeDetailsView, ClientMeetingAnalyticsView,
    MobileDashboardAPIView, StartMeetingAPIView, EndMeetingAPIView,
    SubmitMOMAPIView, OverdueMOMAPIView, EmployeeAnalyticsAPIView,
    FormTemplateViewSet, AssignedFormsListView, DynamicFormTemplateView,
    TrackingConfigurationAPIView, DownloadReportView, EmailReportView,
    ActiveChecklistsListView
)

router = DefaultRouter()
router.register(r'admin/form-templates', FormTemplateViewSet, basename='form-templates')

urlpatterns = [
    path('', include(router.urls)),
    path('mobile/dashboard/', MobileDashboardAPIView.as_view(), name='mobile-dashboard'),
    path('sites/', SiteListView.as_view(), name='site-list'),
    path('routes/daily/', DailyRouteCreateView.as_view(), name='daily-route-create'),
    path('routes/today/', TodayRouteView.as_view(), name='today-route'),
    path('check-in/', CheckInView.as_view(), name='check-in'),
    path('admin/live/', AdminLiveOverviewView.as_view(), name='admin-live-overview'),
    path('admin/live/<str:employee_id>/', LiveEmployeeDetailsView.as_view(), name='admin-live-details'),
    path('admin/settings/', TrackingConfigurationAPIView.as_view(), name='admin-tracking-settings'),
    path('analytics/client-meetings/', ClientMeetingAnalyticsView.as_view(), name='client-meetings-analytics'),
    path('forms/assigned/', AssignedFormsListView.as_view(), name='assigned-forms'),
    path('checklists/', ActiveChecklistsListView.as_view(), name='active-checklists-list'),
    path('forms/<str:form_type>/', DynamicFormTemplateView.as_view(), name='dynamic-form-template'),
    path('form-template/', SiteVisitFormTemplateView.as_view(), name='form-template'),
    path('mom-form-template/', MOMFormTemplateView.as_view(), name='mom-form-template'),
    path('visit-log/<int:pk>/', VisitLogUpdateView.as_view(), name='visit-log-update'),
    path('audit-logs/', AuditLogListView.as_view(), name='audit-logs'),
    path('sync/', OfflineSyncView.as_view(), name='offline-sync'),
    path('meetings/', AdHocMeetingListCreateView.as_view(), name='adhoc-meeting-list-create'),
    path('meetings/<int:pk>/', AdHocMeetingDetailView.as_view(), name='adhoc-meeting-detail'),
    path('meetings/<int:pk>/start/', StartMeetingAPIView.as_view(), name='adhoc-meeting-start'),
    path('meetings/<int:pk>/end/', EndMeetingAPIView.as_view(), name='adhoc-meeting-end'),
    path('profile/', EmployeeProfileAPIView.as_view(), name='employee-profile'),
    path('admin/employees/<str:employee_id>/profile/', AdminEmployeeProfileAPIView.as_view(), name='admin-employee-profile'),
    path('meetings/<int:meeting_id>/submit-mom/', SubmitMOMAPIView.as_view(), name='adhoc-meeting-submit-mom'),
    path('reminders/overdue-moms/', OverdueMOMAPIView.as_view(), name='overdue-moms'),
    path('analytics/employee/<int:employee_id>/', EmployeeAnalyticsAPIView.as_view(), name='employee-analytics'),
    path('analytics/download-report/', DownloadReportView.as_view(), name='download-report'),
    path('analytics/email-report/', EmailReportView.as_view(), name='email-report'),
]
