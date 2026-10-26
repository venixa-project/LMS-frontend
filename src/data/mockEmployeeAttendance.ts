// ============================================================
// LMS - Employee Attendance Records & Analytics
// Encompasses faculty, trainers, administrative staff, and non-teaching staff.
// Completely excludes student/learner attendance.
// ============================================================

import { EmployeeAttendanceRecord, EmployeeAttendanceSummary } from '../types';

export const mockEmployeeAttendanceRecords: EmployeeAttendanceRecord[] = [
  // --- 1. FACULTY & TEACHING STAFF (8) ---
  {
    id: 'emp-att-001',
    employeeId: 'u-004',
    employeeName: 'Dr. James Wilson',
    employeeEmail: 'trainer@lms.demo',
    role: 'faculty',
    roleTitle: 'Professor & Faculty Lead',
    department: 'Engineering',
    departmentId: 'dep-001',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '08:45 AM',
    checkOutTime: '05:15 PM',
    notes: 'On-campus lecture & laboratory supervision'
  },
  {
    id: 'emp-att-002',
    employeeId: 'u-005',
    employeeName: 'Emily Rodriguez',
    employeeEmail: 'emily.rodriguez@lms.demo',
    role: 'faculty',
    roleTitle: 'Associate Professor',
    department: 'Product & Design',
    departmentId: 'dep-002',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '09:02 AM',
    checkOutTime: '05:30 PM',
    notes: 'On-campus design studio review'
  },
  {
    id: 'emp-att-003',
    employeeId: 'u-003',
    employeeName: 'Priya Sharma',
    employeeEmail: 'priya.sharma@lms.demo',
    role: 'trainer',
    roleTitle: 'Senior Technical Trainer',
    department: 'Engineering',
    departmentId: 'dep-001',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '08:50 AM',
    checkOutTime: '05:00 PM',
    notes: 'Cloud architecture lab session'
  },
  {
    id: 'emp-att-004',
    employeeId: 'emp-001',
    employeeName: 'Prof. Alan Turing',
    employeeEmail: 'alan.turing@lms.demo',
    role: 'faculty',
    roleTitle: 'Research Chair, AI Systems',
    department: 'Engineering',
    departmentId: 'dep-001',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '09:10 AM',
    checkOutTime: '05:45 PM',
    notes: 'Algorithms research seminar'
  },
  {
    id: 'emp-att-005',
    employeeId: 'emp-002',
    employeeName: 'Dr. Maya Lin',
    employeeEmail: 'maya.lin@lms.demo',
    role: 'faculty',
    roleTitle: 'Senior Lecturer, Architecture',
    department: 'Product & Design',
    departmentId: 'dep-002',
    date: '2026-10-21',
    status: 'remote',
    checkInTime: '08:30 AM',
    notes: 'Verified remote teaching day (approved)'
  },
  {
    id: 'emp-att-006',
    employeeId: 'emp-003',
    employeeName: 'Dr. Robert Chen',
    employeeEmail: 'robert.chen@lms.demo',
    role: 'faculty',
    roleTitle: 'Assistant Professor, Data Science',
    department: 'Data Science',
    departmentId: 'dep-003',
    date: '2026-10-21',
    status: 'on_leave',
    leaveType: 'duty',
    notes: 'Official Duty Leave: IEEE Data Engineering Conference 2026'
  },
  {
    id: 'emp-att-007',
    employeeId: 'emp-004',
    employeeName: 'Elena Rostova',
    employeeEmail: 'elena.rostova@lms.demo',
    role: 'faculty',
    roleTitle: 'Senior Lecturer, Distributed Systems',
    department: 'Engineering',
    departmentId: 'dep-001',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '08:58 AM',
    checkOutTime: '05:10 PM',
    notes: 'Database concurrency practical lab'
  },
  {
    id: 'emp-att-008',
    employeeId: 'emp-005',
    employeeName: 'Carlos Mendez',
    employeeEmail: 'carlos.mendez@lms.demo',
    role: 'trainer',
    roleTitle: 'Technical Instructor, DevOps',
    department: 'Engineering',
    departmentId: 'dep-001',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '09:05 AM',
    checkOutTime: '05:20 PM',
    notes: 'Kubernetes sandbox mentoring'
  },

  // --- 2. ADMINISTRATIVE STAFF (5) ---
  {
    id: 'emp-att-009',
    employeeId: 'u-002',
    employeeName: 'Marcus Johnson',
    employeeEmail: 'orgadmin@lms.demo',
    role: 'admin_staff',
    roleTitle: 'Campus Operations Director & Institution Admin',
    department: 'Administration',
    departmentId: 'dep-007',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '08:15 AM',
    checkOutTime: '06:00 PM',
    notes: 'Campus administrative review & faculty oversight'
  },
  {
    id: 'emp-att-010',
    employeeId: 'emp-006',
    employeeName: 'Rachel Adams',
    employeeEmail: 'rachel.adams@lms.demo',
    role: 'admin_staff',
    roleTitle: 'Head Registrar & Academic Admissions',
    department: 'Administration',
    departmentId: 'dep-007',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '08:30 AM',
    checkOutTime: '05:00 PM',
    notes: 'Fall admissions auditing'
  },
  {
    id: 'emp-att-011',
    employeeId: 'emp-007',
    employeeName: 'David Miller',
    employeeEmail: 'david.miller@lms.demo',
    role: 'admin_staff',
    roleTitle: 'Academic Affairs Officer',
    department: 'Administration',
    departmentId: 'dep-007',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '08:40 AM',
    checkOutTime: '05:15 PM',
    notes: 'Student petitions and faculty workload planning'
  },
  {
    id: 'emp-att-012',
    employeeId: 'emp-008',
    employeeName: 'Anita Desai',
    employeeEmail: 'anita.desai@lms.demo',
    role: 'admin_staff',
    roleTitle: 'Compliance & Quality Assurance Officer',
    department: 'Administration',
    departmentId: 'dep-007',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '09:00 AM',
    checkOutTime: '05:30 PM',
    notes: 'Accreditation dossier preparation'
  },
  {
    id: 'emp-att-013',
    employeeId: 'u-001',
    employeeName: 'Sarah Chen',
    employeeEmail: 'admin@lms.demo',
    role: 'admin_staff',
    roleTitle: 'Executive Administrator & Platform Liaison',
    department: 'Administration',
    departmentId: 'dep-007',
    date: '2026-10-21',
    status: 'remote',
    checkInTime: '08:00 AM',
    notes: 'Executive planning & multi-tenant policy audit'
  },

  // --- 3. NON-TEACHING & SUPPORT STAFF (5) ---
  {
    id: 'emp-att-014',
    employeeId: 'emp-009',
    employeeName: 'Thomas Clark',
    employeeEmail: 'thomas.clark@lms.demo',
    role: 'support_staff',
    roleTitle: 'Lead IT Systems & Infrastructure Specialist',
    department: 'IT Services',
    departmentId: 'dep-001',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '07:45 AM',
    checkOutTime: '04:45 PM',
    notes: 'Campus server nodes & network switch maintenance'
  },
  {
    id: 'emp-att-015',
    employeeId: 'emp-010',
    employeeName: 'Grace Hopper',
    employeeEmail: 'grace.hopper@lms.demo',
    role: 'support_staff',
    roleTitle: 'Cloud Lab Sandbox Technician',
    department: 'IT Services',
    departmentId: 'dep-001',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '08:10 AM',
    checkOutTime: '05:00 PM',
    notes: 'Docker runner and developer VM instances monitoring'
  },
  {
    id: 'emp-att-016',
    employeeId: 'emp-011',
    employeeName: 'Samuel Osei',
    employeeEmail: 'samuel.osei@lms.demo',
    role: 'support_staff',
    roleTitle: 'Campus Facilities & Safety Coordinator',
    department: 'Facilities',
    departmentId: 'dep-007',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '07:30 AM',
    checkOutTime: '04:30 PM',
    notes: 'Classroom hardware inspections'
  },
  {
    id: 'emp-att-017',
    employeeId: 'emp-012',
    employeeName: 'Miriam Vance',
    employeeEmail: 'miriam.vance@lms.demo',
    role: 'support_staff',
    roleTitle: 'Digital Library & Academic Resources Specialist',
    department: 'Academic Resources',
    departmentId: 'dep-002',
    date: '2026-10-21',
    status: 'present',
    checkInTime: '08:55 AM',
    checkOutTime: '05:25 PM',
    notes: 'E-book license renewals & research cataloging'
  },
  {
    id: 'emp-att-018',
    employeeId: 'emp-013',
    employeeName: 'Kevin Patel',
    employeeEmail: 'kevin.patel@lms.demo',
    role: 'support_staff',
    roleTitle: 'Examination Proctoring Supervisor',
    department: 'Assessment Services',
    departmentId: 'dep-007',
    date: '2026-10-21',
    status: 'absent',
    notes: 'Unplanned absence reported: Personal medical emergency'
  }
];

export interface DepartmentAttendanceSummary {
  department: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
  rate: number;
}

export function getEmployeeAttendanceSummary(period: 'today' | 'week' | 'month' = 'today'): EmployeeAttendanceSummary {
  if (period === 'today') {
    const total = mockEmployeeAttendanceRecords.length;
    const presentCount = mockEmployeeAttendanceRecords.filter(r => r.status === 'present' || r.status === 'remote').length;
    const absentCount = mockEmployeeAttendanceRecords.filter(r => r.status === 'absent').length;
    const approvedLeaveCount = mockEmployeeAttendanceRecords.filter(r => r.status === 'on_leave').length;
    const remoteCount = mockEmployeeAttendanceRecords.filter(r => r.status === 'remote').length;
    const attendanceRate = total > 0 ? parseFloat(((presentCount / total) * 100).toFixed(1)) : 0;

    return {
      reportingPeriod: 'Today (Oct 21, 2026)',
      totalEmployees: total,
      presentCount,
      absentCount,
      approvedLeaveCount,
      remoteCount,
      attendanceRate
    };
  }

  if (period === 'week') {
    return {
      reportingPeriod: 'This Week (Oct 17 – Oct 21, 2026)',
      totalEmployees: 18,
      presentCount: 17,
      absentCount: 0,
      approvedLeaveCount: 1,
      remoteCount: 2,
      attendanceRate: 94.4
    };
  }

  return {
    reportingPeriod: 'This Month (October 2026)',
    totalEmployees: 18,
    presentCount: 17,
    absentCount: 0,
    approvedLeaveCount: 1,
    remoteCount: 3,
    attendanceRate: 93.8
  };
}

export function getDepartmentEmployeeAttendance(): DepartmentAttendanceSummary[] {
  const depts: Record<string, { total: number; present: number; absent: number; leave: number }> = {};

  mockEmployeeAttendanceRecords.forEach((emp) => {
    const deptName = emp.department;
    if (!depts[deptName]) {
      depts[deptName] = { total: 0, present: 0, absent: 0, leave: 0 };
    }
    depts[deptName].total += 1;
    if (emp.status === 'present' || emp.status === 'remote') {
      depts[deptName].present += 1;
    } else if (emp.status === 'absent') {
      depts[deptName].absent += 1;
    } else if (emp.status === 'on_leave') {
      depts[deptName].leave += 1;
    }
  });

  return Object.entries(depts).map(([department, data]) => ({
    department,
    total: data.total,
    present: data.present,
    absent: data.absent,
    leave: data.leave,
    rate: data.total > 0 ? parseFloat(((data.present / data.total) * 100).toFixed(1)) : 0
  }));
}
