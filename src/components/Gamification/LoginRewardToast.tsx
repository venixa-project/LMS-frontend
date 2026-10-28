import React, { useEffect, useState } from 'react';
import { Flame, Sparkles, X, Gift, CheckCircle2 } from 'lucide-react';
import { GAMIFICATION_CONFIG } from '../../lib/gamificationConfig';

export interface LoginRewardToastData {
  dailyPoints: number;
  streak: number;
  milestoneBonus?: number;
  milestoneDays?: number;
}

interface LoginRewardToastProps {
  data: LoginRewardToastData | null;
  onClose: () => void;
  autoCloseMs?: number;
}

export const LoginRewardToast: React.FC<LoginRewardToastProps> = ({
  data,
  onClose,
  autoCloseMs = 7000,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (data) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Allow fade out
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [data, autoCloseMs, onClose]);

  if (!data || !visible) return null;

  const hasMilestone = Boolean(data.milestoneBonus && data.milestoneDays);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1050,
        maxWidth: '380px',
        width: 'calc(100vw - 48px)',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.96) 100%)',
        border: hasMilestone ? '1.5px solid #f97316' : '1.5px solid rgba(129, 140, 248, 0.4)',
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: hasMilestone
          ? '0 12px 35px -5px rgba(249, 115, 22, 0.35)'
          : '0 12px 35px -5px rgba(99, 102, 241, 0.3)',
        boxSizing: 'border-box',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          background: hasMilestone ? 'rgba(249, 115, 22, 0.2)' : 'rgba(99, 102, 241, 0.2)',
          border: hasMilestone ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(129, 140, 248, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: hasMilestone ? '#f97316' : '#818cf8',
        }}
      >
        {hasMilestone ? <Flame size={20} /> : <Gift size={20} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>
            {hasMilestone ? `🔥 ${data.milestoneDays}-Day Streak Achieved!` : 'Welcome back!'}
          </span>
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: '#10b981',
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '1px 6px',
              borderRadius: '999px',
            }}
          >
            +{data.dailyPoints + (data.milestoneBonus || 0)} pts
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.4 }}>
          {hasMilestone
            ? `You earned a daily reward of +${data.dailyPoints} pts and a milestone streak bonus of +${data.milestoneBonus} pts!`
            : `+${data.dailyPoints} Learning Points added to your total. Current streak: ${data.streak} ${data.streak === 1 ? 'day' : 'days'}.`}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 200);
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted, #94a3b8)',
          cursor: 'pointer',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
};
