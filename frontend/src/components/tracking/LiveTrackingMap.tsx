import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, DirectionsRenderer, TrafficLayer, TransitLayer, BicyclingLayer } from '@react-google-maps/api';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation, Clock, MapPin, User, CheckCircle2, AlertCircle, Calendar, Layers, Car, Bus, Bike, Sun, Moon, Map as MapIcon } from 'lucide-react';
import { apiClient } from '@/services/api';
import { format } from 'date-fns';
import { Input } from "@/components/ui/input";
import { GlassModal } from "@/components/ui/GlassModal";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

class MapErrorBoundary extends React.Component<any, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Map Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-muted/20">
          <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-red-200">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Map Display Error</h3>
            <p className="text-slate-600 mb-4 max-w-md">Google Maps encountered a rendering error. This is likely due to the Maps JavaScript API not being activated in your Google Cloud Console.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 19.1136, lng: 72.8697 };

const LOGICON_LIGHT_THEME = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
];

const LOGICON_DARK_THEME = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
];

export function LiveTrackingMap() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("none");
  const [trackingData, setTrackingData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<string>("today"); // 'today' | 'current'
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [showBiking, setShowBiking] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);

  const [mapTheme, setMapTheme] = useState<string>("logicon-light");
  const [autoRefreshRate, setAutoRefreshRate] = useState<number>(15000);

  const isInitialLoad = useRef(true);
  const lastDirectionsQuery = useRef('');

  useEffect(() => {
    isInitialLoad.current = true;
    lastDirectionsQuery.current = '';
    setDirectionsResponse(null);
  }, [selectedEmployeeId, viewMode, selectedDate, mapTheme]);

  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiClient.get(`/field-tracking/admin/settings/?_t=${Date.now()}`);
      if (data) {
        if (data.defaultMapTheme) setMapTheme(data.defaultMapTheme);
        if (data.autoRefreshRate) setAutoRefreshRate(data.autoRefreshRate * 1000);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    
    // Listen for changes from DailyTrackingTab
    window.addEventListener("trackingSettingsUpdated", fetchSettings);
    return () => window.removeEventListener("trackingSettingsUpdated", fetchSettings);
  }, [fetchSettings]);

  // Fetch employees list
  useEffect(() => {
    apiClient.get('/employees/').then((data) => {
      if (data) {
        const filtered = data.filter((emp: any) =>
          emp.id !== 'admin' && emp.employeeId !== 'admin' && !emp.fullName.toLowerCase().includes('admin')
        );
        setEmployees(filtered);
      }
    }).catch(console.error);
  }, []);

  // Fetch real live tracking data for the selected employee
  const fetchLiveTrackingData = useCallback(async () => {
    if (!selectedEmployeeId || selectedEmployeeId === "none") {
      try {
        const response = await apiClient.get(`/field-tracking/admin/live/?date=${selectedDate}`);
        const data = Array.isArray(response) ? response : [];
        setTrackingData({ all_employees: data });
        if (map && window.google) {
          const bounds = new window.google.maps.LatLngBounds();
          let hasPoints = false;
          data.forEach((emp: any) => {
            if (emp.current_location) {
              bounds.extend(new window.google.maps.LatLng(Number(emp.current_location.lat), Number(emp.current_location.lng)));
              hasPoints = true;
            }
          });
          if (hasPoints && isInitialLoad.current) {
            map.fitBounds(bounds);
            isInitialLoad.current = false;
          }
        }
      } catch (e) { console.error(e); }
      setDirectionsResponse(null);
      return;
    }
    try {
      const response = await apiClient.get(`/field-tracking/admin/live/${selectedEmployeeId}/?date=${selectedDate}`);
      const data = response || {};
      setTrackingData(data);

      // Calculate directions to current meeting
      if (window.google) {
        const inProgress = data.meetings?.find((m: any) => m.status === 'In Progress');
        const upcoming = data.meetings?.find((m: any) => m.status === 'Upcoming');
        const activeMeeting = inProgress || upcoming;

        if (data.current_location && activeMeeting && activeMeeting.destination_lat) {
          const queryKey = `${data.current_location.lat},${data.current_location.lng}-${activeMeeting.destination_lat},${activeMeeting.destination_lng}`;
          if (lastDirectionsQuery.current !== queryKey) {
            lastDirectionsQuery.current = queryKey;
            const directionsService = new window.google.maps.DirectionsService();
            directionsService.route(
              {
                origin: { lat: Number(data.current_location.lat), lng: Number(data.current_location.lng) },
                destination: { lat: Number(activeMeeting.destination_lat), lng: Number(activeMeeting.destination_lng) },
                travelMode: window.google.maps.TravelMode.DRIVING,
              },
              (result, status) => {
                if (status === window.google.maps.DirectionsStatus.OK && result) {
                  setDirectionsResponse(result);
                } else {
                  console.error("Directions request failed due to " + status);
                }
              }
            );
          }
        } else {
          lastDirectionsQuery.current = '';
          setDirectionsResponse(null);
        }
      }

      // Auto-adjust map bounds if not using DirectionsRenderer bounds
      if (map && window.google && !directionsResponse) {
        const bounds = new window.google.maps.LatLngBounds();
        let hasPoints = false;

        if (data.current_location) {
          bounds.extend(new window.google.maps.LatLng(data.current_location.lat, data.current_location.lng));
          hasPoints = true;
        }

        if (viewMode === 'today') {
          data.meetings?.forEach((m: any) => {
            if (m.destination_lat && m.destination_lng) {
              bounds.extend(new window.google.maps.LatLng(Number(m.destination_lat), Number(m.destination_lng)));
              hasPoints = true;
            }
          });
          data.visit_logs?.forEach((v: any) => {
            if (v.latitude && v.longitude) {
              bounds.extend(new window.google.maps.LatLng(Number(v.latitude), Number(v.longitude)));
              hasPoints = true;
            }
          });
        }

        if (hasPoints && isInitialLoad.current) {
          map.fitBounds(bounds);
          isInitialLoad.current = false;
        }
      }
    } catch (e) {
      console.error("Failed to fetch live tracking data", e);
    }
  }, [selectedEmployeeId, map, viewMode, directionsResponse, selectedDate]);

  useEffect(() => {
    fetchLiveTrackingData();
    const intervalId = setInterval(fetchLiveTrackingData, autoRefreshRate);
    return () => clearInterval(intervalId);
  }, [fetchLiveTrackingData, autoRefreshRate]);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const mapOptions = React.useMemo(() => {
    const opts: any = { disableDefaultUI: true, zoomControl: true };
    if (mapTheme === 'satellite') {
      opts.mapTypeId = 'satellite';
      opts.styles = [];
    } else if (mapTheme === 'logicon-light') {
      opts.mapTypeId = 'roadmap';
      opts.styles = LOGICON_LIGHT_THEME;
    } else if (mapTheme === 'logicon-dark') {
      opts.mapTypeId = 'roadmap';
      opts.styles = LOGICON_DARK_THEME;
    } else {
      opts.mapTypeId = 'roadmap';
      opts.styles = [];
    }
    return opts;
  }, [mapTheme]);

  if (loadError) {
    return (
      <div className="relative w-full h-[600px] md:h-[700px] rounded-xl overflow-hidden shadow-xl border border-border flex items-center justify-center bg-muted/20">
        <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">Map Loading Error</h3>
          <p className="text-slate-600 mb-4 max-w-md">Google Maps could not be loaded. Please ensure your API key is valid.</p>
        </div>
      </div>
    );
  }

  const empName = employees.find(e => e.employeeId === selectedEmployeeId || e.id === selectedEmployeeId)?.fullName || "Employee";

  const currentLocation = trackingData?.current_location;
  let meetings = trackingData?.meetings || [];
  const visitLogs = trackingData?.visit_logs || [];
  const status = trackingData?.status || "Offline";

  const activeMeeting = meetings.find((m: any) => m.status === 'In Progress') || meetings.find((m: any) => m.status === 'Upcoming');

  if (viewMode === 'current') {
    meetings = activeMeeting ? [activeMeeting] : [];
  }

  const getMarkerIcon = (statusStr: string) => {
    if (statusStr === 'Completed' || statusStr === 'Closed') return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
    if (statusStr === 'In Progress') return 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png';
    if (statusStr === 'Delayed') return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
    return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
  };


  let pathPoints: any[] = [];
  if (trackingData) {
    trackingData?.locations?.forEach((loc: any) => {
      pathPoints.push({ lat: Number(loc.latitude), lng: Number(loc.longitude), time: new Date(loc.timestamp).getTime() });
    });
    trackingData?.visits?.forEach((v: any) => {
      if (v.latitude && v.longitude) {
        pathPoints.push({ lat: Number(v.latitude), lng: Number(v.longitude), time: new Date(v.check_in_time).getTime() });
      }
    });
    trackingData?.meetings?.forEach((m: any) => {
      if (m.current_lat && m.current_lng) {
        pathPoints.push({ lat: Number(m.current_lat), lng: Number(m.current_lng), time: new Date(`1970-01-01T${m.time}`).getTime() });
      }
    });
    pathPoints.sort((a, b) => a.time - b.time);
    if (currentLocation) {
      pathPoints.push({ lat: Number(currentLocation.lat), lng: Number(currentLocation.lng), time: Infinity });
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full h-[600px] md:h-[700px]">
      {/* Main Map Container */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-md border border-border shrink-0">
        
        {/* Floating Controls Overlay */}
        <Card className="absolute top-4 left-4 z-10 w-[320px] shadow-2xl border border-border bg-card/95 backdrop-blur-md max-h-[90%] overflow-y-auto custom-scrollbar">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Live Tracking
              </h3>
              {selectedEmployeeId !== "none" && (
                <Badge variant={status === "Traveling" || status === "At Site" ? "default" : "secondary"}>
                  {status}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Select Date
                </p>
                <Input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="w-full h-8"
                />
              </div>
              


              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Select Employee to Track
                </p>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="bg-background w-full h-8">
                    <SelectValue placeholder="Select an Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Stop Tracking)</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.employeeId || emp.id} value={emp.id.toString()}>
                        {emp.fullName} ({emp.employeeId || emp.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployeeId !== "none" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Map View Filter</p>
                  <Select value={viewMode} onValueChange={setViewMode}>
                    <SelectTrigger className="bg-background w-full h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">View All Today\'s History</SelectItem>
                      <SelectItem value="current">View Current Meeting Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedEmployeeId !== "none" && trackingData && (
                <>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Meetings
                      </p>
                      <p className="font-semibold">{trackingData.meetings?.length || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> Completed
                      </p>
                      <p className="font-semibold">{trackingData.meetings?.filter((m: any) => m.status === 'Completed' || m.status === 'Closed').length || 0}</p>
                    </div>
                  </div>

                  <div className="relative space-y-0 pl-4 border-l-2 border-muted mt-2">
                    {meetings.map((m: any, idx: number) => {
                      let colorClass = "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
                      let icon = <MapPin className="w-4 h-4" />;
                      let dotColor = "bg-red-500";
                      if (m.status === 'Completed' || m.status === 'Closed') {
                        colorClass = "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400";
                        icon = <CheckCircle2 className="w-4 h-4" />;
                        dotColor = "bg-green-500";
                      } else if (m.status === 'In Progress') {
                        colorClass = "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400";
                        icon = <Clock className="w-4 h-4" />;
                        dotColor = "bg-orange-500";
                      } else if (m.status === 'Delayed') {
                        colorClass = "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400";
                        dotColor = "bg-yellow-500";
                      }

                      return (
                        <div 
                          key={m.id} 
                          className="relative pb-4 animate-in slide-in-from-bottom-4 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedMeeting(m)}
                        >
                          <div className={`absolute -left-[23px] top-2 w-3.5 h-3.5 rounded-full border-2 border-background ${dotColor} ${m.status === 'In Progress' ? 'animate-pulse' : ''}`} />
                          <div className={`p-2 ml-2 rounded-xl border text-left ${colorClass} shadow-sm`}>
                            <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                              {icon} {m.meeting_title}
                            </p>
                            <p className="text-[10px] text-muted-foreground opacity-90 truncate">{m.client_name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Map Layers Menu (Google Maps style) */}
        <div className="absolute top-4 right-4 z-20">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="icon" className="w-10 h-10 rounded-xl shadow-xl bg-card/95 hover:bg-muted/80 border border-border transition-all">
                <Layers className="w-5 h-5 text-primary" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={10} className="w-72 p-4 rounded-2xl shadow-2xl border-border bg-card/95 backdrop-blur-xl">
              
              <div className="mb-4">
                <h4 className="font-semibold mb-3 text-sm flex items-center justify-between">Map details</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div 
                    onClick={() => setShowTransit(!showTransit)}
                    className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showTransit ? 'bg-primary/20 border-2 border-primary ring-2 ring-primary/30' : 'bg-muted border border-border group-hover:border-primary/50'}`}>
                      <Bus className={`w-6 h-6 ${showTransit ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[11px] font-medium ${showTransit ? 'text-primary' : 'text-muted-foreground'}`}>Transit</span>
                  </div>

                  <div 
                    onClick={() => setShowTraffic(!showTraffic)}
                    className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showTraffic ? 'bg-orange-500/20 border-2 border-orange-500 ring-2 ring-orange-500/30' : 'bg-muted border border-border group-hover:border-orange-500/50'}`}>
                      <Car className={`w-6 h-6 ${showTraffic ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[11px] font-medium ${showTraffic ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'}`}>Traffic</span>
                  </div>

                  <div 
                    onClick={() => setShowBiking(!showBiking)}
                    className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${showBiking ? 'bg-green-500/20 border-2 border-green-500 ring-2 ring-green-500/30' : 'bg-muted border border-border group-hover:border-green-500/50'}`}>
                      <Bike className={`w-6 h-6 ${showBiking ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[11px] font-medium ${showBiking ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>Biking</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-px bg-border my-4" />

              <div>
                <h4 className="font-semibold mb-3 text-sm">Map type</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div 
                    onClick={() => setMapTheme('standard')}
                    className="flex flex-col items-center justify-start gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden transition-all flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${mapTheme === 'standard' ? 'border-2 border-primary ring-2 ring-primary/30' : 'border border-border group-hover:border-primary/50'}`}>
                      <MapIcon className={`w-6 h-6 ${mapTheme === 'standard' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[10px] text-center font-medium ${mapTheme === 'standard' ? 'text-primary' : 'text-muted-foreground'}`}>Standard</span>
                  </div>

                  <div 
                    onClick={() => setMapTheme('satellite')}
                    className="flex flex-col items-center justify-start gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden transition-all flex items-center justify-center bg-green-900/20 ${mapTheme === 'satellite' ? 'border-2 border-primary ring-2 ring-primary/30' : 'border border-border group-hover:border-primary/50'}`}>
                      <svg className={`w-6 h-6 ${mapTheme === 'satellite' ? 'text-primary' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/></svg>
                    </div>
                    <span className={`text-[10px] text-center font-medium ${mapTheme === 'satellite' ? 'text-primary' : 'text-muted-foreground'}`}>Satellite</span>
                  </div>

                  <div 
                    onClick={() => setMapTheme('logicon-light')}
                    className="flex flex-col items-center justify-start gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden transition-all flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 ${mapTheme === 'logicon-light' ? 'border-2 border-primary ring-2 ring-primary/30' : 'border border-border group-hover:border-primary/50'}`}>
                      <Sun className={`w-6 h-6 ${mapTheme === 'logicon-light' ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <span className={`text-[10px] text-center font-medium leading-tight ${mapTheme === 'logicon-light' ? 'text-primary' : 'text-muted-foreground'}`}>Logicon Light</span>
                  </div>

                  <div 
                    onClick={() => setMapTheme('logicon-dark')}
                    className="flex flex-col items-center justify-start gap-1 cursor-pointer group"
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden transition-all flex items-center justify-center bg-slate-900 ${mapTheme === 'logicon-dark' ? 'border-2 border-primary ring-2 ring-primary/30' : 'border border-border group-hover:border-primary/50'}`}>
                      <Moon className={`w-6 h-6 ${mapTheme === 'logicon-dark' ? 'text-primary' : 'text-slate-400'}`} />
                    </div>
                    <span className={`text-[10px] text-center font-medium leading-tight ${mapTheme === 'logicon-dark' ? 'text-primary' : 'text-muted-foreground'}`}>Logicon Dark</span>
                  </div>
                </div>
              </div>

            </PopoverContent>
          </Popover>
        </div>

        {isLoaded ? (
          <MapErrorBoundary>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={defaultCenter}
              zoom={11}
              onLoad={onMapLoad}
              options={mapOptions}
            >
              {/* Optional Map Layers */}
              {showTraffic && <TrafficLayer />}
              {showTransit && <TransitLayer />}
              {showBiking && <BicyclingLayer />}

              {/* Live Directions Route */}
              {directionsResponse && (
                <DirectionsRenderer
                  directions={directionsResponse}
                  options={{
                    suppressMarkers: true,
                    preserveViewport: true, // Do not auto-zoom to directions
                    polylineOptions: { strokeColor: "#3b82f6", strokeWeight: 6, strokeOpacity: 0.8 }
                  }}
                />
              )}

              {/* AdHocMeeting Markers */}
              {meetings.map((m: any) => m.destination_lat && m.destination_lng ? (
                <Marker
                  key={`meeting-${m.id}`}
                  position={{ lat: Number(m.destination_lat), lng: Number(m.destination_lng) }}
                  icon={getMarkerIcon(m.status)}
                  title={`Meeting: ${m.meeting_title} (${m.status})`}
                />
              ) : null)}

              {/* Today's History Log */}
              {viewMode === 'today' && visitLogs.map((v: any) => v.latitude && v.longitude ? (
                <Marker
                  key={`visit-${v.id}`}
                  position={{ lat: Number(v.latitude), lng: Number(v.longitude) }}
                  icon="http://maps.google.com/mapfiles/ms/icons/purple-dot.png"
                  title={`Visit: ${v.site_name}`}
                />
              ) : null)}

              {viewMode === 'today' && trackingData?.meetings?.map((m: any) => m.current_lat && m.current_lng ? (
                <Marker
                  key={`meeting-start-${m.id}`}
                  position={{ lat: Number(m.current_lat), lng: Number(m.current_lng) }}
                  icon="http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                  title={`Started Meeting from here: ${m.meeting_title}`}
                />
              ) : null)}

              {viewMode === 'today' && pathPoints.length > 1 && (
                <Polyline
                  path={pathPoints.map(p => ({ lat: p.lat, lng: p.lng }))}
                  options={{ strokeColor: "#9ca3af", strokeOpacity: 0.5, strokeWeight: 3, borderStyle: 'dashed' }}
                />
              )}

              {/* Current Location Marker - Animated Real Estate Agent/Broker Icon */}
              {currentLocation && selectedEmployeeId !== "none" && (
                <Marker
                  position={{ lat: Number(currentLocation.lat), lng: Number(currentLocation.lng) }}
                  icon={{
                    url: '/employee-marker.png',
                    scaledSize: window.google ? new window.google.maps.Size(40, 40) : undefined
                  }}
                  animation={window.google ? window.google.maps.Animation.BOUNCE : undefined}
                  title={`${empName}'s Latest Location`}
                />
              )}

              {/* All Employees Markers (when none selected) */}
              {selectedEmployeeId === "none" && trackingData?.all_employees?.map((emp: any) => emp.current_location ? (
                <Marker
                  key={`all-emp-${emp.employee_id}`}
                  position={{ lat: Number(emp.current_location.lat), lng: Number(emp.current_location.lng) }}
                  icon={{
                    url: '/employee-marker.png',
                    scaledSize: window.google ? new window.google.maps.Size(40, 40) : undefined
                  }}
                  animation={window.google ? window.google.maps.Animation.BOUNCE : undefined}
                  title={`${emp.employee_name} (${emp.status})`}
                />
              ) : null)}
            </GoogleMap>
          </MapErrorBoundary>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/20">
            <p>Loading Map...</p>
          </div>
        )}
      </div>

      {/* Meeting Detail Modal */}
      {selectedMeeting && (
        <GlassModal
          isOpen={!!selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          title="Meeting Overview"
          subtitle={selectedMeeting.meeting_title}
          size="md"
          footerContent={
            <Button onClick={() => setSelectedMeeting(null)} className="w-full">
              Close
            </Button>
          }
        >
          <div className="space-y-4 p-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Meeting Name</p>
                <p className="text-sm font-medium">{selectedMeeting.meeting_title}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Client Name</p>
                <p className="text-sm font-medium">{selectedMeeting.client_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {selectedMeeting.status}
                </Badge>
              </div>
            </div>
            
            {selectedMeeting.attachment_url && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Photo Verification</p>
                <img 
                  src={selectedMeeting.attachment_url} 
                  alt="Meeting Proof" 
                  className="w-full h-48 object-cover rounded-lg border border-border"
                />
              </div>
            )}
          </div>
        </GlassModal>
      )}
    </div>
  );
}
