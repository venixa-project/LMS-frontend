import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, AlertCircle, Trash2, CheckCircle2,
  Bookmark, Link2, Bell, RefreshCw, Flag, Check
} from 'lucide-react';
import {
  PlannerActivity,
  PlannerActivityType,
  PlannerPriority,
  PlannerStatus,
  PlannerReminderLead,
  PlannerRecurrence,
  RelatedLMSType
} from '../../types/planner';
import { mockCohorts, mockCourses, mockAssessments } from '../../data/mockData';

interface Props {
  isOpen: boolean;
  activityToEdit?: PlannerActivity | null;
  initialDate?: string;
  onClose: () => void;
  onSave: (data: Omit<PlannerActivity, 'id' | 'createdAt' | 'updatedAt' | 'source'>) => void;
  onDelete?: (id: string) => void;
}

export const AddEditActivityModal: React.FC<Props> = ({
  isOpen,
  activityToEdit,
  initialDate,
  onClose,
  onSave,
  onDelete
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PlannerActivityType>('task');
  const [date, setDate] = useState('2026-10-22');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [hasEndTime, setHasEndTime] = useState(true);
  const [priority, setPriority] = useState<PlannerPriority>('medium');
  const [status, setStatus] = useState<PlannerStatus>('pending');
  const [reminder, setReminder] = useState<PlannerReminderLead>('30_min');
  const [recurrence, setRecurrence] = useState<PlannerRecurrence>('none');
  
  // LMS Integration link
  const [relatedLmsType, setRelatedLmsType] = useState<RelatedLMSType>('general');
  const [relatedLmsId, setRelatedLmsId] = useState('');
  const [relatedLmsTitle, setRelatedLmsTitle] = useState('');
  const [relatedLmsUrl, setRelatedLmsUrl] = useState('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form when opening
  useEffect(() => {
    if (activityToEdit) {
      setTitle(activityToEdit.title || '');
      setDescription(activityToEdit.description || '');
      setType(activityToEdit.type || 'task');
      setDate(activityToEdit.date || '2026-10-22');
      setStartTime(activityToEdit.startTime || '09:00');
      setEndTime(activityToEdit.endTime || '');
      setHasEndTime(Boolean(activityToEdit.endTime));
      setPriority(activityToEdit.priority || 'medium');
      setStatus(activityToEdit.status || 'pending');
      setReminder(activityToEdit.reminder || 'none');
      setRecurrence(activityToEdit.recurrence || 'none');
      setRelatedLmsType(activityToEdit.relatedLmsType || 'general');
      setRelatedLmsId(activityToEdit.relatedLmsId || '');
      setRelatedLmsTitle(activityToEdit.relatedLmsTitle || '');
      setRelatedLmsUrl(activityToEdit.relatedLmsUrl || '');
    } else {
      setTitle('');
      setDescription('');
      setType('task');
      setDate(initialDate || '2026-10-22');
      setStartTime('09:00');
      setEndTime('10:00');
      setHasEndTime(true);
      setPriority('medium');
      setStatus('pending');
      setReminder('30_min');
      setRecurrence('none');
      setRelatedLmsType('general');
      setRelatedLmsId('');
      setRelatedLmsTitle('');
      setRelatedLmsUrl('');
    }
    setErrors({});
    setShowDeleteConfirm(false);
  }, [activityToEdit, initialDate, isOpen]);

  // Handle preset LMS link selection
  const handleLmsPresetChange = (val: string) => {
    if (!val || val === 'none') {
      setRelatedLmsType('general');
      setRelatedLmsId('');
      setRelatedLmsTitle('');
      setRelatedLmsUrl('');
      return;
    }

    if (val === 'attendance') {
      setRelatedLmsType('attendance');
      setRelatedLmsTitle('Student Attendance Ledger');
      setRelatedLmsUrl('/attendance');
    } else if (val === 'grading') {
      setRelatedLmsType('grading');
      setRelatedLmsTitle('Grading Oversight Queue');
      setRelatedLmsUrl('/grading');
    } else if (val === 'proctoring') {
      setRelatedLmsType('assessment');
      setRelatedLmsTitle('Proctoring Incident Center');
      setRelatedLmsUrl('/proctoring');
    } else if (val === 'departments') {
      setRelatedLmsType('department');
      setRelatedLmsTitle('Academic Departments');
      setRelatedLmsUrl('/departments');
    } else if (val.startsWith('cohort:')) {
      const cohId = val.replace('cohort:', '');
      const coh = mockCohorts.find((c) => c.id === cohId);
      setRelatedLmsType('cohort');
      setRelatedLmsId(cohId);
      setRelatedLmsTitle(coh ? `${coh.name} (${coh.code})` : 'Cohort View');
      setRelatedLmsUrl('/cohorts');
    } else if (val.startsWith('course:')) {
      const crsId = val.replace('course:', '');
      const crs = mockCourses.find((c) => c.id === crsId);
      setRelatedLmsType('course');
      setRelatedLmsId(crsId);
      setRelatedLmsTitle(crs ? crs.title : 'Course View');
      setRelatedLmsUrl('/courses');
    } else if (val.startsWith('assessment:')) {
      const asmId = val.replace('assessment:', '');
      const asm = mockAssessments.find((a) => a.id === asmId);
      setRelatedLmsType('assessment');
      setRelatedLmsId(asmId);
      setRelatedLmsTitle(asm ? asm.title : 'Assessment Details');
      setRelatedLmsUrl('/assessments');
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) {
      errs.title = 'Activity title is required.';
    }
    if (!date) {
      errs.date = 'Date is required.';
    }
    if (hasEndTime && startTime && endTime && endTime < startTime) {
      errs.endTime = 'End time cannot be earlier than start time.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      date,
      startTime: startTime || undefined,
      endTime: hasEndTime && endTime ? endTime : undefined,
      priority,
      status,
      reminder,
      recurrence,
      relatedLmsType,
      relatedLmsId: relatedLmsId || undefined,
      relatedLmsTitle: relatedLmsTitle || undefined,
      relatedLmsUrl: relatedLmsUrl || undefined
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: 'min(94vw, 560px)',
          maxHeight: 'min(92vh, 92dvh)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-card)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-input)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {activityToEdit ? 'Edit Activity & Reminder' : 'Add New Activity'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '4px', border: 'none', background: 'none', color: 'var(--text-muted)' }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Activity Title <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                }}
                placeholder="e.g., Department Heads Bi-Weekly Sync, Attendance Audit..."
                className="form-input"
                style={{
                  borderColor: errors.title ? 'var(--danger)' : undefined,
                  fontSize: '0.875rem'
                }}
                autoFocus
              />
              {errors.title && (
                <span className="text-danger text-xs" style={{ display: 'block', marginTop: '4px' }}>
                  {errors.title}
                </span>
              )}
            </div>

            {/* Activity Type & Priority Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Activity Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PlannerActivityType)}
                  className="form-select"
                  style={{ fontSize: '0.825rem' }}
                >
                  <option value="task">Task (Actionable item)</option>
                  <option value="reminder">Reminder (Alert / Follow-up)</option>
                  <option value="meeting">Meeting (Session / Conference)</option>
                  <option value="deadline">Deadline (Exam / Submission)</option>
                  <option value="lms_event">LMS Event (Academic Schedule)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PlannerPriority)}
                  className="form-select"
                  style={{ fontSize: '0.825rem' }}
                >
                  <option value="high">🔴 High Priority (Urgent)</option>
                  <option value="medium">🟡 Medium Priority (Standard)</option>
                  <option value="low">🟢 Low Priority (Routine)</option>
                </select>
              </div>
            </div>

            {/* Date, Start Time & End Time */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Date <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.825rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.825rem' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>End Time</label>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={hasEndTime}
                      onChange={(e) => setHasEndTime(e.target.checked)}
                      style={{ marginRight: '3px' }}
                    />
                    Set
                  </label>
                </div>
                <input
                  type="time"
                  value={endTime}
                  disabled={!hasEndTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="form-input"
                  style={{ fontSize: '0.825rem', opacity: hasEndTime ? 1 : 0.4 }}
                />
                {errors.endTime && (
                  <span className="text-danger text-xs" style={{ display: 'block', marginTop: '2px' }}>
                    {errors.endTime}
                  </span>
                )}
              </div>
            </div>

            {/* Status & Reminder Setting */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PlannerStatus)}
                  className="form-select"
                  style={{ fontSize: '0.825rem' }}
                >
                  <option value="pending">⏳ Pending</option>
                  <option value="in_progress">⚡ In Progress</option>
                  <option value="completed">✓ Completed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Reminder Lead Time
                </label>
                <select
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value as PlannerReminderLead)}
                  className="form-select"
                  style={{ fontSize: '0.825rem' }}
                >
                  <option value="none">No reminder</option>
                  <option value="10_min">10 minutes before</option>
                  <option value="30_min">30 minutes before</option>
                  <option value="1_hour">1 hour before</option>
                  <option value="1_day">1 day before</option>
                </select>
              </div>
            </div>

            {/* Recurrence Setting */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Optional Recurrence
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['none', 'daily', 'weekly', 'monthly'] as PlannerRecurrence[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRecurrence(r)}
                    className={`btn btn-sm ${recurrence === r ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}
                  >
                    {r === 'none' ? 'Does Not Repeat' : `Repeat ${r}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Related LMS Link Selector */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                <Link2 size={13} color="var(--primary)" /> Connect Related LMS Page / Record
              </label>
              <select
                onChange={(e) => handleLmsPresetChange(e.target.value)}
                className="form-select"
                style={{ fontSize: '0.8rem', marginBottom: '8px' }}
                defaultValue={activityToEdit?.relatedLmsUrl || 'none'}
              >
                <option value="none">-- No Direct LMS Record Link --</option>
                <optgroup label="Core Academic Modules">
                  <option value="attendance">Student Attendance Ledger (/attendance)</option>
                  <option value="grading">Grading Oversight Queue (/grading)</option>
                  <option value="proctoring">Proctoring Incident Center (/proctoring)</option>
                  <option value="departments">Academic Departments Hierarchy (/departments)</option>
                </optgroup>
                <optgroup label="Active Cohorts & Batches">
                  {mockCohorts.map((c) => (
                    <option key={c.id} value={`cohort:${c.id}`}>
                      Cohort: {c.name} ({c.code})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Courses & Programs">
                  {mockCourses.map((c) => (
                    <option key={c.id} value={`course:${c.id}`}>
                      Course: {c.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Assessments & Exams">
                  {mockAssessments.map((a) => (
                    <option key={a.id} value={`assessment:${a.id}`}>
                      Assessment: {a.title}
                    </option>
                  ))}
                </optgroup>
              </select>

              {relatedLmsTitle && (
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> Linked to: <strong>{relatedLmsTitle}</strong> ({relatedLmsUrl})
                </div>
              )}
            </div>

            {/* Description / Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Description or Notes
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add meeting agenda items, checklist details, or administrative notes..."
                rows={3}
                className="form-input"
                style={{ fontSize: '0.825rem', resize: 'vertical' }}
              />
            </div>

            {/* Delete Confirmation Box (if editing) */}
            {activityToEdit && showDeleteConfirm && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>
                  <AlertCircle size={14} /> Are you sure you want to delete this activity?
                </div>
                <p className="text-muted text-xs" style={{ margin: 0 }}>
                  This action cannot be undone. Recurring occurrences will also be removed.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDelete && activityToEdit) {
                        onDelete(activityToEdit.id);
                        onClose();
                      }
                    }}
                    className="btn btn-sm"
                    style={{ background: 'var(--danger)', color: '#fff', fontSize: '0.75rem' }}
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-input)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div>
              {activityToEdit && onDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', fontSize: '0.775rem' }}
                >
                  <Trash2 size={13} style={{ marginRight: '4px' }} /> Delete
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                {activityToEdit ? 'Save Changes' : 'Create Activity'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
