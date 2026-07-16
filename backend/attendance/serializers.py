from rest_framework import serializers
from .models import AttendanceRecord

class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    employee_username = serializers.CharField(source='employee.username', read_only=True)
    
    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee', 'employee_name', 'employee_username', 'date',
            'check_in_time', 'check_in_lat', 'check_in_lng', 'check_in_address', 'check_in_photo',
            'check_out_time', 'check_out_lat', 'check_out_lng', 'check_out_address', 'check_out_photo',
            'total_hours', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'employee', 'date', 'total_hours', 'created_at', 'updated_at']

class CheckInResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee', 'date', 
            'check_in_time', 'check_in_lat', 'check_in_lng', 'check_in_address', 'check_in_photo'
        ]

class CheckOutResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceRecord
        fields = [
            'id', 'employee', 'date', 
            'check_out_time', 'check_out_lat', 'check_out_lng', 'check_out_address', 'check_out_photo',
            'total_hours'
        ]

class CheckInSerializer(serializers.Serializer):
    lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=True, help_text="Latitude (e.g. 19.0760)")
    lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=True, help_text="Longitude (e.g. 72.8777)")
    address = serializers.CharField(required=False, allow_blank=True, help_text="Optional reverse-geocoded address string")
    photo = serializers.ImageField(required=False, allow_null=True, help_text="Optional selfie/verification photo for check-in")

class CheckOutSerializer(serializers.Serializer):
    lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=True, help_text="Latitude (e.g. 19.0760)")
    lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=True, help_text="Longitude (e.g. 72.8777)")
    address = serializers.CharField(required=False, allow_blank=True, help_text="Optional reverse-geocoded address string")
    photo = serializers.ImageField(required=False, allow_null=True, help_text="Optional selfie/verification photo for check-out")

class AdminDashboardAttendanceSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    date = serializers.DateField()
    check_in_time = serializers.DateTimeField(allow_null=True)
    check_out_time = serializers.DateTimeField(allow_null=True)
    total_hours = serializers.DecimalField(max_digits=5, decimal_places=2)
    meetings_total = serializers.IntegerField()
    meetings_completed = serializers.IntegerField()
    meetings_pending = serializers.IntegerField()
    
    # New fields for detailed dashboard
    role = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    department = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    session_status = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    duration_formatted = serializers.CharField(allow_null=True, allow_blank=True, required=False)
    ip_address = serializers.CharField(allow_null=True, allow_blank=True, required=False)
