import React, { useEffect, useState } from "react";
import { safeSessionStorage } from './utils/storage';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { MasterDataProvider } from "./contexts/MasterDataContext";
import { ThemeProvider } from "./contexts/ThemeProvider";


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

import EmployeePortal from "./pages/EmployeePortal";
import Handoff from "./pages/Handoff";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = safeSessionStorage.getItem("token");
  const fieldRole = safeSessionStorage.getItem("fieldRole");
  const isAdminLoggedIn = safeSessionStorage.getItem("isAdminLoggedIn") === "true";

  if (fieldRole === "EMPLOYEE") {
    return <EmployeePortal />;
  }

  if (!isAdminLoggedIn && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AdminProtectedRoute = ({ children, allowedRoles = ["ADMIN", "MANAGER", "OPERATIONS_MANAGER", "SALES_MANAGER"] }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const token = safeSessionStorage.getItem("token");
  const isLoggedIn = safeSessionStorage.getItem("isAdminLoggedIn") === "true" || !!token;
  const fieldRole = safeSessionStorage.getItem("fieldRole");
  const rawRole = safeSessionStorage.getItem("userRole") || "";

  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (fieldRole === "EMPLOYEE") return <Navigate to="/" replace />;

  // Prioritize fieldRole claim (ADMIN / MANAGER) over raw legacy userRole
  const effectiveRole = (fieldRole || rawRole).toUpperCase();
  const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());
  const isManagerOrAdmin = ["ADMIN", "MANAGER", "OPERATIONS_MANAGER", "SALES_MANAGER"].includes(effectiveRole);
  
  const hasAccess = normalizedAllowedRoles.includes(effectiveRole) || isManagerOrAdmin;
  
  if (!hasAccess) return <Navigate to="/" replace />;
  return <>{children}</>;
};


const SalesProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userRole = safeSessionStorage.getItem("userRole");
  const fieldRole = safeSessionStorage.getItem("fieldRole");
  const isLoggedIn = userRole === "sales" || fieldRole === "SALES";
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
      if (payload.user_id || payload.sub) {
        safeSessionStorage.setItem("userId", String(payload.user_id || payload.sub));
      }
      
      let resolvedRole = "MANAGER";
      if (payload.field_role) {
        resolvedRole = payload.field_role.toUpperCase();
      } else if (payload.is_staff || payload.is_superuser || payload.user_type === 'admin') {
        resolvedRole = "ADMIN";
      } else if (payload.user_type === 'field') {
        resolvedRole = "EMPLOYEE";
      } else if (payload.user_type) {
        resolvedRole = payload.user_type.toUpperCase();
      }

      safeSessionStorage.setItem("fieldRole", resolvedRole);
      safeSessionStorage.setItem("userRole", resolvedRole);

      if (resolvedRole !== "EMPLOYEE") {
        safeSessionStorage.setItem("isAdminLoggedIn", "true");
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

const App = () => {
  const [memoryToken, setMemoryToken] = React.useState<string | null>(null);

  const handleTokenReceived = (token: string, fieldRole: string) => {
    setMemoryToken(token);
    const normalizedRole = (fieldRole || "EMPLOYEE").toUpperCase();
    safeSessionStorage.setItem("token", token);
    safeSessionStorage.setItem("fieldRole", normalizedRole);
    safeSessionStorage.setItem("userRole", normalizedRole);
    if (normalizedRole !== "EMPLOYEE") {
      safeSessionStorage.setItem("isAdminLoggedIn", "true");
    }
  };



  return (
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
                  <Route path="/handoff" element={<Handoff onTokenReceived={handleTokenReceived} />} />
                  
                  <Route
                    path="/"
                    element={
                      <ProtectedRoute>
                        {safeSessionStorage.getItem("fieldRole") === "EMPLOYEE" ? (
                          <EmployeePortal authToken={memoryToken || undefined} />
                        ) : (
                          <Index />
                        )}
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/master-setup"
                    element={
                      <AdminProtectedRoute allowedRoles={["ADMIN", "MANAGER"]}>
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
};

export default App;