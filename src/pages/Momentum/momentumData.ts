// ============================================================
// LMS - Momentum Study Analytics & Dynamic Calendar Engine
// ============================================================

export interface DayActivityItem {
  id: string;
  type: 'lesson' | 'quiz' | 'assignment' | 'live_session' | 'reading' | 'study';
  title: string;
  courseTitle: string;
  durationMinutes: number;
  status: 'completed' | 'submitted' | 'attended';
  score?: string;
  timestamp?: string;
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

export const TODAY_DATE_STR = formatDate(new Date());

export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

// Generate empty default study database for seamless initial render
export function generateInitialStudyDatabase(
  dailyGoal: number = 45,
  anchorDate: Date = new Date()
): Record<string, DayStudyRecord> {
  const db: Record<string, DayStudyRecord> = {};
  const anchor = new Date(anchorDate);
  anchor.setHours(0, 0, 0, 0);
  const todayStr = formatDate(anchor);

  // Default clean empty grid for 28 days around anchor
  for (let i = 27; i >= 0; i--) {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - i);
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
      isToday: dateStr === todayStr,
      isFuture: d > anchor,
      activities: [],
    };
  }

  return db;
}

// Calculate streak: consecutive calendar days meeting minimum study requirement (>= 20m)
export function calculateStreak(
  db: Record<string, DayStudyRecord>,
  minMinutesForStreak: number = 20,
  referenceDate: Date = new Date()
): { currentStreak: number; personalBest: number } {
  let streak = 0;
  let best = 0;
  const anchor = new Date(referenceDate);
  anchor.setHours(0, 0, 0, 0);
  const todayStr = formatDate(anchor);

  // Check today first
  const todayRecord = db[todayStr];
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

  // Calculate personal best across loaded keys
  const sortedKeys = Object.keys(db).sort();
  let tempStreak = 0;
  for (const k of sortedKeys) {
    if (db[k]?.minutes >= minMinutesForStreak) {
      tempStreak++;
      if (tempStreak > best) best = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  return {
    currentStreak: streak,
    personalBest: Math.max(best, streak),
  };
}

// Get the 28-day window of records given period offset
// offset 0 = ending today; offset -1 = ending 28 days ago, etc.
export function get28DayWindow(
  db: Record<string, DayStudyRecord>,
  periodOffset: number = 0,
  referenceDate: Date = new Date()
): { days: DayStudyRecord[]; startDate: string; endDate: string } {
  const anchor = new Date(referenceDate);
  anchor.setHours(0, 0, 0, 0);
  const todayStr = formatDate(anchor);

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
      isToday: dateStr === todayStr,
      isFuture: d > anchor,
      activities: [],
    };
    days.push(rec);
  }

  return {
    days,
    startDate: days[0]?.date || '',
    endDate: days[days.length - 1]?.date || '',
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
  monthIndex: number, // 0 = Jan, 10 = Nov
  db: Record<string, DayStudyRecord>,
  referenceDate: Date = new Date()
): {
  cells: MonthCalendarCell[];
  monthName: string;
  year: number;
} {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long' });
  const totalDays = lastDay.getDate();
  const todayStr = formatDate(referenceDate);
  const now = new Date(referenceDate);
  now.setHours(0, 0, 0, 0);

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
      isToday: dateStr === todayStr,
      isFuture: d > now,
      activities: [],
    };
    cells.push({
      date: dateStr,
      dayNumber: dayNum,
      dayName: rec.dayName,
      isCurrentMonth: false,
      record: rec,
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
      isToday: dateStr === todayStr,
      isFuture: d > now,
      activities: [],
    };
    cells.push({
      date: dateStr,
      dayNumber: dayNum,
      dayName: rec.dayName,
      isCurrentMonth: true,
      record: rec,
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
      isToday: dateStr === todayStr,
      isFuture: true,
      activities: [],
    };
    cells.push({
      date: dateStr,
      dayNumber: n,
      dayName: rec.dayName,
      isCurrentMonth: false,
      record: rec,
    });
  }

  return {
    cells,
    monthName,
    year,
  };
}

// Calculate weekly learning summary (current week Mon-Sun)
export function getWeeklyLearningSummary(
  db: Record<string, DayStudyRecord>,
  dailyGoal: number = 45,
  weeklyGoalHours: number = 10,
  referenceDate: Date = new Date()
): {
  days: DayStudyRecord[];
  totalMinutes: number;
  activeDaysCount: number;
  lessonsCount: number;
  quizzesCount: number;
  goalDaysCount: number;
  goalPercent: number;
} {
  const anchor = new Date(referenceDate);
  anchor.setHours(0, 0, 0, 0);
  const todayStr = formatDate(anchor);
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
      isToday: dateStr === todayStr,
      isFuture: d > anchor,
      activities: [],
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
  const goalPercent = Math.min(100, Math.round((totalMinutes / weeklyGoalMinutes) * 100));

  return {
    days,
    totalMinutes,
    activeDaysCount,
    lessonsCount,
    quizzesCount,
    goalDaysCount,
    goalPercent,
  };
}
