import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { MasterDataProvider } from "@/contexts/MasterDataContext";
import { apiClient } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportViewModal } from "@/components/tracking/ReportViewModal";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { ArrowLeft, UserCircle, Briefcase, Building2, MapPin, Calendar, Activity, CheckCircle2, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const fetchProfileAndAnalytics = async () => {
      setLoading(true);
      try {
        const [profileData, analyticsData] = await Promise.all([
          apiClient.get(`/field-tracking/admin/employees/${id}/profile/`),
          apiClient.get(`/field-tracking/analytics/employee/${id}/`)
        ]);
        if (profileData && !profileData.error) {
          setProfile(profileData);
        }
        if (analyticsData && !analyticsData.error) {
          setAnalytics(analyticsData);
        }
      } catch (err) {
        console.error("Failed to fetch employee data", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProfileAndAnalytics();
    }
  }, [id]);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const data = await apiClient.get(`/field-tracking/admin/live/${id}/?date=${selectedDate}`);
        if (data && data.timeline) {
          setTimelineData(data.timeline);
        } else {
          setTimelineData([]);
        }
      } catch (err) {
        console.error("Failed to fetch employee timeline", err);
      }
    };
    if (id) {
      fetchTimeline();
    }
  }, [id, selectedDate]);

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
          <div className="max-w-[1000px] mx-auto space-y-6">

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-bold font-display">Employee Profile</h2>
            </div>

            {loading ? (
              <Card className="glass-card"><CardContent className="py-12 text-center">Loading profile data...</CardContent></Card>
            ) : !profile ? (
              <Card className="glass-card"><CardContent className="py-12 text-center">Employee not found or no tracking data available.</CardContent></Card>
            ) : (
              <>
                {/* Header Card */}
                <Card className="glass-card border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="bg-primary/10 p-4 rounded-full">
                        <UserCircle className="w-16 h-16 text-primary" />
                      </div>
                      <div className="text-center md:text-left space-y-2">
                        <h3 className="text-3xl font-bold">{profile.employee_name}</h3>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-muted-foreground text-sm">
                          <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {profile.position}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-4 h-4" /> {profile.department}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="glass-card bg-gradient-to-br from-background to-blue-500/5">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-muted-foreground">Monthly Attendance</h4>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Calendar className="w-5 h-5" /></div>
                      </div>
                      <div className="text-3xl font-bold">{profile.attendance_days} <span className="text-sm font-normal text-muted-foreground">Days present</span></div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card bg-gradient-to-br from-background to-emerald-500/5">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-muted-foreground">Total Travels</h4>
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><MapPin className="w-5 h-5" /></div>
                      </div>
                      <div className="text-3xl font-bold">{profile.total_travels} <span className="text-sm font-normal text-muted-foreground">Visits & Meetings</span></div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card bg-gradient-to-br from-background to-purple-500/5">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-muted-foreground">Productivity</h4>
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Activity className="w-5 h-5" /></div>
                      </div>
                      <div className="text-3xl font-bold">{profile.productivity_percentage}% <span className="text-sm font-normal text-muted-foreground">Completion Rate</span></div>
                    </CardContent>
                  </Card>
                </div>

                {/* Analytics Dashboard */}
                {analytics && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-primary" /> Monthly Trend
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[250px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.monthly_trend}>
                              <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                              <RechartsTooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                              <Bar dataKey="meetings" fill="var(--theme-primary, #3b82f6)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-500" /> Meeting Status Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[250px] w-full flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.status_distribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {analytics.status_distribution.map((entry: any, index: number) => {
                                  const colors = ['#10b981', '#f59e0b', '#64748b'];
                                  return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                })}
                              </Pie>
                              <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-6 mt-2">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#10b981]"></div><span className="text-sm">Closed</span></div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div><span className="text-sm">Pending MOM</span></div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#64748b]"></div><span className="text-sm">Other</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Recent Visits Timeline */}
                <Card className="glass-card">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg">Daily Activity Log</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <Input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-auto h-9"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {timelineData.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">No activity recorded for this date.</p>
                    ) : (
                      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {timelineData.map((visit: any, idx: number) => (
                          <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">

                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                              {visit.type === 'Meeting' ? <UserCircle className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                            </div>

                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-border/50 bg-background shadow-sm">
                              <div className="flex items-center justify-between mb-2">
                                <Badge variant={visit.type === 'Meeting' ? 'secondary' : 'default'} className="text-xs">
                                  {visit.type === 'Meeting' ? 'Meeting' : 'Check-in'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{new Date(visit.time).toLocaleTimeString()}</span>
                              </div>
                              <h4 className="font-semibold">{visit.site_name}</h4>
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  {visit.status}
                                </p>
                                {(visit.report_data || visit.attachment_url) && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      setSelectedActivity(visit);
                                      setIsModalOpen(true);
                                    }}
                                  >
                                    View Form
                                  </Button>
                                )}
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </main>
        
        {selectedActivity && (
          <ReportViewModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            reportData={selectedActivity.report_data || {}}
            siteName={selectedActivity.site_name || "Site"}
            reportType={selectedActivity.report_type || (selectedActivity.type === 'Meeting' ? 'meeting' : 'visit')}
          />
        )}
      </div>
    </MasterDataProvider>
  );
}
