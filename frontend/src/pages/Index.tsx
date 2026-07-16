import { safeSessionStorage } from '../utils/storage';
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { KPICards } from "@/components/layout/KPICards";
import { DailyTrackingTab } from "@/components/tabs/DailyTrackingTab";
import { LiveTrackingMap } from "@/components/tracking/LiveTrackingMap";
import { OverdueMOMAlerts } from "@/components/tracking/OverdueMOMAlerts";
import { ReportDownloader } from "@/components/tracking/ReportDownloader";
import { MasterDataProvider } from "@/contexts/MasterDataContext";

const Index = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("tracking");
  const userRole = safeSessionStorage.getItem("userRole") || "";
  const isAdminOrManager = userRole === "ADMIN" || userRole === "MANAGER" || userRole === "admin" || userRole === "manager" || userRole === "INTERNAL" || userRole === "internal";

  const [isEmbedded, setIsEmbedded] = useState(() => safeSessionStorage.getItem("isEmbedded") === "true");

  useEffect(() => {
    if (safeSessionStorage.getItem("isEmbedded") === "true") {
      setIsEmbedded(true);
    }
  }, [location]);

  return (
    <MasterDataProvider>
      <div className="min-h-screen">
        <TopNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main className="pt-24 px-4 pb-24">
          {!isAdminOrManager ? (
            <div className="max-w-md mx-auto mt-20 text-center space-y-4 bg-card p-8 rounded-xl border border-border shadow-sm">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <h2 className="text-2xl font-bold font-display text-foreground">Access Restricted</h2>
              <p className="text-muted-foreground">
                Your role does not have permission to view the live tracking dashboard. Please use the Field Senses mobile application for your daily operations.
              </p>
            </div>
          ) : (
            <div className="max-w-[1600px] mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold font-display">Dashboard Overview</h1>
                <ReportDownloader />
              </div>
              <KPICards />
              <OverdueMOMAlerts />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Live Tracking Map Section (Sticky) */}
                <div className="lg:col-span-6 xl:col-span-7 sticky top-6 flex flex-col gap-6">
                  <LiveTrackingMap />
                </div>

                {/* Right Column: Daily Tracking Logs Section (Scrolling) */}
                <div className="lg:col-span-6 xl:col-span-5 flex flex-col">
                  <div className="flex-1 w-full">
                    <DailyTrackingTab />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </MasterDataProvider>
  );
};

export default Index;