import { useState, useEffect, useRef } from "react";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { MasterDataProvider } from "@/contexts/MasterDataContext";
import { apiClient } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClientMeetingAnalyticsModal } from "@/components/modals/ClientMeetingAnalyticsModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuditLogs() {
  const [activeTab, setActiveTab] = useState("audit-logs");
  const [isDark, setIsDark] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientSearch, setClientSearch] = useState("");
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const { toast } = useToast();
  
  // Use a ref to keep track of the latest log ID we've seen to avoid showing toasts for existing logs
  const latestLogIdRef = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const fetchLogs = async (isInitialLoad = false) => {
    try {
      const data = await apiClient.get("/field-tracking/audit-logs/");
      if (data && Array.isArray(data)) {
        setLogs(data);
        
        if (data.length > 0) {
          const currentLatestId = data[0].id; // Assuming ordered by -timestamp

          if (!isInitialLoad && latestLogIdRef.current !== null && currentLatestId > latestLogIdRef.current) {
            // Find all new logs
            const newLogs = data.filter(log => log.id > latestLogIdRef.current!);
            // Show toast for the most recent one (or all of them, but let's just do the latest to avoid spam)
            const newestLog = newLogs[0];
            toast({
              title: `New Event: ${newestLog.event_type}`,
              description: newestLog.description,
            });
          }
          latestLogIdRef.current = currentLatestId;
        }
      }
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchLogs(true);
  }, []);

  // Polling every 15 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchLogs(false);
    }, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'CHECK_IN': return 'default';
      case 'FORM_SUBMIT': return 'secondary';
      case 'SITE_ADD': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <MasterDataProvider>
      <div className="min-h-screen">
        <TopNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main className="pt-24 px-4 pb-24">
          <div className="max-w-[1200px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-display">System Audit Logs & Alerts</h2>
                <p className="text-muted-foreground text-sm">Real-time trail of employee check-ins and system events.</p>
              </div>
              <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border/50 shadow-sm">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Enter Client or Employee Name..." 
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="pl-9 w-64 bg-background border-border/50"
                  />
                </div>
                <Button 
                  onClick={() => {
                    if (clientSearch.trim()) {
                      setSelectedClient(clientSearch.trim());
                      setIsAnalyticsModalOpen(true);
                    } else {
                      toast({ title: "Error", description: "Please enter a client name", variant: "destructive" });
                    }
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Analytics
                </Button>
              </div>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileClock className="w-5 h-5 text-primary" />
                  Chronological Event Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="py-8 text-center">Loading logs...</p>
                ) : logs.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No system events recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-muted/50 rounded-t-lg">
                        <tr>
                          <th className="px-6 py-4 rounded-tl-lg font-medium">Timestamp</th>
                          <th className="px-6 py-4 font-medium">Event Type</th>
                          <th className="px-6 py-4 font-medium">Employee</th>
                          <th className="px-6 py-4 rounded-tr-lg font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log: any) => (
                          <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant={getEventBadgeVariant(log.event_type)}>
                                {log.event_type}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 font-medium">
                              {log.employee_name || "System"}
                            </td>
                            <td className="px-6 py-4">
                              {log.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
                  <ClientMeetingAnalyticsModal 
            isOpen={isAnalyticsModalOpen}
            onClose={() => setIsAnalyticsModalOpen(false)}
            clientName={selectedClient}
          />
        </main>
      </div>
    </MasterDataProvider>
  );
}
