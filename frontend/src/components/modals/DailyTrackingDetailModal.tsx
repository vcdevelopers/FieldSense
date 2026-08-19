import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  User,
  Clock,
  MapPin,
  Navigation,
  Activity,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Phone,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Briefcase,
  Building2,
  Target,
  Search,
  Filter,
  ImageIcon, // Changed from Image to ImageIcon
  Paperclip,
  Fuel,
  IndianRupee,
  Utensils,
  Wallet,
  Receipt,
  ZoomIn,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import api from "@/lib/api";
import { RouteReplayMap } from "@/components/tracking/RouteReplayMap";
import { ReportViewModal } from "@/components/tracking/ReportViewModal";
import { generateSiteVisitPDF, generateMOMPDF, generateTrainingReportPDF } from "@/utils/pdfChecklistGenerator";

interface VendorContact {
  name: string;
  phone: string;
  isVerified: boolean;
}

interface TaskEntry {
  id: string;
  taskName: string;
  taskType: "Call" | "Visit" | "Follow-up" | "Issue" | "Other";
  startTime: string;
  endTime: string | null;
  status: "Pending" | "Completed" | "In Progress" | "Escalated";
  proofSubmitted: boolean;
  proofUrl?: string;
  reportData?: any;
  visitReportData?: any;
  notes: string;
  clientName?: string;
  location?: string;
  coordinates?: { lat: number; lng: number };
  distance?: number;
  fuelExpense?: number;
  foodExpense?: number;
  vendorContact?: VendorContact;
  isoTime?: string;
  reportType?: string;

}

interface DailyExpenses {
  foodAllowance: number;
  totalFuelExpense: number;
  totalFoodExpense: number;
  miscExpense: number;
  totalExpense: number;
}

interface EmployeeDetails {
  id: string;
  name: string;
  role: string;
  department: string;
  checkInTime: string;
  checkOutTime: string | null;
  workMode: "Field" | "Office" | "Hybrid";
  currentStatus: "Active" | "Idle" | "Offline";
  avatar?: string;
  currentLocation?: { lat: number; lng: number; address: string };
}

interface PerformanceMetrics {
  totalDistance: number;
  idleTime: number;
  planVsActual: number;
  tasksCompleted: number;
  totalTasks: number;
  avgTaskDuration: number;
  punctualityScore: number;
}

interface DailyTrackingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeData: any;
  date: string;
}



const mockFuelReceipts: MockReceipt[] = [
  {
    id: "fuel-1",
    preview: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect fill='%23fff' width='200' height='280'/%3E%3Crect fill='%23f59e0b' x='10' y='10' width='180' height='40' rx='4'/%3E%3Ctext x='100' y='38' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold' font-size='16'%3EINDIAN OIL%3C/text%3E%3Ctext x='100' y='80' text-anchor='middle' fill='%23374151' font-family='Arial' font-size='12'%3EFuel Receipt%3C/text%3E%3Cline x1='20' y1='95' x2='180' y2='95' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='120' fill='%23374151' font-family='Arial' font-size='11'%3EDate: 18-Jan-2026%3C/text%3E%3Ctext x='30' y='140' fill='%23374151' font-family='Arial' font-size='11'%3ETime: 08:15 AM%3C/text%3E%3Ctext x='30' y='160' fill='%23374151' font-family='Arial' font-size='11'%3EVehicle: MP-09-XY-1234%3C/text%3E%3Cline x1='20' y1='175' x2='180' y2='175' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='200' fill='%23374151' font-family='Arial' font-size='11'%3EPetrol (5.2L)%3C/text%3E%3Ctext x='170' y='200' text-anchor='end' fill='%23374151' font-family='Arial' font-size='11'%3E₹520.00%3C/text%3E%3Cline x1='20' y1='215' x2='180' y2='215' stroke='%23374151' stroke-width='2'/%3E%3Ctext x='30' y='240' fill='%23374151' font-family='Arial' font-weight='bold' font-size='14'%3ETOTAL%3C/text%3E%3Ctext x='170' y='240' text-anchor='end' fill='%23f59e0b' font-family='Arial' font-weight='bold' font-size='14'%3E₹520.00%3C/text%3E%3Ctext x='100' y='270' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='9'%3EThank You! Visit Again%3C/text%3E%3C/svg%3E",
    amount: 520,
    vendor: "Indian Oil - Indore",
    time: "08:15 AM"
  },
  {
    id: "fuel-2",
    preview: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect fill='%23fff' width='200' height='280'/%3E%3Crect fill='%2322c55e' x='10' y='10' width='180' height='40' rx='4'/%3E%3Ctext x='100' y='38' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold' font-size='14'%3EHP PETROLEUM%3C/text%3E%3Ctext x='100' y='80' text-anchor='middle' fill='%23374151' font-family='Arial' font-size='12'%3EFuel Receipt%3C/text%3E%3Cline x1='20' y1='95' x2='180' y2='95' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='120' fill='%23374151' font-family='Arial' font-size='11'%3EDate: 18-Jan-2026%3C/text%3E%3Ctext x='30' y='140' fill='%23374151' font-family='Arial' font-size='11'%3ETime: 02:45 PM%3C/text%3E%3Ctext x='30' y='160' fill='%23374151' font-family='Arial' font-size='11'%3EVehicle: MP-09-XY-1234%3C/text%3E%3Cline x1='20' y1='175' x2='180' y2='175' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='200' fill='%23374151' font-family='Arial' font-size='11'%3EPetrol (1.7L)%3C/text%3E%3Ctext x='170' y='200' text-anchor='end' fill='%23374151' font-family='Arial' font-size='11'%3E₹170.00%3C/text%3E%3Cline x1='20' y1='215' x2='180' y2='215' stroke='%23374151' stroke-width='2'/%3E%3Ctext x='30' y='240' fill='%23374151' font-family='Arial' font-weight='bold' font-size='14'%3ETOTAL%3C/text%3E%3Ctext x='170' y='240' text-anchor='end' fill='%2322c55e' font-family='Arial' font-weight='bold' font-size='14'%3E₹170.00%3C/text%3E%3Ctext x='100' y='270' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='9'%3EThank You! Visit Again%3C/text%3E%3C/svg%3E",
    amount: 170,
    vendor: "HP Petroleum - Dewas",
    time: "02:45 PM"
  }
];

const mockFoodReceipts: MockReceipt[] = [
  {
    id: "food-1",
    preview: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect fill='%23fff' width='200' height='300'/%3E%3Crect fill='%238b5cf6' x='10' y='10' width='180' height='45' rx='4'/%3E%3Ctext x='100' y='28' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold' font-size='14'%3EKRISHI DHABA%3C/text%3E%3Ctext x='100' y='45' text-anchor='middle' fill='%23e9d5ff' font-family='Arial' font-size='10'%3EPure Veg Restaurant%3C/text%3E%3Ctext x='100' y='85' text-anchor='middle' fill='%23374151' font-family='Arial' font-size='12'%3EBill No: KD-2856%3C/text%3E%3Cline x1='20' y1='100' x2='180' y2='100' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='125' fill='%23374151' font-family='Arial' font-size='11'%3EDate: 18-Jan-2026%3C/text%3E%3Ctext x='30' y='145' fill='%23374151' font-family='Arial' font-size='11'%3ETime: 01:30 PM%3C/text%3E%3Cline x1='20' y1='160' x2='180' y2='160' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='185' fill='%23374151' font-family='Arial' font-size='11'%3EThali (Full)%3C/text%3E%3Ctext x='170' y='185' text-anchor='end' fill='%23374151' font-family='Arial' font-size='11'%3E₹80.00%3C/text%3E%3Ctext x='30' y='205' fill='%23374151' font-family='Arial' font-size='11'%3EChaas%3C/text%3E%3Ctext x='170' y='205' text-anchor='end' fill='%23374151' font-family='Arial' font-size='11'%3E₹20.00%3C/text%3E%3Cline x1='20' y1='220' x2='180' y2='220' stroke='%23374151' stroke-width='2'/%3E%3Ctext x='30' y='245' fill='%23374151' font-family='Arial' font-weight='bold' font-size='14'%3ETOTAL%3C/text%3E%3Ctext x='170' y='245' text-anchor='end' fill='%238b5cf6' font-family='Arial' font-weight='bold' font-size='14'%3E₹100.00%3C/text%3E%3Ctext x='100' y='275' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='9'%3EThank You! Jai Kisaan%3C/text%3E%3C/svg%3E",
    amount: 100,
    vendor: "Krishi Dhaba - Rau",
    time: "01:30 PM"
  },
  {
    id: "food-2",
    preview: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect fill='%23fff' width='200' height='300'/%3E%3Crect fill='%23ef4444' x='10' y='10' width='180' height='45' rx='4'/%3E%3Ctext x='100' y='28' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold' font-size='14'%3EMANDI CANTEEN%3C/text%3E%3Ctext x='100' y='45' text-anchor='middle' fill='%23fecaca' font-family='Arial' font-size='10'%3EKrishi Mandi, Indore%3C/text%3E%3Ctext x='100' y='85' text-anchor='middle' fill='%23374151' font-family='Arial' font-size='12'%3EBill No: MC-1124%3C/text%3E%3Cline x1='20' y1='100' x2='180' y2='100' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='125' fill='%23374151' font-family='Arial' font-size='11'%3EDate: 18-Jan-2026%3C/text%3E%3Ctext x='30' y='145' fill='%23374151' font-family='Arial' font-size='11'%3ETime: 10:00 AM%3C/text%3E%3Cline x1='20' y1='160' x2='180' y2='160' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='185' fill='%23374151' font-family='Arial' font-size='11'%3ETea x2%3C/text%3E%3Ctext x='170' y='185' text-anchor='end' fill='%23374151' font-family='Arial' font-size='11'%3E₹30.00%3C/text%3E%3Ctext x='30' y='205' fill='%23374151' font-family='Arial' font-size='11'%3ESamosa x2%3C/text%3E%3Ctext x='170' y='205' text-anchor='end' fill='%23374151' font-family='Arial' font-size='11'%3E₹40.00%3C/text%3E%3Cline x1='20' y1='220' x2='180' y2='220' stroke='%23374151' stroke-width='2'/%3E%3Ctext x='30' y='245' fill='%23374151' font-family='Arial' font-weight='bold' font-size='14'%3ETOTAL%3C/text%3E%3Ctext x='170' y='245' text-anchor='end' fill='%23ef4444' font-family='Arial' font-weight='bold' font-size='14'%3E₹70.00%3C/text%3E%3Ctext x='100' y='275' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='9'%3EThank You!%3C/text%3E%3C/svg%3E",
    amount: 70,
    vendor: "Mandi Canteen - Indore",
    time: "10:00 AM"
  },
  {
    id: "food-3",
    preview: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'%3E%3Crect fill='%23fff' width='200' height='300'/%3E%3Crect fill='%2306b6d4' x='10' y='10' width='180' height='45' rx='4'/%3E%3Ctext x='100' y='28' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold' font-size='14'%3EUJJAIN BHOJNALAYA%3C/text%3E%3Ctext x='100' y='45' text-anchor='middle' fill='%23cffafe' font-family='Arial' font-size='10'%3ESatvik Food%3C/text%3E%3Ctext x='100' y='85' text-anchor='middle' fill='%23374151' font-family='Arial' font-size='12'%3EBill No: UB-4521%3C/text%3E%3Cline x1='20' y1='100' x2='180' y2='100' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='125' fill='%23374151' font-family='Arial' font-size='11'%3EDate: 18-Jan-2026%3C/text%3E%3Ctext x='30' y='145' fill='%23374151' font-family='Arial' font-size='11'%3ETime: 04:15 PM%3C/text%3E%3Cline x1='20' y1='160' x2='180' y2='160' stroke='%23e5e7eb' stroke-width='1'/%3E%3Ctext x='30' y='185' fill='%23374151' font-family='Arial' font-size='11'%3EPoha%3C/text%3E%3Ctext x='170' y='185' text-anchor='end' fill='%23374151' font-family='Arial' font-size='11'%3E₹35.00%3C/text%3E%3Ctext x='30' y='205' fill='%23374151' font-family='Arial' font-size='11'%3EJalebi (250g)%3C/text%3E%3Ctext x='170' y='205' text-anchor='end' fill='%23374151' font-family='Arial' font-size='11'%3E₹45.00%3C/text%3E%3Cline x1='20' y1='220' x2='180' y2='220' stroke='%23374151' stroke-width='2'/%3E%3Ctext x='30' y='245' fill='%23374151' font-family='Arial' font-weight='bold' font-size='14'%3ETOTAL%3C/text%3E%3Ctext x='170' y='245' text-anchor='end' fill='%2306b6d4' font-family='Arial' font-weight='bold' font-size='14'%3E₹80.00%3C/text%3E%3Ctext x='100' y='275' text-anchor='middle' fill='%236b7280' font-family='Arial' font-size='9'%3EShubh Yatra!%3C/text%3E%3C/svg%3E",
    amount: 80,
    vendor: "Ujjain Bhojnalaya",
    time: "04:15 PM"
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Completed":
      return "bg-success/10 text-success border-success/20";
    case "Pending":
      return "bg-warning/10 text-warning border-warning/20";
    case "In Progress":
      return "bg-primary/10 text-primary border-primary/20";
    case "Upcoming":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "Delayed":
      return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "Escalated":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getTaskTypeIcon = (type: TaskEntry["taskType"]) => {
  switch (type) {
    case "Call":
      return Phone;
    case "Visit":
      return MapPin;
    case "Follow-up":
      return Activity;
    case "Issue":
      return AlertTriangle;
    default:
      return FileText;
  }
};

const getStatusIcon = (status: EmployeeDetails["currentStatus"]) => {
  switch (status) {
    case "Active":
      return "bg-success";
    case "Idle":
      return "bg-warning";
    case "Offline":
      return "bg-muted-foreground";
  }
};

export function DailyTrackingDetailModal({
  isOpen,
  onClose,
  employeeData,
  date,
}: DailyTrackingDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<TaskEntry | null>(null);
  const [viewingReportTask, setViewingReportTask] = useState<TaskEntry | null>(null);

  // Receipt preview state (admin view-only mode)
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [currentStopIndex, setCurrentStopIndex] = useState(-1);
  const replayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [realEta, setRealEta] = useState<string | null>(null);
  const [startLocationName, setStartLocationName] = useState<string>("--");
  const [endLocationName, setEndLocationName] = useState<string>("--");

  useEffect(() => {
    const tl = employeeData?.timeline;
    if (!tl || tl.length === 0 || !window.google) {
      setStartLocationName("--");
      setEndLocationName("--");
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    
    const firstEvent = tl[0];
    const sLat = firstEvent.start_lat || firstEvent.lat;
    const sLng = firstEvent.start_lng || firstEvent.lng;

    if (sLat && sLng) {
      setStartLocationName("Fetching...");
      geocoder.geocode({ location: { lat: Number(sLat), lng: Number(sLng) } }, (results, status) => {
        if (status === "OK" && results[0]) {
          const parts = results[0].formatted_address.split(',');
          setStartLocationName(parts.slice(0, 2).join(','));
        } else {
          setStartLocationName("Location not found");
        }
      });
    } else {
      setStartLocationName("--");
    }

    const lastEvent = tl[tl.length - 1];
    if (lastEvent.status === 'Completed' || lastEvent.status === 'Closed' || lastEvent.status === 'Verified' || tl.length > 1) {
      const eLat = lastEvent.end_lat || lastEvent.start_lat || lastEvent.lat;
      const eLng = lastEvent.end_lng || lastEvent.start_lng || lastEvent.lng;

      if (eLat && eLng) {
        setEndLocationName("Fetching...");
        geocoder.geocode({ location: { lat: Number(eLat), lng: Number(eLng) } }, (results, status) => {
          if (status === "OK" && results[0]) {
            const parts = results[0].formatted_address.split(',');
            setEndLocationName(parts.slice(0, 2).join(','));
          } else {
            setEndLocationName("Location not found");
          }
        });
      } else {
        setEndLocationName("--");
      }
    } else {
      setEndLocationName("--");
    }
  }, [employeeData]);

  useEffect(() => {
    const tl = employeeData?.timeline;
    if (!tl || !window.google) return;
    
    const activeMeeting = tl.find((t: any) => t.status === 'In Progress' || t.status === 'Upcoming');
    const employeeLoc = employeeData?.current_location;
    
    if (activeMeeting && employeeLoc && employeeLoc.lat && activeMeeting.lat) {
      const service = new window.google.maps.DistanceMatrixService();
      
      service.getDistanceMatrix({
        origins: [{ lat: Number(employeeLoc.lat), lng: Number(employeeLoc.lng) }],
        destinations: [{ lat: Number(activeMeeting.lat), lng: Number(activeMeeting.lng) }],
        travelMode: window.google.maps.TravelMode.DRIVING,
      }, (response, status) => {
        if (status === 'OK' && response && response.rows[0].elements[0].status === 'OK') {
          const element = response.rows[0].elements[0];
          setRealEta(`ETA: ${element.duration.text} (${element.distance.text})`);
        }
      });
    } else {
      setRealEta(null);
    }
  }, [employeeData]);

  const isLoading = false;

  const employee = employeeData ? {
    id: employeeData.employee_id,
    name: employeeData.employee_name,
    role: employeeData.role || "Employee",
    department: "Sales",
    checkInTime: employeeData.timeline?.[0] ? new Date(employeeData.timeline[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--",
    checkOutTime: (() => {
      const tl = employeeData.timeline;
      if (!tl || tl.length === 0) return null;
      const lastEvent = tl[tl.length - 1];
      
      if (lastEvent.status === 'Completed' || lastEvent.status === 'Closed' || lastEvent.status === 'Verified' || tl.length > 1) {
        if (lastEvent.end_time) {
          return new Date(lastEvent.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return new Date(lastEvent.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return null;
    })(),
    travelTime: (() => {
      const tl = employeeData.timeline;
      if (!tl || tl.length === 0) return "--";
      
      // Check if traveling to an active meeting
      const activeMeeting = tl.find((t: any) => t.status === 'In Progress' || t.status === 'Upcoming');
      if (activeMeeting) {
        if (realEta) return realEta; // Use Google Maps API ETA if available
        
        const dist = activeMeeting.distance_km || 0;
        if (dist > 0) {
           const etaMins = Math.round((dist / 30) * 60); // Assume 30 km/h average speed in city
           return `ETA: ~${etaMins} mins`;
        }
        const start = new Date(activeMeeting.start_time || activeMeeting.time).getTime();
        const now = new Date().getTime();
        const diffMins = Math.round((now - start) / 60000);
        return `Elapsed: ${diffMins > 0 ? diffMins : 1} mins`;
      }
      
      // If no active meeting, show last completed journey travel time
      const lastCompleted = [...tl].reverse().find((t: any) => t.status === 'Completed' || t.status === 'Closed' || t.status === 'Verified');
      if (lastCompleted) {
        const start = new Date(lastCompleted.start_time || lastCompleted.time).getTime();
        const end = lastCompleted.end_time ? new Date(lastCompleted.end_time).getTime() : start + (45 * 60000);
        const diffMins = Math.round((end - start) / 60000);
        return `${diffMins > 0 ? diffMins : 1} mins`;
      }
      return "--";
    })(),
    workMode: "Field",
    currentStatus: employeeData.status || "Offline",
    currentLocation: employeeData.current_location,
  } : {
    id: "1", name: "Unknown", role: "Unknown", department: "Unknown", checkInTime: "--", checkOutTime: null, workMode: "Field", currentStatus: "Offline", currentLocation: undefined
  } as any;

  const tasks = employeeData?.timeline?.map((t: any) => ({
    id: t.id,
    taskName: t.type === 'Meeting' ? t.site_name : `Check-in: ${t.site_name?.split(',')[0] || 'Unknown Location'}`,
    taskType: t.type,
    startTime: new Date(t.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    endTime: t.end_time ? new Date(t.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
    status: t.status,
    proofSubmitted: !!t.attachment_url || !!t.report_data,
    proofUrl: t.attachment_url,
    reportData: t.report_data,
    visitReportData: t.visit_report_data,
    reportType: t.report_type,
    notes: t.notes || (t.client_name ? `Client: ${t.client_name}` : ''),
    clientName: t.client_name,
    location: t.site_name,
    isoTime: t.time,
    distance: t.distance_km || 0,
    fuelExpense: t.fuel_cost || 0,
    fuelApproved: t.fuel_approved,
    coordinates: (t.lat || t.start_lat) ? { lat: Number(t.lat || t.start_lat), lng: Number(t.lng || t.start_lng) } : undefined,
    isMeeting: t.type === 'Meeting'
  })) || [];

  const completedCount = tasks.filter((t: any) => t.status === 'Completed' || t.status === 'Closed').length;
  const totalCount = tasks.length;
  const actualDistance = tasks.reduce((acc: number, t: any) => acc + (t.distance || 0), 0);
  const totalFuel = tasks.reduce((acc: number, t: any) => acc + (t.fuelExpense || 0), 0);
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const metrics = {
    totalDistance: employeeData?.total_distance || actualDistance,
    idleTime: employeeData?.timeline?.length > 0 ? Math.floor(employeeData.timeline.length * 15) : 0, // Mocked 15 mins per event
    planVsActual: completionRate,
    tasksCompleted: completedCount,
    totalTasks: totalCount,
    avgTaskDuration: completedCount > 0 ? 30 : 0, // Estimated avg minutes
    punctualityScore: completedCount > 0 ? 95 : 100, // Estimated
  };
  const dailyExpenses = {
    totalFuelExpense: totalFuel,
    foodAllowance: 0,
    totalFoodExpense: 0,
    miscExpense: 0,
    totalExpense: totalFuel
  } as any;

  // Route stops for replay animation
  const routeStops = tasks.filter((t: TaskEntry) => t.coordinates).map((task: TaskEntry, index: number) => ({
    id: task.id,
    name: task.taskName,
    location: task.location || 'Unknown',
    time: task.startTime,
    endTime: task.endTime,
    status: task.status,
    position: [
      { left: 10, top: 75 },
      { left: 30, top: 45 },
      { left: 50, top: 35 },
      { left: 70, top: 28 },
      { left: 85, top: 22 },
    ][index % 5] || { left: 50, top: 50 }, // Fallback for extra points
    distance: task.distance || 0,
  }));

  // Calculate current position based on replay progress
  const getCurrentReplayPosition = () => {
    if (routeStops.length === 0) return { left: 10, top: 75 };

    const totalStops = routeStops.length;
    const progressPerStop = 100 / totalStops;
    const currentIndex = Math.min(Math.floor(replayProgress / progressPerStop), totalStops - 1);
    const nextIndex = Math.min(currentIndex + 1, totalStops - 1);

    const stopProgress = (replayProgress % progressPerStop) / progressPerStop;

    const currentPos = routeStops[currentIndex].position;
    const nextPos = routeStops[nextIndex].position;

    return {
      left: currentPos.left + (nextPos.left - currentPos.left) * stopProgress,
      top: currentPos.top + (nextPos.top - currentPos.top) * stopProgress,
    };
  };

  // Replay controls
  const startReplay = () => {
    setIsPlaying(true);
  };

  const pauseReplay = () => {
    setIsPlaying(false);
  };

  const resetReplay = () => {
    setIsPlaying(false);
    setReplayProgress(0);
    setCurrentStopIndex(-1);
  };

  const skipToStop = (index: number) => {
    const progressPerStop = 100 / routeStops.length;
    setReplayProgress(index * progressPerStop);
    setCurrentStopIndex(index);
  };

  // Replay animation effect
  useEffect(() => {
    if (isPlaying) {
      replayIntervalRef.current = setInterval(() => {
        setReplayProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + (0.5 * replaySpeed);
        });
      }, 50);
    } else {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    }

    return () => {
      if (replayIntervalRef.current) {
        clearInterval(replayIntervalRef.current);
      }
    };
  }, [isPlaying, replaySpeed]);

  // Update current stop index based on progress
  useEffect(() => {
    if (routeStops.length === 0) return;
    const progressPerStop = 100 / routeStops.length;
    const newIndex = Math.min(Math.floor(replayProgress / progressPerStop), routeStops.length - 1);
    if (newIndex !== currentStopIndex) {
      setCurrentStopIndex(newIndex);
    }
  }, [replayProgress, routeStops.length, currentStopIndex]);

  const replayPosition = getCurrentReplayPosition();

  // Fetch all available dynamic form templates created by the admin
  const { data: dynamicFormTemplates } = useQuery({
    queryKey: ['admin-form-templates'],
    queryFn: async () => {
      try {
        const response = await api.get('/field-tracking/admin/form-templates/');
        return Array.isArray(response) ? response : (response.data || []);
      } catch (e) {
        console.error("Failed to fetch dynamic form templates", e);
        return [];
      }
    }
  });

  const filteredTasks = tasks.filter((task: TaskEntry) => {
    const matchesSearch =
      task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.taskType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const loadImage = async (url: string): Promise<HTMLImageElement> => {
    // Try multiple approaches to load the image for PDF embedding
    const loadFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = dataUrl;
      });
    };

    // Approach 1: Fetch as blob and convert to data URL (bypasses canvas CORS tainting)
    try {
      const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return await loadFromDataUrl(dataUrl);
      }
    } catch (e) {
      console.warn('[PDF Export] CORS fetch failed for:', url, e);
    }

    // Approach 2: Try without explicit CORS mode
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return await loadFromDataUrl(dataUrl);
      }
    } catch (e) {
      console.warn('[PDF Export] Default fetch failed for:', url, e);
    }

    // Approach 3: Direct Image load (no crossOrigin) — works when same-origin
    try {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
        img.src = url;
      });
    } catch (e) {
      console.warn('[PDF Export] Direct Image load failed for:', url, e);
    }

    throw new Error(`All image load approaches failed for: ${url}`);
  };

  const handleExport = async (format: "csv" | "pdf" | "excel") => {
    // --- Fetch form templates for proper field labels ---
    let siteVisitSchema: any[] = [];
    let momSchema: any[] = [];
    try {
      const siteRes = await api.get('/field-tracking/form-template/');
      siteVisitSchema = siteRes.data?.schema || siteRes.data?.fields || [];
    } catch (e) { console.warn("Could not fetch site visit template:", e); }
    try {
      const momRes = await api.get('/field-tracking/mom-form-template/');
      momSchema = momRes.data?.schema || momRes.data?.fields || [];
    } catch (e) { console.warn("Could not fetch MOM template:", e); }

    // Helper: get label from schema by field id
    const getLabel = (schema: any[], fieldId: string): string => {
      const field = schema.find((f: any) => f.id === fieldId);
      if (field?.label) return field.label.replace(/^\d+\.\s*/, ''); // strip leading numbering
      return fieldId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Helper: parse report data
    const parseData = (data: any): Record<string, any> => {
      if (!data) return {};
      let parsed = data;
      if (typeof data === 'string') {
        try { parsed = JSON.parse(data); } catch { return {}; }
      }
      if (parsed && typeof parsed === 'object' && parsed.data) {
        if (typeof parsed.data === 'string') {
          try { parsed = { ...parsed, ...JSON.parse(parsed.data) }; } catch {}
        } else if (typeof parsed.data === 'object') {
          parsed = { ...parsed, ...parsed.data };
        }
      }
      return parsed || {};
    };

    // Helper: get photo URL for a field
    const getPhotoUrl = (data: Record<string, any>, fieldId: string): string | null => {
      const resolveUrl = (raw: string): string => {
        const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000';
        if (raw.startsWith('http')) {
          try {
            const parsed = new URL(raw);
            if (parsed.pathname.startsWith('/media/')) {
              return `${baseUrl}${parsed.pathname}`;
            }
          } catch (e) { /* ignore */ }
          return raw;
        }
        return raw.startsWith('/') ? `${baseUrl}${raw}` : `${baseUrl}/${raw}`;
      };
      const isPhotoValue = (v: any): v is string =>
        typeof v === 'string' && v !== 'null' && v !== 'undefined' && v.length > 5 &&
        (v.match(/\.(jpg|jpeg|png|gif|webp)/i) || v.startsWith('http'));

      const candidates = [
        data[`photo_${fieldId}`],
        data[`${fieldId}_photo`],
      ];
      for (const c of candidates) {
        if (isPhotoValue(c)) {
          return resolveUrl(c);
        }
      }

      const val = data[fieldId];
      if (val && typeof val === 'object' && isPhotoValue(val.photo)) {
        return resolveUrl(val.photo);
      }

      if (isPhotoValue(data[fieldId]) && String(data[fieldId]).match(/\.(jpg|jpeg|png|gif|webp)/i)) {
        return resolveUrl(data[fieldId]);
      }

      return null;
    };

    // Helper: get answer + comment from a field value
    const getFieldValue = (data: Record<string, any>, fieldId: string): { answer: string; comment: string } => {
      const val = data[fieldId];
      const comment = data[`${fieldId}_comment`] || '';
      if (val && typeof val === 'object' && 'answer' in val) {
        return { answer: String(val.answer || '—'), comment: String(val.comment || comment || '') };
      }
      return { answer: val !== undefined && val !== null ? String(val) : '—', comment: String(comment) };
    };

    if (format === "pdf") {
      try {
        // --- COLORS ---
        const NAVY = [26, 54, 93] as const;      // #1a365d - headers
        const SLATE = [71, 85, 105] as const;     // #475569 - section titles
        const LIGHT_BG = [248, 250, 252] as const; // #f8fafc - alt row
        const BORDER = [226, 232, 240] as const;  // #e2e8f0 - borders
        const WHITE = [255, 255, 255] as const;
        const TEXT_PRIMARY = [15, 23, 42] as const;  // #0f172a
        const TEXT_SECONDARY = [100, 116, 139] as const; // #64748b
        const ACCENT_GREEN = [22, 163, 74] as const; // #16a34a
        const ACCENT_AMBER = [217, 119, 6] as const; // #d97706

        const doc = new jsPDF("p", "pt", "a4");
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;
        let yPos = 0;

        const employeeName = employeeData?.employee_name || employee?.name || "Employee";

        // Helper: check remaining space and add page if needed
        const ensureSpace = (needed: number) => {
          if (yPos + needed > pageHeight - 50) {
            doc.addPage();
            yPos = 40;
          }
        };
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, pageWidth, 80, 'F');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(...WHITE);
        doc.text("LOGICON", margin, 35);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(200, 210, 230);
        doc.text("Daily Field Activity Report", margin, 55);

        doc.setFontSize(9);
        doc.setTextColor(180, 195, 220);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - margin, 35, { align: "right" });
        doc.text(`Report Date: ${date}`, pageWidth - margin, 52, { align: "right" });

        yPos = 100;

        // ══════════════════════════════════════════════════════════════
        // EMPLOYEE INFO
        // ══════════════════════════════════════════════════════════════
        autoTable(doc, {
          startY: yPos,
          theme: "plain",
          styles: { fontSize: 9, cellPadding: 8, textColor: TEXT_PRIMARY as any, lineColor: BORDER as any, lineWidth: 0.5 },
          headStyles: { fillColor: LIGHT_BG as any, textColor: SLATE as any, fontStyle: 'bold', fontSize: 8, halign: 'left' },
          bodyStyles: { fontStyle: 'normal' },
          head: [["Employee", "Role", "Department", "Date", "Check-In", "Check-Out"]],
          body: [[
            employeeName,
            employee?.role || "Employee",
            employee?.department || "N/A",
            date,
            employee?.checkInTime || "—",
            employee?.checkOutTime || "Active"
          ]],
          margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 20;

        // ══════════════════════════════════════════════════════════════
        // ACTIVITIES SUMMARY
        // ══════════════════════════════════════════════════════════════
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...SLATE);
        doc.text("ACTIVITIES SUMMARY", margin, yPos);
        yPos += 5;

        // Thin accent line
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(2);
        doc.line(margin, yPos, margin + 60, yPos);
        yPos += 10;

        const tasksBody = filteredTasks.map((t: any, i: number) => [
          String(i + 1),
          t.taskName,
          t.taskType,
          t.status,
          t.startTime || "—",
          t.distance ? `${t.distance} km` : "—",
          t.notes || "—"
        ]);

        autoTable(doc, {
          startY: yPos,
          theme: "plain",
          styles: { fontSize: 8.5, cellPadding: 6, textColor: TEXT_PRIMARY as any, lineColor: BORDER as any, lineWidth: 0.5 },
          headStyles: { fillColor: NAVY as any, textColor: WHITE as any, fontStyle: 'bold', fontSize: 8 },
          alternateRowStyles: { fillColor: LIGHT_BG as any },
          head: [["#", "Task Name", "Type", "Status", "Time", "Distance", "Client / Notes"]],
          body: tasksBody,
          columnStyles: {
            0: { cellWidth: 25, halign: 'center' },
            3: { fontStyle: 'bold' },
            4: { halign: 'center' },
            5: { halign: 'center' }
          },
          margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 25;

        // ══════════════════════════════════════════════════════════════
        // PERFORMANCE METRICS (single row)
        // ══════════════════════════════════════════════════════════════
        ensureSpace(60);
        autoTable(doc, {
          startY: yPos,
          theme: "plain",
          styles: { fontSize: 9, cellPadding: 8, halign: 'center' as const, textColor: TEXT_PRIMARY as any, lineColor: BORDER as any, lineWidth: 0.5 },
          headStyles: { fillColor: LIGHT_BG as any, textColor: SLATE as any, fontStyle: 'bold', fontSize: 7.5 },
          head: [["Total Distance", "Total Fuel Cost", "Tasks Completed", "Completion Rate"]],
          body: [[
            `${metrics.totalDistance.toFixed(1)} km`,
            `₹${dailyExpenses.totalFuelExpense.toFixed(2)}`,
            `${metrics.tasksCompleted} / ${metrics.totalTasks}`,
            `${metrics.planVsActual}%`
          ]],
          margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 30;

        // ══════════════════════════════════════════════════════════════
        // DETAILED MEETING REPORTS — Each meeting separated
        // ══════════════════════════════════════════════════════════════
        const meetingTasks = filteredTasks.filter((t: any) => t.reportData || t.visitReportData);

        if (meetingTasks.length > 0) {
          for (let mIdx = 0; mIdx < meetingTasks.length; mIdx++) {
            const t = meetingTasks[mIdx] as any;
            
            // Handle the backend edge case: when MOM data is empty, the backend
            // puts site visit data into report_data and sets report_type='visit'.
            // We must avoid duplicating the same data in both sections.
            let momData: Record<string, any> = {};
            let visitData: Record<string, any> = {};
            
            if (t.reportType === 'visit') {
              // report_data is actually site visit data (fallback), not MOM
              visitData = parseData(t.reportData);
            } else {
              momData = parseData(t.reportData);
              visitData = parseData(t.visitReportData);
            }
            
            const hasMom = Object.keys(momData).length > 0;
            const hasVisit = Object.keys(visitData).length > 0;

            // Debug: log report data to help diagnose photo loading issues
            console.log(`[PDF Export] Meeting "${t.taskName}" (reportType: ${t.reportType}):`, {
              hasMom, hasVisit,
              momKeys: Object.keys(momData),
              visitKeys: Object.keys(visitData),
              momPhotoKeys: Object.entries(momData).filter(([k, v]) => k.includes('photo') || (typeof v === 'string' && v.match?.(/\.(jpg|jpeg|png|gif|webp)/i))),
              visitPhotoKeys: Object.entries(visitData).filter(([k, v]) => k.includes('photo') || (typeof v === 'string' && v.match?.(/\.(jpg|jpeg|png|gif|webp)/i))),
            });

            if (!hasMom && !hasVisit) continue;

            // ── Meeting Header ─────────────────────────────────
            ensureSpace(120);

            // Separator line before each meeting
            if (mIdx > 0) {
              doc.setDrawColor(...BORDER);
              doc.setLineWidth(1);
              doc.line(margin, yPos - 10, pageWidth - margin, yPos - 10);
            }

            // Meeting title bar
            doc.setFillColor(...NAVY);
            doc.roundedRect(margin, yPos, contentWidth, 40, 3, 3, 'F');

            doc.setFont("helvetica", "bold");
            doc.setFontSize(12);
            doc.setTextColor(...WHITE);
            doc.text(`Meeting ${mIdx + 1}: ${t.taskName}`, margin + 12, yPos + 17);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(200, 210, 230);
            const metaText = [
              t.clientName ? `Client: ${t.clientName}` : (t.notes || ''),
              `Time: ${t.startTime || '—'}`,
              `Status: ${t.status}`
            ].filter(Boolean).join('  •  ');
            doc.text(metaText, margin + 12, yPos + 32);

            yPos += 52;

            // ── SECTION A: Site Visit Checklist ──────────────
            if (hasVisit) {
              ensureSpace(80);

              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.setTextColor(...SLATE);
              doc.text("SECTION A  —  Site Visit Checklist", margin + 4, yPos);
              yPos += 4;
              doc.setDrawColor(...ACCENT_GREEN);
              doc.setLineWidth(1.5);
              doc.line(margin + 4, yPos, margin + 180, yPos);
              yPos += 12;

              // Build rows from site visit schema
              const visitRows: any[] = [];
              const visitFieldIds = siteVisitSchema.length > 0
                ? siteVisitSchema.map((f: any) => f.id)
                : Object.keys(visitData).filter(k => !k.startsWith('photo_') && !k.endsWith('_photo') && !k.endsWith('_comment') && k !== 'data');

              for (const fieldId of visitFieldIds) {
                const label = siteVisitSchema.length > 0 ? getLabel(siteVisitSchema, fieldId) : fieldId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const { answer, comment } = getFieldValue(visitData, fieldId);
                if (answer === '—' && !comment) continue; // skip empty fields

                let responseText = answer;
                if (comment) responseText += `\nComment: ${comment}`;

                const photoUrl = getPhotoUrl(visitData, fieldId);

                if (photoUrl) {
                  try {
                    const img = await loadImage(photoUrl);
                    let w = img.naturalWidth || img.width || 0;
                    let h = img.naturalHeight || img.height || 0;
                    const maxW = 130, maxH = 100;
                    
                    if (w > 0 && h > 0) {
                      const ratio = Math.min(maxW / w, maxH / h, 1);
                      w *= ratio; h *= ratio;
                    } else {
                      // Fallback if dimensions couldn't be read
                      w = maxW; h = maxH;
                    }
                    
                    visitRows.push([label, responseText, { content: '', image: img, imgW: w, imgH: h, styles: { minCellHeight: h + 12 } }]);
                  } catch {
                    visitRows.push([label, responseText, '(Photo unavailable)']);
                  }
                } else {
                  visitRows.push([label, responseText, '—']);
                }
              }

              if (visitRows.length > 0) {
                autoTable(doc, {
                  startY: yPos,
                  theme: "plain",
                  styles: { fontSize: 8.5, cellPadding: 8, textColor: TEXT_PRIMARY as any, lineColor: BORDER as any, lineWidth: 0.5, overflow: 'linebreak' as const },
                  headStyles: { fillColor: [240, 253, 244] as any, textColor: [22, 101, 52] as any, fontStyle: 'bold', fontSize: 8 },
                  head: [["Question", "Response", "Photo Evidence"]],
                  body: visitRows,
                  columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 140 },
                    1: { cellWidth: 200 },
                    2: { cellWidth: contentWidth - 340, halign: 'center' as const }
                  },
                  margin: { left: margin, right: margin },
                  didDrawCell: function(data: any) {
                    if (data.column.index === 2 && data.cell.raw && data.cell.raw.image) {
                      const raw = data.cell.raw;
                      const x = data.cell.x + (data.cell.width - raw.imgW) / 2;
                      const y = data.cell.y + (data.cell.height - raw.imgH) / 2;
                      doc.addImage(raw.image, 'JPEG', x, y, raw.imgW, raw.imgH);
                    }
                  }
                });
                yPos = (doc as any).lastAutoTable.finalY + 18;
              }
            }

            // ── SECTION B: Minutes of Meeting (MOM) ──────────
            if (hasMom) {
              ensureSpace(80);

              doc.setFont("helvetica", "bold");
              doc.setFontSize(10);
              doc.setTextColor(...SLATE);
              doc.text("SECTION B  —  Minutes of Meeting (MOM)", margin + 4, yPos);
              yPos += 4;
              doc.setDrawColor(...ACCENT_AMBER);
              doc.setLineWidth(1.5);
              doc.line(margin + 4, yPos, margin + 210, yPos);
              yPos += 12;

              // Build rows from MOM schema
              const momRows: any[] = [];
              const momFieldIds = momSchema.length > 0
                ? momSchema.map((f: any) => f.id)
                : Object.keys(momData).filter(k => !k.startsWith('photo_') && !k.endsWith('_photo') && !k.endsWith('_comment') && k !== 'data');

              for (const fieldId of momFieldIds) {
                const label = momSchema.length > 0 ? getLabel(momSchema, fieldId) : fieldId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const { answer, comment } = getFieldValue(momData, fieldId);
                if (answer === '—' && !comment) continue;

                let responseText = answer;
                if (comment) responseText += `\nComment: ${comment}`;

                const photoUrl = getPhotoUrl(momData, fieldId);

                if (photoUrl) {
                  try {
                    const img = await loadImage(photoUrl);
                    let w = img.naturalWidth || img.width || 0;
                    let h = img.naturalHeight || img.height || 0;
                    const maxW = 130, maxH = 100;
                    
                    if (w > 0 && h > 0) {
                      const ratio = Math.min(maxW / w, maxH / h, 1);
                      w *= ratio; h *= ratio;
                    } else {
                      // Fallback if dimensions couldn't be read
                      w = maxW; h = maxH;
                    }
                    
                    momRows.push([label, responseText, { content: '', image: img, imgW: w, imgH: h, styles: { minCellHeight: h + 12 } }]);
                  } catch {
                    momRows.push([label, responseText, '(Photo unavailable)']);
                  }
                } else {
                  momRows.push([label, responseText, '—']);
                }
              }

              if (momRows.length > 0) {
                autoTable(doc, {
                  startY: yPos,
                  theme: "plain",
                  styles: { fontSize: 8.5, cellPadding: 8, textColor: TEXT_PRIMARY as any, lineColor: BORDER as any, lineWidth: 0.5, overflow: 'linebreak' as const },
                  headStyles: { fillColor: [255, 251, 235] as any, textColor: [146, 64, 14] as any, fontStyle: 'bold', fontSize: 8 },
                  head: [["Question", "Response", "Photo Evidence"]],
                  body: momRows,
                  columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 140 },
                    1: { cellWidth: 200 },
                    2: { cellWidth: contentWidth - 340, halign: 'center' as const }
                  },
                  margin: { left: margin, right: margin },
                  didDrawCell: function(data: any) {
                    if (data.column.index === 2 && data.cell.raw && data.cell.raw.image) {
                      const raw = data.cell.raw;
                      const x = data.cell.x + (data.cell.width - raw.imgW) / 2;
                      const y = data.cell.y + (data.cell.height - raw.imgH) / 2;
                      doc.addImage(raw.image, 'JPEG', x, y, raw.imgW, raw.imgH);
                    }
                  }
                });
                yPos = (doc as any).lastAutoTable.finalY + 18;
              }
            }

            yPos += 12; // spacing between meetings
          }
        }

        // ── Footer on every page ──────────────────────────────
        const totalPages = doc.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
          doc.setPage(p);
          doc.setDrawColor(...BORDER);
          doc.setLineWidth(0.5);
          doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...TEXT_SECONDARY);
          doc.text("Logicon Field Operations  •  Confidential", margin, pageHeight - 18);
          doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 18, { align: "right" });
        }

        doc.save(`Logicon_Report_${employee.name.replace(/\s+/g, '_')}_${date}.pdf`);
      } catch (err) {
        console.error("PDF export failed", err);
        alert("Failed to export PDF. Check console for details.");
      }
    } else if (format === "excel") {
      try {
        const ExcelJS = await import('exceljs');
        const { saveAs } = await import('file-saver');

        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Activity Report', {
          views: [{ showGridLines: false }]
        });

        // Set column widths
        ws.columns = [
          { width: 35 },
          { width: 35 },
          { width: 25 },
          { width: 25 },
          { width: 20 },
          { width: 40 },
        ];

        let currentRow = 1;

        // Styles
        const headerFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A365D' } }; // Navy
        const sectionFill: any = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // Slate-100
        const titleFont: any = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        const subtitleFont: any = { name: 'Arial', size: 10, bold: false, color: { argb: 'FFCBD5E1' } };
        const boldFont: any = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        const normalFont: any = { name: 'Arial', size: 10, color: { argb: 'FF0F172A' } };
        const linkFont: any = { name: 'Arial', size: 10, color: { argb: 'FF2563EB' }, underline: true };
        const borderThin: any = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };

        const addRow = (values: any[], style?: any, height?: number) => {
          const row = ws.addRow(values);
          if (height) row.height = height;
          if (style) {
            row.eachCell((cell) => {
              if (style.font) cell.font = style.font;
              if (style.fill) cell.fill = style.fill;
              if (style.alignment) cell.alignment = style.alignment;
              if (style.border) cell.border = style.border;
            });
          }
          currentRow++;
          return row;
        };

        // Header
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        const r1 = ws.getRow(currentRow);
        r1.getCell(1).value = "LOGICON FIELD OPERATIONS";
        r1.height = 30;
        r1.getCell(1).font = titleFont;
        r1.getCell(1).fill = headerFill;
        r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        currentRow++;

        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        const r2 = ws.getRow(currentRow);
        r2.getCell(1).value = `Daily Field Activity Report • ${date}`;
        r2.getCell(1).font = subtitleFont;
        r2.getCell(1).fill = headerFill;
        r2.getCell(1).alignment = { vertical: 'top', horizontal: 'left', indent: 1 };
        currentRow++;
        
        currentRow++; // blank

        // EMPLOYEE DETAILS
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        const empHeader = ws.getRow(currentRow);
        empHeader.getCell(1).value = "EMPLOYEE DETAILS";
        empHeader.getCell(1).font = boldFont;
        empHeader.getCell(1).fill = sectionFill;
        empHeader.getCell(1).border = borderThin;
        currentRow++;

        addRow(["Name:", employee.name, "Role:", employee.role]);
        addRow(["Department:", employee.department, "Status:", employee.currentStatus]);
        
        ws.getRow(currentRow-2).getCell(1).font = boldFont;
        ws.getRow(currentRow-2).getCell(3).font = boldFont;
        ws.getRow(currentRow-1).getCell(1).font = boldFont;
        ws.getRow(currentRow-1).getCell(3).font = boldFont;

        currentRow++;

        // METRICS
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        const metHeader = ws.getRow(currentRow);
        metHeader.getCell(1).value = "PERFORMANCE METRICS";
        metHeader.getCell(1).font = boldFont;
        metHeader.getCell(1).fill = sectionFill;
        metHeader.getCell(1).border = borderThin;
        currentRow++;

        addRow(["Tasks Completed:", `${metrics.tasksCompleted}/${metrics.totalTasks}`, "Plan vs Actual:", `${metrics.planVsActual}%`]);
        addRow(["Total Distance:", `${metrics.totalDistance} km`, "Fuel Cost:", `₹${dailyExpenses.totalFuelExpense}`]);
        addRow(["Idle Time:", `${metrics.idleTime} min`]);

        ws.getRow(currentRow-3).getCell(1).font = boldFont;
        ws.getRow(currentRow-3).getCell(3).font = boldFont;
        ws.getRow(currentRow-2).getCell(1).font = boldFont;
        ws.getRow(currentRow-2).getCell(3).font = boldFont;
        ws.getRow(currentRow-1).getCell(1).font = boldFont;

        currentRow++;

        // TASKS SUMMARY
        ws.mergeCells(`A${currentRow}:F${currentRow}`);
        const tskHeader = ws.getRow(currentRow);
        tskHeader.getCell(1).value = "TASKS & ACTIVITIES SUMMARY";
        tskHeader.getCell(1).font = boldFont;
        tskHeader.getCell(1).fill = sectionFill;
        tskHeader.getCell(1).border = borderThin;
        currentRow++;

        addRow(["Task Name", "Type", "Time", "Status", "Distance", "Notes"], { font: { ...boldFont, color: { argb: 'FFFFFFFF' } }, fill: headerFill, border: borderThin });
        for (const t of filteredTasks) {
          addRow([
            t.taskName,
            t.taskType,
            `${t.startTime} - ${t.endTime || 'Ongoing'}`,
            t.status,
            t.distance ? `${t.distance} km` : "-",
            t.notes || "-"
          ], { font: normalFont, border: borderThin, alignment: { wrapText: true, vertical: 'top' } });
        }
        
        currentRow++;

        // DETAILED MEETING REPORTS
        const meetingTasks = filteredTasks.filter((t) => t.isMeeting);
        if (meetingTasks.length > 0) {
          ws.mergeCells(`A${currentRow}:F${currentRow}`);
          const detHeader = ws.getRow(currentRow);
          detHeader.getCell(1).value = "DETAILED MEETING REPORTS";
          detHeader.getCell(1).font = { ...boldFont, color: { argb: 'FFFFFFFF' } };
          detHeader.getCell(1).fill = headerFill;
          currentRow++;
          currentRow++;

          for (let mIdx = 0; mIdx < meetingTasks.length; mIdx++) {
            const t = meetingTasks[mIdx] as any;
            const momData = parseData(t.reportData);
            const visitData = parseData(t.visitReportData);
            const hasMom = Object.keys(momData).length > 0;
            const hasVisit = Object.keys(visitData).length > 0 && t.reportType !== 'visit';

            if (!hasMom && !hasVisit) continue;

            ws.mergeCells(`A${currentRow}:F${currentRow}`);
            const mTitle = ws.getRow(currentRow);
            mTitle.getCell(1).value = `Meeting ${mIdx + 1}: ${t.taskName}`;
            mTitle.getCell(1).font = { ...boldFont, size: 12 };
            mTitle.getCell(1).fill = sectionFill;
            currentRow++;

            addRow(["Client:", t.clientName || 'N/A', "Time:", t.startTime, "Status:", t.status]);
            ws.getRow(currentRow-1).font = normalFont;
            ws.getRow(currentRow-1).getCell(1).font = boldFont;
            ws.getRow(currentRow-1).getCell(3).font = boldFont;
            ws.getRow(currentRow-1).getCell(5).font = boldFont;
            
            currentRow++;
            
            const writeForm = (title: string, schema: any[], dataObj: any) => {
              ws.mergeCells(`A${currentRow}:F${currentRow}`);
              const secTitle = ws.getRow(currentRow);
              secTitle.getCell(1).value = title;
              secTitle.getCell(1).font = boldFont;
              currentRow++;

              addRow(["Question", "Response", "Photo Link"], { font: boldFont, fill: sectionFill, border: borderThin });
              
              const fieldIds = schema.length > 0
                ? schema.map((f: any) => f.id)
                : Object.keys(dataObj).filter(k => !k.startsWith('photo_') && !k.endsWith('_photo') && !k.endsWith('_comment') && k !== 'data');
              
              for (const fieldId of fieldIds) {
                const label = schema.length > 0 ? getLabel(schema, fieldId) : fieldId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const { answer, comment } = getFieldValue(dataObj, fieldId);
                if (answer === '—' && !comment) continue;

                let responseText = answer;
                if (comment) responseText += `\nComment: ${comment}`;
                const photoUrl = getPhotoUrl(dataObj, fieldId);
                
                const row = addRow([label, responseText, photoUrl ? "View Photo" : "-"], { border: borderThin, alignment: { wrapText: true, vertical: 'top' } });
                if (photoUrl) {
                  const pCell = row.getCell(3);
                  pCell.value = { text: 'View Photo', hyperlink: photoUrl, tooltip: 'Click to view photo evidence' } as any;
                  pCell.font = linkFont;
                }
              }
              currentRow++;
            };

            if (hasVisit) {
              writeForm("SECTION A - Site Visit Checklist", siteVisitSchema, visitData);
            }
            if (hasMom) {
              writeForm("SECTION B - Minutes of Meeting (MOM)", momSchema, momData);
            }
          }
        }

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Logicon_Report_${employee.name.replace(/\s+/g, '_')}_${date}.xlsx`);
      } catch (err) {
        console.error("Excel export failed", err);
        alert("Failed to export Excel. Check console for details.");
      }
    } else {
      console.log(`Exporting as ${format}...`);
      alert(`${format.toUpperCase()} export is coming soon.`);
    }
  };

  const handleApproveProof = (taskId: string) => {
    console.log(`Approving proof for task ${taskId}`);
  };

  const handleRejectProof = (taskId: string) => {
    console.log(`Rejecting proof for task ${taskId}`);
  };

  // --- LOADING SCREEN ---
  if (isLoading && isOpen) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card p-8 text-center rounded-lg shadow-xl border border-border">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-semibold">Loading Tracking Data...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card border border-border shadow-2xl overflow-hidden w-full max-w-6xl max-h-[90vh] flex flex-col rounded-xl">
              {/* Header */}
              <div className="relative px-6 py-4 border-b border-border/50 flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 opacity-50" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-lg font-bold">
                        {employee.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card ${getStatusIcon(
                          employee.currentStatus
                        )} ${employee.currentStatus === "Active" ? "animate-pulse" : ""}`}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold">
                        {employee.name}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{employee.role}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Employee Info Cards */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Employee Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    <Card className="bg-card/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Role</p>
                          <p className="text-sm font-medium">{employee.role}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Department
                          </p>
                          <p className="text-sm font-medium">
                            {employee.department}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-success" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Check-in
                          </p>
                          <p className="text-sm font-medium">
                            {employee.checkInTime}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-success" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Check-in Location
                          </p>
                          <p className="text-sm font-medium">
                            {startLocationName}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-warning" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Check-out
                          </p>
                          <p className="text-sm font-medium">
                            {employee.checkOutTime || "Active"}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-warning" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Check-out Location
                          </p>
                          <p className="text-sm font-medium">
                            {endLocationName}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Work Mode
                          </p>
                          <p className="text-sm font-medium">
                            {employee.workMode}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                          <Navigation className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Travel/ETA
                          </p>
                          <p className="text-sm font-medium">
                            {employee.travelTime}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${employee.currentStatus === "Active"
                            ? "bg-success/10"
                            : employee.currentStatus === "Idle"
                              ? "bg-warning/10"
                              : "bg-muted"
                            }`}
                        >
                          <Activity
                            className={`w-4 h-4 ${employee.currentStatus === "Active"
                              ? "text-success"
                              : employee.currentStatus === "Idle"
                                ? "text-warning"
                                : "text-muted-foreground"
                              }`}
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Status
                          </p>
                          <p className="text-sm font-medium">
                            {employee.currentStatus}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                {/* Live Location Map with Route Replay */}
                {/* <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Route Replay & Live Tracking
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${isPlaying ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted'}`}>
                        {isPlaying ? 'Playing' : replayProgress > 0 ? 'Paused' : 'Ready'}
                      </Badge>
                    </div>
                  </div>
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative">
                        {/* Map Container */}
                {/* <div className="h-96 w-full relative overflow-hidden">
                          <RouteReplayMap 
                            apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}
                            routeStops={routeStops}
                            currentLocation={employee.currentLocation}
                            isPlaying={isPlaying}
                            replayProgress={replayProgress}
                          />
                        </div>
                      </div>
                      </CardContent>
                  </Card>
                </section> */}

                {/* Task / Activity Table */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Tasks & Activities
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Search tasks..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9 w-48"
                        />
                      </div>
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger className="h-9 w-36">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="Escalated">Escalated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Task</TableHead>
                            <TableHead className="font-semibold">Type</TableHead>
                            <TableHead className="font-semibold">Time</TableHead>
                            <TableHead className="font-semibold">Distance</TableHead>
                            <TableHead className="font-semibold">Fuel Cost</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="font-semibold">Proof</TableHead>
                            <TableHead className="font-semibold">Notes</TableHead>
                            <TableHead className="font-semibold text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTasks.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={10}
                                className="text-center py-8 text-muted-foreground"
                              >
                                No tasks found matching your filters
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredTasks.map((task) => {
                              const TypeIcon = getTaskTypeIcon(task.taskType);
                              return (
                                <TableRow
                                  key={task.id}
                                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                                  onClick={() => setSelectedTask(task)}
                                >
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">
                                        {task.taskName}
                                      </p>
                                      {task.location && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                          <MapPin className="w-3 h-3" />
                                          {task.location}
                                        </p>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <TypeIcon className="w-4 h-4 text-primary" />
                                      <span className="text-sm">
                                        {task.taskType}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      <p>{task.startTime}</p>
                                      <p className="text-muted-foreground">
                                        {task.endTime || "Ongoing"}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5">
                                      <Navigation className="w-3.5 h-3.5 text-primary" />
                                      <span className="text-sm font-medium">
                                        {task.distance ? `${task.distance} km` : "-"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5">
                                      <Fuel className="w-3.5 h-3.5 text-warning" />
                                      <span className="text-sm font-medium">
                                        {task.fuelExpense ? `₹${task.fuelExpense}` : "-"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1.5">
                                      <Utensils className="w-3.5 h-3.5 text-accent" />
                                      <span className="text-sm font-medium">
                                        {task.foodExpense ? `₹${task.foodExpense}` : "-"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={getStatusColor(task.status)}
                                    >
                                      {task.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {task.proofSubmitted ? (
                                      <div className="flex items-center gap-2">
                                        {task.proofUrl ? (
                                          <div className="flex flex-col items-start gap-1 shrink-0">
                                            <div className="w-8 h-8 rounded overflow-hidden border border-border">
                                              <img src={task.proofUrl} alt="Proof" className="w-full h-full object-cover" />
                                            </div>
                                          </div>
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className="bg-success/10 text-success border-success/20 shrink-0"
                                          >
                                            <FileText className="w-3 h-3 mr-1" />
                                            Form Submitted
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="bg-muted text-muted-foreground"
                                      >
                                        No
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <p className="text-sm text-muted-foreground max-w-[200px] truncate">
                                      {task.notes}
                                    </p>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                                      {task.proofSubmitted && (
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-8 text-xs bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                                              View Checklists
                                              <ChevronDown className="w-3.5 h-3.5 ml-1" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="min-w-[260px] p-1">
                                            {dynamicFormTemplates && dynamicFormTemplates.length > 0 ? (
                                              dynamicFormTemplates.map((template: any) => {
                                                const isFilled = (() => {
                                                  const extractKeys = (rd: any): string[] => {
                                                    if (!rd) return [];
                                                    let obj = rd;
                                                    if (typeof obj === 'string') {
                                                      try { obj = JSON.parse(obj); } catch { return []; }
                                                    }
                                                    if (!obj || typeof obj !== 'object') return [];
                                                    let keys = Object.keys(obj);
                                                    if (obj.data) {
                                                      let inner = obj.data;
                                                      if (typeof inner === 'string') {
                                                        try { inner = JSON.parse(inner); } catch {}
                                                      }
                                                      if (inner && typeof inner === 'object') {
                                                        keys = [...keys, ...Object.keys(inner)];
                                                      }
                                                    }
                                                    return keys;
                                                  };

                                                  const rdKeys = [...extractKeys(task.reportData), ...extractKeys(task.visitReportData)];
                                                  if (rdKeys.length === 0) return false;

                                                  // 1. Direct form_type match or common aliases
                                                  if (task.reportType === template.form_type) return true;
                                                  if ((task.reportType === 'visit' || task.reportType === 'site_visit') && (template.form_type === 'visit' || template.form_type === 'site_visit')) return true;
                                                  if ((task.reportType === 'mom' || task.reportType === 'meeting') && (template.form_type === 'mom' || template.form_type === 'meeting')) return true;

                                                  // 2. Nested form_type key in report_data
                                                  if (rdKeys.includes(template.form_type)) return true;

                                                  // 3. Match against template schema field IDs
                                                  if (template.schema && Array.isArray(template.schema)) {
                                                    const schemaFieldIds = template.schema.map((f: any) => f.id || f.name).filter(Boolean);
                                                    const hasMatchingField = schemaFieldIds.some((fId: string) => 
                                                      rdKeys.includes(fId) || rdKeys.some((k: string) => k.startsWith(`photo_${fId}`) || k.includes(fId))
                                                    );
                                                    if (hasMatchingField) return true;
                                                  }

                                                  // 4. Fallback for site visit reports when visit data exists
                                                  if ((template.form_type === 'site_visit' || template.form_type === 'visit') && (task.visitReportData || (task.reportData && !rdKeys.some((k: string) => k.startsWith('mom_'))))) {
                                                    return true;
                                                  }

                                                  return false;
                                                })();
                                                return (
                                                  <div key={template.id} className={`flex items-center justify-between px-2 py-1.5 rounded-sm transition-colors ${isFilled ? 'hover:bg-muted/50' : 'opacity-60'}`}>
                                                    <div className="flex items-center text-sm cursor-default truncate mr-4">
                                                      {isFilled ? (
                                                        <CheckCircle2 className="w-4 h-4 mr-2 text-success shrink-0" />
                                                      ) : (
                                                        <FileText className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                                                      )}
                                                      <span className={`font-medium truncate max-w-[150px] ${!isFilled ? 'text-muted-foreground' : ''}`} title={template.name || template.title || `Custom Form ${template.id}`}>
                                                        {template.name || template.title || `Custom Form ${template.id}`}
                                                      </span>
                                                    </div>
                                                    {isFilled && (
                                                      <div className="flex items-center gap-1 shrink-0">
                                                        <Button 
                                                          variant="ghost" 
                                                          size="icon" 
                                                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                                                          title="View Form"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setViewingReportTask({ ...task, viewType: template.form_type || template.id.toString() } as any);
                                                          }}
                                                        >
                                                          <Eye className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button 
                                                          variant="ghost" 
                                                          size="icon" 
                                                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10" 
                                                          title="Download PDF"
                                                          onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const employeeName = employeeData?.employee_name || employee?.name || "Employee";
                                                            let actualReportData = task.reportType === template.form_type ? task.reportData : (task.visitReportData || task.reportData);
                                                            if (typeof actualReportData === 'string') {
                                                              try { actualReportData = JSON.parse(actualReportData); } catch {}
                                                            }
                                                            if (actualReportData && actualReportData[template.form_type]) {
                                                              actualReportData = actualReportData[template.form_type];
                                                            }
                                                            const tName: string = template.name || template.title || "Checklist Report";
                                                            
                                                            if (template.form_type === 'mom') {
                                                              await generateMOMPDF({ ...task, reportData: actualReportData }, employeeName);
                                                            } else if (tName.toLowerCase().includes("training")) {
                                                              await generateTrainingReportPDF({ ...task, reportData: actualReportData }, employeeName, tName, template.schema || []);
                                                            } else {
                                                              await generateSiteVisitPDF({ ...task, reportData: actualReportData }, employeeName, tName);
                                                            }
                                                          }}
                                                        >
                                                          <Download className="w-3.5 h-3.5" />
                                                        </Button>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })
                                            ) : (
                                              <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                                                No checklists available
                                              </div>
                                            )}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      )}
                                      
                                      {task.isMeeting && task.fuelApproved && (
                                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                          Fuel Approved
                                        </Badge>
                                      )}

                                      {task.proofSubmitted && (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-success hover:bg-success/10 hover:text-success"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleApproveProof(task.id);
                                            }}
                                            title="Approve"
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRejectProof(task.id);
                                            }}
                                            title="Reject"
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </section>

                {/* Travel & Performance */}
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Travel & Performance
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Navigation className="w-5 h-5 text-primary" />
                          <span className="text-2xl font-bold text-primary">
                            {metrics.totalDistance}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Total Distance (km)
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Fuel className="w-5 h-5 text-warning" />
                          <span className="text-2xl font-bold text-warning">
                            ₹{dailyExpenses.totalFuelExpense}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Total Fuel Cost
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Clock className="w-5 h-5 text-warning" />
                          <span className="text-2xl font-bold text-warning">
                            {metrics.idleTime}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Idle Time (min)
                        </p>
                      </CardContent>
                    </Card>
                    <Card
                      className={`bg-gradient-to-br ${metrics.planVsActual >= 90
                        ? "from-success/5 to-success/10 border-success/20"
                        : metrics.planVsActual >= 70
                          ? "from-warning/5 to-warning/10 border-warning/20"
                          : "from-destructive/5 to-destructive/10 border-destructive/20"
                        }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Target
                            className={`w-5 h-5 ${metrics.planVsActual >= 90
                              ? "text-success"
                              : metrics.planVsActual >= 70
                                ? "text-warning"
                                : "text-destructive"
                              }`}
                          />
                          <span
                            className={`text-2xl font-bold ${metrics.planVsActual >= 90
                              ? "text-success"
                              : metrics.planVsActual >= 70
                                ? "text-warning"
                                : "text-destructive"
                              }`}
                          >
                            {metrics.planVsActual}%
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Plan vs Actual
                        </p>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${metrics.planVsActual >= 90
                              ? "bg-success"
                              : metrics.planVsActual >= 70
                                ? "bg-warning"
                                : "bg-destructive"
                              }`}
                            style={{
                              width: `${Math.min(metrics.planVsActual, 100)}%`,
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Activity className="w-5 h-5 text-accent" />
                          <span className="text-2xl font-bold text-accent">
                            {metrics.tasksCompleted}/{metrics.totalTasks}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Tasks Completed
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Additional KPIs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                    <Card className="bg-card/50">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Avg Task Duration
                          </p>
                          <p className="text-lg font-semibold">
                            {metrics.avgTaskDuration} min
                          </p>
                        </div>
                        <Clock className="w-8 h-8 text-muted-foreground/30" />
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Punctuality Score
                          </p>
                          <p className="text-lg font-semibold">
                            {metrics.punctualityScore}%
                          </p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-muted-foreground/30" />
                      </CardContent>
                    </Card>
                    <Card className="bg-card/50">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Completion Rate
                          </p>
                          <p className="text-lg font-semibold">
                            {Math.round(
                              (metrics.tasksCompleted / metrics.totalTasks) * 100
                            )}
                            %
                          </p>
                        </div>
                        <Target className="w-8 h-8 text-muted-foreground/30" />
                      </CardContent>
                    </Card>
                  </div>
                </section>



                {/* Report View Modal */}
                {viewingReportTask && (
                  <ReportViewModal
                    isOpen={!!viewingReportTask}
                    onClose={() => setViewingReportTask(null)}
                    reportData={viewingReportTask?.reportData || viewingReportTask?.visitReportData}
                    siteName={viewingReportTask?.taskName || ""}
                    attachmentUrl={viewingReportTask?.proofUrl}
                    reportType={((viewingReportTask as any)?.viewType === 'site_visit' ? 'visit' : (viewingReportTask as any)?.viewType) || (viewingReportTask?.taskType === 'Meeting' ? 'meeting' : 'visit')}
                    meetingDetails={viewingReportTask}
                  />
                )}

                {/* Receipt Preview Modal */}
                <AnimatePresence>
                  {selectedReceipt && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
                      onClick={() => setSelectedReceipt(null)}
                    >
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.9 }}
                        className="relative max-w-3xl max-h-[80vh]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img
                          src={selectedReceipt}
                          alt="Receipt preview"
                          className="max-w-full max-h-[80vh] object-contain rounded-lg"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                          onClick={() => setSelectedReceipt(null)}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredTasks.length} tasks displayed • Last updated: Just
                    now
                  </p>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleExport("pdf")}>
                          <FileText className="w-4 h-4 mr-2" />
                          Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport("excel")}>
                          <FileText className="w-4 h-4 mr-2" />
                          Export as Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={onClose}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Task Detail Slide-over (when clicking a task row) */}
          <AnimatePresence>
            {selectedTask && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedTask(null)}
                  className="fixed inset-0 bg-background/50 z-[60]"
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-[60] overflow-y-auto"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-display font-bold">
                        Task Details
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedTask(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Task Name
                        </p>
                        <p className="font-semibold">{selectedTask.taskName}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Type</p>
                          <Badge variant="secondary">
                            {selectedTask.taskType}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Status
                          </p>
                          <Badge
                            variant="outline"
                            className={getStatusColor(selectedTask.status)}
                          >
                            {selectedTask.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Start Time
                          </p>
                          <p className="font-medium">{selectedTask.startTime}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            End Time
                          </p>
                          <p className="font-medium">
                            {selectedTask.endTime || "Ongoing"}
                          </p>
                        </div>
                      </div>

                      {selectedTask.location && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Location
                          </p>
                          <p className="font-medium flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            {selectedTask.location}
                          </p>
                        </div>
                      )}

                      {selectedTask.vendorContact && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Vendor Contact
                          </p>
                          <div className="bg-muted/50 p-3 rounded-lg mt-1 space-y-2">
                            <p className="font-medium">{selectedTask.vendorContact.name}</p>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-primary" />
                              <span className="text-sm">{selectedTask.vendorContact.phone}</span>
                              {selectedTask.vendorContact.isVerified ? (
                                <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs gap-1">
                                  <ShieldAlert className="w-3 h-3" />
                                  Unverified
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">
                          {selectedTask.notes || "No notes provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Proof Submitted
                        </p>
                        {selectedTask.proofSubmitted ? (
                          <div className="space-y-2">
                            {selectedTask.proofUrl && (
                              <div className="w-full max-h-64 overflow-hidden bg-muted rounded-lg flex items-center justify-center">
                                <img src={selectedTask.proofUrl} alt="Proof" className="w-full h-auto object-cover" />
                              </div>
                            )}

                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No proof submitted for this task
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}