import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, BellRing, CheckCircle2 } from "lucide-react";
import { apiClient as api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface OverdueMeeting {
  id: number;
  title: string;
  client: string;
  employee_name: string;
  end_time: string;
}

export function OverdueMOMAlerts() {
  const [overdueMeetings, setOverdueMeetings] = useState<OverdueMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => {
    fetchOverdueMeetings();
  }, []);

  const fetchOverdueMeetings = async () => {
    try {
      const data = await api.get('/field-tracking/reminders/overdue-moms/');
      if (data) {
        setOverdueMeetings(data);
      }
    } catch (error) {
      console.error("Failed to fetch overdue meetings", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (meetingId: number) => {
    setSendingId(meetingId);
    try {
      const res = await api.post('/field-tracking/reminders/overdue-moms/', { meeting_id: meetingId });
      if (res) {
        setOverdueMeetings(prev => prev.filter(m => m.id !== meetingId));
      }
    } catch (error) {
      console.error("Failed to send reminder", error);
    } finally {
      setSendingId(null);
    }
  };

  if (loading || overdueMeetings.length === 0) return null;

  return (
    <Card className="border-destructive/30 shadow-sm bg-destructive/5 overflow-hidden mb-6">
      <div className="bg-destructive/10 px-4 py-3 border-b border-destructive/20 flex items-center gap-2 text-destructive font-semibold">
        <AlertCircle className="w-5 h-5" />
        <span>Overdue MOMs (&gt;24 Hours)</span>
        <div className="ml-auto bg-destructive text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {overdueMeetings.length} Pending
        </div>
      </div>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50 max-h-[300px] overflow-y-auto">
          <AnimatePresence>
            {overdueMeetings.map(meeting => (
              <motion.div
                key={meeting.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-black/5 transition-colors"
              >
                <div>
                  <h4 className="font-semibold text-sm text-foreground">{meeting.employee_name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Missed MOM for <span className="font-medium text-slate-700">{meeting.title}</span> ({meeting.client})
                  </p>
                  <p className="text-[10px] text-destructive/80 mt-1 font-medium">
                    Meeting ended at: {new Date(meeting.end_time).toLocaleString()}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white shrink-0 shadow-sm"
                  onClick={() => handleSendReminder(meeting.id)}
                  disabled={sendingId === meeting.id}
                >
                  {sendingId === meeting.id ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <BellRing className="w-4 h-4" />
                      Send Reminder
                    </>
                  )}
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
