import re

filepath = r'c:\field-senses-app-main\frontend\src\pages\AuditLogs.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Import the modal and UI components
if 'ClientMeetingAnalyticsModal' not in content:
    content = content.replace('import { Badge } from "@/components/ui/badge";', 'import { Badge } from "@/components/ui/badge";\nimport { ClientMeetingAnalyticsModal } from "@/components/modals/ClientMeetingAnalyticsModal";\nimport { Input } from "@/components/ui/input";\nimport { Button } from "@/components/ui/button";\nimport { Search, BarChart3 } from "lucide-react";')

# Add state variables for the modal
state_insert = '''  const [clientSearch, setClientSearch] = useState("");
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");'''
content = content.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n' + state_insert)

# Add the UI for searching and the modal
ui_pattern = re.compile(r'<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">.*?</div>', re.DOTALL)

replacement_ui = '''<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold font-display">System Audit Logs & Alerts</h2>
                <p className="text-muted-foreground text-sm">Real-time trail of employee check-ins and system events.</p>
              </div>
              <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border/50 shadow-sm">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input 
                    placeholder="Enter Client Name..." 
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
            </div>'''
content = ui_pattern.sub(replacement_ui, content)

# Inject the modal before the closing main tag
modal_insert = '''          <ClientMeetingAnalyticsModal 
            isOpen={isAnalyticsModalOpen}
            onClose={() => setIsAnalyticsModalOpen(false)}
            clientName={selectedClient}
          />
        </main>'''
content = content.replace('</main>', modal_insert)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('AuditLogs updated successfully')
