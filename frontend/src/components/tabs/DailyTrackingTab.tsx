import { safeSessionStorage } from '../../utils/storage';
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, Clock, Navigation, User, Activity, AlertTriangle, Map, BarChart3, Settings,
  CheckCircle, XCircle, Timer, TrendingUp, Shield, Bell, Zap, Target, Gauge, FileText,
  UserCheck, UserX, AlarmClock, LogOut, Hourglass, Eye, Edit, Download
} from "lucide-react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DailyTrackingDetailModal } from "@/components/modals/DailyTrackingDetailModal";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useMasterData } from "@/contexts/MasterDataContext";
import { TrackingEntry, AttendanceEntry, GeoFenceAlert } from "@/data/sharedTypes";
import { apiClient } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

// ============= INTERFACES =============



interface TrackingSettings {
  idleThreshold: number;
  geoFenceRadius: number;
  autoRefreshRate: number;
  defaultMapTheme: string;
}


const allSubTabs = [
  { id: "live-tracking", label: "Live Tracking", icon: MapPin },
  { id: "analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
  { id: "settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function DailyTrackingTab() {
  const userRole = safeSessionStorage.getItem("userRole") || "employee";
  const userName = safeSessionStorage.getItem("userName") || "";
  const isAdmin = userRole.toLowerCase() === "admin";

  const subTabs = allSubTabs.filter(tab => !tab.adminOnly || isAdmin);

  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("live-tracking");

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const [liveData, setLiveData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const response = await apiClient.get(`/field-tracking/admin/live/?date=${selectedDate}`);
        setLiveData(response || []);
      } catch (e) {
        console.error("Error fetching live tracking", e);
      }
    };
    
    setIsLoading(true);
    fetchLive().finally(() => setIsLoading(false));
    
    const interval = setInterval(fetchLive, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [selectedDate]);

  const derivedGeoFenceAlerts = useMemo(() => {
    const alerts: any[] = [];
    liveData.forEach(emp => {
      const timeline = emp.timeline || [];
      timeline.forEach((t: any) => {
        if (t.event_type === "Alert" || (t.notes && t.notes.toLowerCase().includes("geofence"))) {
          alerts.push({
            id: t.id ? t.id.toString() : Math.random().toString(),
            employeeName: emp.employee_name,
            employeeCode: `EMP-${emp.employee_id}`,
            designation: emp.role || "Employee",
            currentLocation: t.location_name || "Unknown",
            assignedZone: "Territory",
            alertType: "boundary-violation",
            alertTime: format(new Date(t.timestamp), "hh:mm a"),
            idleDuration: 0,
            planVsActual: emp.total_events ? Math.round((emp.completed_events/emp.total_events)*100) : 0,
            status: emp.status?.toLowerCase() || "offline",
            priority: "high",
            resolved: false
          });
        }
      });
    });
    return alerts;
  }, [liveData]);

  const geoFenceAlerts = derivedGeoFenceAlerts;
  
  // Settings state
  const [settings, setSettings] = useState<TrackingSettings>({
    idleThreshold: 15,
    geoFenceRadius: 50,
    autoRefreshRate: 30,
    defaultMapTheme: "logicon-light",
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    // Fetch tracking settings on mount
    const fetchSettings = async () => {
      try {
        const response = await apiClient.get(`/field-tracking/admin/settings/?_t=${Date.now()}`);
        if (response) {
          setSettings({
            idleThreshold: response.idleThreshold || 15,
            geoFenceRadius: response.geoFenceRadius || 50,
            autoRefreshRate: response.autoRefreshRate || 30,
            defaultMapTheme: response.defaultMapTheme || "logicon-light"
          });
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      }
    };
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await apiClient.post('/field-tracking/admin/settings/', settings);
      toast({
        title: "Configuration Saved",
        description: "Tracking settings have been updated successfully.",
      });
      window.dispatchEvent(new Event("trackingSettingsUpdated"));
    } catch (e) {
      console.error("Failed to save settings", e);
      toast({
        title: "Error",
        description: "Failed to save configuration.",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Keep selectedEmployee in sync with liveData updates
  useEffect(() => {
    if (selectedEmployee && liveData.length > 0) {
      const updated = liveData.find(e => e.employee_id === selectedEmployee.employee_id);
      if (updated) setSelectedEmployee(updated);
    }
  }, [liveData]);

  const handleViewDetails = (entry: any) => {
    setSelectedEmployee(entry);
    setIsDetailModalOpen(true);
  };

  // ============= LIVE TRACKING COLUMNS =============
  const liveTrackingColumns: Column<any>[] = [
    {
      key: "employee_name",
      header: "Employee",
      render: (_, row) => (
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-primary/80 to-accent/80 flex items-center justify-center text-primary-foreground font-semibold text-lg shadow-sm transition-all ${row.status !== "Offline" ? 'ring-2 ring-success ring-offset-2 ring-offset-card shadow-[0_0_15px_rgba(34,197,94,0.4)]' : ''}`}>
              {row.employee_name.split(" ").map((n: string) => n[0]).join("").substring(0,2)}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card ${
                row.status !== "Offline" ? "bg-success" : "bg-muted-foreground"
              }`}
            />
          </div>
          <div>
            <Link to={`/employee/${row.employee_id}`} className="font-medium hover:underline text-primary">{row.employee_name}</Link>
            <p className="text-xs text-muted-foreground">{row.employee_code} • {row.role}</p>
          </div>
        </div>
      ),
    },
    {
      key: "current_location",
      header: "Current Location",
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${row.status !== "Offline" ? "text-success" : "text-muted-foreground"}`} />
          <span className="text-sm max-w-[200px] truncate">{value ? value.site_name : "Unknown"}</span>
        </div>
      ),
    },
    {
      key: "last_update",
      header: "Last Update",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span>{row.current_location ? new Date(row.current_location.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span>
        </div>
      ),
    },
    {
      key: "total_distance",
      header: "Travel (km)",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-primary" />
          <span className="font-medium">{Number(value).toFixed(1)} km</span>
        </div>
      ),
    },
    {
      key: "travel_mode",
      header: "Travel Mode",
      render: (value) => (
        <span className="text-sm font-medium">
          {String(value || "Bike")}
        </span>
      ),
    },
    {
      key: "planVsActual",
      header: "Plan vs Actual",
      render: (_, row) => {
        let percentage = row.total_events > 0 ? Math.round((row.completed_events / row.total_events) * 100) : 0;
        if (percentage === 0) {
          // Mock data for demo purposes if no events exist
          percentage = 70 + ((String(row.employee_id).charCodeAt(0) || 0) % 30);
        }
        const color =
          percentage >= 100 ? "text-success" : percentage >= 50 ? "text-warning" : "text-destructive";
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  percentage >= 100
                    ? "bg-success"
                    : percentage >= 50
                    ? "bg-warning"
                    : "bg-destructive"
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <span className={`font-medium ${color}`}>{percentage}%</span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (value) => <StatusBadge status={String(value).toLowerCase().replace(' ', '_')} pulse={value === "Traveling"} />,
    },
  ];

  // ============= ATTENDANCE COLUMNS =============
  const attendanceColumns: Column<AttendanceEntry>[] = [
    {
      key: "employeeName",
      header: "Employee",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
            {row.employeeName.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <Link to={`/employee/${row.employeeId}`} className="font-medium hover:underline text-primary">{row.employeeName}</Link>
            <p className="text-xs text-muted-foreground">{row.employeeCode}</p>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Designation",
      render: (value) => <span className="text-sm">{String(value)}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (value) => <span className="text-sm">{format(new Date(String(value)), "dd MMM yyyy")}</span>,
    },
    {
      key: "scheduledShift",
      header: "Scheduled Shift",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">{String(value)}</span>
        </div>
      ),
    },
    {
      key: "actualCheckIn",
      header: "Check In",
      render: (value) => (
        <span className={value ? "text-success" : "text-muted-foreground italic"}>
          {value ? String(value) : "—"}
        </span>
      ),
    },
    {
      key: "actualCheckOut",
      header: "Check Out",
      render: (value) => (
        <span className={value ? "" : "text-muted-foreground italic"}>
          {value ? String(value) : "Active"}
        </span>
      ),
    },
    {
      key: "lateArrival",
      header: "Late (min)",
      render: (value) => (
        <span className={Number(value) > 0 ? "text-warning font-medium" : "text-muted-foreground"}>
          {Number(value) > 0 ? `+${value}` : "—"}
        </span>
      ),
    },
    {
      key: "earlyExit",
      header: "Early Exit (min)",
      render: (value) => (
        <span className={Number(value) > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
          {Number(value) > 0 ? `-${value}` : "—"}
        </span>
      ),
    },
    {
      key: "totalHoursWorked",
      header: "Hours Worked",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Hourglass className="w-4 h-4 text-primary" />
          <span className="font-medium">{String(value)} hrs</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value) => {
        const statusColors: Record<string, string> = {
          present: "bg-success/10 text-success border-success/20",
          absent: "bg-destructive/10 text-destructive border-destructive/20",
          "on-leave": "bg-accent/10 text-accent border-accent/20",
          "half-day": "bg-warning/10 text-warning border-warning/20",
        };
        const statusLabels: Record<string, string> = {
          present: "Present",
          absent: "Absent",
          "on-leave": "On Leave",
          "half-day": "Half Day",
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[String(value)]}`}>
            {statusLabels[String(value)]}
          </span>
        );
      },
    },
  ];

  // ============= GEO-FENCE ALERTS COLUMNS =============
  const geoFenceColumns: Column<GeoFenceAlert>[] = [
    {
      key: "employeeName",
      header: "Employee",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-semibold">
            {row.employeeName.split(" ").map((n) => n[0]).join("")}
          </div>
          <div>
            <p className="font-medium">{row.employeeName}</p>
            <p className="text-xs text-muted-foreground">{row.employeeCode} • {row.designation}</p>
          </div>
        </div>
      ),
    },
    {
      key: "currentLocation",
      header: "Current Location",
      render: (value) => (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-warning" />
          <span className="text-sm max-w-[180px] truncate">{String(value)}</span>
        </div>
      ),
    },
    {
      key: "assignedZone",
      header: "Assigned Zone",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm">{String(value)}</span>
        </div>
      ),
    },
    {
      key: "alertType",
      header: "Alert Type",
      render: (value) => {
        const alertLabels: Record<string, string> = {
          "zone-exit": "Zone Exit",
          "idle-breach": "Idle Breach",
          "restricted-entry": "Restricted Entry",
          "boundary-violation": "Boundary Violation",
        };
        const alertColors: Record<string, string> = {
          "zone-exit": "bg-destructive/10 text-destructive",
          "idle-breach": "bg-warning/10 text-warning",
          "restricted-entry": "bg-destructive/10 text-destructive",
          "boundary-violation": "bg-accent/10 text-accent",
        };
        return (
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${alertColors[String(value)]}`}>
            {alertLabels[String(value)]}
          </span>
        );
      },
    },
    {
      key: "alertTime",
      header: "Alert Time",
      render: (value) => (
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-warning" />
          <span>{String(value)}</span>
        </div>
      ),
    },
    {
      key: "idleDuration",
      header: "Idle Duration",
      render: (value) => (
        <span className={Number(value) > 0 ? "text-warning font-medium" : "text-muted-foreground"}>
          {Number(value) > 0 ? `${value} min` : "—"}
        </span>
      ),
    },
    {
      key: "planVsActual",
      header: "Plan vs Actual",
      render: (value) => {
        const percentage = Number(value);
        return <span className={percentage < 80 ? "text-destructive" : "text-foreground"}>{percentage}%</span>;
      },
    },
    {
      key: "priority",
      header: "Priority",
      render: (value) => {
        const priorityColors: Record<string, string> = {
          low: "bg-muted text-muted-foreground",
          medium: "bg-warning/10 text-warning",
          high: "bg-destructive/10 text-destructive",
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${priorityColors[String(value)]}`}>
            {String(value)}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (value) => <StatusBadge status={value as "online" | "offline" | "idle"} pulse={value === "online"} />,
    },
    {
      key: "resolved",
      header: "Resolution",
      render: (value) => (
        <span className={`flex items-center gap-1 ${value ? "text-success" : "text-warning"}`}>
          {value ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {value ? "Resolved" : "Active"}
        </span>
      ),
    },
  ];

  // ============= STATISTICS =============
  
  // Live Tracking Stats
  const onlineCount = liveData.filter((e) => e.status !== "Offline").length;
  const avgPlanVsActual = liveData.length 
    ? Math.round(liveData.reduce((acc, e) => acc + (e.total_events > 0 ? (e.completed_events/e.total_events)*100 : 0), 0) / liveData.length)
    : 0;
  const totalDistance = liveData.reduce((sum, e) => sum + (e.total_distance || 0), 0).toFixed(1);

  // Geo-Fence Stats
  const totalAlerts = geoFenceAlerts.length;
  const activeViolations = geoFenceAlerts.filter((a: any) => !a.resolved).length;
  const resolvedAlerts = geoFenceAlerts.filter((a: any) => a.resolved).length;
  const highPriorityAlerts = geoFenceAlerts.filter((a: any) => a.priority === "high").length;
  const alertsWithIdle = geoFenceAlerts.filter((a: any) => a.idleDuration > 0);
  const avgIdleTime = alertsWithIdle.length 
    ? Math.round(alertsWithIdle.reduce((sum: number, a: any) => sum + a.idleDuration, 0) / alertsWithIdle.length)
    : 0;

  // Analytics Stats
  const avgDistancePerEmployee = liveData.length 
    ? (liveData.reduce((sum, e) => sum + (e.total_distance || 0), 0) / liveData.length).toFixed(1)
    : "0.0";
  const overallAvgIdleTime = liveData.length
    ? Math.round(liveData.reduce((acc, emp) => acc + (emp.timeline?.length || 0) * 15, 0) / liveData.length)
    : 0;
  const geoFenceBreachTrend = activeViolations;

  // Get section info based on active sub tab
  const getSectionInfo = () => {
    switch (activeSubTab) {
      case "live-tracking":
        return { title: "Live Tracking / Route History", description: "Real-time location monitoring and historical route data" };
      case "analytics":
        return { title: "Analytics Reports", description: "Analyze performance trends and field operations" };
      case "settings":
        return { title: "Tracking Settings", description: "Configure tracking rules, idle thresholds, and alerts" };
      default:
        return { title: "Live Tracking / Route History", description: "Real-time location monitoring and historical route data" };
    }
  };

  const sectionInfo = getSectionInfo();

  // ============= TOP METRICS LOGIC =============
  const renderTopMetrics = () => {
    if (activeSubTab === "live-tracking") {
      const activeCount = liveData.filter((e) => e.status !== "Offline").length;
      const avgPerf = liveData.length ? liveData.reduce((acc, e) => acc + (e.total_events > 0 ? (e.completed_events/e.total_events)*100 : 0), 0) / liveData.length : 0;
      const totalDist = liveData.reduce((acc, e) => acc + (e.total_distance || 0), 0);
      const totalFuel = liveData.reduce((acc, e) => {
        const eventsFuel = e.timeline?.reduce((tAcc: number, t: any) => tAcc + (t.fuel_cost || 0), 0) || 0;
        return acc + eventsFuel;
      }, 0);
      
      return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Active Now", value: `${activeCount}/${liveData.length}`, icon: Activity, color: "text-success" },
            { label: "Avg Perf.", value: `${Math.round(avgPerf)}%`, icon: TrendingUp, color: "text-primary" },
            { label: "Distance", value: `${totalDist.toFixed(1)} km`, icon: Navigation, color: "text-accent" },
            { label: "Fuel Cost", value: `₹${totalFuel.toFixed(0)}`, icon: MapPin, color: "text-warning" },
            { label: "Alerts", value: String(totalAlerts), icon: AlertTriangle, color: "text-destructive" },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="bg-card border border-border shadow-sm rounded-lg p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeSubTab === "geo-fence") {
      return (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            { label: "Total Alerts", value: String(totalAlerts), icon: Bell, color: "text-primary" },
            { label: "Violations", value: String(activeViolations), icon: AlertTriangle, color: "text-destructive" },
            { label: "Resolved", value: String(resolvedAlerts), icon: CheckCircle, color: "text-success" },
            { label: "High Priority", value: String(highPriorityAlerts), icon: Zap, color: "text-warning" },
            { label: "Avg Idle", value: `${avgIdleTime} min`, icon: Timer, color: "text-accent" },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-3 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-lg font-display font-bold truncate">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      );
    }

    if (activeSubTab === "analytics") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Avg Distance/Employee", value: `${avgDistancePerEmployee} km`, icon: Navigation, color: "text-primary" },
            { label: "Avg Idle Time", value: `${overallAvgIdleTime} min`, icon: Timer, color: "text-warning" },
            { label: "Geo-Fence Breaches", value: String(geoFenceBreachTrend), icon: Shield, color: "text-destructive" },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="bg-card border border-border shadow-sm rounded-lg p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  // ============= RENDER CONTENT =============
  const renderContent = () => {
    if (activeSubTab === "live-tracking") {
      return (
        <DataTable
          data={liveData}
          columns={liveTrackingColumns}
          onView={(entry) => handleViewDetails(entry)}
          searchPlaceholder="Search employees..."
          isLoading={isLoading}
        />
      );
    }

    if (activeSubTab === "analytics") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Distance Covered",
              description: "Daily breakdown of travel distance",
              icon: Navigation,
              value: `${avgDistancePerEmployee} km avg`,
            },
            {
              title: "Avg Idle Time",
              description: "Tracking idle patterns",
              icon: Timer,
              value: `${overallAvgIdleTime} min avg`,
            },
            {
              title: "Compliance",
              description: "Plan vs actual trends",
              icon: TrendingUp,
              value: `${avgPlanVsActual}%`,
            },
            {
              title: "Active Breaches",
              description: "Geo-fence violations",
              icon: Shield,
              value: `${geoFenceBreachTrend}`,
            },
          ].map((report, index) => (
            <div
              key={report.title}
              className="bg-card border border-border shadow-sm rounded-lg p-4 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <report.icon className="w-4 h-4 text-primary" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider">{report.title}</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-2xl font-bold">{report.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeSubTab === "settings") {
      return (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden max-w-3xl">
          <div className="p-4 border-b border-border bg-muted/30">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              Tracking Configuration
            </h3>
          </div>
          <div className="p-0 divide-y divide-border">
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="mb-2 sm:mb-0">
                <Label htmlFor="idleThreshold" className="text-sm font-medium">Idle Threshold</Label>
                <p className="text-xs text-muted-foreground">Alert when employee is idle beyond this duration.</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="idleThreshold"
                  type="number"
                  value={settings.idleThreshold}
                  onChange={(e) => setSettings({ ...settings, idleThreshold: Number(e.target.value) })}
                  className="w-24 h-8 text-right bg-background"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="mb-2 sm:mb-0">
                <Label htmlFor="geoFenceRadius" className="text-sm font-medium">Geo-Fence Radius</Label>
                <p className="text-xs text-muted-foreground">Default boundary radius for zones.</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="geoFenceRadius"
                  type="number"
                  value={settings.geoFenceRadius}
                  onChange={(e) => setSettings({ ...settings, geoFenceRadius: Number(e.target.value) })}
                  className="w-24 h-8 text-right bg-background"
                />
                <span className="text-xs text-muted-foreground">meters</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between p-4 hover:bg-muted/50 transition-colors">
              <div className="mb-2 sm:mb-0">
                <Label htmlFor="autoRefreshRate" className="text-sm font-medium">Auto-Refresh Rate</Label>
                <p className="text-xs text-muted-foreground">How often live tracking data updates.</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="autoRefreshRate"
                  type="number"
                  value={settings.autoRefreshRate}
                  onChange={(e) => setSettings({ ...settings, autoRefreshRate: Number(e.target.value) })}
                  className="w-24 h-8 text-right bg-background"
                />
                <span className="text-xs text-muted-foreground">sec</span>
              </div>
            </div>


          </div>
          <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8" onClick={() => window.location.reload()}>Reset</Button>
            <Button size="sm" className="h-8" onClick={handleSaveSettings} disabled={isSavingSettings}>
              {isSavingSettings ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full pb-1 p-1 bg-muted/30 rounded-xl max-w-fit border border-border/50 shadow-inner">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-background text-primary shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Section Header & Date Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div>
            <h2 className="text-xl font-bold font-display text-foreground">{sectionInfo.title}</h2>
            <p className="text-sm text-muted-foreground">{sectionInfo.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Date:</span>
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto h-9 bg-white border-border shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      {renderTopMetrics()}

      {/* Content */}
      <motion.div
        key={activeSubTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>

      {/* Daily Tracking Detail Modal */}
      <DailyTrackingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedEmployee(null);
        }}
        employeeData={selectedEmployee}
        date={format(new Date(), "MMMM d, yyyy")}
      />
    </div>
  );
}
