import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useLiveSessionStore } from '../../../lib/liveSessionStore';
import { useCohortStore } from '../../../lib/cohortStore';
import { useCourseStore } from '../../../lib/courseStore';
import { usePeopleStore } from '../../../lib/peopleStore';
import {
  Calendar, Clock, BookOpen, Users, MapPin, Video,
  X, Check, AlertCircle, Sparkles, Building, Layers,
  GraduationCap
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
  initialDayOfWeek?: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
}

const DAYS_OF_WEEK: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'> = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

interface PeriodPreset {
  id: string;
  label: string;
  periodNum: number;
  startTime: string;
  endTime: string;
}

const PERIOD_PRESETS: PeriodPreset[] = [
  { id: 'p1', label: 'Period 1', periodNum: 1, startTime: '09:00', endTime: '10:00' },
  { id: 'p2', label: 'Period 2', periodNum: 2, startTime: '10:00', endTime: '11:00' },
  { id: 'p3', label: 'Period 3', periodNum: 3, startTime: '11:15', endTime: '12:15' },
  { id: 'p4', label: 'Period 4', periodNum: 4, startTime: '12:15', endTime: '13:15' },
  { id: 'p5', label: 'Period 5', periodNum: 5, startTime: '14:00', endTime: '15:00' },
  { id: 'p6', label: 'Period 6', periodNum: 6, startTime: '15:00', endTime: '16:00' },
];

const CAMPUS_ROOM_OPTIONS = [
  'Campus Hall 101',
  'Lecture Theatre A',
  'Lecture Theatre B',
  'Computer Science Lab 1',
  'AI & Robotics Lab',
  'Seminar Hall 202',
  'Smart Classroom 3',
];

function getNextDateForDayOfWeek(dayName: string): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDayIdx = days.indexOf(dayName);
  const now = new Date();
  const currentDayIdx = now.getDay();
  let diff = targetDayIdx - currentDayIdx;
  if (diff < 0) diff += 7;
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + diff);
  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, '0');
  const d = String(targetDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const CreateTimetablePeriodModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDayOfWeek = 'Monday'
}) => {
  const { user } = useAuthStore();
  const { addSession } = useLiveSessionStore();
  const { cohorts, fetchCohorts } = useCohortStore();
  const { courses, fetchCourses } = useCourseStore();
  const { getFaculty, fetchPeople } = usePeopleStore();

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      fetchCohorts();
      fetchPeople();
    }
  }, [isOpen]);

  // Form states
  const [selectedDay, setSelectedDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'>(initialDayOfWeek);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('p1');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [classTitle, setClassTitle] = useState('');
  const [classType, setClassType] = useState<'lecture' | 'lab' | 'tutorial' | 'seminar'>('lecture');
  const [deliveryMode, setDeliveryMode] = useState<'campus' | 'online'>('campus');
  const [roomLocation, setRoomLocation] = useState(CAMPUS_ROOM_OPTIONS[0]);
  const [customRoom, setCustomRoom] = useState('');
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize course, cohort and faculty defaults
  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
      if (!classTitle) {
        setClassTitle(`${courses[0].title} Period`);
      }
    }
  }, [courses, selectedCourseId]);

  useEffect(() => {
    if (cohorts.length > 0 && !selectedCohortId) {
      setSelectedCohortId(cohorts[0].id);
    }
  }, [cohorts, selectedCohortId]);

  const facultyList = getFaculty();
  useEffect(() => {
    if (facultyList.length > 0 && !selectedFacultyId) {
      setSelectedFacultyId(facultyList[0].id);
    }
  }, [facultyList, selectedFacultyId]);

  if (!isOpen) return null;

  const handlePeriodPresetSelect = (preset: PeriodPreset) => {
    setSelectedPeriodId(preset.id);
    setStartTime(preset.startTime);
    setEndTime(preset.endTime);
  };

  const handleCourseChange = (cId: string) => {
    setSelectedCourseId(cId);
    const crs = courses.find((c) => c.id === cId);
    if (crs) {
      const typeLabel = classType.charAt(0).toUpperCase() + classType.slice(1);
      setClassTitle(`${crs.title} ${typeLabel}`);
    }
  };

  const calculateDurationMinutes = (): number => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(endH)) return 60;
    const diff = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
    return diff > 0 ? diff : 60;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const crs = courses.find((c) => c.id === selectedCourseId);
    const coh = cohorts.find((c) => c.id === selectedCohortId);
    const fac = facultyList.find((f) => f.id === selectedFacultyId);

    const finalTitle = classTitle.trim() || (crs ? `${crs.title} Period` : 'Class Period');
    const finalRoom = deliveryMode === 'online'
      ? (onlineMeetingUrl ? 'Google Meet / Online' : 'Online Classroom')
      : (customRoom.trim() || roomLocation);

    const computedDate = getNextDateForDayOfWeek(selectedDay);

    setIsSubmitting(true);
    try {
      await addSession({
        title: finalTitle,
        courseId: selectedCourseId || undefined,
        courseTitle: crs ? crs.title : undefined,
        cohortId: selectedCohortId || undefined,
        cohortName: coh ? coh.name : undefined,
        instructorId: selectedFacultyId || user?.id || 'inst-1',
        instructorName: fac ? (fac.displayName || `${fac.firstName} ${fac.lastName}`.trim()) : 'Appointed Faculty',
        date: computedDate,
        dayOfWeek: selectedDay,
        startTime,
        endTime,
        durationMinutes: calculateDurationMinutes(),
        room: finalRoom,
        provider: deliveryMode === 'online' ? 'Google Meet' : 'In-Person Class',
        meetingUrl: deliveryMode === 'online' && onlineMeetingUrl ? onlineMeetingUrl : undefined,
        description: description.trim() || `${classType.toUpperCase()} session for ${coh?.name || 'Cohort'} in ${finalRoom}`,
        status: 'scheduled',
      });

      if (onSuccess) {
        onSuccess(`Period successfully scheduled for ${selectedDay} (${startTime} - ${endTime}).`);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to create timetable period:', err);
      setErrorMessage(err?.message || 'Failed to schedule timetable period. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '640px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '16px 24px', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                <Clock size={12} style={{ marginRight: '4px' }} /> Timetable Period
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period-Wise Schedule</span>
            </div>
            <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
              Schedule Timetable Period
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Assign a day of the week, period slot, course, instructor, and classroom to the timetable.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {errorMessage && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* 1. Day of the Week Selector */}
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                1. Select Day of the Week <span className="required">*</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      style={{
                        flex: '1 1 80px',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'var(--primary)' : 'var(--bg-input)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center'
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Period Presets & Time Slot */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>
                  2. Timetable Period & Time Slot <span className="required">*</span>
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Duration: {calculateDurationMinutes()} mins
                </span>
              </div>

              {/* Period Quick Chips */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                {PERIOD_PRESETS.map((p) => {
                  const isSelected = selectedPeriodId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePeriodPresetSelect(p)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <span>{p.label}</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.8 }}>{p.startTime} – {p.endTime}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Time Slot Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    className="form-input text-xs"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      setSelectedPeriodId('custom');
                    }}
                    style={{ fontSize: '0.8rem', padding: '6px 10px', height: '34px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    className="form-input text-xs"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      setSelectedPeriodId('custom');
                    }}
                    style={{ fontSize: '0.8rem', padding: '6px 10px', height: '34px' }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 3. Course / Subject & Title */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  3. Course / Subject <span className="required">*</span>
                </label>
                <select
                  className="form-select text-xs"
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  style={{ fontSize: '0.8rem', height: '34px' }}
                  required
                >
                  <option value="">-- Select Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title} ({c.level || 'General'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Period Topic / Title
                </label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. Unit 2: Database Normalization"
                  value={classTitle}
                  onChange={(e) => setClassTitle(e.target.value)}
                  style={{ fontSize: '0.8rem', height: '34px' }}
                />
              </div>
            </div>

            {/* 4. Period Type */}
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                4. Period Type
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['lecture', 'lab', 'tutorial', 'seminar'] as const).map((type) => {
                  const isSelected = classType === type;
                  const labels = {
                    lecture: '📘 Lecture',
                    lab: '🔬 Lab / Practical',
                    tutorial: '👥 Tutorial',
                    seminar: '💡 Seminar'
                  };
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setClassType(type)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Classroom / Hall vs Online Virtual */}
            <div>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                5. Delivery Mode & Room Location <span className="required">*</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('campus')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: deliveryMode === 'campus' ? 700 : 500,
                    border: deliveryMode === 'campus' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: deliveryMode === 'campus' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                    color: deliveryMode === 'campus' ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Building size={14} /> Campus Hall / Classroom
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('online')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: deliveryMode === 'online' ? 700 : 500,
                    border: deliveryMode === 'online' ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: deliveryMode === 'online' ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                    color: deliveryMode === 'online' ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Video size={14} /> Online Virtual (Meet)
                </button>
              </div>

              {deliveryMode === 'campus' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <select
                    className="form-select text-xs"
                    value={roomLocation}
                    onChange={(e) => setRoomLocation(e.target.value)}
                    style={{ fontSize: '0.8rem', height: '34px' }}
                  >
                    {CAMPUS_ROOM_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="form-input text-xs"
                    placeholder="Or enter custom Room / Hall..."
                    value={customRoom}
                    onChange={(e) => setCustomRoom(e.target.value)}
                    style={{ fontSize: '0.8rem', height: '34px' }}
                  />
                </div>
              ) : (
                <div>
                  <input
                    type="url"
                    className="form-input text-xs"
                    placeholder="Optional Google Meet or Zoom URL (e.g. https://meet.google.com/...)"
                    value={onlineMeetingUrl}
                    onChange={(e) => setOnlineMeetingUrl(e.target.value)}
                    style={{ fontSize: '0.8rem', height: '34px' }}
                  />
                </div>
              )}
            </div>

            {/* 6. Cohort / Batch & Faculty */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  6. Assign Cohort / Batch <span className="required">*</span>
                </label>
                <select
                  className="form-select text-xs"
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  style={{ fontSize: '0.8rem', height: '34px' }}
                  required
                >
                  <option value="">-- Choose Cohort / Batch --</option>
                  {cohorts.map((co) => (
                    <option key={co.id} value={co.id}>{co.name} ({co.code || 'Cohort'})</option>
                  ))}
                  <option value="Spring 2026 Engineering">Spring 2026 Engineering</option>
                  <option value="Summer 2026 Cloud">Summer 2026 Cloud</option>
                  <option value="Fall 2026 Data Science">Fall 2026 Data Science</option>
                </select>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  7. Assigned Instructor / Faculty
                </label>
                <select
                  className="form-select text-xs"
                  value={selectedFacultyId}
                  onChange={(e) => setSelectedFacultyId(e.target.value)}
                  style={{ fontSize: '0.8rem', height: '34px' }}
                >
                  <option value="">-- Select Faculty / Trainer --</option>
                  {facultyList.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.displayName || `${f.firstName} ${f.lastName}`.trim() || f.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Live Summary Preview Pill */}
            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px'
            }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                🗓️ {selectedDay} • {startTime} - {endTime} ({calculateDurationMinutes()}m)
              </span>
              <span>
                📍 {deliveryMode === 'campus' ? (customRoom || roomLocation) : 'Online (Google Meet)'}
              </span>
            </div>
          </div>

          <div
            className="modal-footer"
            style={{
              padding: '14px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Scheduled for {selectedDay} ({startTime} – {endTime})
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ fontWeight: 700, padding: '8px 20px', minWidth: '160px' }}
              >
                {isSubmitting ? 'Saving...' : 'Save & Schedule Period'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

