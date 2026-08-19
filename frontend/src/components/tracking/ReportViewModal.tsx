import React, { useState, useEffect, useMemo } from 'react';
import { GlassModal } from "@/components/ui/GlassModal";
import { Button } from "@/components/ui/button";
import { X, FileText, CheckCircle2, AlertCircle, Download, MapPin, Calendar, Clock, User } from "lucide-react";
import { apiClient as api } from '@/services/api';

interface ReportViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: Record<string, any> | null;
  siteName: string;
  attachmentUrl?: string | null;
  reportType?: 'visit' | 'meeting' | 'mom';
  meetingDetails?: any;
}

export function ReportViewModal({ isOpen, onClose, reportData, siteName, attachmentUrl, reportType = 'visit', meetingDetails }: ReportViewModalProps) {
  const [template, setTemplate] = useState<any>(null);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>(reportType);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setActiveTab(reportType);
    }
  }, [isOpen, reportType]);

  const fetchTemplates = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Fetch all templates to support tabs
      let adminTemplates: any[] = [];
      try {
        const adminRes: any = await api.get('/field-tracking/admin/form-templates/');
        const raw = Array.isArray(adminRes) ? adminRes : (adminRes.results || adminRes.data?.results || adminRes.data || []);
        adminTemplates = Array.isArray(raw) ? raw : [];
      } catch (e) { console.warn("Could not fetch admin templates", e); }

      if (adminTemplates.length === 0) {
        try {
          const listRes: any = await api.get('/field-tracking/checklists/');
          const raw = Array.isArray(listRes) ? listRes : (listRes.results || listRes.data?.results || listRes.data || []);
          adminTemplates = Array.isArray(raw) ? raw : [];
        } catch (e) { console.warn("Could not fetch checklists", e); }
      }
      
      let siteVisit = null;
      try {
        const visitRes: any = await api.get('/field-tracking/form-template/');
        siteVisit = visitRes.data || visitRes;
      } catch (e) { console.warn("Could not fetch visit template", e); }
      
      let mom = null;
      try {
        const momRes: any = await api.get('/field-tracking/mom-form-template/');
        mom = momRes.data || momRes;
      } catch (e) { console.warn("Could not fetch mom template", e); }
      
      const momDefault = {
        form_type: 'mom',
        title: 'Minutes of Meeting (MOM)',
        schema: [
          { id: 'mom_purpose', label: 'Meeting Purpose / Objective' },
          { id: 'mom_discussion', label: 'Discussion & Key Points' },
          { id: 'mom_action_items', label: 'Action Items & Next Steps' },
          { id: 'mom_client_feedback', label: 'Client Feedback' },
          { id: 'mom_followup_date', label: 'Follow-up Date' }
        ]
      };

      const combined = [...adminTemplates];
      if (siteVisit && !combined.some(t => t.form_type === 'visit' || t.form_type === 'site_visit')) {
        combined.push({ ...siteVisit, form_type: 'visit', title: siteVisit.title || siteVisit.name || 'Site Visit Report' });
      }
      if (mom) {
        combined.push({ ...mom, form_type: 'mom', title: 'Minutes of Meeting (MOM)', schema: (mom.schema && mom.schema.length > 0) ? mom.schema : momDefault.schema });
      } else {
        combined.push(momDefault);
      }
      
      setAllTemplates(combined);

      // Determine effective initial tab
      const requested = reportType === 'visit' ? 'site_visit' : reportType;
      const initialMatch = combined.find((t: any) => t.form_type === requested || t.id?.toString() === requested || (requested === 'site_visit' && t.form_type === 'visit'));
      
      if (initialMatch) {
        setTemplate(initialMatch);
        setActiveTab(initialMatch.form_type);
      } else if (combined.length > 0) {
        setTemplate(combined[0]);
        setActiveTab(combined[0].form_type);
      }
    } catch (error: any) {
      console.error("Failed to fetch template:", error);
      setErrorMsg(`Fetch error: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const parsedReportData = useMemo(() => {
    const extractAndMerge = (source: any) => {
      if (!source) return {};
      let obj = source;
      if (typeof obj === 'string') {
        try { obj = JSON.parse(obj); } catch { return {}; }
      }
      if (!obj || typeof obj !== 'object') return {};
      
      let res = { ...obj };
      if (obj.data) {
        let inner = obj.data;
        if (Array.isArray(inner) && inner.length > 0) {
          inner = inner[0];
        }
        if (typeof inner === 'string') {
          try { inner = JSON.parse(inner); } catch {}
        }
        if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
          res = { ...res, ...inner };
        }
      }
      return res;
    };

    const d1 = extractAndMerge(reportData);
    const d2 = extractAndMerge(meetingDetails?.visit_report_data || meetingDetails?.visitReportData);
    const d3 = extractAndMerge(meetingDetails?.report_data || meetingDetails?.reportData);

    return { ...d2, ...d3, ...d1 };
  }, [reportData, meetingDetails]);

  const availableTabs = useMemo(() => {
    if (!parsedReportData) return [];
    
    const tabs: any[] = [];
    const keys = Object.keys(parsedReportData);

    // 1. Check for MOM data
    const hasMomData = keys.some(k => k.startsWith('mom_')) || !!parsedReportData.mom;
    const momT = allTemplates.find((t: any) => t.form_type === 'mom') || {
      form_type: 'mom',
      title: 'Minutes of Meeting (MOM)',
      schema: [
        { id: 'mom_purpose', label: 'Meeting Purpose / Objective' },
        { id: 'mom_discussion', label: 'Discussion & Key Points' },
        { id: 'mom_action_items', label: 'Action Items & Next Steps' },
        { id: 'mom_client_feedback', label: 'Client Feedback' },
        { id: 'mom_followup_date', label: 'Follow-up Date' }
      ]
    };

    if (hasMomData || meetingDetails?.taskType === 'Meeting') {
      tabs.push({
        id: 'mom',
        title: momT.title || momT.name || 'Minutes of Meeting (MOM)',
        template: momT,
        data: parsedReportData.mom && typeof parsedReportData.mom === 'object' ? parsedReportData.mom : parsedReportData
      });
    }

    // 2. Check for each FormTemplate (Custom Forms, Training Report, Site Visit Report)
    allTemplates.forEach((t: any) => {
      if (t.form_type === 'mom') return;
      
      const schemaFieldIds = (t.schema || []).map((f: any) => f.id || f.name).filter(Boolean);
      const isMatchedByFields = schemaFieldIds.some((fId: string) => 
        keys.includes(fId) || keys.some(k => k.startsWith(`photo_${fId}`) || k.includes(fId))
      );
      const isMatchedBySlug = !!parsedReportData[t.form_type];

      if (isMatchedByFields || isMatchedBySlug) {
        tabs.push({
          id: t.form_type,
          title: t.title || t.name || `Checklist (${t.form_type})`,
          template: t,
          data: parsedReportData[t.form_type] && typeof parsedReportData[t.form_type] === 'object' 
            ? parsedReportData[t.form_type] 
            : parsedReportData
        });
      }
    });

    // Fallback: If non-MOM keys exist but no custom template matched, create a Checklist tab
    const nonMomKeys = keys.filter(k => !k.startsWith('mom_') && k !== 'mom' && k !== 'data');
    if (nonMomKeys.length > 0 && !tabs.some(t => t.id !== 'mom')) {
      const fallbackT = allTemplates.find((t: any) => t.form_type !== 'mom') || {
        form_type: 'checklist',
        title: 'Checklist Report',
        schema: nonMomKeys.map(k => ({ id: k, label: k.replace(/^photo_/, 'Photo: ').replace(/_/g, ' ') }))
      };
      tabs.push({
        id: fallbackT.form_type || 'checklist',
        title: fallbackT.title || fallbackT.name || 'Checklist Report',
        template: fallbackT,
        data: parsedReportData
      });
    }

    if (tabs.length === 0) {
      tabs.push({
        id: reportType || 'report',
        title: template?.title || template?.name || 'Report',
        template: template,
        data: parsedReportData
      });
    }

    return tabs;
  }, [parsedReportData, allTemplates, reportType, template, meetingDetails]);

  // Sync template with activeTab
  useEffect(() => {
    if (availableTabs.length > 0) {
      const match = availableTabs.find(t => t.id === activeTab);
      if (match) {
        setTemplate(match.template);
      } else {
        const fallback = availableTabs[0];
        setActiveTab(fallback.id);
        setTemplate(fallback.template);
      }
    }
  }, [availableTabs, activeTab]);

  const activeTabData = availableTabs.find(t => t.id === activeTab) || availableTabs[0];
  const currentTemplate = activeTabData?.template || template;
  const currentData = activeTabData?.data || parsedReportData;

  if (!isOpen) return null;

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Checklist Report"
      subtitle={`Submitted reports for ${siteName}`}
      size="lg"
      footerContent={<Button onClick={onClose}>Close</Button>}
    >
      <div className="p-2">
        {loading ? (
          <p className="text-center py-8">Loading report structure...</p>
        ) : errorMsg ? (
          <div className="flex flex-col items-center justify-center py-8 text-red-500">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p>Error: {errorMsg}</p>
          </div>
        ) : (!parsedReportData || Object.keys(parsedReportData).length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No Form Data Submitted</p>
            <p className="text-sm">The employee checked in but did not submit a form.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tabs Navigation */}
            {availableTabs.length > 1 && (
              <div className="flex space-x-2 border-b border-border mb-4 overflow-x-auto pb-2">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {tab.title}
                  </button>
                ))}
              </div>
            )}
            {(activeTab === 'meeting' || activeTab === 'mom' || activeTab === 'visit') && meetingDetails && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                <div className="flex items-start gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">01 Meeting Information</h3>
                    <p className="text-xs text-slate-500">Core meeting context and scheduling details</p>
                  </div>
                </div>
                
                {(() => {
                  const tStart = meetingDetails.rawStartTime || meetingDetails.startTime;
                  const dStart = new Date(tStart);
                  const isValidStart = !isNaN(dStart.getTime());

                  const tEnd = meetingDetails.rawEndTime || meetingDetails.endTime;
                  const dEnd = new Date(tEnd);
                  const isValidEnd = !isNaN(dEnd.getTime());

                  const displayDate = isValidStart ? dStart.toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
                  const displayStartTime = isValidStart ? dStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : (tStart || 'N/A');
                  const displayEndTime = isValidEnd ? dEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : (tEnd || 'N/A');

                  return (
                    <div className="grid grid-cols-2 gap-4 p-5 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Client Name</p>
                        <p className="font-medium text-slate-800 px-3 py-2 bg-slate-50 rounded border border-slate-100">
                          {meetingDetails.clientName || meetingDetails.client_name || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Site Name</p>
                        <p className="font-medium text-slate-800 px-3 py-2 bg-slate-50 rounded border border-slate-100">
                          {siteName || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Location</p>
                        <p className="font-medium text-slate-800 px-3 py-2 bg-slate-50 rounded border border-slate-100 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {meetingDetails.location || 'Location details available in app'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Meeting Date</p>
                        <p className="font-medium text-slate-800 px-3 py-2 bg-slate-50 rounded border border-slate-100 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {displayDate}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Start Time</p>
                        <p className="font-medium text-slate-800 px-3 py-2 bg-slate-50 rounded border border-slate-100 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {displayStartTime}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">End Time</p>
                        <p className="font-medium text-slate-800 px-3 py-2 bg-slate-50 rounded border border-slate-100 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {displayEndTime}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Meeting Type</p>
                        <p className="font-medium text-slate-800 px-3 py-2 bg-slate-50 rounded border border-slate-100">
                          {meetingDetails.taskType === 'Meeting' ? 'Ad-hoc Meeting' : meetingDetails.taskType || 'Meeting'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Prepared By</p>
                        <p className="font-medium text-slate-800 px-3 py-2 bg-slate-50 rounded border border-slate-100 flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {meetingDetails.employeeName || sessionStorage.getItem('userName') || 'Employee'}
                        </p>
                      </div>
                      
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 mb-1">Meeting Status</p>
                        <p className="font-medium text-slate-800 px-3 py-2 bg-slate-50 rounded border border-slate-100 inline-block">
                          {meetingDetails.status || 'Completed'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {currentTemplate?.schema?.map((field: any, index: number) => {
              let value = currentData ? currentData[field.id] : null;
              let comment = currentData ? currentData[`${field.id}_comment`] : null;
              let photo = currentData ? (currentData[`${field.id}_photo`] || currentData[`photo_${field.id}`]) : null;
              
              // App developer sent { answer: "...", comment: "..." } inside the field key
              if (value && typeof value === 'object' && value.answer !== undefined) {
                comment = value.comment || comment;
                photo = value.photo || photo;
                value = value.answer;
              }

              const isValidPhoto = photo && typeof photo === 'string' && photo !== 'null' && photo !== 'undefined';

              const getPhotoUrl = (url: string) => {
                if (!url || typeof url !== 'string' || url === 'null' || url === 'undefined') return '';
                if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) return url;
                const baseUrl = import.meta.env.VITE_API_URL || 'https://fieldops.vibecopilot.ai';
                return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
              };
              
              return (
                <div key={field.id} className="p-4 bg-muted/30 rounded-xl border border-white/5 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      {index + 1}. {field.label}
                    </p>
                    {value ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                        <p className="text-sm font-medium">{value}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No answer provided</p>
                    )}
                  </div>
                  
                  {isValidPhoto && (
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-xs font-semibold text-slate-500 mb-2">Photo Proof</p>
                      <div className="rounded-lg overflow-hidden border border-border max-w-xs bg-slate-100 flex items-center justify-center min-h-[100px]">
                        <img 
                          src={getPhotoUrl(photo)} 
                          alt={`${field.label} Proof`} 
                          className="w-full h-auto object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = '<p class="text-xs text-slate-400 p-4">Image failed to load</p>';
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {comment && (
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-xs font-semibold text-slate-500 mb-1">Comment / Remarks</p>
                      <p className="text-sm text-slate-700 bg-white/50 p-3 rounded-lg border border-border">{comment}</p>
                    </div>
                  )}
                </div>
              );
            })}
            
            {!currentTemplate && (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p>Template details not found for this checklist.</p>
              </div>
            )}

          </div>
        )}
      </div>
    </GlassModal>
  );
}
