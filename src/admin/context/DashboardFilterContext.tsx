import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode, useCallback } from 'react';
import { useCourseStore } from '../../lib/courseStore';
import { usePeopleStore } from '../../lib/peopleStore';
import { apiClient } from '../../lib/apiClient';
import type { Course } from '../../types';

export type DashboardDateRange = '30d' | '6m' | '1y' | 'custom';

export interface MonthlyGrowthPoint {
  month: string;           // e.g. "May 2026"
  monthShort: string;      // e.g. "May"
  periodName: string;      // full label for tooltip
  activeLearners: number;
  newEnrollments: number;
  completions: number;
  growthRatePct: number;   // percentage vs prior period
  x: number;
  y: number;
}

export interface CourseStatBarItem {
  label: string;
  periodName: string;
  enrollments: number;
  completions: number;
}

export interface DashboardKPISummary {
  totalStudents: number;
  totalEnrolledStudents: number;
  totalFaculty: number;
  activeCourses: number;
  activeLearners: number;
  velocityPct: string;
  retentionRate: string;
}

export interface DashboardFilterContextType {
  departmentId: string;
  courseId: string;
  dateRange: DashboardDateRange;
  startDate: string;
  endDate: string;
  isFiltered: boolean;
  activeFiltersCount: number;
  periodLabel: string;
  availableCourses: Course[];
  kpiSummary: DashboardKPISummary;
  monthlyGrowthData: MonthlyGrowthPoint[];
  enrollmentStatsData: CourseStatBarItem[];
  setDepartmentId: (deptId: string) => void;
  setCourseId: (courseId: string) => void;
  setDateRange: (range: DashboardDateRange) => void;
  setStartDate: (start: string) => void;
  setEndDate: (end: string) => void;
  setCustomDateRange: (start: string, end: string) => void;
  resetFilters: () => void;
  isLoading: boolean;
}

const DashboardFilterContext = createContext<DashboardFilterContextType | undefined>(undefined);

const DEFAULT_START_DATE = '2026-05-01';
const DEFAULT_END_DATE = '2026-10-23';

export const DashboardFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { courses, fetchCourses } = useCourseStore();
  const { fetchPeople, users: peopleUsers } = usePeopleStore();

  const [departmentId, setDepartmentIdState] = useState<string>('all');
  const [courseId, setCourseIdState] = useState<string>('all');
  const [dateRange, setDateRangeState] = useState<DashboardDateRange>('6m');
  const [startDate, setStartDateState] = useState<string>(DEFAULT_START_DATE);
  const [endDate, setEndDateState] = useState<string>(DEFAULT_END_DATE);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendKpis, setBackendKpis] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<{
    monthlyGrowthData: MonthlyGrowthPoint[];
    enrollmentStatsData: CourseStatBarItem[];
  }>({
    monthlyGrowthData: [],
    enrollmentStatsData: [],
  });

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchCourses().catch(() => {}),
        fetchPeople().catch(() => {}),
      ]);

      const [kpiRes, analyticsRes] = await Promise.all([
        apiClient.get<any>('/reports/kpis').catch(() => null),
        apiClient.get<any>(`/reports/dashboard-analytics?dateRange=${dateRange}`).catch(() => null),
      ]);

      if (kpiRes && kpiRes.data) {
        setBackendKpis(kpiRes.data);
      }

      if (analyticsRes && analyticsRes.data) {
        setAnalyticsData({
          monthlyGrowthData: analyticsRes.data.monthlyGrowthData || [],
          enrollmentStatsData: analyticsRes.data.enrollmentStatsData || [],
        });
      }
    } catch (err) {
      console.warn('Failed to load dashboard backend data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, fetchCourses, fetchPeople]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Clean genuine courses available in current scope
  const cleanCourses = useMemo(() => {
    return courses.filter((c) => !c.id.startsWith('crs-00') && c.status !== 'archived');
  }, [courses]);

  // Available courses cascading based on selected department
  const availableCourses = useMemo(() => {
    if (departmentId === 'all') {
      return cleanCourses;
    }
    return cleanCourses.filter((c) => c.departmentId === departmentId);
  }, [cleanCourses, departmentId]);

  const setDepartmentId = (newDeptId: string) => {
    setDepartmentIdState(newDeptId);
    if (newDeptId !== 'all') {
      const isCourseCompatible = availableCourses.some((c) => c.id === courseId && c.departmentId === newDeptId);
      if (!isCourseCompatible && courseId !== 'all') {
        setCourseIdState('all');
      }
    }
  };

  const setCourseId = (newCourseId: string) => {
    setCourseIdState(newCourseId);
    if (newCourseId !== 'all' && departmentId === 'all') {
      const courseObj = cleanCourses.find((c) => c.id === newCourseId);
      if (courseObj?.departmentId) {
        setDepartmentIdState(courseObj.departmentId);
      }
    }
  };

  const setDateRange = (range: DashboardDateRange) => {
    setDateRangeState(range);
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    const formatDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    setEndDateState(formatDate(now));
    if (range === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDateState(formatDate(past));
    } else if (range === '6m') {
      const past = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      setStartDateState(formatDate(past));
    } else if (range === '1y') {
      const past = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      setStartDateState(formatDate(past));
    }
  };

  const setStartDate = (start: string) => {
    setDateRangeState('custom');
    setStartDateState(start);
  };

  const setEndDate = (end: string) => {
    setDateRangeState('custom');
    setEndDateState(end);
  };

  const setCustomDateRange = (start: string, end: string) => {
    setDateRangeState('custom');
    setStartDateState(start);
    setEndDateState(end);
  };

  const resetFilters = () => {
    setDepartmentIdState('all');
    setCourseIdState('all');
    setDateRangeState('6m');
    setStartDateState(DEFAULT_START_DATE);
    setEndDateState(DEFAULT_END_DATE);
  };

  const isFiltered = useMemo(() => {
    return (
      departmentId !== 'all' ||
      courseId !== 'all' ||
      startDate !== DEFAULT_START_DATE ||
      endDate !== DEFAULT_END_DATE
    );
  }, [departmentId, courseId, startDate, endDate]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (departmentId !== 'all') count++;
    if (courseId !== 'all') count++;
    if (startDate !== DEFAULT_START_DATE || endDate !== DEFAULT_END_DATE) count++;
    return count;
  }, [departmentId, courseId, startDate, endDate]);

  const periodLabel = useMemo(() => {
    const formatD = (dStr: string) => {
      try {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const m = parseInt(parts[1], 10) - 1;
          return `${mNames[m] || parts[1]} ${parts[2]}, ${parts[0]}`;
        }
        return dStr;
      } catch {
        return dStr;
      }
    };
    return `${formatD(startDate)} – ${formatD(endDate)}`;
  }, [startDate, endDate]);

  // Derive genuine counts directly from real backend and clean course store
  const kpiSummary: DashboardKPISummary = useMemo(() => {
    const fallbackStudents = peopleUsers ? peopleUsers.filter((u) => u.activeRole === 'student' || u.activeRole === 'learner').length : 0;
    const fallbackFaculty = peopleUsers ? peopleUsers.filter((u) => u.activeRole === 'trainer' || u.activeRole === 'instructor').length : 0;

    const baseStudents = backendKpis?.totalStudents ?? fallbackStudents;
    const baseFaculty = backendKpis?.totalFaculty ?? fallbackFaculty;

    // Scope to specific course if filtered
    if (courseId !== 'all') {
      const selected = availableCourses.find((c) => c.id === courseId);
      const courseLearners = selected ? (selected.enrolledLearners || selected.learnerCount || 0) : 0;
      return {
        totalStudents: baseStudents,
        totalEnrolledStudents: courseLearners,
        totalFaculty: baseFaculty,
        activeCourses: selected && selected.status === 'published' ? 1 : 0,
        activeLearners: courseLearners,
        velocityPct: courseLearners > 0 ? '+100%' : '0%',
        retentionRate: courseLearners > 0 ? '100%' : '0%',
      };
    }

    const totalEnrolled = backendKpis?.totalEnrolledStudents ??
      availableCourses.reduce((sum, c) => sum + (c.enrolledLearners || c.learnerCount || 0), 0);
    const activeLearners = backendKpis?.activeLearners ?? totalEnrolled;
    const activeCoursesCount = availableCourses.filter((c) => c.status === 'published').length;

    return {
      totalStudents: baseStudents,
      totalEnrolledStudents: totalEnrolled,
      totalFaculty: baseFaculty,
      activeCourses: activeCoursesCount,
      activeLearners,
      velocityPct: backendKpis?.velocityPct || (activeLearners > 0 ? '+100%' : '0%'),
      retentionRate: backendKpis?.retentionRate || (activeLearners > 0 ? '100%' : '0%'),
    };
  }, [backendKpis, peopleUsers, courseId, availableCourses]);

  const value: DashboardFilterContextType = {
    departmentId,
    courseId,
    dateRange,
    startDate,
    endDate,
    isFiltered,
    activeFiltersCount,
    periodLabel,
    availableCourses,
    kpiSummary,
    monthlyGrowthData: analyticsData.monthlyGrowthData,
    enrollmentStatsData: analyticsData.enrollmentStatsData,
    setDepartmentId,
    setCourseId,
    setDateRange,
    setStartDate,
    setEndDate,
    setCustomDateRange,
    resetFilters,
    isLoading,
  };

  return (
    <DashboardFilterContext.Provider value={value}>
      {children}
    </DashboardFilterContext.Provider>
  );
};

export const useDashboardFilters = (): DashboardFilterContextType => {
  const context = useContext(DashboardFilterContext);
  if (!context) {
    throw new Error('useDashboardFilters must be used within a DashboardFilterProvider');
  }
  return context;
};
