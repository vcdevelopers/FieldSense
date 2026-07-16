with open('c:/field-senses-app-main/backend/field_tracking/views.py', 'a') as f:
    f.write('''
class TrackingConfigurationAPIView(APIView):
    permission_classes = [IsAdminOrManagerWeb]
    def get(self, request):
        from .models import TrackingConfiguration
        config, _ = TrackingConfiguration.objects.get_or_create(id=1)
        return Response({
            "idleThreshold": config.idle_threshold,
            "geoFenceRadius": config.geo_fence_radius,
            "autoRefreshRate": config.auto_refresh_rate,
            "defaultMapTheme": config.default_map_theme
        })
    def post(self, request):
        from .models import TrackingConfiguration
        config, _ = TrackingConfiguration.objects.get_or_create(id=1)
        data = request.data
        if "idleThreshold" in data: config.idle_threshold = data["idleThreshold"]
        if "geoFenceRadius" in data: config.geo_fence_radius = data["geoFenceRadius"]
        if "autoRefreshRate" in data: config.auto_refresh_rate = data["autoRefreshRate"]
        if "defaultMapTheme" in data: config.default_map_theme = data["defaultMapTheme"]
        config.save()
        return Response({"message": "Configuration updated successfully"})
''')
