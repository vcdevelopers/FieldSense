import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { X, Users, CheckCircle, BarChart3, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/services/api";

interface ClientMeetingAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
}

export function ClientMeetingAnalyticsModal({
  isOpen,
  onClose,
  clientName,
}: ClientMeetingAnalyticsModalProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["clientMeetingAnalytics", clientName],
    queryFn: async () => {
      return apiClient.get(`/field-tracking/analytics/client-meetings/?client_name=${encodeURIComponent(clientName)}`);
    },
    enabled: isOpen && !!clientName,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card border border-border shadow-2xl w-full max-w-2xl rounded-xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold font-display text-foreground">
                        {clientName}
                      </h2>
                      <p className="text-sm text-muted-foreground">Meeting Analytics & Stats</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-destructive/10 hover:text-destructive">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground">Analyzing client data...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-10">
                    <p className="text-destructive font-medium">Failed to load analytics.</p>
                    <p className="text-sm text-muted-foreground mt-1">Please ensure the client name is correct.</p>
                  </div>
                ) : data ? (
                  <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <BarChart3 className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground font-medium">Total Meetings Created</p>
                            <p className="text-3xl font-bold text-primary">{data.total_created}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-success/5 border-success/20">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center shrink-0">
                            <CheckCircle className="w-6 h-6 text-success" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground font-medium">Total Attended</p>
                            <p className="text-3xl font-bold text-success">{data.total_attended}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Involved Employees */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Involved Employees
                      </h3>
                      <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                        {data.involved_employees && data.involved_employees.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {data.involved_employees.map((empName: string, index: number) => (
                              <Badge key={index} variant="secondary" className="px-3 py-1 text-sm font-medium">
                                {empName}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No employees found for this search.</p>
                        )}
                      </div>
                    </div>

                    {/* Involved Clients */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        Associated Clients
                      </h3>
                      <div className="bg-muted/30 border border-border/50 rounded-lg p-4">
                        {data.involved_clients && data.involved_clients.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {data.involved_clients.map((cName: string, index: number) => (
                              <Badge key={index} variant="outline" className="px-3 py-1 text-sm font-medium border-primary/30 text-primary">
                                {cName}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No clients found for this search.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
