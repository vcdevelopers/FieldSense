from rest_framework import serializers
from django.utils import timezone
from .models import Site, DailyRoute, RouteStop, VisitLog, AdHocMeeting, FormTemplate

class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = ['id', 'name', 'address', 'latitude', 'longitude', 'geofence_radius']

class RouteStopSerializer(serializers.ModelSerializer):
    site = SiteSerializer(read_only=True)
    site_id = serializers.PrimaryKeyRelatedField(
        queryset=Site.objects.all(), source='site', write_only=True
    )

    class Meta:
        model = RouteStop
        fields = ['id', 'site', 'site_id', 'order_index', 'status', 'expected_time']

class DailyRouteSerializer(serializers.ModelSerializer):
    stops = RouteStopSerializer(many=True, read_only=True)
    site_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=False
    )

    class Meta:
        model = DailyRoute
        fields = ['id', 'employee', 'date', 'status', 'stops', 'site_ids']
        read_only_fields = ['employee', 'date', 'status']

    def create(self, validated_data):
        site_ids = validated_data.pop('site_ids', [])
        user = self.context['request'].user
        
        # Check if route already exists for today
        route, created = DailyRoute.objects.get_or_create(
            employee=user, 
            date=validated_data.get('date', None) or timezone.now().date()
        )
        
        # Add stops
        for index, site_id in enumerate(site_ids):
            site = Site.objects.get(id=site_id)
            RouteStop.objects.get_or_create(
                route=route, 
                site=site, 
                defaults={'order_index': index}
            )
            
        return route

class VisitLogSerializer(serializers.ModelSerializer):
    site = serializers.PrimaryKeyRelatedField(queryset=Site.objects.all(), required=False, allow_null=True)
    site_name = serializers.CharField(write_only=True, required=False)
    meeting_id = serializers.PrimaryKeyRelatedField(queryset=AdHocMeeting.objects.all(), source='meeting', write_only=True, required=False, allow_null=True)
    recorded_lat = serializers.FloatField(required=False, allow_null=True)
    recorded_lng = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = VisitLog
        fields = ['id', 'site', 'site_name', 'meeting_id', 'check_in_time', 'recorded_lat', 'recorded_lng', 'distance_from_site', 'photo', 'is_verified', 'remarks', 'report_data']
        read_only_fields = ['check_in_time', 'distance_from_site', 'is_verified']

    def create(self, validated_data):
        validated_data.pop('site_name', None)
        return super().create(validated_data)

    def to_internal_value(self, data):
        # Gracefully handle if the mobile app sends site: 0 or site: ""
        if hasattr(data, '_mutable'):
            # It's a QueryDict (multipart/form-data), make it mutable
            data = data.copy()
        if 'site' in data and data['site'] in [0, "0", "", None, "null"]:
            data['site'] = None
            
        # Map 'attachment' key from mobile app to 'photo' model field
        if 'attachment' in data:
            data['photo'] = data.pop('attachment')[0] if isinstance(data.getlist('attachment'), list) and data.getlist('attachment') else data.pop('attachment')
            
        # Process dynamic photo fields and normalize checklist data
        from .utils import process_checklist_report_data
        request = self.context.get('request')
        data = process_checklist_report_data(data, request)
            
        return super().to_internal_value(data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if ret.get('report_data') and isinstance(ret['report_data'], str):
            try:
                import json
                ret['report_data'] = json.loads(ret['report_data'])
            except Exception:
                pass
        return ret

class SiteVisitFormTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormTemplate
        fields = ['id', 'name', 'schema', 'created_at', 'updated_at', 'is_active']

class MOMFormTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormTemplate
        fields = ['id', 'name', 'schema', 'created_at', 'updated_at', 'is_active']

from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'

from .models import AdHocMeeting
from django.conf import settings
import requests
import logging

logger = logging.getLogger(__name__)

class AdHocMeetingSerializer(serializers.ModelSerializer):
    date = serializers.DateField(required=False, allow_null=True, format='%d/%m/%Y', input_formats=['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%m/%d/%Y', 'iso-8601'])
    time = serializers.TimeField(required=False, allow_null=True, format='%I:%M %p', input_formats=['%I:%M %p', '%H:%M', '%H:%M:%S', '%I:%M:%S %p', 'iso-8601'])
    current_lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    current_lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    destination_lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    destination_lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    location_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    client_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    meeting_title = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    meeting_type = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    priority = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    status = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    eta_time = serializers.SerializerMethodField()
    total_distance = serializers.SerializerMethodField()
    traffic_status = serializers.SerializerMethodField()
    
    reached_time = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    journey_distance = serializers.SerializerMethodField()
    journey_traffic_condition = serializers.SerializerMethodField()
    visit_report_data = serializers.SerializerMethodField()

    class Meta:
        model = AdHocMeeting
        fields = '__all__'
        read_only_fields = ['employee', 'eta_time', 'total_distance', 'traffic_status', 'reached_time', 'duration', 'journey_distance', 'journey_traffic_condition', 'visit_report_data']

    def to_internal_value(self, data):
        if hasattr(data, '_mutable'):
            data = data.copy()

        for field in ['current_lat', 'current_lng', 'destination_lat', 'destination_lng']:
            if field not in data or data[field] in [None, '', 'null', 'undefined']:
                data[field] = 0.0

        if not data.get('client_name'):
            data['client_name'] = 'Client'
        if not data.get('meeting_title'):
            data['meeting_title'] = data.get('client_name', 'Meeting')
        if not data.get('meeting_type'):
            data['meeting_type'] = 'Client Visit'
        if not data.get('location_name'):
            data['location_name'] = 'Location'
        if not data.get('priority'):
            data['priority'] = 'Medium'
        if not data.get('status'):
            data['status'] = 'Upcoming'

        if 'date' in data and data['date']:
            d_str = str(data['date']).strip()
            if 'T' in d_str:
                d_str = d_str.split('T')[0]
            if '/' in d_str:
                parts = d_str.split('/')
                if len(parts) == 3 and len(parts[2]) == 4:
                    day, month, year = parts[0], parts[1], parts[2]
                    d_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            elif '-' in d_str:
                parts = d_str.split('-')
                if len(parts) == 3 and len(parts[2]) == 4:
                    day, month, year = parts[0], parts[1], parts[2]
                    d_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
            data['date'] = d_str

        if 'time' in data and data['time']:
            t_str = str(data['time']).strip()
            if 'T' in t_str:
                t_str = t_str.split('T')[1].split('.')[0].split('+')[0].split('Z')[0]
                data['time'] = t_str

        return super().to_internal_value(data)

    def get_google_maps_data(self, obj):
        # Cache the API result in the serializer context to avoid duplicate calls per meeting
        cache_key = f'gmaps_{obj.id}'
        if cache_key in self.context:
            return self.context[cache_key]
            
        api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', '')
        if not api_key:
            logger.warning("GOOGLE_MAPS_API_KEY is not configured in settings.")
            return None

        # Validate that coordinates exist
        if not all([obj.current_lat, obj.current_lng, obj.destination_lat, obj.destination_lng]):
            logger.warning(f"Meeting {obj.id} is missing coordinate data.")
            return None
            
        # Use Routes API (modern replacement for Distance Matrix API)
        url = "https://routes.googleapis.com/directions/v2:computeRoutes"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.travelAdvisory.speedReadingIntervals",
        }
        body = {
            "origin": {
                "location": {
                    "latLng": {
                        "latitude": float(obj.current_lat),
                        "longitude": float(obj.current_lng)
                    }
                }
            },
            "destination": {
                "location": {
                    "latLng": {
                        "latitude": float(obj.destination_lat),
                        "longitude": float(obj.destination_lng)
                    }
                }
            },
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
        }
        
        try:
            response = requests.post(url, json=body, headers=headers, timeout=5)
            data = response.json()

            if 'error' in data:
                logger.error(f"Routes API error for meeting {obj.id}: {data['error']}")
                self.context[cache_key] = None
                return None

            if data.get('routes'):
                route = data['routes'][0]
                duration_seconds = int(route.get('duration', '0s').rstrip('s'))
                distance_meters = route.get('distanceMeters', 0)

                # Format values for display
                distance_km = round(distance_meters / 1000, 1)
                distance_text = f"{distance_km} km"
                duration_minutes = round(duration_seconds / 60)
                if duration_minutes >= 60:
                    hours = duration_minutes // 60
                    mins = duration_minutes % 60
                    duration_text = f"{hours}h {mins} mins" if mins else f"{hours}h"
                else:
                    duration_text = f"{duration_minutes} mins"

                result = {
                    'distance': distance_text,
                    'duration': duration_text,
                    'duration_in_traffic': duration_text,
                    'duration_value': duration_seconds,
                    'traffic_value': duration_seconds,
                    'distance_meters': distance_meters,
                }
                self.context[cache_key] = result
                return result
        except Exception as e:
            logger.error(f"Routes API exception for meeting {obj.id}: {e}")
            
        self.context[cache_key] = None
        return None


    def get_eta_time(self, obj):
        data = self.get_google_maps_data(obj)
        if data:
            return data['duration_in_traffic']
        return "Error" # Fallback dummy data if API key missing

    def get_total_distance(self, obj):
        data = self.get_google_maps_data(obj)
        if data:
            return data['distance']
        return "Error" # Fallback dummy data if API key missing
        
    def get_traffic_status(self, obj):
        data = self.get_google_maps_data(obj)
        if data:
            # Simple heuristic for traffic status
            if data['traffic_value'] > data['duration_value'] * 1.5:
                return "Heavy"
            elif data['traffic_value'] > data['duration_value'] * 1.2:
                return "Moderate"
            return "Light"
        return "Error" # Fallback dummy data if API key missing

    def _get_journey_data(self, obj):
        # Treat both Completed and Closed as finished meetings
        if obj.status not in ('Completed', 'Closed') or not obj.start_time or not obj.end_time:
            return None
            
        cache_key = f'journey_{obj.id}'
        if cache_key in self.context:
            return self.context[cache_key]
            
        # Calculate actual elapsed duration from timestamps
        duration_delta = obj.end_time - obj.start_time
        hours, remainder = divmod(duration_delta.total_seconds(), 3600)
        minutes, _ = divmod(remainder, 60)
        duration_text = f"{int(hours)}h {int(minutes)}m" if hours else f"{int(minutes)}m"
            
        result = {
            "duration": duration_text,
            "distance": "0 km",
            "traffic_condition": "Unknown"
        }
        
        # Fetch distance and traffic from Routes API using the journey start/end coordinates
        if obj.start_lat and obj.start_lng and obj.end_lat and obj.end_lng:
            api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', '')
            if api_key:
                url = "https://routes.googleapis.com/directions/v2:computeRoutes"
                headers = {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
                }
                body = {
                    "origin": {
                        "location": {
                            "latLng": {
                                "latitude": float(obj.start_lat),
                                "longitude": float(obj.start_lng)
                            }
                        }
                    },
                    "destination": {
                        "location": {
                            "latLng": {
                                "latitude": float(obj.recorded_lat),
                                "longitude": float(obj.recorded_lng)
                            }
                        }
                    },
                    "travelMode": "DRIVE",
                    "routingPreference": "TRAFFIC_AWARE_OPTIMAL",
                }
                try:
                    response = requests.post(url, json=body, headers=headers, timeout=5)
                    data = response.json()

                    if 'error' in data:
                        logger.error(f"Routes API journey error for meeting {obj.id}: {data['error']}")
                    elif data.get('routes'):
                        route = data['routes'][0]
                        distance_meters = route.get('distanceMeters', 0)
                        route_duration_s = int(route.get('duration', '0s').rstrip('s'))

                        distance_km = round(distance_meters / 1000, 1)
                        result['distance'] = f"{distance_km} km"

                        # Compare actual travel time vs. route estimate for traffic condition
                        actual_seconds = duration_delta.total_seconds()
                        if actual_seconds > route_duration_s * 1.5:
                            result['traffic_condition'] = "Heavy"
                        elif actual_seconds > route_duration_s * 1.2:
                            result['traffic_condition'] = "Moderate"
                        else:
                            result['traffic_condition'] = "Light"
                except Exception as e:
                    logger.error(f"Routes API journey exception for meeting {obj.id}: {e}")
                
        self.context[cache_key] = result
        return result

    def get_reached_time(self, obj):
        return obj.end_time if obj.status in ('Completed', 'Closed') else None

    def get_duration(self, obj):
        data = self._get_journey_data(obj)
        return data['duration'] if data else None

    def get_journey_distance(self, obj):
        data = self._get_journey_data(obj)
        return data['distance'] if data else None

    def get_journey_traffic_condition(self, obj):
        data = self._get_journey_data(obj)
        return data['traffic_condition'] if data else None

    def get_visit_report_data(self, obj):
        linked_visit = obj.visit_logs.first()
        if linked_visit and linked_visit.report_data:
            data = linked_visit.report_data
            if isinstance(data, str):
                try:
                    import json
                    return json.loads(data)
                except Exception:
                    return data
            return data
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)

        def normalize_dict(obj):
            if isinstance(obj, str):
                try:
                    import json
                    obj = json.loads(obj)
                except Exception:
                    return obj
            if isinstance(obj, dict):
                if isinstance(obj.get('data'), str):
                    try:
                        import json
                        obj['data'] = json.loads(obj['data'])
                    except Exception:
                        pass
            return obj

        if ret.get('report_data'):
            ret['report_data'] = normalize_dict(ret['report_data'])

        visit_data = ret.get('visit_report_data')
        if visit_data:
            visit_data = normalize_dict(visit_data)
            ret['visit_report_data'] = visit_data

            if not ret.get('report_data'):
                ret['report_data'] = visit_data
            elif isinstance(ret.get('report_data'), dict) and isinstance(visit_data, dict):
                merged = dict(visit_data)
                if isinstance(merged.get('data'), dict) and isinstance(ret['report_data'].get('data'), dict):
                    merged_inner = dict(merged['data'])
                    merged_inner.update(ret['report_data']['data'])
                    merged['data'] = merged_inner
                merged.update(ret['report_data'])
                ret['report_data'] = merged

        return ret

from .models import FormTemplate

class FormTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormTemplate
        fields = '__all__'
