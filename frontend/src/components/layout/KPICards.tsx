import { safeSessionStorage } from '../../utils/storage';
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, FolderKanban, MapPin, AlertTriangle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { apiClient } from "@/services/api";


interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  delay?: number;
  isLoading?: boolean;
  color?: string;
}

function KPICard({ title, value, subtitle, icon, trend, delay = 0, isLoading, color = "text-primary" }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ duration: 0.4, delay, type: "spring", bounce: 0.4 }}
      className="kpi-card group cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {isLoading ? (
            <div className="flex items-center gap-2 h-9">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : (
            <p className="text-3xl font-display font-bold">{value}</p>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm font-medium ${
                trend.isPositive ? "text-success" : "text-destructive"
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        <div className={`relative w-12 h-12 rounded-2xl bg-background/50 backdrop-blur-sm flex items-center justify-center ${color} shadow-[0_4px_12px_rgba(0,0,0,0.05)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] transition-all duration-300 border border-white/20 overflow-hidden`}>
          <div className="absolute inset-0 bg-current opacity-10" />
          <motion.div whileHover={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}>
            {icon}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export function KPICards() {
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [highPriorityAlerts, setHighPriorityAlerts] = useState(0);
  const [trackingToday, setTrackingToday] = useState(0);
  const [activeProjects, setActiveProjects] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employees, liveData, projects, alerts] = await Promise.all([
          apiClient.get('/employees/').catch(() => []),
          apiClient.get('/field-tracking/admin/live/').catch(() => []),
          apiClient.get('/projects/').catch(() => []),
          apiClient.get('/ops/alerts/?resolved=False').catch(() => [])
        ]);

        const filteredEmployees = Array.isArray(employees) 
          ? employees.filter((emp: any) => emp.id !== 'admin' && emp.employeeId !== 'admin' && !(emp.fullName || '').toLowerCase().includes('admin'))
          : [];
        setEmployeeCount(filteredEmployees.length);
        
        const liveArr = Array.isArray(liveData) ? liveData : [];
        setOnlineCount(liveArr.filter((t: any) => t.status !== "Offline").length);
        
        // Calculate today's site visits from completed events
        const totalVisits = liveArr.reduce((sum: number, emp: any) => sum + (emp.completed_events || 0), 0);
        setTrackingToday(totalVisits);
        
        // Set pending alerts from the API
        const alertsArr = Array.isArray(alerts) ? alerts : [];
        setAlertCount(alertsArr.length);
        setHighPriorityAlerts(alertsArr.filter((a: any) => a.severity === 'high' || a.priority === 'high').length || alertsArr.length);
        
        const projArr = Array.isArray(projects) ? projects : [];
        setActiveProjects(projArr.filter((p: any) => p.status?.toLowerCase() === "active" || p.status?.toLowerCase() === "in-progress").length);
      } catch (err) {
        console.error("Failed to load KPIs", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const kpis = [
    {
      title: "Employees Online",
      value: loading ? "—" : `${onlineCount}/${employeeCount}`,
      subtitle: `${employeeCount} total registered`,
      icon: <Users className="w-6 h-6" />,
      color: "text-blue-500",
    },
    {
      title: "Active Projects",
      value: loading ? "—" : activeProjects,
      subtitle: "Live in database",
      icon: <FolderKanban className="w-6 h-6" />,
      color: "text-purple-500",
    },
    {
      title: "Today's Site Visits",
      value: loading ? "—" : trackingToday,
      subtitle: `${onlineCount} currently active`,
      icon: <MapPin className="w-6 h-6" />,
      color: "text-green-500",
    },
    {
      title: "Pending Alerts",
      value: loading ? "—" : alertCount,
      subtitle: `${highPriorityAlerts} high priority`,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: alertCount > 0 ? "text-red-500" : "text-muted-foreground",
    },
  ];

  const userRole = safeSessionStorage.getItem("userRole") || "";
  const filteredKpis = userRole === "EMPLOYEE" || userRole === "SALES_EXEC" || userRole === "WH_MGR" ? kpis.slice(1) : kpis;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {filteredKpis.map((kpi, index) => (
        <KPICard key={kpi.title} {...kpi} delay={index * 0.1} isLoading={loading} />
      ))}
    </div>
  );
}
