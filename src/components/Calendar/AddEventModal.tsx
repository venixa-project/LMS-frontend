import React, { useState, useEffect } from 'react';
import { AcademicEvent, EventCategory, EventFormData, FormErrors } from './types';
import {
  AVAILABLE_COURSES, AVAILABLE_INSTRUCTORS, AVAILABLE_LOCATIONS, CATEGORY_META
} from './calendarData';
import { timeToMinutes } from './dateHelpers';
import { X, Calendar, Clock, MapPin, BookOpen, User, Plus } from 'lucide-react';

interface Props {
  isOpen: boolean;
  initialDate: string;
  initialStartTime?: string;
  onClose: () => void;
  onSave: (event: AcademicEvent) => void;
}

export const AddEventModal: React.FC<Props> = ({
  isOpen,
  initialDate,
  initialStartTime = '10:00',
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    category: 'live',
    date: initialDate,
    startTime: initialStartTime,
    endTime: '11:30',
    course: AVAILABLE_COURSES[0],
    instructor: AVAILABLE_INSTRUCTORS[0],
    location: AVAILABLE_LOCATIONS[0],
    description: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  // Sync date/time when initialDate changes
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        date: initialDate,
        startTime: initialStartTime || '10:00',
        endTime: calculateDefaultEndTime(initialStartTime || '10:00')
      }));
      setErrors({});
    }
  }, [isOpen, initialDate, initialStartTime]);

  if (!isOpen) return null;

  function calculateDefaultEndTime(start: string): string {
    const startMins = timeToMinutes(start);
    const endMins = startMins + 90; // Default 90 min academic slot
    const h = Math.floor(endMins / 60) % 24;
    const m = endMins % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(h)}:${pad(m)}`;
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required.';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required.';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required.';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required.';
    } else if (formData.startTime) {
      const startMins = timeToMinutes(formData.startTime);
      const endMins = timeToMinutes(formData.endTime);
      if (endMins <= startMins) {
        newErrors.endTime = 'End time must be after start time.';
      }
    }

    if (!formData.course.trim()) {
      newErrors.course = 'Please select or enter a course.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const startMins = timeToMinutes(formData.startTime);
    const endMins = timeToMinutes(formData.endTime);
    const durationMinutes = Math.max(15, endMins - startMins);

    const [year, month, day] = formData.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = (dateObj.getDay() + 6) % 7 + 1; // 1=Mon, ..., 7=Sun

    const isVirtual = formData.location.toLowerCase().includes('virtual') ||
                      formData.location.toLowerCase().includes('zoom') ||
                      formData.location.toLowerCase().includes('teams');

    const newEvent: AcademicEvent = {
      id: `evt-${Date.now()}`,
      title: formData.title.trim(),
      category: formData.category,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      durationMinutes,
      course: formData.course.trim(),
      instructor: formData.instructor.trim(),
      instructorRole: 'Course Faculty',
      cohort: 'Spring 2026 Engineering',
      location: formData.location.trim(),
      isVirtual,
      meetingUrl: isVirtual ? 'https://zoom.us/j/demo-session' : undefined,
      description: formData.description.trim() || 'Custom academic schedule event added by student.',
      materials: ['Personal Study Notes'],
      recurringWeekday: dayOfWeek,
      isUserCreated: true
    };

    onSave(newEvent);
    onClose();
  };

  const categories: EventCategory[] = ['live', 'lab', 'capstone', 'office-hours', 'study'];

  return (
    <div className="cal-modal-backdrop" onClick={onClose}>
      <div className="cal-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cal-modal-header">
          <div>
            <div className="badge badge-primary" style={{ marginBottom: '4px', fontSize: '0.7rem' }}>
              Academic Timetable &bull; Local State
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
              Add Academic Event
            </h2>
          </div>
          <button className="cal-nav-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="cal-modal-body">
            {/* Event Title */}
            <div>
              <label className="text-secondary text-xs font-semibold" style={{ display: 'block', marginBottom: '6px' }}>
                Event Title *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Distributed Database Sharding Workshop"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ borderColor: errors.title ? 'var(--danger)' : undefined }}
                autoFocus
              />
              {errors.title && <div className="cal-field-error">{errors.title}</div>}
            </div>

            {/* Event Category Chips */}
            <div>
              <label className="text-secondary text-xs font-semibold" style={{ display: 'block', marginBottom: '8px' }}>
                Category & Type *
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {categories.map((catKey) => {
                  const meta = CATEGORY_META[catKey];
                  const isSelected = formData.category === catKey;
                  return (
                    <button
                      type="button"
                      key={catKey}
                      onClick={() => setFormData({ ...formData, category: catKey })}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isSelected ? meta.bg : 'var(--bg-input)',
                        color: isSelected ? meta.text : 'var(--text-secondary)',
                        border: isSelected ? `1.5px solid ${meta.border}` : '1px solid var(--border-subtle)',
                        transition: 'var(--transition)'
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: meta.dotColor
                        }}
                      />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date and Time Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label className="text-secondary text-xs font-semibold" style={{ display: 'block', marginBottom: '6px' }}>
                  Date *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={{ borderColor: errors.date ? 'var(--danger)' : undefined }}
                  />
                </div>
                {errors.date && <div className="cal-field-error">{errors.date}</div>}
              </div>

              <div>
                <label className="text-secondary text-xs font-semibold" style={{ display: 'block', marginBottom: '6px' }}>
                  Start Time *
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  style={{ borderColor: errors.startTime ? 'var(--danger)' : undefined }}
                />
                {errors.startTime && <div className="cal-field-error">{errors.startTime}</div>}
              </div>

              <div>
                <label className="text-secondary text-xs font-semibold" style={{ display: 'block', marginBottom: '6px' }}>
                  End Time *
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  style={{ borderColor: errors.endTime ? 'var(--danger)' : undefined }}
                />
                {errors.endTime && <div className="cal-field-error">{errors.endTime}</div>}
              </div>
            </div>

            {/* Course Selector */}
            <div>
              <label className="text-secondary text-xs font-semibold" style={{ display: 'block', marginBottom: '6px' }}>
                Course Name *
              </label>
              <select
                className="form-select"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
              >
                {AVAILABLE_COURSES.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Instructor & Location Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="text-secondary text-xs font-semibold" style={{ display: 'block', marginBottom: '6px' }}>
                  Instructor / Host
                </label>
                <select
                  className="form-select"
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                >
                  {AVAILABLE_INSTRUCTORS.map((ins, i) => (
                    <option key={i} value={ins}>{ins}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-secondary text-xs font-semibold" style={{ display: 'block', marginBottom: '6px' }}>
                  Location / Room
                </label>
                <select
                  className="form-select"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                >
                  {AVAILABLE_LOCATIONS.map((loc, i) => (
                    <option key={i} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-secondary text-xs font-semibold" style={{ display: 'block', marginBottom: '6px' }}>
                Description / Objectives (Optional)
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Topics covered, syllabus reference, preparation instructions..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="cal-modal-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="cal-btn-add">
              <Plus size={16} /> Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
