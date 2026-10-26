import React, { useState } from 'react';
import { LiveSession } from '../../../types';
import { mockUsers } from '../../../data/mockUsers';
import {
  Users, X, Search, CheckCircle2, Clock, XCircle, ShieldCheck, Download
} from 'lucide-react';

interface Props {
  session: LiveSession | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SessionRosterModal: React.FC<Props> = ({ session, isOpen, onClose }) => {
  const [search, setSearch] = useState('');

  if (!isOpen || !session) return null;

  const targetIds = session.targetStudentIds || [];
  const students = mockUsers.filter(
    (u) =>
      (u.activeRole === 'student' || u.activeRole === 'learner') &&
      (targetIds.length === 0 || targetIds.includes(u.id) || targetIds.includes(u.rollNo || ''))
  );

  const filtered = students.filter(
    (s) =>
      s.displayName?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo?.toLowerCase().includes(search.toLowerCase())
  );

  // Present count from session.attendance
  const presentIds = new Set(
    session.attendance?.filter((a) => a.status === 'present').map((a) => a.userId) || []
  );

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 55,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                Target Audience & Student Roster
              </h3>
              <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
                {session.title} &bull; {session.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Stats Strip */}
        <div
          style={{
            padding: '12px 24px',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
          }}
        >
          <div>
            <span className="text-secondary">Audience Policy: </span>
            <strong style={{ textTransform: 'capitalize' }}>
              {session.targetAudienceType === 'selected_students'
                ? 'Tailored Selected Students'
                : 'All Enrolled Cohort Members'}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span className="badge badge-primary">{students.length} Total Eligible</span>
            {session.status === 'live' || session.status === 'ended' ? (
              <span className="badge badge-active">{presentIds.size} Present in Room</span>
            ) : null}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 24px 0' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search enrolled student by name, email, or student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Roster List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                No matching students found in this session audience.
              </div>
            ) : (
              filtered.map((st) => {
                const isPresent = presentIds.has(st.id);
                return (
                  <div
                    key={st.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                        }}
                      >
                        {st.displayName?.slice(0, 2).toUpperCase() || 'ST'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{st.displayName}</div>
                        <div className="text-secondary text-xs">{st.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="font-mono text-muted text-xs">{st.rollNo || 'STU-2026'}</span>
                      {session.status === 'live' || session.status === 'ended' ? (
                        isPresent ? (
                          <span
                            className="badge badge-active"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CheckCircle2 size={11} /> Joined
                          </span>
                        ) : (
                          <span className="badge badge-draft">Absent</span>
                        )
                      ) : (
                        <span className="badge badge-secondary">Invited</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
