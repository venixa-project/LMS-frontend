import { AcademicEvent, CalendarView, EventPosition } from './types';

export const padZero = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}-${m}-${d}`;
};

export const parseDateKey = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

// Gets the Monday of the current week (Monday-based week)
export const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Returns 7 dates from Monday to Sunday for the selected week
export const getWeekDays = (baseDate: Date): Date[] => {
  const start = getStartOfWeek(baseDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
};

export interface MonthDayCell {
  date: Date;
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

// Generates 35 or 42 cells for the month grid starting on Monday
export const getMonthGrid = (year: number, month: number, today: Date): MonthDayCell[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat
  // We want Monday to be 0, Sunday to be 6:
  const firstWeekday = (firstDay.getDay() + 6) % 7; 
  
  const cells: MonthDayCell[] = [];

  // Trailing days from previous month
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDate - i);
    cells.push({
      date: d,
      dateStr: formatDateKey(d),
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: isSameDay(d, today)
    });
  }

  // Days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    cells.push({
      date: d,
      dateStr: formatDateKey(d),
      dayNumber: i,
      isCurrentMonth: true,
      isToday: isSameDay(d, today)
    });
  }

  // Leading days of next month to complete rows of 7
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({
      date: d,
      dateStr: formatDateKey(d),
      dayNumber: i,
      isCurrentMonth: false,
      isToday: isSameDay(d, today)
    });
  }

  return cells;
};

// "09:30" -> 570 minutes from midnight
export const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
};

// "14:30" -> "2:30 PM", "09:00" -> "9:00 AM"
export const formatTime12 = (timeStr: string): string => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${padZero(m)} ${period}`;
};

export const formatTimeRange = (start: string, end: string): string => {
  return `${formatTime12(start)} – ${formatTime12(end)}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

export const formatDateRangeLabel = (view: CalendarView, baseDate: Date): string => {
  if (view === 'day') {
    const dayName = WEEKDAY_NAMES[baseDate.getDay()];
    const monthName = MONTH_NAMES[baseDate.getMonth()];
    return `${dayName}, ${monthName} ${baseDate.getDate()}, ${baseDate.getFullYear()}`;
  }

  if (view === 'week') {
    const week = getWeekDays(baseDate);
    const start = week[0];
    const end = week[6];

    if (start.getMonth() === end.getMonth()) {
      return `${MONTH_SHORT[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${start.getFullYear()}`;
    }
    if (start.getFullYear() === end.getFullYear()) {
      return `${MONTH_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTH_SHORT[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} – ${MONTH_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }

  // Month view
  return `${MONTH_NAMES[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
};

// Layout algorithm for overlapping events on the same day (Google Calendar style)
export const calculateDayOverlaps = (
  dayEvents: AcademicEvent[],
  startHour = 8,
  hourHeight = 64
): Map<string, EventPosition> => {
  const result = new Map<string, EventPosition>();
  if (dayEvents.length === 0) return result;

  // Sort events by start time, then by duration descending
  const sorted = [...dayEvents].sort((a, b) => {
    const diff = timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    if (diff !== 0) return diff;
    return b.durationMinutes - a.durationMinutes;
  });

  // Calculate top and height for all events
  const parsed = sorted.map((e) => {
    const startMins = timeToMinutes(e.startTime);
    const endMins = timeToMinutes(e.endTime);
    const top = ((startMins - startHour * 60) / 60) * hourHeight;
    const height = Math.max(32, ((endMins - startMins) / 60) * hourHeight - 4);
    return { event: e, startMins, endMins, top, height };
  });

  // Cluster overlapping events into concurrent groups
  const clusters: typeof parsed[] = [];
  let currentCluster: typeof parsed = [];
  let clusterEnd = -1;

  for (const item of parsed) {
    if (currentCluster.length === 0) {
      currentCluster.push(item);
      clusterEnd = item.endMins;
    } else if (item.startMins < clusterEnd) {
      // Overlaps with current cluster
      currentCluster.push(item);
      clusterEnd = Math.max(clusterEnd, item.endMins);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
      clusterEnd = item.endMins;
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  // For each cluster, greedily assign column indices so overlapping events share the width
  for (const cluster of clusters) {
    const columns: number[] = []; // tracks the end time of each column
    const assignments: { item: (typeof parsed)[0]; col: number }[] = [];

    for (const item of cluster) {
      let placedCol = -1;
      for (let c = 0; c < columns.length; c++) {
        if (item.startMins >= columns[c]) {
          placedCol = c;
          columns[c] = item.endMins;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = columns.length;
        columns.push(item.endMins);
      }
      assignments.push({ item, col: placedCol });
    }

    const totalCols = Math.max(1, columns.length);
    for (const { item, col } of assignments) {
      const widthPercent = 100 / totalCols;
      const leftPercent = col * widthPercent;

      result.set(item.event.id, {
        top: Math.max(0, item.top),
        height: item.height,
        leftPercent,
        widthPercent
      });
    }
  }

  return result;
};

// Generates an .ics file download for any academic event
export const downloadIcsFile = (event: AcademicEvent): void => {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const [y, m, d] = event.date.split('-').map(Number);
  const [sh, sm] = event.startTime.split(':').map(Number);
  const [eh, em] = event.endTime.split(':').map(Number);

  const startIso = `${y}${pad(m)}${pad(d)}T${pad(sh)}${pad(sm)}00`;
  const endIso = `${y}${pad(m)}${pad(d)}T${pad(eh)}${pad(em)}00`;

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VeniLearn LMS//Academic Timetable//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:venilearn-${event.id}-${Date.now()}@lms.demo`,
    `DTSTAMP:${startIso}Z`,
    `DTSTART:${startIso}`,
    `DTEND:${endIso}`,
    `SUMMARY:${event.title} - ${event.course}`,
    `DESCRIPTION:${event.description || 'Academic session on VeniLearn LMS.'}\\nInstructor: ${event.instructor}\\nLocation: ${event.location}`,
    `LOCATION:${event.location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
