import { useState, useEffect } from "react";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { MasterSetupTab } from "@/components/tabs/MasterSetupTab";
import { MasterDataProvider } from "@/contexts/MasterDataContext";

const MasterSetup = () => {
  const [activeTab, setActiveTab] = useState("master-setup");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const handleThemeToggle = () => {
    setIsDark(!isDark);
  };

  return (
    <MasterDataProvider>
      <div className="min-h-screen">
        <TopNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isDark={isDark}
          onThemeToggle={handleThemeToggle}
        />

        <main className="pt-24 px-4 pb-24">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold font-display">System Master Configuration</h2>
              <p className="text-muted-foreground text-sm">Configure system parameters, employees, departments, status codes, and access permissions.</p>
            </div>
            <MasterSetupTab />
          </div>
        </main>
      </div>
    </MasterDataProvider>
  );
};

export default MasterSetup;
