import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { useCourseStore } from '../lib/courseStore';
import {
  X, Copy, Check, Link2, ExternalLink, ShieldCheck,
  AlertCircle, Calendar, Users, Sliders, ToggleLeft, ToggleRight,
  BookOpen, Sparkles
} from 'lucide-react';

interface Props {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareCourseModal: React.FC<Props> = ({ course, isOpen, onClose }) => {
  const { updateCourseShareSettings } = useCourseStore();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // Link configuration state initialized from course
  const [linkActive, setLinkActive] = useState<boolean>(course?.shareableLinkEnabled ?? true);
  const [deadline, setDeadline] = useState<string>(course?.enrollmentDeadline || '');
  const [capacity, setCapacity] = useState<number>(course?.enrollmentCapacity || 100);
  const [requiresApproval, setRequiresApproval] = useState<boolean>(course?.enrollmentApprovalRequired ?? false);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  useEffect(() => {
    if (course) {
      setLinkActive(course.shareableLinkEnabled ?? true);
      setDeadline(course.enrollmentDeadline || '');
      setCapacity(course.enrollmentCapacity || 100);
      setRequiresApproval(course.enrollmentApprovalRequired ?? false);
    }
  }, [course]);

  if (!isOpen || !course) return null;

  const isPublished = course.status === 'published';
  // Canonical shareable URL matching the LMS route convention
  const shareableUrl = `${window.location.origin}/course/${course.id}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareableUrl);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement('textarea');
        textarea.value = shareableUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  const handleSaveSettings = () => {
    updateCourseShareSettings(course.id, {
      shareableLinkEnabled: linkActive,
      enrollmentDeadline: deadline || undefined,
      enrollmentCapacity: capacity,
      enrollmentApprovalRequired: requiresApproval,
    });
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '600px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Link2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>
                Share Course & Student Enrollment
              </h3>
              <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                Generate official shareable link for student discovery and enrollment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px', borderRadius: '50%', color: 'var(--text-muted)' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Publication Status Notice */}
          {!isPublished ? (
            <div
              style={{
                background: 'var(--warning-bg)',
                border: '1px solid var(--warning-border)',
                color: 'var(--warning)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Course is currently in {course.status} state.</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>
                  Only published courses allow public student enrollment. You can preview the link below, but learners cannot join until you publish the course from Course Builder or the status dropdown.
                </p>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid var(--success-border)',
                color: 'var(--text-main)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '0.825rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="var(--success)" />
                <span>
                  <strong>Published & Enrollment Eligible:</strong> Link is ready to share with students.
                </span>
              </div>
              <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>Active</span>
            </div>
          )}

          {/* Course Summary Card */}
          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{course.title}</span>
              <span className="badge badge-primary">{course.category}</span>
            </div>
            <p className="text-muted text-xs" style={{ margin: 0 }}>
              ID: <code>{course.id}</code> &bull; Duration: {course.durationHours || 40} hrs &bull; Level: {course.level || 'Intermediate'}
            </p>
          </div>

          {/* Shareable Link Box */}
          <div>
            <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
              Official Shareable Enrollment URL
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={shareableUrl}
                className="form-input"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.825rem',
                  background: 'var(--bg-card)',
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                type="button"
                className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
                onClick={handleCopyLink}
                style={{
                  minWidth: '125px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: copied ? 'none' : '0 2px 8px var(--primary-light)',
                }}
              >
                {copied ? (
                  <>
                    <Check size={15} /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={15} /> Copy Link
                  </>
                )}
              </button>
            </div>
            {copyError && (
              <span className="form-error" style={{ marginTop: '4px' }}>
                Failed to copy to clipboard. Please copy manually from the input field.
              </span>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span className="text-muted text-xs">
                Students opening this link will view course details and can join instantly.
              </span>
              <a
                href={`/course/${course.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                }}
              >
                <ExternalLink size={12} /> Test Public View
              </a>
            </div>
          </div>

          {/* Configuration Settings Accordion / Box (Requirement A.8) */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={16} color="var(--primary)" />
                <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                  Enrollment Access Rules & Capacity
                </span>
              </div>
              <span className="text-muted text-xs">Admin Controls</span>
            </div>

            {/* Toggle Link Active / Deactivate */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                  Link Sharing Active
                </div>
                <div className="text-muted text-xs">
                  {linkActive
                    ? 'Anyone with the link can view and register for this course'
                    : 'Link is currently deactivated; visitors will see an enrollment closed notice'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkActive(!linkActive)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: linkActive ? 'var(--success)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title={linkActive ? 'Click to deactivate link' : 'Click to activate link'}
              >
                {linkActive ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
              </button>
            </div>

            {/* Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  <Calendar size={13} /> Enrollment Deadline
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  style={{ fontSize: '0.825rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  <Users size={13} /> Max Seat Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  className="form-input"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 50)}
                  style={{ fontSize: '0.825rem' }}
                />
              </div>
            </div>

            {/* Approval Mode Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.825rem' }}>
                  Require Admin Approval
                </div>
                <div className="text-muted text-xs">
                  {requiresApproval
                    ? 'Students submit a "Request to Join" needing admin confirmation'
                    : 'Instant automatic enrollment upon clicking Join Course'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequiresApproval(!requiresApproval)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: requiresApproval ? 'var(--primary)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {requiresApproval ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px' }}>
              {savedSettingsNotice && (
                <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>
                  ✓ Settings saved
                </span>
              )}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSaveSettings}
              >
                Update Access Rules
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <Link
            to={`/courses/${course.id}/share`}
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', borderColor: 'var(--primary)' }}
          >
            Open Dedicated Recipient & Notification Workflow &rarr;
          </Link>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
