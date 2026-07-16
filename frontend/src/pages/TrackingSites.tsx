import { useState, useEffect } from "react";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { MasterDataProvider } from "@/contexts/MasterDataContext";
import { apiClient } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Plus, X, Search, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassModal } from "@/components/ui/GlassModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TrackingSites() {
  const [activeTab, setActiveTab] = useState("tracking-sites");
  const [isDark, setIsDark] = useState(false);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSite, setNewSite] = useState({ name: '', address: '', latitude: '', longitude: '', geofence_radius: '100' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const fetchSites = async () => {
    try {
      const data = await apiClient.get("/field-tracking/sites/");
      if (data) {
        setSites(data);
      }
    } catch (err) {
      console.error("Failed to fetch sites", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleAddSite = async () => {
    if (!newSite.name || !newSite.latitude || !newSite.longitude) return;
    setSubmitting(true);
    try {
      await apiClient.post("/field-tracking/sites/", newSite);
      setIsAddModalOpen(false);
      setNewSite({ name: '', address: '', latitude: '', longitude: '', geofence_radius: '100' });
      fetchSites();
    } catch (err) {
      console.error("Failed to add site", err);
    } finally {
      setSubmitting(false);
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold font-display">Tracking Sites Management</h2>
                <p className="text-muted-foreground text-sm">Manage geofenced client and store locations for field tracking.</p>
              </div>
              <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Site
              </Button>
            </div>

            <Card className="glass-card">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Configured Sites
                </CardTitle>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Search sites..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64 bg-background border-border/50"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p>Loading sites...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                        <tr>
                          <th className="px-6 py-3">Site ID</th>
                          <th className="px-6 py-3">Site Name</th>
                          <th className="px-6 py-3">Address</th>
                          <th className="px-6 py-3">Coordinates (Lat, Lng)</th>
                          <th className="px-6 py-3">Geofence Radius</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sites.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.address?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                              No tracking sites found.
                            </td>
                          </tr>
                        ) : (
                          sites.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.address?.toLowerCase().includes(searchQuery.toLowerCase())).map((site: any) => (
                            <tr key={site.id} className="border-b border-border/50 hover:bg-muted/20">
                              <td className="px-6 py-4 font-medium">{site.id}</td>
                              <td className="px-6 py-4">{site.name}</td>
                              <td className="px-6 py-4">{site.address || "N/A"}</td>
                              <td className="px-6 py-4">
                                {site.latitude}, {site.longitude}
                              </td>
                              <td className="px-6 py-4">{site.geofence_radius}m</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        <GlassModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} size="md">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-bold font-display">Add New Site</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)} className="rounded-full">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Site Name</Label>
              <Input 
                placeholder="e.g. Acme Corp HQ" 
                value={newSite.name}
                onChange={e => setNewSite({...newSite, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Address (Optional)</Label>
              <Input 
                placeholder="Full address" 
                value={newSite.address}
                onChange={e => setNewSite({...newSite, address: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input 
                  placeholder="e.g. 19.0760" 
                  value={newSite.latitude}
                  onChange={e => setNewSite({...newSite, latitude: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input 
                  placeholder="e.g. 72.8777" 
                  value={newSite.longitude}
                  onChange={e => setNewSite({...newSite, longitude: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Geofence Radius (meters)</Label>
              <Input 
                type="number"
                value={newSite.geofence_radius}
                onChange={e => setNewSite({...newSite, geofence_radius: e.target.value})}
              />
            </div>
          </div>
          <div className="p-6 border-t border-white/10 bg-muted/10 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddSite} 
              disabled={submitting || !newSite.name || !newSite.latitude || !newSite.longitude}
            >
              {submitting ? "Saving..." : "Save Site"}
            </Button>
          </div>
        </GlassModal>

      </div>
    </MasterDataProvider>
  );
}
