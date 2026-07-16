import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save, MoveUp, MoveDown, Type, Camera, ListOrdered, GripVertical, Smartphone, Settings, LayoutList, Download, Upload, Hash, Calendar } from "lucide-react";
import { apiClient as api } from '@/services/api';
import { API_BASE_URL } from '@/config';
import { motion, AnimatePresence } from 'framer-motion';

interface FormField {
  id: string;
  type: string;
  label: string;
  options?: string[];
  requirePhoto?: boolean;
  requireComment?: boolean;
}

interface FormTemplate {
  id?: number;
  name: string;
  form_type?: string;
  schema: FormField[];
  is_active: boolean;
  is_global?: boolean;
  assigned_employees?: number[];
}

export function FormBuilderTab() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [formsData, empData] = await Promise.all([
        api.get('/field-tracking/admin/form-templates/'),
        api.get('/employees/')
      ]);
      
      let initialTemplates: FormTemplate[] = [];
      if (formsData && Array.isArray(formsData)) {
        initialTemplates = formsData;
      } else if (formsData && formsData.results) {
        initialTemplates = formsData.results;
      }
      setTemplates(initialTemplates);
      setTemplates(initialTemplates);
      if (initialTemplates.length > 0) {
        setTemplate(initialTemplates[0]);
      } else {
        // If no templates exist on the server (like on a fresh live deployment), create an empty one
        setTemplate({
          name: "New Checklist",
          form_type: `custom_form_${Date.now()}`,
          schema: [],
          is_active: true,
          is_global: true,
          assigned_employees: []
        });
      }
      
      const filterEmployees = (list: any[]) => list.filter(e => 
        e.fullName?.toLowerCase() !== 'system admin' && 
        e.designation?.toLowerCase() !== 'administrator'
      );
      
      if (empData && Array.isArray(empData)) {
        setEmployees(filterEmployees(empData));
      } else if (empData && empData.results) {
        setEmployees(filterEmployees(empData.results));
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
      await api.delete(`/field-tracking/admin/form-templates/${id}/`);
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
      const endpoint = isNew ? '/field-tracking/admin/form-templates/' : `/field-tracking/admin/form-templates/${template.id}/`;
      
      const dataToSave = {
        ...template,
        assigned_employees: template.is_global ? [] : template.assigned_employees
      };

      const res = isNew ? await api.post(endpoint, dataToSave) : await api.put(endpoint, dataToSave);
      
      if (!res) {
        setErrorMsg(`Failed to save template. Please check the network tab.`);
      } else {
        // Refresh list
        const formsData: any = await api.get('/field-tracking/admin/form-templates/');
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
  };

  const handleDownloadSample = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/field-tracking/admin/form-templates/download-sample/`, {
        method: 'GET',
        headers: {
          'X-User-Role': sessionStorage.getItem('userRole') || '',
          'X-User-Id': sessionStorage.getItem('userId') || '',
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to download template. Please try again.");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'form_checklists_sample.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (e: any) {
      setErrorMsg(e.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    setErrorMsg(null);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/field-tracking/admin/form-templates/upload-excel/`, {
        method: 'POST',
        headers: {
          'X-User-Role': sessionStorage.getItem('userRole') || '',
          'X-User-Id': sessionStorage.getItem('userId') || '',
        },
        body: formData,
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      
      alert(result.message || "Upload successful");
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  
  

  

  const addField = () => {
    if (!template) return;
    const currentSchema = Array.isArray(template.schema) ? template.schema : [];
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Question",
      requirePhoto: false,
      requireComment: false,
    };
    setTemplate({
      ...template,
      schema: [...currentSchema, newField]
    });
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    if (!template) return;
    const newSchema = [...template.schema];
    newSchema[index] = { ...newSchema[index], ...updates };
    setTemplate({ ...template, schema: newSchema });
  };

  const removeField = (index: number) => {
    if (!template) return;
    const newSchema = [...template.schema];
    newSchema.splice(index, 1);
    setTemplate({ ...template, schema: newSchema });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    if (!template) return;
    const newSchema = [...template.schema];
    if (direction === 'up' && index > 0) {
      const temp = newSchema[index - 1];
      newSchema[index - 1] = newSchema[index];
      newSchema[index] = temp;
    } else if (direction === 'down' && index < newSchema.length - 1) {
      const temp = newSchema[index + 1];
      newSchema[index + 1] = newSchema[index];
      newSchema[index] = temp;
    }
    setTemplate({ ...template, schema: newSchema });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'photo': return <Camera className="w-4 h-4" />;
      case 'radio': return <ListOrdered className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Form Builder...</div>;
  if (errorMsg) return <div className="text-destructive p-4 font-bold border border-destructive/50 bg-destructive/10 rounded-xl">Error: {errorMsg}</div>;
  if (!template) return <div className="p-8 text-center text-muted-foreground">Creating template...</div>;

  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-16rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border">
        <div>
          <h3 className="text-2xl font-bold font-display tracking-tight text-foreground">
            Form Builder
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Design the data collection flow for your field teams.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleDownloadSample} className="flex items-center gap-2 rounded-xl shadow-sm">
             <Download className="w-4 h-4" /> Sample Excel
          </Button>
          <div>
            <input type="file" id="excel-upload" accept=".xlsx" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            <label htmlFor="excel-upload">
              <Button variant="secondary" size="sm" asChild className="cursor-pointer flex items-center gap-2 rounded-xl shadow-sm bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                <span>
                  <Upload className={`w-4 h-4 ${uploading ? 'animate-bounce' : ''}`} /> 
                  {uploading ? 'Uploading...' : 'Upload Excel'}
                </span>
              </Button>
            </label>
          </div>

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6 flex-1 items-start">
        {/* LEFT COLUMN: Field Configuration */}
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
                          {emp.fullName ? `${emp.fullName} (${emp.employeeId || ''})` : (emp.employeeId || emp.username || emp.id)}
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
          </div>

          <div className="flex-1 space-y-4 pb-10">
            <AnimatePresence>
              {template.schema.map((field, index) => (
                <motion.div 
                  key={field.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-border shadow-sm rounded-xl overflow-hidden group hover:border-primary/30 transition-colors"
                >
                  {/* Card Header / Drag Handle */}
                  <div className="bg-muted/40 px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-white border border-border text-xs font-medium text-muted-foreground shadow-sm">
                        {getIconForType(field.type)}
                        {field.type === 'text' ? 'Text Input' : field.type === 'photo' ? 'Photo Upload' : field.type === 'radio' ? 'Multiple Choice' : field.type === 'number' ? 'Number Input' : field.type === 'date' ? 'Date Picker' : 'Multiple Choice'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => moveField(index, 'up')} disabled={index === 0}>
                        <MoveUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => moveField(index, 'down')} disabled={index === template.schema.length - 1}>
                        <MoveDown className="w-4 h-4" />
                      </Button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => removeField(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Question Label</Label>
                      <Input 
                        value={field.label} 
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className="font-medium text-base h-10 border-slate-200 focus-visible:ring-primary/20"
                        placeholder="e.g., Describe the shop condition"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Input Type</Label>
                      <Select 
                        value={field.type} 
                        onValueChange={(val) => updateField(index, { type: val })}
                      >
                        <SelectTrigger className="h-10 bg-muted/20 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">
                            <div className="flex items-center gap-2"><Type className="w-4 h-4"/> Text Input</div>
                          </SelectItem>
                          <SelectItem value="number">
                            <div className="flex items-center gap-2"><Hash className="w-4 h-4"/> Number Input</div>
                          </SelectItem>
                          <SelectItem value="date">
                            <div className="flex items-center gap-2"><Calendar className="w-4 h-4"/> Date Picker</div>
                          </SelectItem>
                          <SelectItem value="radio">
                            <div className="flex items-center gap-2"><ListOrdered className="w-4 h-4"/> Multiple Choice</div>
                          </SelectItem>
                          <SelectItem value="photo">
                            <div className="flex items-center gap-2"><Camera className="w-4 h-4"/> Photo Upload</div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {field.type === 'radio' && (
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Options (comma separated)</Label>
                        <Input 
                          value={field.options?.join(', ') || ''} 
                          onChange={(e) => updateField(index, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          placeholder="e.g., Open, Closed, Under Renovation"
                          className="border-slate-200 focus-visible:ring-primary/20"
                        />
                        <p className="text-[11px] text-muted-foreground">These will be rendered as radio buttons in the mobile app.</p>
                      </div>
                    )}
                    
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-2 border-t border-border">
                      <div className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border border-border/50">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Require Photo Proof</Label>
                          <p className="text-[11px] text-muted-foreground">Force user to snap a picture.</p>
                        </div>
                        <Switch 
                          checked={field.requirePhoto !== false} 
                          onCheckedChange={(checked) => updateField(index, { requirePhoto: checked })}
                        />
                      </div>
                      <div className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border border-border/50">
                        <div className="space-y-0.5">
                          <Label className="text-sm font-medium">Require Comments</Label>
                          <p className="text-[11px] text-muted-foreground">Force user to add remarks.</p>
                        </div>
                        <Switch 
                          checked={field.requireComment !== false} 
                          onCheckedChange={(checked) => updateField(index, { requireComment: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {template.schema.length === 0 && (
              <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-2xl bg-white/50 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <ListOrdered className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">No questions yet</h3>
                <p className="text-sm">Click "Add Question" to start building your form.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Mobile Preview Frame */}
        <div className="lg:col-span-4 hidden lg:flex flex-col items-center sticky top-24 pb-10">
          <div className="flex items-center gap-2 mb-4 w-full justify-center">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
            <h4 className="font-semibold text-muted-foreground">Live App Preview</h4>
          </div>

          <div className="relative w-[320px] h-[650px] bg-black rounded-[40px] p-3 shadow-2xl border-4 border-slate-800 shrink-0">
            {/* Notch */}
            <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
              <div className="w-32 h-6 bg-black rounded-b-3xl"></div>
            </div>

            {/* Screen Content */}
            <div className="bg-slate-50 w-full h-full rounded-[30px] overflow-hidden flex flex-col relative">
              {/* App Header */}
              <div className="bg-primary px-4 pt-10 pb-4 text-white shadow-md z-10 shrink-0">
                <h3 className="font-semibold text-base">
                  {template.name || 'New Form'}
                </h3>
                <p className="text-[10px] text-primary-foreground/80">Fill details to start tracking</p>
              </div>

              {/* Form Body inside App */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20 no-scrollbar">
                {template.schema.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground mt-10">Form is empty</div>
                ) : (
                  template.schema.map((field, idx) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-[13px] font-semibold text-slate-800 leading-tight">
                        {idx + 1}. {field.label || 'Untitled Question'}
                        {(field.requirePhoto !== false || field.requireComment !== false) && <span className="text-destructive ml-1">*</span>}
                      </Label>

                      {field.type === 'text' && (
                        <div className="h-10 w-full bg-white border border-slate-200 rounded-md px-3 flex items-center text-[12px] text-muted-foreground shadow-sm">
                          Enter response...
                        </div>
                      )}

                      {field.type === 'photo' && (
                        <div className="h-24 w-full bg-slate-100 border-2 border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center text-slate-400 gap-1 cursor-not-allowed">
                          <Camera className="w-6 h-6" />
                          <span className="text-[10px] font-medium">Tap to snap</span>
                        </div>
                      )}

                      {field.type === 'radio' && (
                        <div className="space-y-2 mt-2">
                          {field.options && field.options.length > 0 ? field.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white p-2 border border-slate-100 rounded-md shadow-sm">
                              <div className="w-4 h-4 rounded-full border border-slate-300 bg-white"></div>
                              <span className="text-[12px] font-medium text-slate-700">{opt}</span>
                            </div>
                          )) : (
                            <div className="text-[11px] italic text-muted-foreground">No options defined</div>
                          )}
                        </div>
                      )}

                      {/* Photo / Comment Toggles Preview */}
                      {(field.requirePhoto !== false || field.requireComment !== false) && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-200/60">
                          {field.requirePhoto !== false && (
                            <div className="flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                              <Camera className="w-3 h-3" /> Photo Reqd
                            </div>
                          )}
                          {field.requireComment !== false && (
                            <div className="flex items-center gap-1 text-[10px] text-primary font-medium bg-primary/10 px-2 py-1 rounded-full">
                              <Type className="w-3 h-3" /> Remarks Reqd
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                
                {/* Global Attachment Preview */}
                {template.schema.length > 0 && (
                  <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200">
                    <Label className="text-[13px] font-semibold text-slate-800">Additional Attachments</Label>
                    <div className="h-16 w-full bg-white border border-slate-200 rounded-md flex items-center justify-center text-slate-400 gap-2 mt-2 shadow-sm">
                      <Plus className="w-4 h-4" />
                      <span className="text-[11px] font-medium">Add File</span>
                    </div>
                  </div>
                )}
              </div>

              {/* App Footer Button */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-8">
                <div className="w-full h-11 bg-primary rounded-xl text-white flex items-center justify-center text-[13px] font-semibold shadow-lg opacity-90">
                  Submit Check-In
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
