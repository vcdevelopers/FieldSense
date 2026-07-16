from django.contrib import admin
from .models import Site, DailyRoute, RouteStop, VisitLog, AdHocMeeting

@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ('name', 'latitude', 'longitude', 'geofence_radius')
    search_fields = ('name',)

class RouteStopInline(admin.TabularInline):
    model = RouteStop
    extra = 1

@admin.register(DailyRoute)
class DailyRouteAdmin(admin.ModelAdmin):
    list_display = ('employee', 'date', 'status')
    list_filter = ('status', 'date')
    search_fields = ('employee__username',)
    inlines = [RouteStopInline]

@admin.register(VisitLog)
class VisitLogAdmin(admin.ModelAdmin):
    list_display = ('employee', 'site', 'check_in_time', 'is_verified')
    list_filter = ('is_verified', 'check_in_time')
    search_fields = ('employee__username', 'site__name')

@admin.register(AdHocMeeting)
class AdHocMeetingAdmin(admin.ModelAdmin):
    list_display = ('meeting_title', 'client_name', 'employee', 'date', 'time', 'status', 'priority')
    list_filter = ('status', 'priority', 'date', 'meeting_type')
    search_fields = ('meeting_title', 'client_name', 'employee__username', 'location_name')
    readonly_fields = ('start_time', 'end_time', 'start_lat', 'start_lng', 'end_lat', 'end_lng')
    ordering = ('-date', '-time')
