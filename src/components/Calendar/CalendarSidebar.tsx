import React, { useState } from 'react';
import { AcademicEvent, EventCategory } from './types';
import { CATEGORY_META } from './calendarData';
import { getMonthGrid, formatDateKey, isSameDay, formatTime12 } from './dateHelpers';
import {
  ChevronLeft, ChevronRight, Clock, Video, Radio,
  Filter, BookOpen, ExternalLink, Play
} from 'lucide-react';

interface Props {
  currentDate: Date;
  today: Date;
  events: AcademicEvent[];
  selectedCategories: EventCategory[];
  onSelectDate: (date: Date) => void;
  onToggleCategory: (cat: EventCategory) => void;
  onSelectEvent: (event: AcademicEvent) => void;
  onSwitchTab?: (tab: 'upcoming' | 'past' | 'timetable') => void;
}

export const CalendarSidebar: React.FC<Props> = ({
  currentDate,
  today,
  events,
  selectedCategories,
  onSelectDate,
  onToggleCategory,
  onSelectEvent,
  onSwitchTab
}) => {
  // Mini calendar state for month navigation
  const [miniYear, setMiniYear] = useState(currentDate.getFullYear());
  const [miniMonth, setMiniMonth] = useState(currentDate.getMonth());

  const handlePrevMonth = () => {
    if (miniMonth === 0) {
      setMiniMonth(11);
      setMiniYear(miniYear - 1);
    } else {
      setMiniMonth(miniMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (miniMonth === 11) {
      setMiniMonth(0);
      setMiniYear(miniYear + 1);
    } else {
      setMiniMonth(miniMonth + 1);
    }
  };

  const monthGrid = getMonthGrid(miniYear, miniMonth, today);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Set of dates that have events
  const datesWithEvents = new Set(events.map((e) => e.date));

  // Find next upcoming event
  const todayKey = formatDateKey(today);
  const upcomingEvents = events
    .filter((e) => e.date >= todayKey)
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return a.startTime.localeCompare(b.startTime);
    });

  const nextEvent = upcomingEvents[0];

  const categories: EventCategory[] = ['live', 'lab', 'capstone', 'office-hours', 'study'];

  return (
    <aside className="cal-sidebar">
      {/* 1. Mini Month Calendar Card */}
      <div className="cal-sidebar-card">
        <div className="cal-mini-header">
          <span className="cal-mini-title">
            {monthNames[miniMonth]} {miniYear}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="cal-nav-btn" style={{ width: '26px', height: '26px' }} onClick={handlePrevMonth} aria-label="Previous month">
              <ChevronLeft size={14} />
            </button>
            <button className="cal-nav-btn" style={{ width: '26px', height: '26px' }} onClick={handleNextMonth} aria-label="Next month">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="cal-mini-grid">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="cal-mini-dayname">
              {day}
            </div>
          ))}

          {monthGrid.map((cell, idx) => {
            const isSelected = isSameDay(cell.date, currentDate);
            const hasEvent = datesWithEvents.has(cell.dateStr);

            return (
              <div
                key={idx}
                className={`cal-mini-daycell ${cell.isToday ? 'is-today' : ''} ${isSelected && !cell.isToday ? 'is-selected' : ''} ${hasEvent ? 'has-events' : ''}`}
                style={{
                  opacity: cell.isCurrentMonth ? 1 : 0.35
                }}
                onClick={() => onSelectDate(cell.date)}
                title={`${cell.date.toDateString()} ${hasEvent ? '(Has Sessions)' : ''}`}
              >
                {cell.dayNumber}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Next Up Highlight Card */}
      {nextEvent && (
        <div className="cal-next-up-card">
          <div className="cal-next-up-header">
            <span className="cal-pulse-live">
              <span className="cal-pulse-dot" /> Next Academic Session
            </span>
            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
              {nextEvent.date === todayKey ? 'TODAY' : nextEvent.date}
            </span>
          </div>

          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#ffffff', fontWeight: 700, lineHeight: 1.3 }}>
              {nextEvent.title}
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {nextEvent.course}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Clock size={12} color="var(--primary)" />
              <span>
                {formatTime12(nextEvent.startTime)} – {formatTime12(nextEvent.endTime)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <Video size={12} color="var(--primary)" />
              <span>{nextEvent.location}</span>
            </div>
          </div>

          <button
            className="btn btn-primary btn-sm"
            style={{ width: '100%', marginTop: '4px', fontSize: '0.775rem' }}
            onClick={() => onSelectEvent(nextEvent)}
          >
            View Session Details
          </button>
        </div>
      )}

      {/* 3. Category Visibility Checklist */}
      <div className="cal-sidebar-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
          <Filter size={15} color="var(--primary)" />
          <span>My Calendars & Tracks</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((catKey) => {
            const meta = CATEGORY_META[catKey];
            const isChecked = selectedCategories.includes(catKey);

            return (
              <label
                key={catKey}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: isChecked ? 'var(--text-main)' : 'var(--text-muted)',
                  userSelect: 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleCategory(catKey)}
                  style={{
                    accentColor: meta.dotColor,
                    width: '15px',
                    height: '15px',
                    cursor: 'pointer'
                  }}
                />
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: meta.dotColor,
                    flexShrink: 0
                  }}
                />
                <span style={{ fontWeight: isChecked ? 600 : 400 }}>{meta.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 4. Quick Archive Shortcut */}
      {onSwitchTab && (
        <div
          className="cal-sidebar-card"
          style={{
            cursor: 'pointer',
            background: 'var(--bg-input)',
            border: '1px dashed var(--border-subtle)',
            transition: 'var(--transition)'
          }}
          onClick={() => onSwitchTab('past')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Play size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Recorded Lectures Archive
              </span>
            </div>
            <ExternalLink size={14} color="var(--text-muted)" />
          </div>
          <p className="text-muted text-xs" style={{ margin: '6px 0 0 0' }}>
            Missed a class? Access verified video archives and class notes.
          </p>
        </div>
      )}
    </aside>
  );
};
