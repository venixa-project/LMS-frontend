// ============================================================
// LMS - Mock Student Attendance Dataset
// Strictly represents enrolled learners attending scheduled academic cohorts
// Excludes all faculty, administrators, and non-teaching staff
// ============================================================

import {
  StudentSessionAttendanceRecord,
  StudentAttendanceSummary,
  CohortAttendanceSummary
} from '../types';

export const mockStudentAttendanceRecords: StudentSessionAttendanceRecord[] = [
  // --- Cohort 1: Q4 2026 Engineering Onboarding (coh-001, ENG-Q4-26) ---
  {
    id: 'att-st-001',
    studentId: 'st-1',
    studentName: 'Alex Rivera',
    studentEmail: 'alex@lms.demo',
    rollNo: 'STU-2026-001',
    cohortId: 'coh-001',
    cohortName: 'Q4 2026 Engineering Onboarding',
    cohortCode: 'ENG-Q4-26',
    courseTitle: 'JavaScript Fundamentals & Architecture',
    date: '2026-10-21',
    timeSlot: '09:00 - 10:30 AM',
    facultyName: 'Dr. James Wilson',
    status: 'present',
    method: 'Biometric Lab Terminal',
    notes: 'Checked in 08:58 AM'
  },
  {
    id: 'att-st-002',
    studentId: 'st-2',
    studentName: 'Daniel Wu',
    studentEmail: 'daniel.wu@acmelearning.com',
    rollNo: 'STU-2026-002',
    cohortId: 'coh-001',
    cohortName: 'Q4 2026 Engineering Onboarding',
    cohortCode: 'ENG-Q4-26',
    courseTitle: 'JavaScript Fundamentals & Architecture',
    date: '2026-10-21',
    timeSlot: '09:00 - 10:30 AM',
    facultyName: 'Dr. James Wilson',
    status: 'present',
    method: 'RFID Lecture Hall Reader',
    notes: 'Checked in 08:55 AM'
  },
  {
    id: 'att-st-003',
    studentId: 'st-3',
    studentName: 'Elena Rostova',
    studentEmail: 'elena.r@acmelearning.com',
    rollNo: 'STU-2026-003',
    cohortId: 'coh-001',
    cohortName: 'Q4 2026 Engineering Onboarding',
    cohortCode: 'ENG-Q4-26',
    courseTitle: 'JavaScript Fundamentals & Architecture',
    date: '2026-10-21',
    timeSlot: '09:00 - 10:30 AM',
    facultyName: 'Dr. James Wilson',
    status: 'late',
    method: 'Biometric Lab Terminal',
    notes: 'Checked in 09:12 AM (12 min late)'
  },
  {
    id: 'att-st-004',
    studentId: 'st-4',
    studentName: 'Kwame Mensah',
    studentEmail: 'kwame.m@acmelearning.com',
    rollNo: 'STU-2026-004',
    cohortId: 'coh-001',
    cohortName: 'Q4 2026 Engineering Onboarding',
    cohortCode: 'ENG-Q4-26',
    courseTitle: 'JavaScript Fundamentals & Architecture',
    date: '2026-10-21',
    timeSlot: '09:00 - 10:30 AM',
    facultyName: 'Dr. James Wilson',
    status: 'absent',
    method: 'Automated Absentees Scanner',
    notes: 'Unexcused morning absence'
  },
  {
    id: 'att-st-005',
    studentId: 'st-5',
    studentName: 'Sophia Patel',
    studentEmail: 'sophia.p@acmelearning.com',
    rollNo: 'STU-2026-005',
    cohortId: 'coh-001',
    cohortName: 'Q4 2026 Engineering Onboarding',
    cohortCode: 'ENG-Q4-26',
    courseTitle: 'JavaScript Fundamentals & Architecture',
    date: '2026-10-21',
    timeSlot: '09:00 - 10:30 AM',
    facultyName: 'Dr. James Wilson',
    status: 'excused',
    method: 'Dean Academic Leave Portal',
    notes: 'Approved Medical Absence (Ref #MED-8819)'
  },
  {
    id: 'att-st-006',
    studentId: 'u-007',
    studentName: 'Alex Thompson',
    studentEmail: 'student@lms.demo',
    rollNo: 'STU-2026-007',
    cohortId: 'coh-001',
    cohortName: 'Q4 2026 Engineering Onboarding',
    cohortCode: 'ENG-Q4-26',
    courseTitle: 'JavaScript Fundamentals & Architecture',
    date: '2026-10-21',
    timeSlot: '09:00 - 10:30 AM',
    facultyName: 'Dr. James Wilson',
    status: 'present',
    method: 'Biometric Lab Terminal',
    notes: 'Full session 90 mins'
  },
  {
    id: 'att-st-007',
    studentId: 'u-009',
    studentName: 'Maria Garcia',
    studentEmail: 'maria.garcia@lms.demo',
    rollNo: 'STU-2026-009',
    cohortId: 'coh-001',
    cohortName: 'Q4 2026 Engineering Onboarding',
    cohortCode: 'ENG-Q4-26',
    courseTitle: 'JavaScript Fundamentals & Architecture',
    date: '2026-10-21',
    timeSlot: '09:00 - 10:30 AM',
    facultyName: 'Dr. James Wilson',
    status: 'present',
    method: 'Zoom In-App Telemetry (88m)',
    notes: 'Attended remote lab link'
  },
  {
    id: 'att-st-008',
    studentId: 'u-010',
    studentName: 'David Kim',
    studentEmail: 'david.kim@lms.demo',
    rollNo: 'STU-2026-010',
    cohortId: 'coh-001',
    cohortName: 'Q4 2026 Engineering Onboarding',
    cohortCode: 'ENG-Q4-26',
    courseTitle: 'JavaScript Fundamentals & Architecture',
    date: '2026-10-21',
    timeSlot: '09:00 - 10:30 AM',
    facultyName: 'Dr. James Wilson',
    status: 'present',
    method: 'RFID Lecture Hall Reader',
    notes: 'Checked in 08:50 AM'
  },

  // --- Cohort 2: Advanced React Bootcamp (coh-002, REACT-ADV) ---
  {
    id: 'att-st-009',
    studentId: 'st-6',
    studentName: 'Marcus Bell',
    studentEmail: 'marcus.b@acmelearning.com',
    rollNo: 'STU-2026-006',
    cohortId: 'coh-002',
    cohortName: 'Advanced React Bootcamp',
    cohortCode: 'REACT-ADV',
    courseTitle: 'Advanced React & Component Design Patterns',
    date: '2026-10-21',
    timeSlot: '11:00 - 12:30 PM',
    facultyName: 'Dr. James Wilson',
    status: 'present',
    method: 'Zoom In-App Telemetry (90m)',
    notes: 'Virtual Studio Room A'
  },
  {
    id: 'att-st-010',
    studentId: 'u-006',
    studentName: 'Aisha Patel',
    studentEmail: 'aisha.patel@lms.demo',
    rollNo: 'STU-2026-008',
    cohortId: 'coh-002',
    cohortName: 'Advanced React Bootcamp',
    cohortCode: 'REACT-ADV',
    courseTitle: 'Advanced React & Component Design Patterns',
    date: '2026-10-21',
    timeSlot: '11:00 - 12:30 PM',
    facultyName: 'Dr. James Wilson',
    status: 'present',
    method: 'Zoom In-App Telemetry (89m)',
    notes: 'Virtual Studio Room A'
  },
  {
    id: 'att-st-011',
    studentId: 'u-008',
    studentName: 'Taylor Blake',
    studentEmail: 'taylor.blake@lms.demo',
    rollNo: 'STU-2026-011',
    cohortId: 'coh-002',
    cohortName: 'Advanced React Bootcamp',
    cohortCode: 'REACT-ADV',
    courseTitle: 'Advanced React & Component Design Patterns',
    date: '2026-10-21',
    timeSlot: '11:00 - 12:30 PM',
    facultyName: 'Dr. James Wilson',
    status: 'absent',
    method: 'Session Telemetry Monitor',
    notes: 'No session join detected'
  },
  {
    id: 'att-st-012',
    studentId: 'st-7',
    studentName: 'Liam O\'Connor',
    studentEmail: 'liam.o@acmelearning.com',
    rollNo: 'STU-2026-012',
    cohortId: 'coh-002',
    cohortName: 'Advanced React Bootcamp',
    cohortCode: 'REACT-ADV',
    courseTitle: 'Advanced React & Component Design Patterns',
    date: '2026-10-21',
    timeSlot: '11:00 - 12:30 PM',
    facultyName: 'Dr. James Wilson',
    status: 'excused',
    method: 'Academic Affairs Duty Order',
    notes: 'Inter-College Hackathon Delegation'
  },

  // --- Cohort 3: Summer Python Intensive (coh-005, PY-SUM) ---
  {
    id: 'att-st-013',
    studentId: 'st-8',
    studentName: 'Chloe Bennett',
    studentEmail: 'chloe.b@acmelearning.com',
    rollNo: 'STU-2026-013',
    cohortId: 'coh-005',
    cohortName: 'Summer Python Intensive',
    cohortCode: 'PY-SUM',
    courseTitle: 'Python Data Analysis & Pipelines',
    date: '2026-10-21',
    timeSlot: '02:00 - 03:30 PM',
    facultyName: 'Prof. Priya Sharma',
    status: 'present',
    method: 'Biometric Lab Terminal',
    notes: 'Data Science Lab 3'
  },
  {
    id: 'att-st-014',
    studentId: 'st-9',
    studentName: 'Rohan Gupta',
    studentEmail: 'rohan.g@acmelearning.com',
    rollNo: 'STU-2026-014',
    cohortId: 'coh-005',
    cohortName: 'Summer Python Intensive',
    cohortCode: 'PY-SUM',
    courseTitle: 'Python Data Analysis & Pipelines',
    date: '2026-10-21',
    timeSlot: '02:00 - 03:30 PM',
    facultyName: 'Prof. Priya Sharma',
    status: 'present',
    method: 'Biometric Lab Terminal',
    notes: 'Data Science Lab 3'
  },
  {
    id: 'att-st-015',
    studentId: 'st-10',
    studentName: 'Zoe Martinez',
    studentEmail: 'zoe.m@acmelearning.com',
    rollNo: 'STU-2026-015',
    cohortId: 'coh-005',
    cohortName: 'Summer Python Intensive',
    cohortCode: 'PY-SUM',
    courseTitle: 'Python Data Analysis & Pipelines',
    date: '2026-10-21',
    timeSlot: '02:00 - 03:30 PM',
    facultyName: 'Prof. Priya Sharma',
    status: 'absent',
    method: 'Lab Attendance Console',
    notes: 'Unreported absence'
  },
  // --- Cohort 4: Leadership Development 2026 (coh-004, LEAD-26) ---
  {
    id: 'att-st-016',
    studentId: 'st-16',
    studentName: 'Julian Vance',
    studentEmail: 'julian.v@acmelearning.com',
    rollNo: 'STU-2026-016',
    cohortId: 'coh-004',
    cohortName: 'Leadership Development 2026',
    cohortCode: 'LEAD-26',
    courseTitle: 'Strategic Leadership & Management',
    date: '2026-10-21',
    timeSlot: '03:30 - 05:00 PM',
    facultyName: 'Prof. Elena Rostova',
    status: 'present',
    method: 'Seminar RFID Badge Terminal',
    notes: 'Checked in 03:26 PM'
  },
  {
    id: 'att-st-017',
    studentId: 'st-17',
    studentName: 'Chloe Dupont',
    studentEmail: 'chloe.d@acmelearning.com',
    rollNo: 'STU-2026-017',
    cohortId: 'coh-004',
    cohortName: 'Leadership Development 2026',
    cohortCode: 'LEAD-26',
    courseTitle: 'Strategic Leadership & Management',
    date: '2026-10-21',
    timeSlot: '03:30 - 05:00 PM',
    facultyName: 'Prof. Elena Rostova',
    status: 'late',
    method: 'Executive Lab Terminal',
    notes: 'Checked in 03:42 PM (12m late)'
  },
  // --- Cohort 5: Data Science Foundation (coh-003, DS-FND) ---
  {
    id: 'att-st-018',
    studentId: 'st-18',
    studentName: 'Kenji Sato',
    studentEmail: 'kenji.s@acmelearning.com',
    rollNo: 'STU-2026-018',
    cohortId: 'coh-003',
    cohortName: 'Data Science Foundation',
    cohortCode: 'DS-FND',
    courseTitle: 'Python for Data Science',
    date: '2026-10-21',
    timeSlot: '10:00 - 11:30 AM',
    facultyName: 'Dr. Marcus Bell',
    status: 'present',
    method: 'Biometric Lab Terminal',
    notes: 'Checked in 09:55 AM'
  },
  {
    id: 'att-st-019',
    studentId: 'st-19',
    studentName: 'Amara Okafor',
    studentEmail: 'amara.o@acmelearning.com',
    rollNo: 'STU-2026-019',
    cohortId: 'coh-003',
    cohortName: 'Data Science Foundation',
    cohortCode: 'DS-FND',
    courseTitle: 'Python for Data Science',
    date: '2026-10-21',
    timeSlot: '10:00 - 11:30 AM',
    facultyName: 'Dr. Marcus Bell',
    status: 'excused',
    method: 'Dean Academic Leave Portal',
    notes: 'Approved Academic Conference Leave'
  }
];

// Aggregation summary for the 3 scheduled cohorts (total expected: 60 students)
export function getStudentAttendanceSummary(period: 'today' | 'week' | 'month' = 'today'): StudentAttendanceSummary {
  if (mockStudentAttendanceRecords.length === 0) {
    return {
      reportingPeriod: 'Today (Oct 21, 2026)',
      totalExpected: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      approvedLeaveCount: 0,
      attendanceRate: 0,
    };
  }

  if (period === 'week') {
    // Aggregated 5-day academic week
    const totalExpected = 300;
    const presentCount = 276;
    const lateCount = 9;
    const absentCount = 14;
    const approvedLeaveCount = 10;
    const attendanceRate = Math.round((presentCount / totalExpected) * 1000) / 10; // 92.0%
    return {
      reportingPeriod: 'This Week (Oct 19–23, 2026)',
      totalExpected,
      presentCount,
      lateCount,
      absentCount,
      approvedLeaveCount,
      attendanceRate
    };
  }

  if (period === 'month') {
    // Aggregated monthly cycle (October 2026)
    const totalExpected = 1200;
    const presentCount = 1098;
    const lateCount = 34;
    const absentCount = 62;
    const approvedLeaveCount = 40;
    const attendanceRate = Math.round((presentCount / totalExpected) * 1000) / 10; // 91.5%
    return {
      reportingPeriod: 'This Month (October 2026)',
      totalExpected,
      presentCount,
      lateCount,
      absentCount,
      approvedLeaveCount,
      attendanceRate
    };
  }

  // Today (Oct 21, 2026)
  // 60 expected students scheduled across the 3 cohorts:
  // Cohort 1: 28 expected (26 present/late, 1 absent, 1 excused)
  // Cohort 2: 22 expected (20 present/late, 1 absent, 1 excused)
  // Cohort 3: 10 expected (9 present/late, 1 absent, 0 excused)
  const totalExpected = 60;
  const presentCount = 55; // 53 on-time + 2 late
  const lateCount = 2;
  const absentCount = 3;
  const approvedLeaveCount = 2;
  const attendanceRate = Math.round((presentCount / totalExpected) * 1000) / 10; // 91.7%

  return {
    reportingPeriod: 'Today (Oct 21, 2026)',
    totalExpected,
    presentCount,
    lateCount,
    absentCount,
    approvedLeaveCount,
    attendanceRate
  };
}

// Cohort-wise attendance breakdown
export function getCohortStudentAttendance(): CohortAttendanceSummary[] {
  return [
    {
      cohortId: 'coh-001',
      cohortName: 'Q4 2026 Engineering Onboarding',
      cohortCode: 'ENG-Q4-26',
      courseTitle: 'JavaScript Fundamentals & Architecture',
      facultyName: 'Dr. James Wilson',
      totalExpected: 28,
      presentCount: 26,
      absentCount: 1,
      approvedLeaveCount: 1,
      attendanceRate: 92.9
    },
    {
      cohortId: 'coh-002',
      cohortName: 'Advanced React Bootcamp',
      cohortCode: 'REACT-ADV',
      courseTitle: 'Advanced React & Component Design Patterns',
      facultyName: 'Dr. James Wilson',
      totalExpected: 22,
      presentCount: 20,
      absentCount: 1,
      approvedLeaveCount: 1,
      attendanceRate: 90.9
    },
    {
      cohortId: 'coh-005',
      cohortName: 'Summer Python Intensive',
      cohortCode: 'PY-SUM',
      courseTitle: 'Python Data Analysis & Pipelines',
      facultyName: 'Prof. Priya Sharma',
      totalExpected: 10,
      presentCount: 9,
      absentCount: 1,
      approvedLeaveCount: 0,
      attendanceRate: 90.0
    },
    {
      cohortId: 'coh-004',
      cohortName: 'Leadership Development 2026',
      cohortCode: 'LEAD-26',
      courseTitle: 'Strategic Leadership & Management',
      facultyName: 'Prof. Elena Rostova',
      totalExpected: 18,
      presentCount: 17,
      absentCount: 1,
      approvedLeaveCount: 0,
      attendanceRate: 94.4
    },
    {
      cohortId: 'coh-003',
      cohortName: 'Data Science Foundation',
      cohortCode: 'DS-FND',
      courseTitle: 'Python for Data Science',
      facultyName: 'Dr. Marcus Bell',
      totalExpected: 16,
      presentCount: 15,
      absentCount: 0,
      approvedLeaveCount: 1,
      attendanceRate: 93.8
    }
  ];
}
