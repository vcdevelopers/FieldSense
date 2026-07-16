import re

with open('src/components/tracking/LiveTrackingMap.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to find the `return (` block in LiveTrackingMap and replace it.
# It starts at:
#   return (
#     <div className="flex flex-col gap-6 w-full">
# and ends right before:
#       {/* Meeting Detail Modal */}

replacement = '''  return (
    <div className="flex flex-col gap-6 w-full h-[600px] md:h-[700px]">
      {/* Main Map Container */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-md border border-border shrink-0">
        
        {/* Floating Controls Overlay */}
        <Card className="absolute top-4 left-4 z-10 w-[320px] shadow-2xl border border-border bg-card/95 backdrop-blur-md max-h-[90%] overflow-y-auto custom-scrollbar">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Live Tracking
              </h3>
              {selectedEmployeeId !== "none" && (
                <Badge variant={status === "Traveling" || status === "At Site" ? "default" : "secondary"}>
                  {status}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Select Date
                </p>
                <Input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="w-full h-8"
                />
              </div>
              
              <div>
                <p className="text-xs text-muted-foreground mb-1">Map Theme</p>
                <Select value={mapTheme} onValueChange={setMapTheme}>
                  <SelectTrigger className="bg-background w-full h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="satellite">Satellite</SelectItem>
                    <SelectItem value="logicon-light">Logicon Light Theme</SelectItem>
                    <SelectItem value="logicon-dark">Logicon Dark Theme</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Select Employee to Track
                </p>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger className="bg-background w-full h-8">
                    <SelectValue placeholder="Select an Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Stop Tracking)</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.employeeId || emp.id} value={emp.id.toString()}>
                        {emp.fullName} ({emp.employeeId || emp.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployeeId !== "none" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Map View Filter</p>
                  <Select value={viewMode} onValueChange={setViewMode}>
                    <SelectTrigger className="bg-background w-full h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">View All Today\\'s History</SelectItem>
                      <SelectItem value="current">View Current Meeting Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedEmployeeId !== "none" && trackingData && (
                <>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Meetings
                      </p>
                      <p className="font-semibold">{trackingData.meetings?.length || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" /> Completed
                      </p>
                      <p className="font-semibold">{trackingData.meetings?.filter((m: any) => m.status === 'Completed' || m.status === 'Closed').length || 0}</p>
                    </div>
                  </div>

                  <div className="relative space-y-0 pl-4 border-l-2 border-muted mt-2">
                    {meetings.map((m: any, idx: number) => {
                      let colorClass = "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400";
                      let icon = <MapPin className="w-4 h-4" />;
                      let dotColor = "bg-red-500";
                      if (m.status === 'Completed' || m.status === 'Closed') {
                        colorClass = "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400";
                        icon = <CheckCircle2 className="w-4 h-4" />;
                        dotColor = "bg-green-500";
                      } else if (m.status === 'In Progress') {
                        colorClass = "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400";
                        icon = <Clock className="w-4 h-4" />;
                        dotColor = "bg-orange-500";
                      } else if (m.status === 'Delayed') {
                        colorClass = "bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400";
                        dotColor = "bg-yellow-500";
                      }

                      return (
                        <div 
                          key={m.id} 
                          className="relative pb-4 animate-in slide-in-from-bottom-4 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedMeeting(m)}
                        >
                          <div className={`absolute -left-[23px] top-2 w-3.5 h-3.5 rounded-full border-2 border-background ${dotColor} ${m.status === 'In Progress' ? 'animate-pulse' : ''}`} />
                          <div className={`p-2 ml-2 rounded-xl border text-left ${colorClass} shadow-sm`}>
                            <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                              {icon} {m.meeting_title}
                            </p>
                            <p className="text-[10px] text-muted-foreground opacity-90 truncate">{m.client_name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoaded ? (
          <MapErrorBoundary>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={defaultCenter}
              zoom={11}
              onLoad={onMapLoad}
              options={mapOptions}
            >
              {/* Live Directions Route */}
              {directionsResponse && (
                <DirectionsRenderer
                  directions={directionsResponse}
                  options={{
                    suppressMarkers: true,
                    preserveViewport: true, // Do not auto-zoom to directions
                    polylineOptions: { strokeColor: "#3b82f6", strokeWeight: 6, strokeOpacity: 0.8 }
                  }}
                />
              )}

              {/* AdHocMeeting Markers */}
              {meetings.map((m: any) => m.destination_lat && m.destination_lng ? (
                <Marker
                  key={`meeting-${m.id}`}
                  position={{ lat: Number(m.destination_lat), lng: Number(m.destination_lng) }}
                  icon={getMarkerIcon(m.status)}
                  title={`Meeting: ${m.meeting_title} (${m.status})`}
                />
              ) : null)}

              {/* Today's History Log */}
              {viewMode === 'today' && visitLogs.map((v: any) => v.latitude && v.longitude ? (
                <Marker
                  key={`visit-${v.id}`}
                  position={{ lat: Number(v.latitude), lng: Number(v.longitude) }}
                  icon="http://maps.google.com/mapfiles/ms/icons/purple-dot.png"
                  title={`Visit: ${v.site_name}`}
                />
              ) : null)}

              {viewMode === 'today' && trackingData?.meetings?.map((m: any) => m.current_lat && m.current_lng ? (
                <Marker
                  key={`meeting-start-${m.id}`}
                  position={{ lat: Number(m.current_lat), lng: Number(m.current_lng) }}
                  icon="http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                  title={`Started Meeting from here: ${m.meeting_title}`}
                />
              ) : null)}

              {viewMode === 'today' && pathPoints.length > 1 && (
                <Polyline
                  path={pathPoints.map(p => ({ lat: p.lat, lng: p.lng }))}
                  options={{ strokeColor: "#9ca3af", strokeOpacity: 0.5, strokeWeight: 3, borderStyle: 'dashed' }}
                />
              )}

              {/* Current Location Marker - Animated Real Estate Agent/Broker Icon */}
              {currentLocation && selectedEmployeeId !== "none" && (
                <Marker
                  position={{ lat: Number(currentLocation.lat), lng: Number(currentLocation.lng) }}
                  icon={{
                    url: '/employee-marker.png',
                    scaledSize: window.google ? new window.google.maps.Size(40, 40) : undefined
                  }}
                  animation={window.google ? window.google.maps.Animation.BOUNCE : undefined}
                  title={`${empName}'s Latest Location`}
                />
              )}

              {/* All Employees Markers (when none selected) */}
              {selectedEmployeeId === "none" && trackingData?.all_employees?.map((emp: any) => emp.current_location ? (
                <Marker
                  key={`all-emp-${emp.employee_id}`}
                  position={{ lat: Number(emp.current_location.lat), lng: Number(emp.current_location.lng) }}
                  icon={{
                    url: '/employee-marker.png',
                    scaledSize: window.google ? new window.google.maps.Size(40, 40) : undefined
                  }}
                  animation={window.google ? window.google.maps.Animation.BOUNCE : undefined}
                  title={`${emp.employee_name} (${emp.status})`}
                />
              ) : null)}
            </GoogleMap>
          </MapErrorBoundary>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/20">
            <p>Loading Map...</p>
          </div>
        )}
      </div>
'''

start_idx = content.find('  return (\n    <div className="flex flex-col gap-6 w-full">')
end_idx = content.find('      {/* Meeting Detail Modal */}')

if start_idx == -1 or end_idx == -1:
    print("Could not find blocks")
    print(f"Start: {start_idx}, End: {end_idx}")
else:
    new_content = content[:start_idx] + replacement + '\n' + content[end_idx:]
    with open('src/components/tracking/LiveTrackingMap.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced layout!")
