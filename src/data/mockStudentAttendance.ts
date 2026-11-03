// ============================================================
// LMS - Student Attendance Dataset (Clean / Empty Production State)
// ============================================================
import {
  StudentSessionAttendanceRecord,
  StudentAttendanceSummary,
  CohortAttendanceSummary
} from '../types';

export const mockStudentAttendanceRecords: StudentSessionAttendanceRecord[] = [];

// Aggregation summary for cohorts
export function getStudentAttendanceSummary(period: 'today' | 'week' | 'month' = 'today'): StudentAttendanceSummary {
  return {
    reportingPeriod: period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'Today',
    totalExpected: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    approvedLeaveCount: 0,
    attendanceRate: 0,
  };
}

// Cohort-wise attendance breakdown
export function getCohortStudentAttendance(): CohortAttendanceSummary[] {
  return [];
}
