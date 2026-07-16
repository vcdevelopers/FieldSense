import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export const ReportDownloader = () => {
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const { toast } = useToast();

  const handleDownload = async (period: string) => {
    setDownloading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const downloadUrl = `${baseUrl}/api/field-tracking/analytics/download-report/?period=${period}`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'X-User-Role': sessionStorage.getItem('userRole') || '',
          'X-User-Id': sessionStorage.getItem('userId') || '',
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to download report");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FieldOps_Report_${period.charAt(0).toUpperCase() + period.slice(1)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Complete",
        description: `Your ${period} report has been downloaded.`,
      });
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading the report.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleEmail = async (period: string) => {
    setEmailing(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const emailUrl = `${baseUrl}/api/field-tracking/analytics/email-report/`;
      
      const response = await fetch(emailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': sessionStorage.getItem('userRole') || '',
          'X-User-Id': sessionStorage.getItem('userId') || '',
        },
        body: JSON.stringify({ period })
      });
      
      if (!response.ok) {
        throw new Error("Failed to email report");
      }
      
      const data = await response.json();
      
      toast({
        title: "Email Sent",
        description: data.message || `Your ${period} report has been emailed to administrators.`,
      });
    } catch (error) {
      console.error("Error emailing report:", error);
      toast({
        title: "Email Failed",
        description: "There was an error sending the report via email.",
        variant: "destructive",
      });
    } finally {
      setEmailing(false);
    }
  };

  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Report
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleDownload("daily")}>Daily Report</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload("weekly")}>Weekly Report</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload("monthly")}>Monthly Report</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload("yearly")}>Yearly Report</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="flex items-center gap-2 bg-[#1b2541] hover:bg-[#2a365c] text-white border-0">
            {emailing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Email Report
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleEmail("daily")}>Email Daily Report</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEmail("weekly")}>Email Weekly Report</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEmail("monthly")}>Email Monthly Report</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleEmail("yearly")}>Email Yearly Report</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
