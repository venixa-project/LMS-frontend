import React, { useState, useEffect } from 'react';
import {
  X, Award, ShieldCheck, CheckCircle2, AlertCircle,
  Sparkles, History, ArrowRight, User
} from 'lucide-react';
import { GAMIFICATION_CONFIG, getRankForPoints } from '../../lib/gamificationConfig';
import { useGamificationStore } from '../../lib/gamificationStore';
import { RankBadge } from './RankBadge';

interface StudentOption {
  id: string;
  name: string;
  email?: string;
}

interface AwardPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedStudentId?: string;
  preselectedStudentName?: string;
  authorizedStudents?: StudentOption[];
  awardingRole: 'trainer' | 'admin';
  awardingUserId?: string;
  awardingUserName?: string;
  onAwardSuccess?: (studentId: string, pointsAwarded: number) => void;
}

export const AwardPointsModal: React.FC<AwardPointsModalProps> = ({
  isOpen,
  onClose,
  preselectedStudentId,
  preselectedStudentName,
  authorizedStudents = [],
  awardingRole,
  awardingUserId = 'staff-01',
  awardingUserName = 'Authorized Faculty',
  onAwardSuccess,
}) => {
  const { profiles, awardAcademicPoints } = useGamificationStore();

  const [studentId, setStudentId] = useState(preselectedStudentId || '');
  const [points, setPoints] = useState<number>(25);
  const [reason, setReason] = useState<string>(GAMIFICATION_CONFIG.academicReasons[0]);
  const [note, setNote] = useState<string>('');
  const [stage, setStage] = useState<'edit' | 'confirm' | 'success'>('edit');
  const [error, setError] = useState<string>('');
  const [awardedResult, setAwardedResult] = useState<{
    newPoints: number;
    newRank: string;
    rankChanged: boolean;
  } | null>(null);

  // Synchronize student ID on modal open
  useEffect(() => {
    if (isOpen) {
      const initialId = preselectedStudentId || (authorizedStudents.length > 0 ? authorizedStudents[0].id : 'u-007');
      setStudentId(initialId);
      setPoints(25);
      setReason(GAMIFICATION_CONFIG.academicReasons[0]);
      setNote('');
      setStage('edit');
      setError('');
      setAwardedResult(null);
    }
  }, [isOpen, preselectedStudentId, authorizedStudents]);

  if (!isOpen) return null;

  // Selected student profile info from store
  const targetProfile = profiles[studentId] || {
    totalPoints: 0,
    currentRank: 'bronze',
    events: [],
  };

  const currentRankTier = getRankForPoints(targetProfile.totalPoints);
  const projectedPoints = targetProfile.totalPoints + (points > 0 ? points : 0);
  const projectedRankTier = getRankForPoints(projectedPoints);

  const selectedStudentObj = authorizedStudents.find((s) => s.id === studentId);
  const displayName = preselectedStudentName || selectedStudentObj?.name || `Student (${studentId})`;

  const quickPoints = [10, 25, 50, 100];

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setError('Please select a student.');
      return;
    }
    if (!points || points <= 0) {
      setError('Points must be a positive integer greater than 0.');
      return;
    }
    if (!reason) {
      setError('Please choose an academic reason.');
      return;
    }
    setError('');
    setStage('confirm');
  };

  const handleConfirmAward = () => {
    const result = awardAcademicPoints({
      studentId,
      points,
      reason,
      awardingRole,
      awardingUserId,
      awardingUserName,
      note: note.trim() || undefined,
    });

    setAwardedResult({
      newPoints: result.newPoints,
      newRank: result.currentRank,
      rankChanged: result.rankChanged,
    });
    setStage('success');

    if (onAwardSuccess) {
      onAwardSuccess(studentId, points);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(10, 15, 30, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.95) 100%)',
          border: '1.5px solid rgba(129, 140, 248, 0.35)',
          borderRadius: '24px',
          padding: '28px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.2)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary, #cbd5e1)',
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: awardingRole === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.18)',
              border: awardingRole === 'admin' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(129, 140, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: awardingRole === 'admin' ? '#ffd700' : '#818cf8',
            }}
          >
            <Award size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                Award Learning Points
              </h3>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: awardingRole === 'admin' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: awardingRole === 'admin' ? '#ffd700' : '#818cf8',
                  border: awardingRole === 'admin' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(129, 140, 248, 0.3)',
                }}
              >
                {awardingRole === 'admin' ? 'Admin Action' : 'Trainer Action'}
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted, #94a3b8)' }}>
              Official academic points directly recorded into scholar audit history
            </p>
          </div>
        </div>

        {/* STAGE 1: EDIT FORM */}
        {stage === 'edit' && (
          <form onSubmit={handleProceedToConfirm}>
            {/* Student Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                Recipient Student
              </label>
              {authorizedStudents.length > 0 && !preselectedStudentId ? (
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    background: 'rgba(15, 23, 42, 0.8)',
                    borderColor: 'rgba(129, 140, 248, 0.25)',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '10px 14px',
                  }}
                >
                  {authorizedStudents.map((s) => (
                    <option key={s.id} value={s.id} style={{ background: '#0f172a' }}>
                      {s.name} ({s.email || s.id})
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(15, 23, 42, 0.7)',
                    border: '1px solid rgba(129, 140, 248, 0.2)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(99, 102, 241, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#818cf8',
                      }}
                    >
                      <User size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>
                        {displayName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)' }}>
                        ID: {studentId}
                      </div>
                    </div>
                  </div>

                  {/* Current points & rank preview */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RankBadge tier={currentRankTier} size="xs" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: currentRankTier.color }}>
                      {targetProfile.totalPoints.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Points Input & Quick Presets */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)' }}>
                  Points to Award
                </label>
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>
                  Projected: {projectedPoints.toLocaleString()} XP ({projectedRankTier.name})
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                {quickPoints.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPoints(val)}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      background: points === val ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                      border: points === val ? '1.5px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: points === val ? '#fff' : 'var(--text-secondary, #cbd5e1)',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    +{val} pts
                  </button>
                ))}
              </div>

              <input
                type="number"
                min="1"
                max="5000"
                value={points || ''}
                onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 0))}
                className="input"
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderColor: 'rgba(129, 140, 248, 0.25)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}
                placeholder="Enter custom points amount"
              />
            </div>

            {/* Academic Reason Selector */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                Academic Reason / Recognition
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input"
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderColor: 'rgba(129, 140, 248, 0.25)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '10px 14px',
                }}
              >
                {GAMIFICATION_CONFIG.academicReasons.map((r) => (
                  <option key={r} value={r} style={{ background: '#0f172a' }}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Note */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary, #cbd5e1)', marginBottom: '6px' }}>
                Faculty Note / Details <span style={{ color: 'var(--text-muted)' }}>(Optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="e.g. Demonstrated exceptional leadership during the Week 4 capstone sprint presentation."
                className="input"
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderColor: 'rgba(129, 140, 248, 0.25)',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  resize: 'none',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '8px',
                  color: '#f87171',
                  fontSize: '0.78rem',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ borderRadius: '10px', padding: '10px 18px' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  borderRadius: '10px',
                  padding: '10px 22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700,
                }}
              >
                Review & Confirm <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* STAGE 2: REVIEW & CONFIRM */}
        {stage === 'confirm' && (
          <div>
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(129, 140, 248, 0.25)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 800, color: '#fff' }}>
                Award Summary
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '0.72rem' }}>
                    STUDENT
                  </span>
                  <strong style={{ color: '#fff' }}>{displayName}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '0.72rem' }}>
                    POINTS TO AWARD
                  </span>
                  <strong style={{ color: '#ffd700', fontSize: '1.05rem' }}>+{points} Learning Points</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '0.72rem' }}>
                    REASON
                  </span>
                  <span style={{ color: 'var(--text-secondary, #cbd5e1)' }}>{reason}</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '0.72rem' }}>
                    AWARDING AUTHORITY
                  </span>
                  <span style={{ color: '#818cf8', fontWeight: 700 }}>
                    {awardingUserName} ({awardingRole.toUpperCase()})
                  </span>
                </div>

                {note && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted, #94a3b8)', display: 'block', fontSize: '0.72rem' }}>
                      NOTE
                    </span>
                    <span style={{ color: 'var(--text-secondary, #cbd5e1)', fontStyle: 'italic' }}>
                      "{note}"
                    </span>
                  </div>
                )}
              </div>

              {/* Projected Rank Impact */}
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>CURRENT RANK</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RankBadge tier={currentRankTier} size="xs" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: currentRankTier.color }}>
                      {currentRankTier.name} ({targetProfile.totalPoints} pts)
                    </span>
                  </div>
                </div>

                <ArrowRight size={16} color="var(--text-muted)" />

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>NEW PROJECTED</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RankBadge tier={projectedRankTier} size="xs" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: projectedRankTier.color }}>
                      {projectedRankTier.name} ({projectedPoints} pts)
                    </span>
                  </div>
                </div>
              </div>

              {projectedRankTier.id !== currentRankTier.id && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#ffd700',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={14} />
                  Awarding these points will promote {displayName} from {currentRankTier.name} to {projectedRankTier.name}!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStage('edit')}
                className="btn btn-secondary"
                style={{ borderRadius: '10px', padding: '10px 18px' }}
              >
                Back to Edit
              </button>
              <button
                type="button"
                onClick={handleConfirmAward}
                className="btn btn-primary"
                style={{
                  borderRadius: '10px',
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={16} /> Confirm & Record Award
              </button>
            </div>
          </div>
        )}

        {/* STAGE 3: SUCCESS STATE */}
        {stage === 'success' && awardedResult && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                color: '#10b981',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              Points Successfully Awarded!
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #cbd5e1)' }}>
              +{points} learning points have been recorded in {displayName}'s official record.
            </p>

            <div
              style={{
                background: 'rgba(15, 23, 42, 0.7)',
                borderRadius: '14px',
                padding: '14px',
                maxWidth: '360px',
                margin: '0 auto 24px auto',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Updated Scholar Standing</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ffd700', margin: '4px 0' }}>
                {awardedResult.newPoints.toLocaleString()} Total XP
              </div>
              <div style={{ fontSize: '0.82rem', color: '#818cf8', fontWeight: 700 }}>
                Current Rank: {awardedResult.newRank.toUpperCase()}
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn btn-primary"
              style={{ borderRadius: '12px', padding: '10px 30px', fontWeight: 800 }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
