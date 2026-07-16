import { safeSessionStorage } from './utils/storage';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { MasterDataProvider } from "./contexts/MasterDataContext";
import { ThemeProvider } from "./contexts/ThemeProvider";
import { useEffect } from "react";

import Index from "./pages/Index";
import Login from "./pages/Login";
import SalesPortal from "./pages/SalesPortal";
import MasterSetup from "./pages/MasterSetup";
import TrackingSites from "./pages/TrackingSites";
import TrackingHistory from "./pages/TrackingHistory";
import AuditLogs from "./pages/AuditLogs";
import EmployeeProfile from "./pages/EmployeeProfile";
import NotFound from "./pages/NotFound";
import AttendanceDashboard from "./pages/AttendanceDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isLoggedIn = safeSessionStorage.getItem("isAdminLoggedIn") === "true";
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminProtectedRoute = ({ children, allowedRoles = ["ADMIN", "admin"] }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const isLoggedIn = safeSessionStorage.getItem("isAdminLoggedIn") === "true";
  const rawRole = safeSessionStorage.getItem("userRole") || "";
  
  // Normalize roles
  const normalizedRole = rawRole.toUpperCase();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());
  
  const hasAccess = normalizedAllowedRoles.includes(normalizedRole);
  
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (!hasAccess) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const SalesProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userRole = safeSessionStorage.getItem("userRole");
  const isLoggedIn = userRole === "sales";
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
};

const SSOHandler = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Process token synchronously before children render to prevent premature redirect
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  const isEmbedded = params.get("embedded");

  if (isEmbedded === "true") {
    safeSessionStorage.setItem("isEmbedded", "true");
    document.body.setAttribute("data-embedded", "true");
  } else if (safeSessionStorage.getItem("isEmbedded") === "true") {
    document.body.setAttribute("data-embedded", "true");
  }

  if (token) {
    try {
      let base64Url = token.split('.')[1];
      let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payloadStr = atob(base64);
      const payload = JSON.parse(payloadStr);
      
      safeSessionStorage.setItem("token", token);
      safeSessionStorage.setItem("isAdminLoggedIn", "true");
      
      if (payload.is_staff || payload.user_type?.toLowerCase() === 'internal') {
        safeSessionStorage.setItem("userRole", "ADMIN");
      } else {
        safeSessionStorage.setItem("userRole", payload.user_type?.toUpperCase() || "USER");
      }
    } catch (e) {
      console.error("Invalid token format in SSO", e);
    }
  }

  useEffect(() => {
    // If we processed a token, clean the URL by navigating to the same path without search params
    if (token) {
      navigate(location.pathname, { replace: true });
    }
  }, [token, location.pathname, navigate]);

  return <>{children}</>;
};

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="field-senses-theme">
    <QueryClientProvider client={queryClient}>
      <MasterDataProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <SSOHandler>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/master-setup"
                  element={
                    <AdminProtectedRoute>
                      <MasterSetup />
                    </AdminProtectedRoute>
                  }
                />

                <Route
                  path="/tracking-sites"
                  element={
                    <AdminProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                      <TrackingSites />
                    </AdminProtectedRoute>
                  }
                />

                <Route
                  path="/tracking-history"
                  element={
                    <AdminProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                      <TrackingHistory />
                    </AdminProtectedRoute>
                  }
                />

                <Route
                  path="/audit-logs"
                  element={
                    <AdminProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                      <AuditLogs />
                    </AdminProtectedRoute>
                  }
                />

                <Route
                  path="/employee/:id"
                  element={
                    <AdminProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                      <EmployeeProfile />
                    </AdminProtectedRoute>
                  }
                />

                <Route
                  path="/attendance-dashboard"
                  element={
                    <AdminProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
                      <AttendanceDashboard />
                    </AdminProtectedRoute>
                  }
                />

                <Route
                  path="/sales-portal"
                  element={
                    <SalesProtectedRoute>
                      <SalesPortal />
                    </SalesProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SSOHandler>
          </BrowserRouter>
        </TooltipProvider>
      </MasterDataProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;