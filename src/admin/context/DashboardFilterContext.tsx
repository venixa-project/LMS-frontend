import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { mockDepartments, mockCourses, mockCertificates } from '../../data/mockData';
import { mockUsers } from '../../data/mockUsers';

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
  availableCourses: typeof mockCourses;
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
}

const DashboardFilterContext = createContext<DashboardFilterContextType | undefined>(undefined);

const DEFAULT_START_DATE = '2026-05-01';
const DEFAULT_END_DATE = '2026-10-23';

export const DashboardFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [departmentId, setDepartmentIdState] = useState<string>('all');
  const [courseId, setCourseIdState] = useState<string>('all');
  const [dateRange, setDateRangeState] = useState<DashboardDateRange>('custom');
  const [startDate, setStartDateState] = useState<string>(DEFAULT_START_DATE);
  const [endDate, setEndDateState] = useState<string>(DEFAULT_END_DATE);

  // Available courses cascading based on selected department
  const availableCourses = useMemo(() => {
    if (departmentId === 'all') {
      return mockCourses;
    }
    // Also include sub-department courses if departmentId is parent
    const childDeptIds = mockDepartments
      .filter((d) => d.parentId === departmentId)
      .map((d) => d.id);
    return mockCourses.filter(
      (c) => c.departmentId === departmentId || (c.departmentId ? childDeptIds.includes(c.departmentId) : false)
    );
  }, [departmentId]);

  // Handle department change: reset course if incompatible
  const setDepartmentId = (newDeptId: string) => {
    setDepartmentIdState(newDeptId);
    if (newDeptId !== 'all') {
      const childDeptIds = mockDepartments
        .filter((d) => d.parentId === newDeptId)
        .map((d) => d.id);
      const isCourseCompatible = mockCourses.some(
        (c) => c.id === courseId && (c.departmentId === newDeptId || (c.departmentId ? childDeptIds.includes(c.departmentId) : false))
      );
      if (!isCourseCompatible && courseId !== 'all') {
        setCourseIdState('all');
      }
    }
  };

  const setCourseId = (newCourseId: string) => {
    setCourseIdState(newCourseId);
    // If a course is selected and department is 'all', optionally cascade department
    if (newCourseId !== 'all' && departmentId === 'all') {
      const courseObj = mockCourses.find((c) => c.id === newCourseId);
      if (courseObj?.departmentId) {
        // Check if course belongs to a main department or child
        const deptObj = mockDepartments.find((d) => d.id === courseObj.departmentId);
        if (deptObj?.parentId) {
          setDepartmentIdState(deptObj.parentId);
        } else if (deptObj) {
          setDepartmentIdState(deptObj.id);
        }
      }
    }
  };

  const setDateRange = (range: DashboardDateRange) => {
    setDateRangeState(range);
    if (range === '30d') {
      setStartDateState('2026-09-24');
      setEndDateState('2026-10-23');
    } else if (range === '6m') {
      setStartDateState('2026-05-01');
      setEndDateState('2026-10-23');
    } else if (range === '1y') {
      setStartDateState('2025-11-01');
      setEndDateState('2026-10-23');
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
    setDateRangeState('custom');
    setStartDateState(DEFAULT_START_DATE);
    setEndDateState(DEFAULT_END_DATE);
  };

  // Determine if filters are applied
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

  // Formatted human-readable period label
  const periodLabel = useMemo(() => {
    const formatD = (dStr: string) => {
      try {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const mNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const m = parseInt(parts[1]) - 1;
          return `${mNames[m] || parts[1]} ${parts[2]}, ${parts[0]}`;
        }
        return dStr;
      } catch {
        return dStr;
      }
    };
    return `${formatD(startDate)} – ${formatD(endDate)}`;
  }, [startDate, endDate]);

  // Calculate scope multiplier based on department and course
  // This ensures mathematical consistency across KPIs, Activity Growth, and Enrollment Charts!
  const scopeFactor = useMemo(() => {
    // Check if course has 0 learners (e.g., crs-005, crs-006)
    if (courseId !== 'all') {
      const c = mockCourses.find((crs) => crs.id === courseId);
      if (!c || c.learnerCount === 0 || c.status === 'draft') return 0;
      // Normal course ratios relative to overall 892 learners
      if (c.id === 'crs-001') return 0.383; // ~342 / 892
      if (c.id === 'crs-004') return 0.228; // ~204 / 892
      if (c.id === 'crs-002') return 0.175; // ~156 / 892
      if (c.id === 'crs-003') return 0.100; // ~89 / 892
      return 0.12;
    }

    if (departmentId !== 'all') {
      if (departmentId === 'dep-001') return 0.62; // Engineering (major)
      if (departmentId === 'dep-002') return 0.18; // Product & Design
      if (departmentId === 'dep-003') return 0.12; // Data Science
      if (departmentId === 'dep-004') return 0.14; // Frontend
      if (departmentId === 'dep-005') return 0.08; // Backend
      if (departmentId === 'dep-006' || departmentId === 'dep-007') return 0; // Sales/HR: no published courses
      return 0.15;
    }

    return 1.0; // All departments & courses
  }, [departmentId, courseId]);

  // -------------------------------------------------------------
  // 1. KPI Summary Calculation (Students, Total Enrolled, Faculty, Courses, Active)
  // -------------------------------------------------------------
  const kpiSummary: DashboardKPISummary = useMemo(() => {
    // Base counts
    let baseStudents = 124;
    let baseFaculty = 18;
    let baseActive = 892;

    // Total enrollment records across courses in the selected scope
    const totalEnrolledStudents = (() => {
      if (scopeFactor === 0) return 0;
      if (courseId !== 'all') {
        const c = availableCourses.find((crs) => crs.id === courseId);
        return c ? (c.enrolledLearners ?? c.learnerCount ?? 0) : 0;
      }
      return availableCourses.reduce((sum, c) => sum + (c.enrolledLearners ?? c.learnerCount ?? 0), 0);
    })();

    if (scopeFactor === 0) {
      return {
        totalStudents: 0,
        totalEnrolledStudents: 0,
        totalFaculty: departmentId === 'dep-006' ? 2 : departmentId === 'dep-007' ? 1 : 0,
        activeCourses: availableCourses.length,
        activeLearners: 0,
        velocityPct: '0%',
        retentionRate: '0%',
      };
    }

    const filteredStudents = Math.round(baseStudents * (departmentId !== 'all' || courseId !== 'all' ? Math.max(0.12, scopeFactor) : 1));
    const filteredFaculty = departmentId === 'all' && courseId === 'all'
      ? baseFaculty
      : Math.max(1, Math.round(baseFaculty * Math.max(0.2, scopeFactor)));
    const filteredActive = Math.round(baseActive * scopeFactor);

    let vel = '+53.8%';
    let ret = '94.2%';
    if (startDate && endDate) {
      const d1 = new Date(startDate).getTime();
      const d2 = new Date(endDate).getTime();
      const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (days <= 40) {
        vel = '+12.9%';
        ret = '96.4%';
      } else if (days >= 300) {
        vel = '+112.4%';
        ret = '91.8%';
      } else {
        vel = '+48.5%';
        ret = '94.2%';
      }
    }

    return {
      totalStudents: filteredStudents,
      totalEnrolledStudents,
      totalFaculty: filteredFaculty,
      activeCourses: availableCourses.filter((c) => c.status === 'published' || c.status === 'in_review').length,
      activeLearners: filteredActive,
      velocityPct: vel,
      retentionRate: ret,
    };
  }, [scopeFactor, departmentId, courseId, startDate, endDate, availableCourses]);

  // -------------------------------------------------------------
  // 2. Learner Activity & Growth Chart Data Calculation
  // Consecutively ordered months, zero-handling, realistic curves
  // -------------------------------------------------------------
  const monthlyGrowthData: MonthlyGrowthPoint[] = useMemo(() => {
    // If scope factor is 0, produce a valid zero-activity dataset (does not invent random values!)
    const isZero = scopeFactor === 0;

    // A. Last 6 Months: May 2026, Jun 2026, Jul 2026, Aug 2026, Sep 2026, Oct 2026
    if (dateRange === '6m') {
      const base6m = [
        { month: 'May 2026', monthShort: 'May', periodName: 'May 2026', baseActive: 580, baseEnroll: 120, baseComp: 85 },
        { month: 'Jun 2026', monthShort: 'Jun', periodName: 'June 2026', baseActive: 650, baseEnroll: 145, baseComp: 105 },
        { month: 'Jul 2026', monthShort: 'Jul', periodName: 'July 2026', baseActive: 720, baseEnroll: 168, baseComp: 130 },
        { month: 'Aug 2026', monthShort: 'Aug', periodName: 'August 2026', baseActive: 790, baseEnroll: 195, baseComp: 160 },
        { month: 'Sep 2026', monthShort: 'Sep', periodName: 'September 2026', baseActive: 840, baseEnroll: 230, baseComp: 200 },
        { month: 'Oct 2026', monthShort: 'Oct', periodName: 'October 2026', baseActive: 892, baseEnroll: 260, baseComp: 235 },
      ];

      return base6m.map((pt, i) => {
        const act = isZero ? 0 : Math.round(pt.baseActive * scopeFactor);
        const enr = isZero ? 0 : Math.round(pt.baseEnroll * scopeFactor);
        const comp = isZero ? 0 : Math.round(pt.baseComp * scopeFactor);
        const prevAct = i > 0 ? (isZero ? 0 : Math.round(base6m[i - 1].baseActive * scopeFactor)) : act;
        const growth = prevAct > 0 ? Math.round(((act - prevAct) / prevAct) * 1000) / 10 : (i === 0 ? 0 : 0);

        return {
          month: pt.month,
          monthShort: pt.monthShort,
          periodName: pt.periodName,
          activeLearners: act,
          newEnrollments: enr,
          completions: comp,
          growthRatePct: growth,
          x: 50 + (i / 5) * 500, // scaled 50 to 550
          y: isZero ? 180 : Math.max(35, 180 - (act / (950 * Math.max(0.1, scopeFactor))) * 140),
        };
      });
    }

    // B. Last 1 Year: 12 consecutive months (Nov 2025 to Oct 2026)
    if (dateRange === '1y') {
      const base1y = [
        { month: 'Nov 2025', monthShort: 'Nov', periodName: 'November 2025', baseActive: 420, baseEnroll: 85, baseComp: 55 },
        { month: 'Dec 2025', monthShort: 'Dec', periodName: 'December 2025', baseActive: 450, baseEnroll: 90, baseComp: 60 },
        { month: 'Jan 2026', monthShort: 'Jan', periodName: 'January 2026', baseActive: 490, baseEnroll: 95, baseComp: 70 },
        { month: 'Feb 2026', monthShort: 'Feb', periodName: 'February 2026', baseActive: 510, baseEnroll: 100, baseComp: 75 },
        { month: 'Mar 2026', monthShort: 'Mar', periodName: 'March 2026', baseActive: 540, baseEnroll: 110, baseComp: 80 },
        { month: 'Apr 2026', monthShort: 'Apr', periodName: 'April 2026', baseActive: 560, baseEnroll: 115, baseComp: 82 },
        { month: 'May 2026', monthShort: 'May', periodName: 'May 2026', baseActive: 580, baseEnroll: 120, baseComp: 85 },
        { month: 'Jun 2026', monthShort: 'Jun', periodName: 'June 2026', baseActive: 650, baseEnroll: 145, baseComp: 105 },
        { month: 'Jul 2026', monthShort: 'Jul', periodName: 'July 2026', baseActive: 720, baseEnroll: 168, baseComp: 130 },
        { month: 'Aug 2026', monthShort: 'Aug', periodName: 'August 2026', baseActive: 790, baseEnroll: 195, baseComp: 160 },
        { month: 'Sep 2026', monthShort: 'Sep', periodName: 'September 2026', baseActive: 840, baseEnroll: 230, baseComp: 200 },
        { month: 'Oct 2026', monthShort: 'Oct', periodName: 'October 2026', baseActive: 892, baseEnroll: 260, baseComp: 235 },
      ];

      return base1y.map((pt, i) => {
        const act = isZero ? 0 : Math.round(pt.baseActive * scopeFactor);
        const enr = isZero ? 0 : Math.round(pt.baseEnroll * scopeFactor);
        const comp = isZero ? 0 : Math.round(pt.baseComp * scopeFactor);
        const prevAct = i > 0 ? (isZero ? 0 : Math.round(base1y[i - 1].baseActive * scopeFactor)) : act;
        const growth = prevAct > 0 ? Math.round(((act - prevAct) / prevAct) * 1000) / 10 : 0;

        return {
          month: pt.month,
          monthShort: pt.monthShort,
          periodName: pt.periodName,
          activeLearners: act,
          newEnrollments: enr,
          completions: comp,
          growthRatePct: growth,
          x: 45 + (i / 11) * 510, // scaled 45 to 555
          y: isZero ? 180 : Math.max(35, 180 - (act / (950 * Math.max(0.1, scopeFactor))) * 140),
        };
      });
    }

    // C. Last 30 Days: 5 consecutive milestone intervals (Oct 01 - Oct 23)
    if (dateRange === '30d') {
      const base30d = [
        { month: 'Oct 01', monthShort: 'Oct 1', periodName: 'Oct 01 – Oct 07, 2026', baseActive: 810, baseEnroll: 55, baseComp: 40 },
        { month: 'Oct 08', monthShort: 'Oct 8', periodName: 'Oct 08 – Oct 14, 2026', baseActive: 835, baseEnroll: 68, baseComp: 52 },
        { month: 'Oct 15', monthShort: 'Oct 15', periodName: 'Oct 15 – Oct 21, 2026', baseActive: 865, baseEnroll: 72, baseComp: 58 },
        { month: 'Oct 23', monthShort: 'Oct 23', periodName: 'Oct 22 – Oct 23, 2026 (Latest)', baseActive: 892, baseEnroll: 84, baseComp: 64 },
      ];

      return base30d.map((pt, i) => {
        const act = isZero ? 0 : Math.round(pt.baseActive * scopeFactor);
        const enr = isZero ? 0 : Math.round(pt.baseEnroll * scopeFactor);
        const comp = isZero ? 0 : Math.round(pt.baseComp * scopeFactor);
        const prevAct = i > 0 ? (isZero ? 0 : Math.round(base30d[i - 1].baseActive * scopeFactor)) : act;
        const growth = prevAct > 0 ? Math.round(((act - prevAct) / prevAct) * 1000) / 10 : 0;

        return {
          month: pt.month,
          monthShort: pt.monthShort,
          periodName: pt.periodName,
          activeLearners: act,
          newEnrollments: enr,
          completions: comp,
          growthRatePct: growth,
          x: 60 + (i / 3) * 480,
          y: isZero ? 180 : Math.max(35, 180 - (act / (950 * Math.max(0.1, scopeFactor))) * 140),
        };
      });
    }

    // D. Custom Date Range: Parse actual month intervals between startDate and endDate
    const startY = parseInt(startDate.slice(0, 4)) || 2026;
    const startM = parseInt(startDate.slice(5, 7)) || 5;
    const endY = parseInt(endDate.slice(0, 4)) || 2026;
    const endM = parseInt(endDate.slice(5, 7)) || 10;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const customPoints: { month: string; monthShort: string; periodName: string; baseActive: number; baseEnroll: number; baseComp: number }[] = [];

    let curY = startY;
    let curM = startM;
    const maxIter = 24; // safety cap
    let iter = 0;

    while ((curY < endY || (curY === endY && curM <= endM)) && iter < maxIter) {
      const mIdx = curM - 1;
      const mName = monthNames[mIdx];
      const weight = 0.5 + (iter / Math.max(1, (endY - startY) * 12 + (endM - startM))) * 0.5;

      customPoints.push({
        month: `${mName} ${curY}`,
        monthShort: mName,
        periodName: `${mName} ${curY}`,
        baseActive: Math.round(480 + weight * 410),
        baseEnroll: Math.round(90 + weight * 160),
        baseComp: Math.round(60 + weight * 160),
      });

      curM++;
      if (curM > 12) {
        curM = 1;
        curY++;
      }
      iter++;
    }

    // Fallback if custom date range produced zero valid months (e.g. invalid user input)
    if (customPoints.length === 0) {
      customPoints.push({
        month: 'Current Period',
        monthShort: 'Period',
        periodName: `${startDate} to ${endDate}`,
        baseActive: 0,
        baseEnroll: 0,
        baseComp: 0,
      });
    }

    const totalPts = customPoints.length;
    return customPoints.map((pt, i) => {
      const act = isZero ? 0 : Math.round(pt.baseActive * scopeFactor);
      const enr = isZero ? 0 : Math.round(pt.baseEnroll * scopeFactor);
      const comp = isZero ? 0 : Math.round(pt.baseComp * scopeFactor);
      const prevAct = i > 0 ? (isZero ? 0 : Math.round(customPoints[i - 1].baseActive * scopeFactor)) : act;
      const growth = prevAct > 0 ? Math.round(((act - prevAct) / prevAct) * 1000) / 10 : 0;

      return {
        month: pt.month,
        monthShort: pt.monthShort,
        periodName: pt.periodName,
        activeLearners: act,
        newEnrollments: enr,
        completions: comp,
        growthRatePct: growth,
        x: totalPts === 1 ? 300 : 50 + (i / (totalPts - 1)) * 500,
        y: isZero ? 180 : Math.max(35, 180 - (act / (950 * Math.max(0.1, scopeFactor))) * 140),
      };
    });
  }, [dateRange, startDate, endDate, scopeFactor]);

  // -------------------------------------------------------------
  // 3. Course Enrollment Statistics Bar Chart Data
  // Synchronized with the identical monthly periods!
  // -------------------------------------------------------------
  const enrollmentStatsData: CourseStatBarItem[] = useMemo(() => {
    return monthlyGrowthData.map((pt) => ({
      label: pt.monthShort,
      periodName: pt.periodName,
      enrollments: pt.newEnrollments,
      completions: pt.completions,
    }));
  }, [monthlyGrowthData]);

  return (
    <DashboardFilterContext.Provider
      value={{
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
        monthlyGrowthData,
        enrollmentStatsData,
        setDepartmentId,
        setCourseId,
        setDateRange,
        setStartDate,
        setEndDate,
        setCustomDateRange,
        resetFilters,
      }}
    >
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
