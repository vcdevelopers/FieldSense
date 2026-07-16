import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { MasterDataProvider } from "@/contexts/MasterDataContext";
import { apiClient } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportViewModal } from "@/components/tracking/ReportViewModal";

export default function TrackingHistory() {
  const [activeTab, setActiveTab] = useState("tracking-history");
  const [isDark, setIsDark] = useState(false);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [selectedSiteName, setSelectedSiteName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get(`/field-tracking/admin/live/?date=${dateStr}`);
        if (data) {
          setHistory(data);
        } else {
          setHistory([]);
        }
      } catch (err) {
        console.error("Failed to fetch history", err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [dateStr]);

  return (
    <MasterDataProvider>
      <div className="min-h-screen">
        <TopNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isDark={isDark}
          onThemeToggle={() => setIsDark(!isDark)}
        />

        <main className="pt-24 px-4 pb-24">
          <div className="max-w-[1200px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-display">Route History & Audits</h2>
                <p className="text-muted-foreground text-sm">Review historical tracking data and completed routes by date.</p>
              </div>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  type="date" 
                  value={dateStr} 
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-[200px]"
                />
              </div>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Routes for {dateStr}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Loading history...</p>
                ) : history.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">No route data available for the selected date.</p>
                ) : (
                  <div className="space-y-6">
                    {history.map((emp: any) => (
                      <div key={emp.employee_id} className="border border-border/50 rounded-xl p-4 bg-muted/10">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="font-semibold text-lg">
                            <Link to={`/employee/${emp.employee_id}`} className="hover:underline text-primary">{emp.employee_name}</Link>
                            <span className="text-muted-foreground text-sm font-normal ml-2">(ID: {emp.employee_code})</span>
                          </h4>
                          <Badge variant={emp.status === 'Completed' || emp.status === 'Closed' || emp.status === 'Offline' ? 'secondary' : 'default'}>
                            {emp.status}
                          </Badge>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-2">Checkpoints ({emp.timeline?.filter((t: any) => t.status === 'Completed' || t.status === 'Closed').length || 0}/{emp.timeline?.length || 0} Completed)</p>
                          <div className="flex flex-col gap-2">
                            {emp.timeline?.map((stop: any) => (
                              <div key={stop.id} className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-white/50">
                                <Badge variant={stop.status === 'Completed' || stop.status === 'Closed' ? 'default' : 'outline'} className={stop.status === 'Completed' || stop.status === 'Closed' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                  {stop.site_name} - {stop.status}
                                </Badge>
                                {stop.report_data && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-6 text-xs gap-1 ml-auto"
                                    onClick={() => {
                                      const data = stop.report_data || {};
                                      data._attachmentUrl = stop.attachment_url;
                                      setSelectedReport(data);
                                      setSelectedSiteName(stop.site_name);
                                      setIsModalOpen(true);
                                    }}
                                  >
                                    <Eye className="w-3 h-3" />
                                    View Report
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {emp.current_location && (
                          <div className="text-xs text-muted-foreground bg-background p-2 rounded-lg inline-block">
                            <span className="font-medium text-foreground">Last Check-in:</span> {new Date(emp.current_location.time).toLocaleTimeString()} at {emp.current_location.site_name} 
                            ({emp.current_location.lat}, {emp.current_location.lng})
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
        
        <ReportViewModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          reportData={selectedReport}
          siteName={selectedSiteName}
        />
      </div>
    </MasterDataProvider>
  );
}
