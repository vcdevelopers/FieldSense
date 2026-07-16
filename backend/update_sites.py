import re

filepath = r'c:\field-senses-app-main\frontend\src\pages\TrackingSites.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Import Search icon
content = content.replace('import { MapPin, Plus, X } from "lucide-react";', 'import { MapPin, Plus, X, Search, Edit2, Trash2 } from "lucide-react";')

# Add search state
state_insert = '''  const [searchQuery, setSearchQuery] = useState("");'''
content = content.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n' + state_insert)

# Add search input UI
header_pattern = re.compile(r'<CardHeader>.*?</CardHeader>', re.DOTALL)
replacement_header = '''<CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              </CardHeader>'''
content = header_pattern.sub(replacement_header, content)

# Update sites.map to use filtered sites
content = content.replace('sites.map((site: any) => (', 'sites.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.address?.toLowerCase().includes(searchQuery.toLowerCase())).map((site: any) => (')
content = content.replace('sites.length === 0', 'sites.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.address?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('TrackingSites enhanced')
