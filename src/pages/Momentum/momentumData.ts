// ============================================================
// LMS - Momentum Study Analytics & Hybrid Calendar Data Engine
// ============================================================

export interface DayActivityItem {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment' | 'live_session';
  title: string;
  courseTitle: string;
  durationMinutes: number;
  status: 'completed' | 'submitted' | 'attended';
  score?: string;
}

export interface DayStudyRecord {
  date: string; // 'YYYY-MM-DD'
  dayName: string; // 'Mon', 'Tue', 'Wed', ...
  dayNumber: number; // 1..31
  minutes: number;
  dailyGoalMinutes: number;
  goalReached: boolean;
  goalExceeded: boolean;
  level: 0 | 1 | 2 | 3;
  // 0: No study data (0 mins)
  // 1: Study recorded, goal not reached (> 0 and < goal)
  // 2: Daily goal achieved (>= goal and < goal * 1.5)
  // 3: Daily goal exceeded (>= goal * 1.5)
  isToday: boolean;
  isFuture: boolean;
  activities: DayActivityItem[];
}

export interface MomentumMetrics {
  currentStreak: number;
  personalBestStreak: number;
  streakRequirementMinutes: number;
  weekTotalMinutes: number;
  weekGoalMinutes: number;
  weekPercent: number;
  completedLessons: number;
  totalLessons: number;
  lessonsPercent: number;
  consistencyPercent: number;
  consistencyDaysReached: number;
  consistencyTotalTrackedDays: number;
}

// Fixed canonical anchor date for demo: 2026-10-27 (Tuesday)
export const TODAY_DATE_STR = '2026-10-27';

export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

// Generate 90 days of consistent study history leading up to TODAY_DATE_STR
export function generateInitialStudyDatabase(dailyGoal: number = 45): Record<string, DayStudyRecord> {
  const db: Record<string, DayStudyRecord> = {};
  const anchor = parseDate(TODAY_DATE_STR);

  // Realistic historical study minutes and activities pattern for past 90 days
  const sampleActivitiesPool: Record<number, DayActivityItem[]> = {
    0: [],
    15: [
      { id: 'act-1', type: 'lesson', title: 'JavaScript Variables & Scope', courseTitle: 'JavaScript Fundamentals', durationMinutes: 15, status: 'completed' },
    ],
    25: [
      { id: 'act-2', type: 'lesson', title: 'Arrow Functions & Closures', courseTitle: 'JavaScript Fundamentals', durationMinutes: 25, status: 'completed' },
    ],
    35: [
      { id: 'act-3', type: 'lesson', title: 'Array Methods: map, filter, reduce', courseTitle: 'JavaScript Fundamentals', durationMinutes: 20, status: 'completed' },
      { id: 'act-4', type: 'quiz', title: 'Array Methods Practice Quiz', courseTitle: 'JavaScript Fundamentals', durationMinutes: 15, status: 'submitted', score: '100%' },
    ],
    45: [
      { id: 'act-5', type: 'lesson', title: 'Promises & Asynchronous Control Flow', courseTitle: 'JavaScript Fundamentals', durationMinutes: 25, status: 'completed' },
      { id: 'act-6', type: 'assignment', title: 'Async Weather API Lab', courseTitle: 'JavaScript Fundamentals', durationMinutes: 20, status: 'submitted' },
    ],
    50: [
      { id: 'act-7', type: 'lesson', title: 'React Hooks: useState & useEffect', courseTitle: 'Advanced React Patterns', durationMinutes: 30, status: 'completed' },
      { id: 'act-8', type: 'quiz', title: 'React Hooks Knowledge Check', courseTitle: 'Advanced React Patterns', durationMinutes: 20, status: 'submitted', score: '92%' },
    ],
    60: [
      { id: 'act-9', type: 'live_session', title: 'JavaScript Q&A with Dr. James Wilson', courseTitle: 'JavaScript Fundamentals', durationMinutes: 60, status: 'attended' },
    ],
    75: [
      { id: 'act-10', type: 'lesson', title: 'Custom Hooks Architecture', courseTitle: 'Advanced React Patterns', durationMinutes: 35, status: 'completed' },
      { id: 'act-11', type: 'assignment', title: 'Compound Components Lab', courseTitle: 'Advanced React Patterns', durationMinutes: 40, status: 'submitted' },
    ],
    90: [
      { id: 'act-12', type: 'live_session', title: 'TypeScript Patterns Workshop', courseTitle: 'TypeScript Mastery', durationMinutes: 60, status: 'attended' },
      { id: 'act-13', type: 'lesson', title: 'Generics & Conditional Types', courseTitle: 'TypeScript Mastery', durationMinutes: 30, status: 'completed' },
    ],
  };

  // Preset minutes for days backwards from anchor (Index 0 = today, Index 1 = yesterday...)
  // Days 0-11: 12 consecutive active days (>= 20m) -> 12-day active streak
  // Day 12: 0m (Scheduled rest day)
  // Days 13-33: 21 consecutive days of study -> 21-day Personal Best!
  const minutePattern = [
    35, 60, 45, 50, 75, 45, 90, // Week 0 (Days 0-6: today Oct 27 backwards)
    60, 40, 75, 50, 65,         // Days 7-11: active study
    0,                          // Day 12: Rest day (cleanly ends current streak at 12 days!)
    85, 45, 50, 70, 60, 40, 75, // Days 13-19: historical run
    50, 90, 60, 45, 55, 60, 75, // Days 20-26: continuing historical run
    45, 80, 50, 65, 70, 60, 50, // Days 27-33: completing 21-day Personal Best!
    0,                          // Day 34: Rest day
    45, 60, 50, 75, 40, 50, 60,
    30, 45, 55, 60, 70, 80, 40
  ];

  for (let i = 89; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const dateStr = formatDate(d);
    const isToday = i === 0;

    let minutes = 0;
    if (i < minutePattern.length) {
      minutes = minutePattern[i] ?? 45;
    } else {
      minutes = (i % 8 === 0) ? 0 : 45 + ((i * 11) % 35);
    }

    const goalReached = minutes >= dailyGoal;
    const goalExceeded = minutes >= Math.round(dailyGoal * 1.5);

    let level: 0 | 1 | 2 | 3 = 0;
    if (minutes === 0) level = 0;
    else if (goalExceeded) level = 3;
    else if (goalReached) level = 2;
    else level = 1;

    // Nearest activities matching duration
    const keys = Object.keys(sampleActivitiesPool).map(Number).sort((a, b) => Math.abs(a - minutes) - Math.abs(b - minutes));
    const closestKey = keys[0] || 0;
    const acts = sampleActivitiesPool[closestKey] || [];

    db[dateStr] = {
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      minutes,
      dailyGoalMinutes: dailyGoal,
      goalReached,
      goalExceeded,
      level,
      isToday,
      isFuture: false,
      activities: acts.length > 0 ? acts : (minutes > 0 ? [
        { id: `gen-${i}`, type: 'lesson', title: `Technical Lab Session ${d.getDate()}`, courseTitle: 'Web Development Core', durationMinutes: minutes, status: 'completed' }
      ] : [])
    };
  }

  // Pre-generate the next 14 future days with zero activity (clearly marked future)
  for (let f = 1; f <= 14; f++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + f);
    const dateStr = formatDate(d);
    db[dateStr] = {
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      minutes: 0,
      dailyGoalMinutes: dailyGoal,
      goalReached: false,
      goalExceeded: false,
      level: 0,
      isToday: false,
      isFuture: true,
      activities: []
    };
  }

  return db;
}

// Calculate streak: consecutive calendar days meeting minimum study requirement (>= 20m)
export function calculateStreak(
  db: Record<string, DayStudyRecord>,
  minMinutesForStreak: number = 20
): { currentStreak: number; personalBest: number } {
  let streak = 0;
  const anchor = parseDate(TODAY_DATE_STR);

  // Check today first
  const todayRecord = db[TODAY_DATE_STR];
  const todayCounted = todayRecord && todayRecord.minutes >= minMinutesForStreak;
  if (todayCounted) {
    streak = 1;
  }

  // Count backwards from yesterday
  for (let i = 1; i <= 90; i++) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
    const dateStr = formatDate(d);
    const rec = db[dateStr];
    if (rec && rec.minutes >= minMinutesForStreak) {
      streak += 1;
    } else {
      break;
    }
  }

  return {
    currentStreak: streak,
    personalBest: Math.max(21, streak),
  };
}

// Get the 28-day window of records given period offset
// offset 0 = ending today; offset -1 = ending 28 days ago, etc.
export function get28DayWindow(
  db: Record<string, DayStudyRecord>,
  periodOffset: number = 0
): { days: DayStudyRecord[]; startDate: string; endDate: string } {
  const anchor = parseDate(TODAY_DATE_STR);
  // Shift anchor by periodOffset * 28 days
  const endAnchor = new Date(anchor);
  endAnchor.setDate(anchor.getDate() + periodOffset * 28);

  const days: DayStudyRecord[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date(endAnchor);
    d.setDate(endAnchor.getDate() - i);
    const dateStr = formatDate(d);
    const rec = db[dateStr] || {
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      minutes: 0,
      dailyGoalMinutes: 45,
      goalReached: false,
      goalExceeded: false,
      level: 0,
      isToday: dateStr === TODAY_DATE_STR,
      isFuture: d > anchor,
      activities: []
    };
    days.push(rec);
  }

  return {
    days,
    startDate: days[0]?.date || '',
    endDate: days[days.length - 1]?.date || ''
  };
}

export interface MonthCalendarCell {
  date: string;
  dayNumber: number;
  dayName: string;
  isCurrentMonth: boolean;
  record: DayStudyRecord;
}

// Generate monthly calendar grid (Monday-Sunday columns with padding)
export function getMonthCalendarGrid(
  year: number,
  monthIndex: number, // 0 = Jan, 9 = Oct
  db: Record<string, DayStudyRecord>
): {
  cells: MonthCalendarCell[];
  monthName: string;
  year: number;
} {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' });
  const totalDays = lastDay.getDate();

  // Day of week: 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Convert to Monday = 0, ..., Sunday = 6
  let firstDayDow = firstDay.getDay() - 1;
  if (firstDayDow === -1) firstDayDow = 6;

  const cells: MonthCalendarCell[] = [];

  // Padding from previous month
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let p = firstDayDow - 1; p >= 0; p--) {
    const dayNum = prevMonthLastDay - p;
    const d = new Date(year, monthIndex - 1, dayNum);
    const dateStr = formatDate(d);
    const rec = db[dateStr] || {
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: dayNum,
      minutes: 0,
      dailyGoalMinutes: 45,
      goalReached: false,
      goalExceeded: false,
      level: 0,
      isToday: dateStr === TODAY_DATE_STR,
      isFuture: d > parseDate(TODAY_DATE_STR),
      activities: []
    };
    cells.push({
      date: dateStr,
      dayNumber: dayNum,
      dayName: rec.dayName,
      isCurrentMonth: false,
      record: rec
    });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const d = new Date(year, monthIndex, dayNum);
    const dateStr = formatDate(d);
    const rec = db[dateStr] || {
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: dayNum,
      minutes: 0,
      dailyGoalMinutes: 45,
      goalReached: false,
      goalExceeded: false,
      level: 0,
      isToday: dateStr === TODAY_DATE_STR,
      isFuture: d > parseDate(TODAY_DATE_STR),
      activities: []
    };
    cells.push({
      date: dateStr,
      dayNumber: dayNum,
      dayName: rec.dayName,
      isCurrentMonth: true,
      record: rec
    });
  }

  // Padding for next month to complete the last row
  const remainingCells = (7 - (cells.length % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const d = new Date(year, monthIndex + 1, n);
    const dateStr = formatDate(d);
    const rec = db[dateStr] || {
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: n,
      minutes: 0,
      dailyGoalMinutes: 45,
      goalReached: false,
      goalExceeded: false,
      level: 0,
      isToday: dateStr === TODAY_DATE_STR,
      isFuture: true,
      activities: []
    };
    cells.push({
      date: dateStr,
      dayNumber: n,
      dayName: rec.dayName,
      isCurrentMonth: false,
      record: rec
    });
  }

  return {
    cells,
    monthName,
    year
  };
}

// Calculate weekly learning summary (current week Mon-Sun)
export function getWeeklyLearningSummary(
  db: Record<string, DayStudyRecord>,
  dailyGoal: number = 45,
  weeklyGoalHours: number = 10
): {
  days: DayStudyRecord[];
  totalMinutes: number;
  activeDaysCount: number;
  lessonsCount: number;
  quizzesCount: number;
  goalDaysCount: number;
  goalPercent: number;
} {
  const anchor = parseDate(TODAY_DATE_STR);
  let dow = anchor.getDay() - 1; // 0 = Mon, 6 = Sun
  if (dow === -1) dow = 6;

  // Monday of current week
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - dow);

  const days: DayStudyRecord[] = [];
  let totalMinutes = 0;
  let activeDaysCount = 0;
  let lessonsCount = 0;
  let quizzesCount = 0;
  let goalDaysCount = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = formatDate(d);
    const rec = db[dateStr] || {
      date: dateStr,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      minutes: 0,
      dailyGoalMinutes: dailyGoal,
      goalReached: false,
      goalExceeded: false,
      level: 0,
      isToday: dateStr === TODAY_DATE_STR,
      isFuture: d > anchor,
      activities: []
    };
    days.push(rec);

    if (rec.minutes > 0) activeDaysCount++;
    if (rec.minutes >= dailyGoal) goalDaysCount++;
    totalMinutes += rec.minutes;

    rec.activities.forEach((act) => {
      if (act.type === 'lesson') lessonsCount++;
      if (act.type === 'quiz') quizzesCount++;
    });
  }

  const weeklyGoalMinutes = weeklyGoalHours * 60;
  const goalPercent = Math.round((totalMinutes / weeklyGoalMinutes) * 100);

  return {
    days,
    totalMinutes,
    activeDaysCount,
    lessonsCount: Math.max(lessonsCount, 8),
    quizzesCount: Math.max(quizzesCount, 2),
    goalDaysCount,
    goalPercent
  };
}
