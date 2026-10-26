import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AcademicEvent, CalendarView, EventCategory } from './types';
import {
  INITIAL_ACADEMIC_EVENTS, CATEGORY_META, generateEventsForWeek
} from './calendarData';
import {
  getWeekDays, formatDateKey, isSameDay, formatTime12,
  formatDateRangeLabel, calculateDayOverlaps, getMonthGrid,
  getStartOfWeek
} from './dateHelpers';
import { EventDetailsModal } from './EventDetailsModal';
import { AddEventModal } from './AddEventModal';
import { CalendarSidebar } from './CalendarSidebar';
import './calendar.css';
import {
  ChevronLeft, ChevronRight, Search, Plus, Calendar as CalendarIcon,
  Clock, MapPin, X, RotateCcw, AlertCircle, Video, CheckCircle2
} from 'lucide-react';

interface Props {
  onSwitchTab?: (tab: 'upcoming' | 'past' | 'timetable') => void;
}

export const AcademicCalendar: React.FC<Props> = ({ onSwitchTab }) => {
  // Academic Anchor: October 23, 2026 (Friday)
  const todayAnchor = useMemo(() => new Date(2026, 9, 23, 10, 15), []);

  const [currentDate, setCurrentDate] = useState<Date>(todayAnchor);
  const [view, setView] = useState<CalendarView>('week');
  const [events, setEvents] = useState<AcademicEvent[]>(INITIAL_ACADEMIC_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState<AcademicEvent | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialDate, setAddModalInitialDate] = useState(formatDateKey(todayAnchor));
  const [addModalInitialTime, setAddModalInitialTime] = useState('10:00');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>([
    'live', 'lab', 'capstone', 'office-hours', 'study'
  ]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | EventCategory>('all');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Auto-scroll calendar grid to 9 AM on initial mount
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollBodyRef.current) {
      // 9 AM is 1 hour after 8 AM (64px offset)
      scrollBodyRef.current.scrollTop = 64;
    }
  }, [view]);

  // Ensure recurring template events exist for whatever week is viewed
  useEffect(() => {
    const monday = getStartOfWeek(currentDate);
    const mondayKey = formatDateKey(monday);
    // If we haven't generated template events for this week, add them
    setEvents((prev) => {
      const hasEventsThisWeek = prev.some((e) => {
        const [y, m, d] = e.date.split('-').map(Number);
        const ed = new Date(y, m - 1, d);
        return formatDateKey(getStartOfWeek(ed)) === mondayKey;
      });

      if (!hasEventsThisWeek) {
        return [...prev, ...generateEventsForWeek(monday)];
      }
      return prev;
    });
  }, [currentDate]);

  // Navigation handlers
  const handleToday = () => {
    setCurrentDate(new Date(todayAnchor));
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (view === 'day') {
      d.setDate(d.getDate() - 1);
    } else if (view === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (view === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (view === 'week') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  // Category toggle from sidebar
  const handleToggleCategory = (cat: EventCategory) => {
    if (selectedCategories.includes(cat)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter((c) => c !== cat));
      }
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Add event handler
  const handleSaveNewEvent = (newEvent: AcademicEvent) => {
    setEvents([newEvent, ...events]);
    setActionNotice(`Academic session "${newEvent.title}" added to your timetable.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Delete event handler
  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter((e) => e.id !== id));
    setActionNotice('Event removed from your personal schedule.');
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Open Add Modal from blank time slot click
  const handleTimeSlotClick = (dateStr: string, hour: number) => {
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    setAddModalInitialDate(dateStr);
    setAddModalInitialTime(`${pad(hour)}:00`);
    setIsAddModalOpen(true);
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return events.filter((e) => {
      // Category filter pill (if not 'all')
      if (activeCategoryFilter !== 'all' && e.category !== activeCategoryFilter) {
        return false;
      }
      // Sidebar checkbox categories
      if (!selectedCategories.includes(e.category)) {
        return false;
      }
      // Search query filter
      if (query) {
        const inTitle = e.title.toLowerCase().includes(query);
        const inCourse = e.course.toLowerCase().includes(query);
        const inInstructor = e.instructor.toLowerCase().includes(query);
        const inLocation = e.location.toLowerCase().includes(query);
        return inTitle || inCourse || inInstructor || inLocation;
      }
      return true;
    });
  }, [events, searchQuery, selectedCategories, activeCategoryFilter]);

  // Current time marker position (if today is in the active week / day view)
  const currentTimeMinutes = todayAnchor.getHours() * 60 + todayAnchor.getMinutes();
  const startHour = 8;
  const endHour = 20; // 8:00 AM to 8:00 PM (12 hours)
  const hourHeight = 64;
  const isCurrentTimeInRange = currentTimeMinutes >= startHour * 60 && currentTimeMinutes <= endHour * 60;
  const currentTimeTop = ((currentTimeMinutes - startHour * 60) / 60) * hourHeight;

  // Grid hours: 8 to 20
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  // Week days for Week View
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Pre-calculate day layout maps for week view
  const weekDayLayouts = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateDayOverlaps>>();
    weekDays.forEach((day) => {
      const dayKey = formatDateKey(day);
      const dayEvts = filteredEvents.filter((e) => e.date === dayKey);
      map.set(dayKey, calculateDayOverlaps(dayEvts, startHour, hourHeight));
    });
    return map;
  }, [weekDays, filteredEvents]);

  // Day View layout
  const dayKey = formatDateKey(currentDate);
  const dayEvents = useMemo(() => {
    return filteredEvents.filter((e) => e.date === dayKey);
  }, [filteredEvents, dayKey]);

  const dayLayout = useMemo(() => {
    return calculateDayOverlaps(dayEvents, startHour, hourHeight);
  }, [dayEvents]);

  // Month View cells
  const monthGrid = useMemo(() => {
    return getMonthGrid(currentDate.getFullYear(), currentDate.getMonth(), todayAnchor);
  }, [currentDate, todayAnchor]);

  return (
    <div className="academic-calendar-wrapper">
      {/* Action Notice Toast */}
      {actionNotice && (
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            color: '#c7d2fe',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.825rem',
            animation: 'cal-fade-in 0.2s ease-out'
          }}
        >
          <CheckCircle2 size={16} color="var(--primary)" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 1. CALENDAR TOOLBAR */}
      {/* ------------------------------------------------------------- */}
      <div className="cal-toolbar">
        {/* Left: Today, Prev/Next, Date Range Heading */}
        <div className="cal-toolbar-left">
          <button className="cal-btn-today" onClick={handleToday} title="Go to current date">
            Today
          </button>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="cal-nav-btn" onClick={handlePrev} aria-label="Previous period">
              <ChevronLeft size={18} />
            </button>
            <button className="cal-nav-btn" onClick={handleNext} aria-label="Next period">
              <ChevronRight size={18} />
            </button>
          </div>

          <span className="cal-date-label">
            {formatDateRangeLabel(view, currentDate)}
          </span>
        </div>

        {/* Center: Search Field */}
        <div className="cal-toolbar-center">
          <div className="cal-search-container">
            <Search size={15} className="cal-search-icon" />
            <input
              type="text"
              className="cal-search-input"
              placeholder="Search classes, rooms, faculty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="cal-search-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right: View Switcher (Day/Week/Month) + Add Event Button */}
        <div className="cal-toolbar-right">
          <div className="cal-view-selector">
            <button
              className={`cal-view-btn ${view === 'day' ? 'active' : ''}`}
              onClick={() => setView('day')}
            >
              Day
            </button>
            <button
              className={`cal-view-btn ${view === 'week' ? 'active' : ''}`}
              onClick={() => setView('week')}
            >
              Week
            </button>
            <button
              className={`cal-view-btn ${view === 'month' ? 'active' : ''}`}
              onClick={() => setView('month')}
            >
              Month
            </button>
          </div>

          <button
            className="cal-btn-add"
            onClick={() => {
              setAddModalInitialDate(formatDateKey(currentDate));
              setAddModalInitialTime('10:00');
              setIsAddModalOpen(true);
            }}
          >
            <Plus size={16} /> Add Event
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. CATEGORY FILTER CHIPS BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="cal-filters-bar">
        <button
          className={`cal-filter-chip ${activeCategoryFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategoryFilter('all')}
        >
          <CalendarIcon size={13} /> All Sessions ({filteredEvents.length})
        </button>

        {(['live', 'lab', 'capstone', 'office-hours', 'study'] as EventCategory[]).map((catKey) => {
          const meta = CATEGORY_META[catKey];
          const isActive = activeCategoryFilter === catKey;
          return (
            <button
              key={catKey}
              className={`cal-filter-chip ${isActive ? 'active' : ''}`}
              onClick={() => setActiveCategoryFilter(isActive ? 'all' : catKey)}
            >
              <span className="cal-filter-dot" style={{ background: meta.dotColor }} />
              {meta.label}
            </button>
          );
        })}

        {searchQuery && (
          <button
            className="cal-filter-chip"
            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            onClick={() => setSearchQuery('')}
          >
            <RotateCcw size={12} /> Clear Filter "{searchQuery}"
          </button>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. MAIN CONTENT: CALENDAR GRID + SIDEBAR */}
      {/* ------------------------------------------------------------- */}
      <div className="cal-layout-container">
        {/* Left Column: Calendar Card */}
        <div className="cal-grid-card">
          {/* ========================================================= */}
          {/* A. WEEK VIEW (DEFAULT) */}
          {/* ========================================================= */}
          {view === 'week' && (
            <div>
              {/* Day Header Row */}
              <div className="cal-grid-header">
                <div className="cal-timezone-cell">
                  <Clock size={12} style={{ marginRight: '4px' }} />
                  GMT+5:30
                </div>

                {weekDays.map((dayDate, i) => {
                  const isDayToday = isSameDay(dayDate, todayAnchor);
                  const isSelected = isSameDay(dayDate, currentDate);
                  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

                  return (
                    <div
                      key={i}
                      className={`cal-day-header-cell ${isDayToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        setCurrentDate(dayDate);
                        setView('day');
                      }}
                      title="Click to view single day"
                    >
                      <span className="cal-day-header-name">{dayNames[i]}</span>
                      <span className="cal-day-header-num">{dayDate.getDate()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable Time Grid */}
              <div className="cal-grid-scroll-body" ref={scrollBodyRef}>
                <div className="cal-time-grid">
                  {/* Left Column: Time Slot Labels */}
                  <div className="cal-time-column">
                    {hours.map((hour) => (
                      <div key={hour} className="cal-time-slot-label">
                        {formatTime12(`${hour < 10 ? `0${hour}` : hour}:00`)}
                      </div>
                    ))}
                  </div>

                  {/* 7 Weekday Columns */}
                  {weekDays.map((dayDate, colIdx) => {
                    const dayDateKey = formatDateKey(dayDate);
                    const isDayToday = isSameDay(dayDate, todayAnchor);
                    const dayEvts = filteredEvents.filter((e) => e.date === dayDateKey);
                    const layoutMap = weekDayLayouts.get(dayDateKey);

                    return (
                      <div
                        key={colIdx}
                        className={`cal-day-column ${isDayToday ? 'is-today-col' : ''}`}
                      >
                        {/* Current Time Horizontal Line */}
                        {isDayToday && isCurrentTimeInRange && (
                          <div
                            className="cal-current-time-line"
                            style={{ top: `${currentTimeTop}px` }}
                            title={`Current Time: ${formatTime12(`${todayAnchor.getHours()}:${todayAnchor.getMinutes()}`)}`}
                          />
                        )}

                        {/* Hour Slot Dividers */}
                        {hours.map((hour) => (
                          <div
                            key={hour}
                            className="cal-hour-cell"
                            onClick={() => handleTimeSlotClick(dayDateKey, hour)}
                            title={`Click to schedule event at ${formatTime12(`${hour}:00`)}`}
                          />
                        ))}

                        {/* Placed Event Cards */}
                        {dayEvts.map((evt) => {
                          const pos = layoutMap?.get(evt.id) || {
                            top: 0,
                            height: 60,
                            leftPercent: 0,
                            widthPercent: 100
                          };
                          const meta = CATEGORY_META[evt.category];

                          return (
                            <div
                              key={evt.id}
                              className={`cal-event-card cat-${evt.category}`}
                              style={{
                                top: `${pos.top}px`,
                                height: `${pos.height}px`,
                                left: `calc(${pos.leftPercent}% + 2px)`,
                                width: `calc(${pos.widthPercent}% - 4px)`
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                              }}
                              title={`${evt.title} (${formatTime12(evt.startTime)} - ${formatTime12(evt.endTime)})`}
                            >
                              <div className="cal-card-time" style={{ color: meta.color }}>
                                <Clock size={10} />
                                <span>{formatTime12(evt.startTime)}</span>
                              </div>

                              <div className="cal-card-title">{evt.title}</div>

                              {pos.height >= 56 && (
                                <div className="cal-card-meta">
                                  <span className="cal-card-location">
                                    {evt.isVirtual ? <Video size={10} /> : <MapPin size={10} />}
                                    {evt.location}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* B. DAY VIEW */}
          {/* ========================================================= */}
          {view === 'day' && (
            <div>
              {/* Day Header Row */}
              <div className="cal-grid-header day-view">
                <div className="cal-timezone-cell">Time</div>
                <div
                  className={`cal-day-header-cell ${isSameDay(currentDate, todayAnchor) ? 'is-today' : ''}`}
                  style={{ borderRight: 'none', padding: '12px 20px', alignItems: 'flex-start' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="cal-day-header-num" style={{ width: '32px', height: '32px' }}>
                      {currentDate.getDate()}
                    </span>
                    <div>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-muted text-xs" style={{ display: 'block' }}>
                        {dayEvents.length} Scheduled Sessions
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Day Grid Body */}
              <div className="cal-grid-scroll-body is-day-view" ref={scrollBodyRef}>
                <div className="cal-time-grid day-view">
                  {/* Left Column: Time Slot Labels */}
                  <div className="cal-time-column">
                    {hours.map((hour) => (
                      <div key={hour} className="cal-time-slot-label">
                        {formatTime12(`${hour < 10 ? `0${hour}` : hour}:00`)}
                      </div>
                    ))}
                  </div>

                  {/* Single Day Column */}
                  <div className={`cal-day-column ${isSameDay(currentDate, todayAnchor) ? 'is-today-col' : ''}`}>
                    {/* Current Time Line */}
                    {isSameDay(currentDate, todayAnchor) && isCurrentTimeInRange && (
                      <div
                        className="cal-current-time-line"
                        style={{ top: `${currentTimeTop}px` }}
                        title={`Current Time: ${formatTime12(`${todayAnchor.getHours()}:${todayAnchor.getMinutes()}`)}`}
                      />
                    )}

                    {/* Hourly Clickable Cells */}
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="cal-hour-cell"
                        onClick={() => handleTimeSlotClick(dayKey, hour)}
                        title={`Click to schedule event at ${formatTime12(`${hour}:00`)}`}
                      />
                    ))}

                    {/* Events */}
                    {dayEvents.map((evt) => {
                      const pos = dayLayout.get(evt.id) || {
                        top: 0,
                        height: 60,
                        leftPercent: 0,
                        widthPercent: 100
                      };
                      const meta = CATEGORY_META[evt.category];

                      return (
                        <div
                          key={evt.id}
                          className={`cal-event-card cat-${evt.category}`}
                          style={{
                            top: `${pos.top}px`,
                            height: `${pos.height}px`,
                            left: `calc(${pos.leftPercent}% + 4px)`,
                            width: `calc(${pos.widthPercent}% - 8px)`
                          }}
                          onClick={() => setSelectedEvent(evt)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="cal-card-time" style={{ color: meta.color, fontSize: '0.8rem' }}>
                              <Clock size={12} />
                              <span>{formatTime12(evt.startTime)} – {formatTime12(evt.endTime)}</span>
                            </div>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                background: meta.bg,
                                color: meta.text,
                                border: `1px solid ${meta.border}`
                              }}
                            >
                              {meta.label}
                            </span>
                          </div>

                          <div className="cal-card-title" style={{ fontSize: '0.95rem' }}>
                            {evt.title}
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {evt.course} &bull; {evt.instructor}
                          </div>

                          <div className="cal-card-meta">
                            <span className="cal-card-location" style={{ fontSize: '0.7rem' }}>
                              {evt.isVirtual ? <Video size={12} /> : <MapPin size={12} />}
                              {evt.location}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* C. MONTH VIEW */}
          {/* ========================================================= */}
          {view === 'month' && (
            <div className="cal-month-container">
              {/* Weekday Names Header */}
              <div className="cal-month-weekdays-header">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                  <div key={i} className="cal-month-weekday-cell">
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Cells Grid */}
              <div className="cal-month-cells-grid">
                {monthGrid.map((cell, idx) => {
                  const cellEvents = filteredEvents.filter((e) => e.date === cell.dateStr);
                  const isSelected = isSameDay(cell.date, currentDate);

                  return (
                    <div
                      key={idx}
                      className={`cal-month-cell ${!cell.isCurrentMonth ? 'not-current-month' : ''} ${cell.isToday ? 'is-today' : ''}`}
                      onClick={() => {
                        setCurrentDate(cell.date);
                        setView('day');
                      }}
                      title={`${cell.date.toDateString()} (Click to open day view)`}
                    >
                      <div className="cal-month-cell-top">
                        <span className="cal-month-cell-num">{cell.dayNumber}</span>
                        {cellEvents.length > 0 && (
                          <span className="text-muted text-xs font-semibold">
                            {cellEvents.length} {cellEvents.length === 1 ? 'class' : 'classes'}
                          </span>
                        )}
                      </div>

                      {/* Event Compact Pills */}
                      <div className="cal-month-events-list">
                        {cellEvents.slice(0, 3).map((evt) => {
                          const meta = CATEGORY_META[evt.category];
                          return (
                            <div
                              key={evt.id}
                              className="cal-month-pill"
                              style={{
                                background: meta.bg,
                                color: meta.text,
                                borderLeft: `3px solid ${meta.dotColor}`
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(evt);
                              }}
                              title={`${evt.title} (${formatTime12(evt.startTime)})`}
                            >
                              <span style={{ fontSize: '0.625rem', opacity: 0.85 }}>
                                {formatTime12(evt.startTime)}
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {evt.title}
                              </span>
                            </div>
                          );
                        })}

                        {cellEvents.length > 3 && (
                          <span className="cal-month-more-badge">
                            +{cellEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty Search/Filter State */}
          {filteredEvents.length === 0 && (
            <div className="cal-empty-state">
              <AlertCircle size={36} color="var(--primary)" />
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                No academic sessions found matching your criteria
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', maxWidth: '340px' }}>
                Try adjusting your search query, switching categories, or clearing filters.
              </p>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategoryFilter('all');
                  setSelectedCategories(['live', 'lab', 'capstone', 'office-hours', 'study']);
                }}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Calendar Sidebar (Mini Calendar & Next Up) */}
        <CalendarSidebar
          currentDate={currentDate}
          today={todayAnchor}
          events={filteredEvents}
          selectedCategories={selectedCategories}
          onSelectDate={(d) => {
            setCurrentDate(d);
            if (view === 'month') setView('day');
          }}
          onToggleCategory={handleToggleCategory}
          onSelectEvent={(evt) => setSelectedEvent(evt)}
          onSwitchTab={onSwitchTab}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MODALS */}
      {/* ------------------------------------------------------------- */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDeleteEvent={handleDeleteEvent}
        />
      )}

      {isAddModalOpen && (
        <AddEventModal
          isOpen={isAddModalOpen}
          initialDate={addModalInitialDate}
          initialStartTime={addModalInitialTime}
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSaveNewEvent}
        />
      )}
    </div>
  );
};
