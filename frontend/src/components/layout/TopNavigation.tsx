import { safeSessionStorage, safeLocalStorage } from '../../utils/storage';
import { API_ROOT } from "@/config";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Users,
  UserCog,
  Activity,
  BarChart3,
  AlertTriangle,
  FileText,
  Search,
  Bell,
  Moon,
  Sun,
  Menu,
  X,
  Building2,
  UserCircle,
  Package,
  UserPlus, // Added this icon for the new tab
  Navigation, // For Live Tracking
  LogOut,
  FolderKanban,
  CheckCircle2,
  Contact,
  Calendar,
  MessageSquare,
  MapPin,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "./NotificationBell";
import { toast } from "sonner";
import { useMasterData } from "@/contexts/MasterDataContext";
import { useTheme } from "@/contexts/ThemeProvider";


interface TopNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const allTabs = [
  { id: "tracking", label: "Tracking Dashboard", icon: Activity, roles: ["admin", "manager", "WH_MGR", "employee"], path: "/" },
  { id: "tracking-sites", label: "Tracking Sites", icon: MapPin, roles: ["admin", "manager"], path: "/tracking-sites" },
  { id: "tracking-history", label: "Route History", icon: FileText, roles: ["admin", "manager"], path: "/tracking-history" },
  { id: "attendance", label: "Attendance Dashboard", icon: UserCog, roles: ["admin", "manager"], path: "/attendance-dashboard" },
  { id: "audit-logs", label: "Audit Logs", icon: FileText, roles: ["admin"], path: "/audit-logs" },
  { id: "master-setup", label: "Master Setup", icon: Settings, roles: ["admin"], path: "/master-setup" },
];

export function TopNavigation({
  activeTab,
  onTabChange,
}: TopNavigationProps) {
  const { isDark, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications] = useState(3);
  
  const [isEmbedded, setIsEmbedded] = useState(() => safeSessionStorage.getItem("isEmbedded") === "true");

  useEffect(() => {
    if (safeSessionStorage.getItem("isEmbedded") === "true") {
      setIsEmbedded(true);
    }
  }, [location]);
  
  const rawRole = safeSessionStorage.getItem("userRole") || "employee";
  const userName = safeSessionStorage.getItem("userName") || "User";
  
  // Normalize the backend roleCode to match our frontend tab permissions
  const userRole = ["ADMIN", "admin"].includes(rawRole) ? "admin" 
                 : ["WH_MGR"].includes(rawRole) ? "WH_MGR" 
                 : ["MANAGER", "manager"].includes(rawRole) ? "manager" 
                 : "employee";

  const tabs = allTabs.filter(tab => tab.roles.includes(userRole) || tab.roles.includes("admin") && userRole === "admin");

  const handleLogout = () => {
    safeSessionStorage.removeItem("isAdminLoggedIn");
    navigate("/login");
  };

  const { getEmployeeNameById } = useMasterData();
  const userId = safeSessionStorage.getItem("userId") || "";
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(safeLocalStorage.getItem('notificationsMuted') === 'true');
  
  // Use ref so polling intervals always have the latest value without re-creating intervals
  const isMutedRef = useRef(isMuted);
  const lastAlertIdRef = useRef(lastAlertId);

  const toggleMute = () => {
    const val = !isMuted;
    setIsMuted(val);
    isMutedRef.current = val;
    safeLocalStorage.setItem('notificationsMuted', String(val));
  };

  // Poll for general alerts (new employee, money alert, etc.)
  useEffect(() => {
    if (!userId) return;

    const checkNewAlerts = async () => {
      try {
        const res = await fetch(`${API_ROOT}/api/ops/alerts/?resolved=False`);
        if (res.ok) {
          const data = await res.json();
          const unhandledAlerts = Array.isArray(data) ? data.filter(a => !a.resolved) : [];

          if (unhandledAlerts.length > 0) {
            const latest = unhandledAlerts[unhandledAlerts.length - 1];
            const currentLastId = lastAlertIdRef.current;
            
            if (currentLastId && latest.id !== currentLastId && !isMutedRef.current) {
              // Determine icon based on alert type
              const icon = latest.type === 'pending_approval' ? '⏳' 
                         : latest.type === 'tracking_update' ? '📍' 
                         : '🔔';
                         
              toast(`${icon} New Alert`, {
                description: latest.message,
                duration: 6000,
              });

              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`New Alert`, { body: latest.message, icon: '/favicon.ico' });
              }
            }
            lastAlertIdRef.current = latest.id;
            setLastAlertId(latest.id);
          }
        }
      } catch {
        // Ignore network errors during polling
      }
    };

    checkNewAlerts();
  }, [userId]);

  // Helper to handle navigation
  const handleTabClick = (tabId: string, path?: string) => {
    onTabChange(tabId);
    if (path) {
      navigate(path);
    } else {
      const targetPath = allTabs.find(t => t.id === tabId)?.path || "/";
      navigate(targetPath);
    }
    setMobileMenuOpen(false);
  };

  if (isEmbedded) {
    return null;
  }
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="glass-card mx-4 mt-4 px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-10 flex items-center justify-center">
              <img src="/logicon-logo.png" alt="Logicon Logo" className="h-full object-contain" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg gradient-text">Logicon</h1>
              <p className="text-xs text-muted-foreground capitalize">{userName} • {rawRole.toLowerCase()}</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id, tab.path)}
                  title={tab.label}
                  className={`nav-link flex items-center gap-2 ${
                    isActive ? "active" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden 2xl:inline text-xs">{tab.label}</span>
                </motion.button>
              );
            })}
          </nav>

          {/* ... (Keep the rest of your Right Actions div exactly as it is) ... */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            {/* Notifications */}
            <NotificationBell 
              onNotificationClick={handleTabClick} 
              isMuted={isMuted} 
              onToggleMute={toggleMute} 
            />
            <Button variant="ghost" size="icon" onClick={() => setTheme(isDark ? "light" : "dark")} title="Toggle Theme">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="xl:hidden absolute top-full left-4 right-4 mt-2 p-4 glass-card rounded-xl border border-border/50 shadow-lg"
          >
            <nav className="flex flex-col gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id, tab.path)}
                    title={tab.label}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}