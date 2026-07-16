from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class AttendanceRecord(models.Model):
    employee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField(default=timezone.now)
    
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_in_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_in_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_in_address = models.TextField(blank=True, null=True)
    check_in_photo = models.ImageField(upload_to='attendance_photos/checkin/', null=True, blank=True)
    
    check_out_time = models.DateTimeField(null=True, blank=True)
    check_out_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    check_out_address = models.TextField(blank=True, null=True)
    check_out_photo = models.ImageField(upload_to='attendance_photos/checkout/', null=True, blank=True)
    
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('employee', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.employee.username} - {self.date}"

    def calculate_hours(self):
        if self.check_in_time and self.check_out_time:
            delta = self.check_out_time - self.check_in_time
            hours = delta.total_seconds() / 3600
            self.total_hours = round(hours, 2)
        return self.total_hours
