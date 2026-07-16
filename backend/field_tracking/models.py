from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Site(models.Model):
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    geofence_radius = models.IntegerField(default=100, help_text="Radius in meters")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class DailyRoute(models.Model):
    STATUS_CHOICES = (
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    )
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_routes')
    date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee.username} - {self.date}"

class RouteStop(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('missed', 'Missed'),
    )
    route = models.ForeignKey(DailyRoute, on_delete=models.CASCADE, related_name='stops')
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='route_stops')
    order_index = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    expected_time = models.TimeField(blank=True, null=True)

    class Meta:
        ordering = ['order_index']

    def __str__(self):
        return f"{self.route} -> {self.site.name}"

class VisitLog(models.Model):
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='visit_logs')
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name='visit_logs')
    check_in_time = models.DateTimeField(default=timezone.now)
    recorded_lat = models.DecimalField(max_digits=9, decimal_places=6)
    recorded_lng = models.DecimalField(max_digits=9, decimal_places=6)
    distance_from_site = models.FloatField(help_text="Calculated distance in meters", null=True, blank=True)
    meeting = models.ForeignKey('AdHocMeeting', on_delete=models.SET_NULL, null=True, blank=True, related_name='visit_logs')
    photo = models.ImageField(upload_to='visit_photos/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    remarks = models.TextField(blank=True, null=True)
    report_data = models.JSONField(blank=True, null=True, help_text="Stores the dynamically filled form data as JSON")

    def __str__(self):
        return f"Visit by {self.employee.username} to {self.site.name} at {self.check_in_time}"

class SiteVisitFormTemplate(models.Model):
    name = models.CharField(max_length=255, default="Default Site Visit Report")
    schema = models.JSONField(default=list, help_text="List of form field objects")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class MOMFormTemplate(models.Model):
    name = models.CharField(max_length=255)
    schema = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    is_global = models.BooleanField(default=True)
    client_type = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.name

class AuditLog(models.Model):
    EVENT_TYPES = (
        ('CHECK_IN', 'Check-In'),
        ('FORM_SUBMIT', 'Form Submission'),
        ('SITE_ADD', 'Site Addition'),
        ('OTHER', 'Other'),
    )
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    description = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
    user_id = models.IntegerField(null=True, blank=True)
    employee_name = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.event_type} - {self.description} at {self.timestamp}"

class AdHocMeeting(models.Model):
    PRIORITY_CHOICES = (
        ('High', 'High'),
        ('Medium', 'Medium'),
        ('Low', 'Low'),
    )
    
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='adhoc_meetings')
    client_name = models.CharField(max_length=255)
    meeting_title = models.CharField(max_length=255)
    meeting_type = models.CharField(max_length=100)
    date = models.DateField()
    time = models.TimeField()
    location_name = models.CharField(max_length=255)
    priority = models.CharField(max_length=50, choices=PRIORITY_CHOICES, default='Medium')
    
    STATUS_CHOICES = (
        ('Upcoming', 'Upcoming'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Pending MOM', 'Pending MOM'),
        ('Closed', 'Closed'),
        ('Delayed', 'Delayed')
    )
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Upcoming')
    
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    designation = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    current_lat = models.DecimalField(max_digits=9, decimal_places=6)
    current_lng = models.DecimalField(max_digits=9, decimal_places=6)
    destination_lat = models.DecimalField(max_digits=9, decimal_places=6)
    destination_lng = models.DecimalField(max_digits=9, decimal_places=6)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    distance_km = models.FloatField(default=0.0)
    fuel_cost = models.FloatField(default=0.0)
    fuel_approved = models.BooleanField(default=False)
    
    # Meeting Execution Tracking
    start_time = models.DateTimeField(null=True, blank=True)
    start_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    start_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    end_time = models.DateTimeField(null=True, blank=True)
    end_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    end_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    photo = models.ImageField(upload_to='meeting_photos/', null=True, blank=True)
    report_data = models.JSONField(null=True, blank=True)
    
    class Meta:
        ordering = ['-date', '-time']

    def __str__(self):
        return f"{self.meeting_title} - {self.client_name}"

class FormTemplate(models.Model):
    name = models.CharField(max_length=255)
    form_type = models.CharField(max_length=100, unique=True, help_text="A unique slug for this form (e.g., site_visit)")
    schema = models.JSONField(default=list, help_text="The JSON array defining the form fields")
    is_active = models.BooleanField(default=True)
    is_global = models.BooleanField(default=True, help_text="If true, available to all employees. If false, only available to assigned_employees.")
    assigned_employees = models.ManyToManyField(User, blank=True, related_name='assigned_forms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} Schema"


class TrackingConfiguration(models.Model):
    """
    Global settings for the Field Tracking application.
    """
    idle_threshold = models.IntegerField(default=15, help_text="Alert when employee is idle beyond this duration (minutes)")
    geo_fence_radius = models.IntegerField(default=50, help_text="Default boundary radius for zones (meters)")
    auto_refresh_rate = models.IntegerField(default=30, help_text="How often live tracking data updates (seconds)")
    default_map_theme = models.CharField(max_length=50, default='logicon-light')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tracking Configuration"
        verbose_name_plural = "Tracking Configurations"

    def __str__(self):
        return "Global Tracking Configuration"
