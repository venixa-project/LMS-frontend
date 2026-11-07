import React, { useState, useEffect } from 'react';
import { LiveSession } from '../../../types';
import { apiClient } from '../../../lib/apiClient';
import { usePeopleStore } from '../../../lib/peopleStore';
import {
  Users, X, Search, CheckCircle2, Clock
} from 'lucide-react';

interface Props {
  session: LiveSession | null;
  isOpen: boolean;
  onClose: () => void;
}

interface RosterScholar {
  userId: string;
  name: string;
  email: string;
  rollNo: string;
  status: string;
  joinedAt: string | null;
}

export const SessionRosterModal: React.FC<Props> = ({ session, isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState<RosterScholar[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !session?.id) return;
    setLoading(true);
    apiClient
      .get(`/live-sessions/${session.id}/attendance`)
      .then((res) => {
        if (res && res.data) {
          const data = Array.isArray(res.data) ? res.data : (res.data as any).roster || [];
          setRoster(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, session?.id]);

  if (!isOpen || !session) return null;

  // Use db roster if available, otherwise fallback to store
  const scholars: RosterScholar[] = roster.length > 0
    ? roster
    : usePeopleStore.getState().users
        .filter((u) => u.activeRole === 'student' || u.activeRole === 'learner')
        .map((u) => ({
          userId: u.id,
          name: u.displayName || 'Scholar',
          email: u.email || '',
          rollNo: u.rollNo || 'STU-001',
          status: session.attendance?.find((a) => a.userId === u.id)?.status || 'absent',
          joinedAt: session.attendance?.find((a) => a.userId === u.id)?.joinedAt || null,
        }));

  const filtered = scholars.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo?.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = scholars.filter((s) => s.status === 'present' || s.status === 'late').length;

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
                Live Session Audience & Attendance
              </h3>
              <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0' }}>
                {session.title} &bull; {session.date} ({session.startTime} - {session.endTime})
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
            <span className="text-secondary">Cohort: </span>
            <strong style={{ color: 'var(--text-main)' }}>
              {session.cohortName || 'Target Cohort'}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span className="badge badge-primary">{scholars.length} Registered</span>
            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> {presentCount} Attended
            </span>
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
              placeholder="Search scholar by name, email, or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Roster List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                Loading session attendance roster...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                No matching scholars found.
              </div>
            ) : (
              filtered.map((st) => {
                const isAttended = st.status === 'present' || st.status === 'late';
                return (
                  <div
                    key={st.userId}
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
                        {st.name?.charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{st.name}</div>
                        <div className="text-secondary text-xs">{st.email}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="font-mono text-muted text-xs">{st.rollNo}</span>
                      {isAttended ? (
                        <span
                          className="badge badge-success"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <CheckCircle2 size={11} /> {st.status === 'late' ? 'Late' : 'Attended'}
                        </span>
                      ) : (
                        <span className="badge badge-danger">Absent</span>
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
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
