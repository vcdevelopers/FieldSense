// ============= SHARED INTERFACES =============

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  profilePhoto?: string;
  roleId: string;
  departmentId: string;
  designation: string;
  reportingManager: string;
  employmentType: "Full-time" | "Contract";
  workMode: "Field" | "Office" | "Hybrid";
  joiningDate: string;
  trackingEnabled: boolean;
  attendanceRequired: boolean;
  taskAssignmentAllowed: boolean;
  statusId: string;
  accountStatus: boolean;
  travelMode?: "Bike" | "Scooty" | "Car";
}

export interface Role {
  id: string;
  roleName: string;
  roleCode: string;
  roleType: "Management" | "Execution";
  defaultDashboard: string;
  rolePriority: number;
  activeStatus: boolean;
}

export interface Department {
  id: string;
  departmentName: string;
  departmentCode: string;
  parentDepartmentId: string;
  departmentHeadId: string;
  trackingEnabled: boolean;
  kpiCategory: string[];
  activeStatus: boolean;
}

export interface StatusMaster {
  id: string;
  statusName: string;
  tracking: boolean;
  visibility: "All" | "Manager Only" | "Admin Only";
  activeStatus: boolean;
}

export interface Project {
  id: string;
  name: string;
  opsManager: string;
  status: "active" | "pending" | "completed" | "delayed";
  progress: number;
  tasksCompleted: number;
  totalTasks: number;
  nextMilestone: string;
  dueDate: string;
}

// ============= SAMPLE DATA =============

export const initialStatusMaster: StatusMaster[] = [
  { id: "1", statusName: "Active", tracking: true, visibility: "All", activeStatus: true },
  { id: "2", statusName: "On Leave", tracking: false, visibility: "All", activeStatus: true },
  { id: "3", statusName: "Resigned", tracking: false, visibility: "Manager Only", activeStatus: true },
  { id: "4", statusName: "Suspended", tracking: false, visibility: "Admin Only", activeStatus: true },
  { id: "5", statusName: "Probation", tracking: true, visibility: "All", activeStatus: true },
];

export const initialRoles: Role[] = [
  { id: "1", roleName: "Admin", roleCode: "ADMIN", roleType: "Management", defaultDashboard: "Admin Dashboard", rolePriority: 100, activeStatus: true },
  { id: "2", roleName: "Sales Manager", roleCode: "SALES_MGR", roleType: "Management", defaultDashboard: "Sales Dashboard", rolePriority: 80, activeStatus: true },
  { id: "3", roleName: "Territory Manager", roleCode: "TERR_MGR", roleType: "Management", defaultDashboard: "Territory Dashboard", rolePriority: 70, activeStatus: true },
  { id: "4", roleName: "Sales Executive", roleCode: "SALES_EXEC", roleType: "Execution", defaultDashboard: "Field Dashboard", rolePriority: 50, activeStatus: true },
  { id: "5", roleName: "Warehouse Manager", roleCode: "WAREH_MGR", roleType: "Management", defaultDashboard: "Inventory Dashboard", rolePriority: 60, activeStatus: true },
  { id: "6", roleName: "Delivery Executive", roleCode: "DELIV_EXEC", roleType: "Execution", defaultDashboard: "Delivery Dashboard", rolePriority: 40, activeStatus: true },
  { id: "7", roleName: "Agronomist", roleCode: "AGRO", roleType: "Execution", defaultDashboard: "Field Dashboard", rolePriority: 55, activeStatus: true },
];

export const initialDepartments: Department[] = [
  { id: "1", departmentName: "Sales", departmentCode: "SALES", parentDepartmentId: "", departmentHeadId: "2", trackingEnabled: true, kpiCategory: ["Revenue", "Visits", "Orders"], activeStatus: true },
  { id: "2", departmentName: "Warehouse", departmentCode: "WAREH", parentDepartmentId: "", departmentHeadId: "5", trackingEnabled: false, kpiCategory: ["Stock", "Dispatch"], activeStatus: true },
  { id: "3", departmentName: "Logistics", departmentCode: "LOGI", parentDepartmentId: "", departmentHeadId: "6", trackingEnabled: true, kpiCategory: ["Deliveries", "Routes"], activeStatus: true },
  { id: "4", departmentName: "Technical Support", departmentCode: "TECH", parentDepartmentId: "", departmentHeadId: "7", trackingEnabled: true, kpiCategory: ["Farm Visits", "Consultations"], activeStatus: true },
  { id: "5", departmentName: "Administration", departmentCode: "ADMIN", parentDepartmentId: "", departmentHeadId: "1", trackingEnabled: false, kpiCategory: ["Compliance", "HR"], activeStatus: true },
];

export const initialEmployees: Employee[] = [];

export const initialProjects: Project[] = [
  { id: "1", name: "Kharif Season Campaign", opsManager: "2", status: "active", progress: 65, tasksCompleted: 26, totalTasks: 40, nextMilestone: "Dealer Meet", dueDate: "2024-02-15" },
  { id: "2", name: "New Product Launch - Bio Fertilizer", opsManager: "2", status: "active", progress: 40, tasksCompleted: 8, totalTasks: 20, nextMilestone: "Training Completion", dueDate: "2024-02-20" },
  { id: "3", name: "Rabi Season Preparation", opsManager: "3", status: "pending", progress: 10, tasksCompleted: 2, totalTasks: 25, nextMilestone: "Inventory Stocking", dueDate: "2024-03-01" },
];

// ============= HELPER FUNCTIONS =============

export const getRoleName = (roleId: string, roles: Role[]): string => {
  const role = roles.find(r => r.id === roleId);
  return role?.roleName || "Unknown Role";
};

export const getDepartmentName = (departmentId: string, departments: Department[]): string => {
  const dept = departments.find(d => d.id === departmentId);
  return dept?.departmentName || "Unknown Department";
};

export const getStatusName = (statusId: string, statuses: StatusMaster[]): string => {
  const status = statuses.find(s => s.id === statusId);
  return status?.statusName || "Unknown Status";
};

export const getOperationsDepartmentId = (departments: Department[]): string => {
  const opsDept = departments.find(d => d.departmentName === "Operations");
  return opsDept?.id || "";
};

export const getManagementRoleIds = (roles: Role[]): string[] => {
  return roles.filter(r => r.roleType === "Management" && r.activeStatus).map(r => r.id);
};

// Get eligible employees for Ops Manager (Management role + Operations department + Active status)
export const getEligibleOpsManagerEmployees = (
  employees: Employee[],
  roles: Role[],
  departments: Department[],
  statuses: StatusMaster[]
): Employee[] => {
  const opsDeptId = getOperationsDepartmentId(departments);
  const managementRoleIds = getManagementRoleIds(roles);
  const activeStatusId = statuses.find(s => s.statusName === "Active")?.id || "";

  return employees.filter(emp => 
    managementRoleIds.includes(emp.roleId) &&
    emp.departmentId === opsDeptId &&
    emp.statusId === activeStatusId &&
    emp.accountStatus
  );
};

// Get employees for assignment (Execution role + Operations department + Active status)
export const getAssignableEmployees = (
  employees: Employee[],
  roles: Role[],
  departments: Department[],
  statuses: StatusMaster[]
): Employee[] => {
  const opsDeptId = getOperationsDepartmentId(departments);
  const executionRoleIds = roles.filter(r => r.roleType === "Execution" && r.activeStatus).map(r => r.id);
  const activeStatusId = statuses.find(s => s.statusName === "Active")?.id || "";

  return employees.filter(emp => 
    executionRoleIds.includes(emp.roleId) &&
    emp.departmentId === opsDeptId &&
    emp.statusId === activeStatusId &&
    emp.accountStatus
  );
};
