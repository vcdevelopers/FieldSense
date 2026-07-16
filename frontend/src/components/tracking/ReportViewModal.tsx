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
      let adminTemplates = [];
      try {
        const adminRes = await api.get('/field-tracking/admin/form-templates/');
        adminTemplates = Array.isArray(adminRes) ? adminRes : (adminRes.data || []);
      } catch (e) { console.warn("Could not fetch admin templates", e); }
      
      let siteVisit = null;
      try {
        const visitRes = await api.get('/field-tracking/form-template/');
        siteVisit = visitRes.data || visitRes;
      } catch (e) { console.warn("Could not fetch visit template", e); }
      
      let mom = null;
      try {
        const momRes = await api.get('/field-tracking/mom-form-template/');
        mom = momRes.data || momRes;
      } catch (e) { console.warn("Could not fetch mom template", e); }
      
      const combined = [...adminTemplates];
      if (siteVisit) combined.push({ ...siteVisit, form_type: 'visit', title: 'Site Visit Report' });
      if (mom) combined.push({ ...mom, form_type: 'mom', title: 'Minutes of Meeting (MOM)' });
      
      setAllTemplates(combined);

      // Set the initial template
      let current = null;
      if (reportType === 'visit') current = siteVisit;
      else if (reportType === 'meeting' || reportType === 'mom') current = mom;
      else current = adminTemplates.find((t: any) => t.form_type === reportType || t.id.toString() === reportType);
      
      setTemplate(current);
    } catch (error: any) {
      console.error("Failed to fetch template:", error);
      setErrorMsg(`Fetch error: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const parsedReportData = useMemo(() => {
    if (!reportData) return null;
    
    let finalData = reportData;
    if (typeof reportData === 'string') {
      try {
        finalData = JSON.parse(reportData);
      } catch (e) {
        console.error("Failed to parse reportData string:", e);
        return {};
      }
    }

    // Safely extract if app developer nested the answers inside a 'data' string or object
    if (finalData && finalData.data) {
      if (typeof finalData.data === 'string') {
        try {
          const innerData = JSON.parse(finalData.data);
          finalData = { ...finalData, ...innerData };
        } catch(e) {}
      } else if (typeof finalData.data === 'object') {
        finalData = { ...finalData, ...finalData.data };
      }
    }

    return finalData;
  }, [reportData]);

  const availableTabs = useMemo(() => {
    if (!parsedReportData) return [];
    
    // Check if it's a composite object by looking for known form_types
    const compositeKeys = Object.keys(parsedReportData).filter(key => 
      allTemplates.some(t => t.form_type === key) && typeof parsedReportData[key] === 'object'
    );
    
    if (compositeKeys.length > 0) {
      return compositeKeys.map(key => {
        const t = allTemplates.find(t => t.form_type === key);
        return {
          id: key,
          title: t?.title || t?.name || `Form ${key}`,
          template: t,
          data: parsedReportData[key]
        };
      });
    } else {
      // Legacy flat structure
      return [{
        id: reportType,
        title: template?.title || template?.name || 'Report',
        template: template,
        data: parsedReportData
      }];
    }
  }, [parsedReportData, allTemplates, reportType, template]);

  // Ensure activeTab is valid
  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.some(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

  const activeTabData = availableTabs.find(t => t.id === activeTab);
  const currentTemplate = activeTabData?.template;
  const currentData = activeTabData?.data;

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
                const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
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
