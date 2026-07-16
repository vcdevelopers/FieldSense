from rest_framework import views, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Q, Prefetch
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import AttendanceRecord
from .serializers import (
    AttendanceRecordSerializer,
    CheckInSerializer,
    CheckOutSerializer,
    AdminDashboardAttendanceSerializer,
    CheckInResponseSerializer,
    CheckOutResponseSerializer
)
from field_tracking.models import AdHocMeeting

class EmployeeCheckInView(views.APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        tags=['Mobile App - Attendance'],
        summary='Employee Check-In',
        description='Records the start of a field employee\'s shift. Accepts GPS coordinates and an optional verification photo. If sending a photo, use multipart/form-data.',
        request=CheckInSerializer,
        responses={200: CheckInResponseSerializer}
    )
    def post(self, request):
        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        today = timezone.localdate()
        user = request.user
        
        # Check if already checked in today
        record, created = AttendanceRecord.objects.get_or_create(
            employee=user,
            date=today
        )
        
        if not created and record.check_in_time:
            return Response(
                {"detail": "You have already checked in today."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        record.check_in_time = timezone.now()
        record.check_in_lat = serializer.validated_data['lat']
        record.check_in_lng = serializer.validated_data['lng']
        record.check_in_address = serializer.validated_data.get('address', '')
        
        if 'photo' in serializer.validated_data and serializer.validated_data['photo']:
            record.check_in_photo = serializer.validated_data['photo']
            
        record.save()
        
        return Response(CheckInResponseSerializer(record).data, status=status.HTTP_200_OK)

class EmployeeCheckOutView(views.APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    @extend_schema(
        tags=['Mobile App - Attendance'],
        summary='Employee Check-Out',
        description='Records the end of a field employee\'s shift and calculates total hours. Accepts GPS coordinates and an optional verification photo.',
        request=CheckOutSerializer,
        responses={200: CheckOutResponseSerializer}
    )
    def post(self, request):
        serializer = CheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        today = timezone.localdate()
        user = request.user
        
        try:
            record = AttendanceRecord.objects.get(employee=user, date=today)
        except AttendanceRecord.DoesNotExist:
            return Response(
                {"detail": "No check-in record found for today."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if record.check_out_time:
            return Response(
                {"detail": "You have already checked out today."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        record.check_out_time = timezone.now()
        record.check_out_lat = serializer.validated_data['lat']
        record.check_out_lng = serializer.validated_data['lng']
        record.check_out_address = serializer.validated_data.get('address', '')
        
        if 'photo' in serializer.validated_data and serializer.validated_data['photo']:
            record.check_out_photo = serializer.validated_data['photo']
            
        record.calculate_hours()
        record.save()
        
        return Response(CheckOutResponseSerializer(record).data, status=status.HTTP_200_OK)

class TodayAttendanceView(views.APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Mobile App - Attendance'],
        summary='Get Today\'s Attendance',
        description='Retrieves the current user\'s attendance record for today (if they have checked in).',
        responses={200: AttendanceRecordSerializer}
    )
    def get(self, request):
        today = timezone.localdate()
        user = request.user
        
        try:
            record = AttendanceRecord.objects.get(employee=user, date=today)
            return Response(AttendanceRecordSerializer(record).data)
        except AttendanceRecord.DoesNotExist:
            return Response({"detail": "No attendance record for today."}, status=status.HTTP_404_NOT_FOUND)

@extend_schema_view(
    list=extend_schema(
        tags=['Mobile App - Attendance'],
        summary='List Attendance History',
        description='Returns a list of all historical attendance records for the currently authenticated employee.'
    ),
    retrieve=extend_schema(
        tags=['Mobile App - Attendance'],
        summary='Get Attendance Record Details',
        description='Returns the full details of a specific historical attendance record.'
    )
)
class AttendanceRecordViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceRecordSerializer
    
    def get_queryset(self):
        # Admins can see all, employees see their own
        if self.request.user.is_staff or self.request.user.is_superuser: # Assuming basic admin check for now
            return AttendanceRecord.objects.all()
        return AttendanceRecord.objects.filter(employee=self.request.user)

class AdminDashboardAttendanceView(views.APIView):

    @extend_schema(
        tags=['Admin - Attendance Dashboard'],
        summary='Admin Analytics Dashboard',
        description='Fetches aggregated metrics and detailed data for the Admin Field Operations Dashboard. Accepts optional date_start, date_end, and employee_id filters.',
        responses={200: AdminDashboardAttendanceSerializer(many=True)}
    )
    def get(self, request):
        # Expected filters: date_start, date_end, employee_id
        # Default to today
        today = timezone.localdate()
        date_start = request.query_params.get('date_start', today)
        date_end = request.query_params.get('date_end', today)
        employee_id = request.query_params.get('employee_id')

        attendance_qs = AttendanceRecord.objects.filter(date__gte=date_start, date__lte=date_end).select_related('employee')
        meetings_qs = AdHocMeeting.objects.filter(date__gte=date_start, date__lte=date_end).select_related('employee')
        
        if employee_id:
            attendance_qs = attendance_qs.filter(employee_id=employee_id)
            meetings_qs = meetings_qs.filter(employee_id=employee_id)
            
        # Group by (employee_id, date)
        from collections import defaultdict
        grouped_data = defaultdict(lambda: {
            'employee_name': '',
            'check_in_time': None,
            'check_out_time': None,
            'total_hours': 0.00,
            'meetings_total': 0,
            'meetings_completed': 0,
            'meetings_pending': 0,
        })
        
        for record in attendance_qs:
            key = (record.employee.id, record.date)
            grouped_data[key]['employee_name'] = record.employee.get_full_name() or record.employee.username
            grouped_data[key]['check_in_time'] = record.check_in_time
            grouped_data[key]['check_out_time'] = record.check_out_time
            grouped_data[key]['total_hours'] = record.total_hours
            
        for meeting in meetings_qs:
            key = (meeting.employee.id, meeting.date)
            if not grouped_data[key]['employee_name']:
                grouped_data[key]['employee_name'] = meeting.employee.get_full_name() or meeting.employee.username
            
            grouped_data[key]['meetings_total'] += 1
            if meeting.status == 'Completed':
                grouped_data[key]['meetings_completed'] += 1
            else:
                grouped_data[key]['meetings_pending'] += 1
                
        from core.models import Employee
        emp_ids = list(set([k[0] for k in grouped_data.keys()]))
        employees = Employee.objects.filter(id__in=emp_ids).select_related('roleId', 'departmentId')
        employee_map = {e.id: e for e in employees}
        
        dashboard_data = []
        for (emp_id, d), data in grouped_data.items():
            emp = employee_map.get(str(emp_id)) or employee_map.get(emp_id)
            role_name = emp.roleId.roleName if emp and emp.roleId else '-'
            dept_name = emp.departmentId.departmentName if emp and emp.departmentId else '-'
            
            # Formatting Duration
            total_hours = float(data['total_hours'])
            hours = int(total_hours)
            minutes = int((total_hours - hours) * 60)
            duration_formatted = f"{hours}h {minutes}m" if total_hours > 0 else "-"
            
            # Session Status
            session_status = "-"
            if data['check_in_time']:
                if data['check_out_time']:
                    session_status = "Closed"
                else:
                    session_status = "Active Now"
                    
            ip_address = "127.0.0.1" if data['check_in_time'] else "-"

            dashboard_data.append({
                'employee_id': emp_id,
                'employee_name': data['employee_name'],
                'date': d,
                'check_in_time': data['check_in_time'],
                'check_out_time': data['check_out_time'],
                'total_hours': data['total_hours'],
                'meetings_total': data['meetings_total'],
                'meetings_completed': data['meetings_completed'],
                'meetings_pending': data['meetings_pending'],
                'role': role_name,
                'department': dept_name,
                'session_status': session_status,
                'duration_formatted': duration_formatted,
                'ip_address': ip_address
            })
            
        # Sort by date descending
        dashboard_data.sort(key=lambda x: x['date'], reverse=True)
            
        serializer = AdminDashboardAttendanceSerializer(dashboard_data, many=True)
        return Response(serializer.data)
