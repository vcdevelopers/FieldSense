import re
import os

filepath = r'c:\field-senses-app-main\frontend\src\components\modals\DailyTrackingDetailModal.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace SVG Map with RouteReplayMap
content = content.replace('import api from "@/lib/api";', 'import api from "@/lib/api";\nimport { RouteReplayMap } from "@/components/tracking/RouteReplayMap";')

svg_pattern = re.compile(r'<div className="h-72 bg-gradient-to-br from-primary/5 via-accent/5 to-success/5 relative overflow-hidden">.*?</div>\s*</CardContent>', re.DOTALL)
replacement_map = '''<div className="h-96 w-full relative overflow-hidden">
                          <RouteReplayMap 
                            apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}
                            routeStops={routeStops}
                            currentLocation={employee.currentLocation}
                            isPlaying={isPlaying}
                            replayProgress={replayProgress}
                          />
                        </div>
                      </CardContent>'''
content = svg_pattern.sub(replacement_map, content)

# Update data mapping from API to match modal structure
query_pattern = re.compile(r'const employee = trackingData\?.employee \|\| mockEmployee;.*?const dailyExpenses = trackingData\?.dailyExpenses \|\| mockDailyExpenses;', re.DOTALL)
replacement_query = '''const employee = trackingData ? {
    id: trackingData.employee_id,
    name: trackingData.employee_name,
    role: "Employee",
    department: "Sales",
    checkInTime: trackingData.visit_logs?.[0]?.check_in_time ? new Date(trackingData.visit_logs[0].check_in_time).toLocaleTimeString() : "N/A",
    checkOutTime: null,
    workMode: "Field",
    currentStatus: trackingData.status,
    currentLocation: trackingData.current_location,
  } : mockEmployee;

  const tasks = trackingData && trackingData.visit_logs ? trackingData.visit_logs.map((v: any, index: number) => ({
    id: v.id.toString(),
    taskName: v.site_name,
    taskType: "Visit",
    startTime: new Date(v.check_in_time).toLocaleTimeString(),
    endTime: null,
    status: "Completed",
    proofSubmitted: true,
    location: v.site_name,
    coordinates: { lat: v.latitude, lng: v.longitude },
    distance: 0,
    travelMode: v.travel_mode,
    isVerified: v.is_verified,
    reportData: v.report_data,
  })) : mockTasks;
  
  const metrics = trackingData?.metrics || mockMetrics;
  const dailyExpenses = trackingData?.dailyExpenses || mockDailyExpenses;'''
content = query_pattern.sub(replacement_query, content)

# Remove Fuel Cost and Food Cost from Table Head
th_pattern = re.compile(r'<TableHead>Distance</TableHead>\s*<TableHead>Fuel Cost</TableHead>\s*<TableHead>Food Cost</TableHead>')
content = th_pattern.sub('<TableHead>Vehicle/Mode</TableHead><TableHead>Verification</TableHead>', content)

# Remove Fuel Cost and Food Cost from Table Cell
tc_pattern = re.compile(r'<TableCell>\{task\.distance\} km</TableCell>\s*<TableCell>₹\{task\.fuelExpense\}</TableCell>\s*<TableCell>₹\{task\.foodExpense\}</TableCell>')
content = tc_pattern.sub('<TableCell>{(task as any).travelMode || "N/A"}</TableCell><TableCell>{(task as any).isVerified ? <Badge className="bg-success/20 text-success border-success/30">Verified</Badge> : <Badge variant="outline" className="text-destructive border-destructive">Out of Bounds</Badge>}</TableCell>', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Rewrite successful")
