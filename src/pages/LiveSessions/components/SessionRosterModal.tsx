import React, { useState, useEffect } from 'react';
import { LiveSession } from '../../../types';
import { apiClient } from '../../../lib/apiClient';
import { usePeopleStore } from '../../../lib/peopleStore';
import { useLiveSessionStore } from '../../../lib/liveSessionStore';
import { useAuthStore } from '../../../lib/store';
import {
  Users, X, Search, CheckCircle2, Clock, Check
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
  const { user } = useAuthStore();
  const { fetchSessions } = useLiveSessionStore();
  const [search, setSearch] = useState('');
  const [roster, setRoster] = useState<RosterScholar[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'platform_admin' || user?.activeRole === 'lms_admin';
  const canManage = isTrainer || isAdmin;

  const loadRoster = () => {
    if (!session?.id) return;
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
  };

  useEffect(() => {
    if (!isOpen || !session?.id) return;
    loadRoster();
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

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    if (!session?.id) return;
    setSavingId(userId);
    try {
      // Optimistic update
      setRoster((prev) => {
        const idx = prev.findIndex((r) => r.userId === userId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], status: newStatus, joinedAt: newStatus === 'present' || newStatus === 'late' ? (updated[idx].joinedAt || new Date().toISOString()) : null };
          return updated;
        }
        return [...scholars.map(s => s.userId === userId ? { ...s, status: newStatus, joinedAt: newStatus === 'present' || newStatus === 'late' ? new Date().toISOString() : null } : s)];
      });

      await apiClient.put(`/live-sessions/${session.id}/attendance`, {
        records: [{ userId, status: newStatus }],
      });
      await fetchSessions();
      setSuccessNotice('Attendance updated.');
      setTimeout(() => setSuccessNotice(null), 2500);
    } catch (err) {
      console.error('Failed to update attendance:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!session?.id || scholars.length === 0) return;
    setLoading(true);
    try {
      const records = scholars.map((s) => ({ userId: s.userId, status: 'present' }));
      setRoster(scholars.map((s) => ({ ...s, status: 'present', joinedAt: s.joinedAt || new Date().toISOString() })));
      await apiClient.put(`/live-sessions/${session.id}/attendance`, { records });
      await fetchSessions();
      setSuccessNotice(`All ${records.length} scholars marked Present.`);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err) {
      console.error('Failed to mark all present:', err);
    } finally {
      setLoading(false);
    }
  };

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
          maxWidth: '720px',
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
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span className="text-secondary">Cohort: </span>
            <strong style={{ color: 'var(--text-main)' }}>
              {session.cohortName || 'Target Cohort'}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {canManage && (
              <button
                type="button"
                onClick={handleMarkAllPresent}
                disabled={loading || scholars.length === 0}
                className="btn btn-primary btn-sm"
                style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px', fontWeight: 700 }}
              >
                <CheckCircle2 size={12} /> Mark All Present
              </button>
            )}
            <span className="badge badge-primary">{scholars.length} Registered</span>
            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={12} /> {presentCount} Attended
            </span>
          </div>
        </div>

        {successNotice && (
          <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', padding: '6px 24px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Check size={13} /> {successNotice}
          </div>
        )}

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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="font-mono text-muted text-xs">{st.rollNo}</span>
                      
                      {/* Attendance Status Badge & Action Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

                        {canManage && (
                          <div style={{ display: 'inline-flex', gap: '3px', background: 'var(--bg-card)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(st.userId, 'present')}
                              disabled={savingId === st.userId}
                              className={`btn btn-xs ${st.status === 'present' ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '4px' }}
                              title="Mark Present"
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(st.userId, 'late')}
                              disabled={savingId === st.userId}
                              className={`btn btn-xs ${st.status === 'late' ? 'btn-primary' : 'btn-ghost'}`}
                              style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '4px' }}
                              title="Mark Late"
                            >
                              Late
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(st.userId, 'absent')}
                              disabled={savingId === st.userId}
                              className={`btn btn-xs ${st.status === 'absent' ? 'btn-danger' : 'btn-ghost'}`}
                              style={{ padding: '2px 6px', fontSize: '0.68rem', borderRadius: '4px' }}
                              title="Mark Absent"
                            >
                              Absent
                            </button>
                          </div>
                        )}
                      </div>
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
