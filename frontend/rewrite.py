import re

with open('src/components/tabs/FormBuilderTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace('import { Plus, Trash2, Save, MoveUp, MoveDown, Type, Camera, ListOrdered, GripVertical, Smartphone, Settings } from "lucide-react";',
'import { Plus, Trash2, Save, MoveUp, MoveDown, Type, Camera, ListOrdered, GripVertical, Smartphone, Settings, LayoutList } from "lucide-react";')

# 2. FormTemplate Interface
content = content.replace('''interface FormTemplate {
  id?: number;
  name: string;
  schema: FormField[];
  is_active: boolean;
}''',
'''interface FormTemplate {
  id?: number;
  name: string;
  form_type?: string;
  schema: FormField[];
  is_active: boolean;
  is_global?: boolean;
  assigned_employees?: number[];
}''')

# 3. Component state & fetch
old_state = '''export function FormBuilderTab() {
  const [formType, setFormType] = useState<'site-visit' | 'mom'>('site-visit');
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplate(formType);
  }, [formType]);

  const fetchTemplate = async (type: 'site-visit' | 'mom') => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const endpoint = type === 'mom' ? '/api/field-tracking/mom-form-template/' : '/api/field-tracking/form-template/';
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': sessionStorage.getItem('userRole') || 'ADMIN',
          'X-User-Id': sessionStorage.getItem('userId') || ''
        }
      });
      if (!response.ok) {
        const text = await response.text();
        setErrorMsg(`HTTP ${response.status}: ${text}`);
      } else {
        const data = await response.json();
        setTemplate(data);
      }
    } catch (error: any) {
      console.error("Failed to fetch template:", error);
      setErrorMsg(`Fetch error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const endpoint = formType === 'mom' ? '/api/field-tracking/mom-form-template/' : '/api/field-tracking/form-template/';
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': sessionStorage.getItem('userRole') || 'ADMIN',
          'X-User-Id': sessionStorage.getItem('userId') || ''
        },
        body: JSON.stringify(template)
      });
      if (!response.ok) {
        const text = await response.text();
        setErrorMsg(`HTTP ${response.status} on Save: ${text}`);
      }
      setTimeout(() => setSaving(false), 500);
    } catch (error: any) {
      console.error("Failed to save template:", error);
      setErrorMsg(`Save error: ${error.message}`);
      setSaving(false);
    }
  };'''

new_state = '''export function FormBuilderTab() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [formsData, empData] = await Promise.all([
        api.get('/api/field-tracking/admin/form-templates/'),
        api.get('/api/core/employees/')
      ]);
      
      let initialTemplates: FormTemplate[] = [];
      if (formsData && Array.isArray(formsData)) {
        initialTemplates = formsData;
      } else if (formsData && formsData.results) {
        initialTemplates = formsData.results;
      }
      setTemplates(initialTemplates);
      if (initialTemplates.length > 0) setTemplate(initialTemplates[0]);
      
      if (empData && Array.isArray(empData)) {
        setEmployees(empData);
      } else if (empData && empData.results) {
        setEmployees(empData.results);
      }
      
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const newTemplate: FormTemplate = {
      name: "New Checklist",
      form_type: `custom_form_${Date.now()}`,
      schema: [],
      is_active: true,
      is_global: true,
      assigned_employees: []
    };
    setTemplate(newTemplate);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this form?")) return;
    try {
      await fetch(`http://127.0.0.1:8000/api/field-tracking/admin/form-templates/${id}/`, {
        method: 'DELETE',
        headers: {
          'X-User-Role': sessionStorage.getItem('userRole') || 'ADMIN',
          'X-User-Id': sessionStorage.getItem('userId') || ''
        }
      });
      fetchInitialData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const isNew = !template.id;
      const endpoint = isNew ? '/api/field-tracking/admin/form-templates/' : `/api/field-tracking/admin/form-templates/${template.id}/`;
      
      const dataToSave = {
        ...template,
        assigned_employees: template.is_global ? [] : template.assigned_employees
      };

      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': sessionStorage.getItem('userRole') || 'ADMIN',
          'X-User-Id': sessionStorage.getItem('userId') || ''
        },
        body: JSON.stringify(dataToSave)
      });
      if (!response.ok) {
        const text = await response.text();
        setErrorMsg(`HTTP ${response.status} on Save: ${text}`);
      } else {
        const res = await response.json();
        // Refresh list
        const formsData: any = await api.get('/api/field-tracking/admin/form-templates/');
        const newTemplates = Array.isArray(formsData) ? formsData : (formsData.results || []);
        setTemplates(newTemplates);
        if (isNew && res.id) {
           const created = newTemplates.find((t: any) => t.id === res.id);
           if (created) setTemplate(created);
        }
      }
      setTimeout(() => setSaving(false), 500);
    } catch (error: any) {
      console.error("Failed to save template:", error);
      setErrorMsg(`Save error: ${error.message}`);
      setSaving(false);
    }
  };'''

content = content.replace(old_state, new_state)

# 4. Header UI
old_header = '''      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <h3 className="text-2xl font-bold font-display tracking-tight text-foreground">
            {formType === 'site-visit' ? 'Site Visit Form Builder' : 'Minutes of Meeting (MOM) Builder'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Design the data collection flow for your field teams.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-lg border border-border">
            <Button 
              variant={formType === 'site-visit' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setFormType('site-visit')}
              className={formType === 'site-visit' ? 'shadow-sm' : ''}
            >
              Site Visit
            </Button>
            <Button 
              variant={formType === 'mom' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setFormType('mom')}
              className={formType === 'mom' ? 'shadow-sm' : ''}
            >
              MOM Form
            </Button>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-md hover:shadow-lg transition-all rounded-xl px-6">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Publish Form"}
          </Button>
        </div>
      </div>'''

new_header = '''      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <h3 className="text-2xl font-bold font-display tracking-tight text-foreground">
            Form Builder
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Design the data collection flow for your field teams.</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={String(template.id || 'NEW')} onValueChange={(v) => {
             if (v === 'NEW') handleCreateNew();
             else {
               const t = templates.find(x => x.id === Number(v));
               if (t) setTemplate(t);
             }
          }}>
            <SelectTrigger className="w-[280px] bg-white border-border shadow-sm">
              <SelectValue placeholder="Select a form..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => (
                <SelectItem key={t.id} value={String(t.id)}>
                  <div className="flex items-center gap-2">
                    <LayoutList className="w-4 h-4 text-primary/70" />
                    <span>{t.name}</span>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="NEW" className="text-primary font-bold border-t border-border mt-1 pt-1">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Plus className="w-4 h-4" /> Create New Checklist
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {template.id && (
             <Button variant="destructive" size="icon" onClick={() => handleDelete(template.id!)} className="rounded-xl shadow-sm">
               <Trash2 className="w-4 h-4" />
             </Button>
          )}

          <Button onClick={handleSave} disabled={saving} className="gap-2 shadow-md hover:shadow-lg transition-all rounded-xl px-6">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Publish Form"}
          </Button>
        </div>
      </div>'''

content = content.replace(old_header, new_header)

# 5. Form Configuration
old_config = '''        {/* LEFT COLUMN: Field Configuration */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Form Configuration
            </h4>
            <Button size="sm" onClick={addField} className="gap-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-0">
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>'''

new_config = '''        {/* LEFT COLUMN: Field Configuration */}
        <div className="lg:col-span-8 flex flex-col">
          
          {/* Metadata Section */}
          <div className="bg-white p-5 rounded-xl border border-border shadow-sm mb-8 space-y-5">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Checklist Name</Label>
                <Input value={template.name} onChange={(e) => setTemplate({...template, name: e.target.value})} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Internal ID (Slug)</Label>
                <Input value={template.form_type} onChange={(e) => setTemplate({...template, form_type: e.target.value})} disabled={!!template.id} className="h-10 bg-muted/50" />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-foreground flex items-center gap-2">
                  Global Checklist
                  {template.is_global && <span className="bg-success/20 text-success text-[10px] px-2 py-0.5 rounded-full">Available to All</span>}
                </Label>
                <p className="text-xs text-muted-foreground">If disabled, you can assign this checklist to specific employees only.</p>
              </div>
              <Switch checked={template.is_global} onCheckedChange={(c) => setTemplate({...template, is_global: c, assigned_employees: c ? [] : template.assigned_employees})} />
            </div>

            {!template.is_global && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Assigned Employees</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-muted/20 border border-border rounded-lg">
                  {employees.map(emp => {
                    const isAssigned = (template.assigned_employees || []).includes(emp.id);
                    return (
                      <div key={emp.id} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          id={`emp-${emp.id}`} 
                          checked={isAssigned}
                          onChange={(e) => {
                            let newAssigned = [...(template.assigned_employees || [])];
                            if (e.target.checked) newAssigned.push(emp.id);
                            else newAssigned = newAssigned.filter(id => id !== emp.id);
                            setTemplate({...template, assigned_employees: newAssigned});
                          }}
                          className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`emp-${emp.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                          {emp.user?.first_name ? `${emp.user.first_name} ${emp.user.last_name}` : (emp.employee_id || emp.username || emp.id)}
                        </label>
                      </div>
                    );
                  })}
                  {employees.length === 0 && <div className="text-sm text-muted-foreground col-span-3 p-2">No employees found.</div>}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-lg flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Questions & Fields
            </h4>
            <Button size="sm" onClick={addField} className="gap-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 shadow-none border-0">
              <Plus className="w-4 h-4" /> Add Question
            </Button>
          </div>'''

content = content.replace(old_config, new_config)

# 6. Mobile Preview Title
old_mobile_title = '''{formType === 'site-visit' ? 'Site Visit Form' : 'MOM Form'}'''
new_mobile_title = '''{template.name || 'New Form'}'''
content = content.replace(old_mobile_title, new_mobile_title)

with open('src/components/tabs/FormBuilderTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
