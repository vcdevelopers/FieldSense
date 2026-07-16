import { useState, useEffect } from "react";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { MasterDataProvider } from "@/contexts/MasterDataContext";
import { fetchAttendanceDashboard, AttendanceDashboardData } from "@/services/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format, subDays, parseISO } from "date-fns";
import { 
  Users, Clock, Search, 
  RefreshCw, Download, 
  MapPin, AlertTriangle, Building2, Briefcase, Activity, CheckCircle2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function AttendanceDashboard() {
  const [activeTab, setActiveTab] = useState("attendance");
  
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const defaultStartStr = format(subDays(new Date(), 7), "yyyy-MM-dd");
  
  const [dateStart, setDateStart] = useState(defaultStartStr);
  const [dateEnd, setDateEnd] = useState(todayStr);
  const [searchQuery, setSearchQuery] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [data, setData] = useState<AttendanceDashboardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Late arrival threshold (This will be fetched from Admin Master Setup later)
  const lateThreshold = "09:30";

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchAttendanceDashboard(dateStart, dateEnd);
      setData(result || []);
    } catch (err) {
      console.error("Failed to load attendance data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateStart, dateEnd]);

  // Filtering
  const filteredData = data.filter((item) => {
    const matchesSearch = item.employee_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesSession = true;
    if (sessionStatusFilter !== "all") {
      matchesSession = item.session_status?.toLowerCase() === sessionStatusFilter.toLowerCase();
    }
    
    let matchesAttendance = true;
    if (attendanceFilter !== "all") {
      const isPresent = item.check_in_time != null;
      if (attendanceFilter === "present" && !isPresent) matchesAttendance = false;
      if (attendanceFilter === "absent" && isPresent) matchesAttendance = false;
    }
    
    return matchesSearch && matchesSession && matchesAttendance;
  });

  // Top KPIs
  const activeFieldStaff = data.filter(d => d.session_status === "Active Now").length;
  const totalStaff = new Set(data.map(d => d.employee_id)).size;
  
  // Late arrivals based on the configurable threshold
  const lateArrivals = data.filter(d => {
    if (!d.check_in_time) return false;
    const timeStr = format(new Date(d.check_in_time), 'HH:mm');
    return timeStr > lateThreshold;
  }).length;

  const totalMeetings = data.reduce((acc, curr) => acc + curr.meetings_total, 0);
  const totalCompletedMeetings = data.reduce((acc, curr) => acc + curr.meetings_completed, 0);
  const totalHoursSum = data.reduce((acc, curr) => acc + Number(curr.total_hours), 0);

  // Department Distribution Data
  const deptMap: Record<string, number> = {};
  data.forEach(d => {
    if (d.check_in_time) {
      const dept = d.department || 'Unassigned';
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    }
  });
  const deptArray = Object.entries(deptMap).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 4);

  // Exceptions / Alerts
  const exceptions = data.filter(d => {
    if (d.session_status === "Active Now" && Number(d.total_hours) > 12) return true; // Over 12 hours without check out
    if (d.check_out_time && d.meetings_pending > 0) return true; // Checked out but pending meetings
    return false;
  }).slice(0, 3); // top 3 exceptions

  return (
    <MasterDataProvider>
      <div className="min-h-screen bg-slate-50/50">
        <TopNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main className="pt-24 px-4 pb-24">
          <div className="max-w-[1400px] mx-auto space-y-6">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-display text-slate-800">Field Operations & Attendance</h2>
                <p className="text-muted-foreground text-sm">Real-time tracking of field staff attendance, meeting execution, and daily hours.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={loadData} className="text-slate-600 font-medium bg-white border-slate-200">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
                <Button className="bg-[#1e58a2] hover:bg-[#16427d] text-white font-medium shadow-sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* Top KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border border-slate-200 shadow-sm rounded-xl">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Field Staff</p>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 animate-pulse"></div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-slate-800">{activeFieldStaff}</span>
                      <span className="text-sm font-medium text-slate-500">/ {totalStaff} total</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-2 font-medium">
                      <MapPin className="w-3.5 h-3.5" />
                      Currently in the field
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border border-slate-200 shadow-sm rounded-xl">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Late Arrivals</p>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-amber-500">{lateArrivals}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                      <Clock className="w-3.5 h-3.5" />
                      Checked in after {lateThreshold} AM
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm rounded-xl">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meeting Execution</p>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-slate-800">{totalCompletedMeetings}</span>
                      <span className="text-sm font-medium text-slate-500">/ {totalMeetings}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-2 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Successfully completed
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-slate-200 shadow-sm rounded-xl">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aggregate Field Hours</p>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-4xl font-bold text-slate-800">{totalHoursSum.toFixed(1)}</span>
                      <span className="text-sm font-medium text-slate-500">hours</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                      <Activity className="w-3.5 h-3.5" />
                      Combined workforce productivity
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Middle Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Meeting Success Rate */}
              <Card className="border border-slate-200 shadow-sm rounded-xl flex flex-col">
                <CardHeader className="pb-2 px-5 pt-5 border-b border-slate-100">
                  <CardTitle className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    Meeting Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex-1 flex flex-col justify-center">
                  {totalMeetings === 0 ? (
                    <p className="text-sm text-slate-400 text-center">No meetings scheduled for this period.</p>
                  ) : (
                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                          <span className="text-emerald-600">Completed</span>
                          <span className="text-slate-700">{totalCompletedMeetings} / {totalMeetings}</span>
                        </div>
                        <Progress value={(totalCompletedMeetings / totalMeetings) * 100} className="h-2 bg-slate-100" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                          <span className="text-amber-500">Pending Execution</span>
                          <span className="text-slate-700">{totalMeetings - totalCompletedMeetings} / {totalMeetings}</span>
                        </div>
                        <Progress value={((totalMeetings - totalCompletedMeetings) / totalMeetings) * 100} className="h-2 bg-slate-100 [&>div]:bg-amber-400" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Department Attendance */}
              <Card className="border border-slate-200 shadow-sm rounded-xl flex flex-col">
                <CardHeader className="pb-2 px-5 pt-5 border-b border-slate-100">
                  <CardTitle className="text-[14px] font-bold text-slate-800 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Department Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  {deptArray.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-5">
                      <p className="text-sm text-slate-400">No attendance data available.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {deptArray.map((dept, i) => (
                        <div key={i} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                          <span className="text-[13px] font-medium text-slate-700">{dept.name}</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#1e58a2]/10 text-[#1e58a2]">
                            {dept.count} Present
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Operational Exceptions */}
              <Card className="border border-slate-200 shadow-sm rounded-xl flex flex-col bg-gradient-to-b from-white to-amber-50/30">
                <CardHeader className="pb-2 px-5 pt-5 border-b border-amber-100/50">
                  <CardTitle className="text-[14px] font-bold text-amber-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Operational Exceptions
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex-1 overflow-y-auto">
                  {exceptions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-slate-400">No operational anomalies detected.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {exceptions.map((ex, i) => {
                        const isOvertime = ex.session_status === "Active Now" && Number(ex.total_hours) > 12;
                        return (
                          <div key={i} className="p-3 bg-white border border-amber-200 rounded-lg shadow-sm">
                            <p className="text-[13px] font-semibold text-slate-800 mb-1">{ex.employee_name}</p>
                            <p className="text-[11px] text-amber-600 font-medium">
                              {isOvertime 
                                ? `Active in field for over 12 hours (${ex.duration_formatted}) without checkout.` 
                                : `Checked out but still has ${ex.meetings_pending} pending meetings.`}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Filter and Table Section */}
            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-white grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                <div className="md:col-span-4">
                  <Label className="text-xs font-semibold text-slate-500 mb-2 block">Search Staff</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input 
                      placeholder="Search name, code..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-slate-50/50 border-slate-200 rounded-lg h-10 text-[13px]"
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 mb-2 block">Start Date</Label>
                  <Input 
                    type="date" 
                    value={dateStart} 
                    onChange={e => setDateStart(e.target.value)}
                    className="bg-slate-50/50 border-slate-200 text-sm rounded-lg h-10"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 mb-2 block">End Date</Label>
                  <Input 
                    type="date" 
                    value={dateEnd} 
                    onChange={e => setDateEnd(e.target.value)}
                    className="bg-slate-50/50 border-slate-200 text-sm rounded-lg h-10"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 mb-2 block">Session Status</Label>
                  <Select value={sessionStatusFilter} onValueChange={setSessionStatusFilter}>
                    <SelectTrigger className="bg-slate-50/50 border-slate-200 text-sm rounded-lg h-10">
                      <SelectValue placeholder="All Sessions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sessions</SelectItem>
                      <SelectItem value="active now">Active Now (In Field)</SelectItem>
                      <SelectItem value="closed">Closed (Checked Out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 mb-2 block">Attendance</Label>
                  <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
                    <SelectTrigger className="bg-slate-50/50 border-slate-200 text-sm rounded-lg h-10">
                      <SelectValue placeholder="All Attendance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Attendance</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-[11px] text-slate-500 font-bold uppercase bg-slate-50/50 border-b border-slate-200 tracking-wider">
                    <tr>
                      <th className="px-6 py-4">EMPLOYEE</th>
                      <th className="px-6 py-4">ROLE & DEPT</th>
                      <th className="px-6 py-4">FIELD TIMES</th>
                      <th className="px-6 py-4">MEETINGS</th>
                      <th className="px-6 py-4">DURATION</th>
                      <th className="px-6 py-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center">
                            <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mb-3" />
                            <p>Loading field logs...</p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 border-b border-slate-100">
                          No field records found for the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredData.map((record, idx) => {
                        const isPresent = record.check_in_time != null;
                        const loginStr = record.check_in_time ? format(new Date(record.check_in_time), 'h:mm a') : '-';
                        const logoutStr = record.check_out_time ? format(new Date(record.check_out_time), 'h:mm a') : '-';
                        
                        return (
                          <tr key={`${record.employee_id}-${record.date}-${idx}`} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#1e58a2]/10 flex items-center justify-center text-xs font-bold text-[#1e58a2] shadow-sm">
                                  {record.employee_name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800 text-[13px] group-hover:text-[#1e58a2] transition-colors">{record.employee_name}</p>
                                  <p className="text-[11px] text-slate-500">ID: {record.employee_id} • {format(new Date(record.date), 'MMM d, yyyy')}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-slate-800 font-medium text-[13px]">{record.role || '-'}</p>
                              <p className="text-slate-500 text-[11px]">{record.department || '-'}</p>
                            </td>
                            <td className="px-6 py-4">
                              {isPresent ? (
                                <div className="flex items-center gap-2 text-[12px]">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-100">In: {loginStr}</span>
                                  {record.check_out_time ? (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">Out: {logoutStr}</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-100 animate-pulse">Active</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[12px]">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {record.meetings_total > 0 ? (
                                <div className="flex items-center gap-2">
                                  <span className={`text-[13px] font-bold ${record.meetings_completed === record.meetings_total ? 'text-emerald-600' : 'text-slate-700'}`}>
                                    {record.meetings_completed} / {record.meetings_total}
                                  </span>
                                  <Progress 
                                    value={(record.meetings_completed / record.meetings_total) * 100} 
                                    className="h-1.5 w-16 bg-slate-100" 
                                  />
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[12px]">No Meetings</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-800 font-medium text-[13px]">{record.duration_formatted || '-'}</td>
                            <td className="px-6 py-4">
                              {isPresent ? (
                                record.session_status === 'Active Now' ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200/50 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></div>
                                    In Field
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5"></div>
                                    Checked Out
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-100 shadow-sm">
                                  Absent
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </MasterDataProvider>
  );
}
