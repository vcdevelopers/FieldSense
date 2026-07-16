import { apiClient } from './api';

export interface AttendanceDashboardData {
  employee_id: number;
  employee_name: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number;
  meetings_total: number;
  meetings_completed: number;
  meetings_pending: number;
  role?: string;
  department?: string;
  session_status?: string;
  duration_formatted?: string;
  ip_address?: string;
}

export const fetchAttendanceDashboard = async (
  dateStart: string,
  dateEnd: string,
  employeeId?: number
): Promise<AttendanceDashboardData[]> => {
  let url = `/attendance/admin/dashboard/?date_start=${dateStart}&date_end=${dateEnd}`;
  if (employeeId) {
    url += `&employee_id=${employeeId}`;
  }
  const response = await apiClient.get<AttendanceDashboardData[]>(url);
  return response || [];
};
