import React, { useState } from 'react';
import { AcademicEvent } from './types';
import { CATEGORY_META } from './calendarData';
import { formatTimeRange, downloadIcsFile } from './dateHelpers';
import {
  X, Calendar, Clock, MapPin, Video, User, BookOpen,
  Download, Trash2, CheckCircle2, ExternalLink
} from 'lucide-react';

interface Props {
  event: AcademicEvent | null;
  onClose: () => void;
  onDeleteEvent?: (id: string) => void;
}

export const EventDetailsModal: React.FC<Props> = ({ event, onClose, onDeleteEvent }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [joinedNotice, setJoinedNotice] = useState<string | null>(null);

  if (!event) return null;

  const catMeta = CATEGORY_META[event.category] || CATEGORY_META.live;

  const handleJoinClass = () => {
    setJoinedNotice(`Connecting to ${event.location}... (Simulated Live Classroom Session)`);
    setTimeout(() => {
      setJoinedNotice(null);
    }, 4000);
  };

  const handleCopyMeeting = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const [year, month, day] = event.date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const formattedFullDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="cal-modal-backdrop" onClick={onClose}>
      <div className="cal-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Accent Bar */}
        <div style={{ height: '4px', background: catMeta.color, width: '100%' }} />

        {/* Modal Header */}
        <div className="cal-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  background: catMeta.bg,
                  color: catMeta.text,
                  border: `1px solid ${catMeta.border}`
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: catMeta.dotColor }} />
                {catMeta.label}
              </span>

              <span className="badge badge-secondary" style={{ fontSize: '0.7rem' }}>
                {event.cohort}
              </span>
            </div>

            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>
              {event.title}
            </h2>
          </div>

          <button className="cal-nav-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="cal-modal-body">
          {joinedNotice && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--success)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.825rem'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{joinedNotice}</span>
            </div>
          )}

          {/* Time & Date Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', fontSize: '0.875rem', fontWeight: 600 }}>
              <Calendar size={16} color="var(--primary)" />
              <span>{formattedFullDate}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
              <Clock size={16} color="var(--primary)" />
              <span>
                {formatTimeRange(event.startTime, event.endTime)} ({event.durationMinutes} minutes)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.825rem' }}>
              {event.isVirtual ? <Video size={16} color="var(--primary)" /> : <MapPin size={16} color="var(--primary)" />}
              <span>{event.location}</span>
            </div>
          </div>

          {/* Course Details */}
          <div>
            <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px', textTransform: 'uppercase' }}>
              Associated Course
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '0.9rem', fontWeight: 600 }}>
              <BookOpen size={16} color="var(--primary)" />
              <span>{event.course}</span>
            </div>
          </div>

          {/* Instructor Profile */}
          <div>
            <div className="text-muted text-xs font-semibold" style={{ marginBottom: '6px', textTransform: 'uppercase' }}>
              Session Faculty / Host
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem'
                }}
              >
                {event.instructor.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                  {event.instructor}
                </div>
                <div className="text-muted text-xs">
                  {event.instructorRole || 'Academic Faculty & Lecturer'}
                </div>
              </div>
            </div>
          </div>

          {/* Description & Agenda */}
          {event.description && (
            <div>
              <div className="text-muted text-xs font-semibold" style={{ marginBottom: '4px', textTransform: 'uppercase' }}>
                Lecture Agenda & Objectives
              </div>
              <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {event.description}
              </p>
            </div>
          )}

          {/* Materials */}
          {event.materials && event.materials.length > 0 && (
            <div>
              <div className="text-muted text-xs font-semibold" style={{ marginBottom: '6px', textTransform: 'uppercase' }}>
                Session Materials & Handouts
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {event.materials.map((mat, i) => (
                  <span
                    key={i}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '4px 8px',
                      fontSize: '0.725rem',
                      color: 'var(--text-secondary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {mat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="cal-modal-footer">
          {onDeleteEvent && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--danger)', marginRight: 'auto' }}
              onClick={() => {
                if (window.confirm(`Are you sure you want to remove "${event.title}" from your schedule?`)) {
                  onDeleteEvent(event.id);
                  onClose();
                }
              }}
              title="Remove from schedule"
            >
              <Trash2 size={14} /> Remove
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => downloadIcsFile(event)}
            title="Download .ics calendar file"
          >
            <Download size={14} /> Export .ics
          </button>

          {event.isVirtual ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleJoinClass}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Video size={14} /> Join Class Room
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleJoinClass}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MapPin size={14} /> Check In (Hall)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
