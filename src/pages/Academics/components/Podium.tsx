import React from 'react';
import { Crown, Trophy, Sparkles, Award, Zap, Star } from 'lucide-react';
import { LeaderboardMember, computeMemberBadges } from '../leaderboardData';
import { AnimatedAvatar } from '../../../components/AnimatedAvatar';
import { useThemeStore } from '../../../lib/themeStore';

interface PodiumProps {
  firstPlace: LeaderboardMember | null;
  secondPlace: LeaderboardMember | null;
  thirdPlace: LeaderboardMember | null;
  onSelectMember: (member: LeaderboardMember) => void;
  timeframeLabel: string;
}

export const Podium: React.FC<PodiumProps> = ({
  firstPlace,
  secondPlace,
  thirdPlace,
  onSelectMember,
  timeframeLabel,
}) => {
  const { resolvedTheme } = useThemeStore();
  const isLight = resolvedTheme === 'light';

  return (
    <div
      className="card"
      style={{
        padding: '24px 24px 20px',
        background: isLight
          ? 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 45%, #F1F5F9 100%)'
          : 'radial-gradient(ellipse at top, rgba(84, 71, 255, 0.16) 0%, var(--bg-card) 75%)',
        border: isLight ? '1px solid #CBD5E1' : '1.5px solid var(--border-subtle)',
        borderRadius: '24px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: isLight
          ? '0 20px 45px -12px rgba(15, 23, 42, 0.1), 0 4px 14px -2px rgba(15, 23, 42, 0.04), inset 0 1px 0 #FFFFFF'
          : '0 16px 36px -10px rgba(0, 0, 0, 0.7)',
      }}
    >
      <style>{`
        @keyframes podiumEntrance {
          0% {
            opacity: 0;
            transform: translateY(28px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes championCrownFloat {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            filter: drop-shadow(0 2px 8px rgba(245, 158, 11, 0.5));
          }
          50% {
            transform: translateY(-4px) rotate(-1deg);
            filter: drop-shadow(0 4px 14px rgba(245, 158, 11, 0.7));
          }
        }
        @keyframes championAuraPulse {
          0%, 100% {
            box-shadow: 0 0 25px rgba(255, 215, 0, 0.45), 0 0 50px rgba(245, 158, 11, 0.2);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.8), 0 0 70px rgba(245, 158, 11, 0.35);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .podium-card, .champion-crown, .champion-avatar {
            animation: none !important;
            transform: none !important;
          }
        }
        @media (max-width: 768px) {
          .podium-grid {
            display: flex !important;
            flex-direction: column !important;
            gap: 20px !important;
          }
          .podium-pedestal {
            height: auto !important;
            min-height: 80px !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
            border-radius: 16px !important;
          }
        }
      `}</style>

      {/* Subtle Warm Amber Spotlight for Championship Center */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '420px',
          height: '170px',
          background: isLight
            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.12) 0%, rgba(99, 102, 241, 0.04) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(255, 215, 0, 0.22) 0%, rgba(99, 102, 241, 0.1) 50%, transparent 70%)',
          filter: 'blur(35px)',
          pointerEvents: 'none',
        }}
      />

      {/* Podium Header Label */}
      <div style={{ textAlign: 'center', marginBottom: '22px', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: isLight ? '#FEF3C7' : 'rgba(255, 215, 0, 0.12)',
            border: isLight ? '1px solid #FDE68A' : '1px solid rgba(255, 215, 0, 0.4)',
            color: isLight ? '#92400E' : '#fbbf24',
            padding: '4px 14px',
            borderRadius: '999px',
            fontSize: '0.74rem',
            fontWeight: 800,
            marginBottom: '8px',
          }}
        >
          <Sparkles size={13} color={isLight ? '#B45309' : '#ffd700'} />
          <span>Top 3 Academic Podium &bull; {timeframeLabel}</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          Hall of Fame: Top 3 Scholars
        </h2>
        <p className="text-secondary text-xs" style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Recognizing the top learners demonstrating exceptional course mastery, speed, and learning momentum
        </p>
      </div>

      {/* 3D-Styled Olympic Podium Grid */}
      <div
        className="podium-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          alignItems: 'flex-end',
          gap: '16px',
          maxWidth: '860px',
          margin: '0 auto',
          paddingBottom: '4px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* ========================================================= */}
        {/* #2 SILVER (Left, Medium Height)                           */}
        {/* ========================================================= */}
        {secondPlace && (
          <div
            className="podium-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'podiumEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both',
              cursor: 'pointer',
            }}
            onClick={() => onSelectMember(secondPlace)}
            title="Click to inspect scholar details"
          >
            {/* Avatar & Silver Medal Indicator */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <AnimatedAvatar
                avatarId={secondPlace.avatarId}
                name={secondPlace.name}
                size={66}
                rank={2}
                isCurrentUser={secondPlace.isCurrentUser}
                ringVariant="silver"
                interactive={true}
              />

              {/* 2nd Place Medal Icon */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #f1f5f9, #94a3b8)',
                  color: '#0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  border: isLight ? '2px solid #FFFFFF' : '2px solid #0f172a',
                  boxShadow: isLight ? '0 2px 6px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                🥈
              </div>
            </div>

            {/* Member Info */}
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '2px' }}>
              {secondPlace.name.replace(' (You)', '')}
              {secondPlace.isCurrentUser && <span className="badge badge-primary" style={{ marginLeft: '6px', fontSize: '0.6rem' }}>YOU</span>}
            </div>
            <div className="text-secondary text-xs" style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
              {secondPlace.cohort}
            </div>

            {/* Badges preview */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {computeMemberBadges(secondPlace, 2).map((b) => (
                <span
                  key={b.id}
                  title={`${b.name}: ${b.description}`}
                  style={{
                    fontSize: '0.85rem',
                    background: isLight ? '#F1F5F9' : 'var(--bg-input)',
                    border: isLight ? '1px solid #CBD5E1' : 'none',
                    borderRadius: '50%',
                    padding: '2px 4px',
                  }}
                >
                  {b.icon}
                </span>
              ))}
            </div>

            {/* Silver Pedestal Block */}
            <div
              className="podium-pedestal"
              style={{
                width: '100%',
                height: '118px',
                background: isLight
                  ? 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 50%, #E2E8F0 100%)'
                  : 'linear-gradient(180deg, rgba(203, 213, 225, 0.25) 0%, rgba(71, 85, 105, 0.35) 100%)',
                border: isLight ? '2px solid #94A3B8' : '1.5px solid rgba(203, 213, 225, 0.45)',
                borderBottom: 'none',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                padding: '14px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isLight
                  ? '0 10px 24px -4px rgba(100, 116, 139, 0.22), inset 0 2px 0 #FFFFFF, inset 0 -3px 0 rgba(100, 116, 139, 0.25)'
                  : '0 6px 18px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '1.45rem', fontWeight: 900, color: isLight ? '#1E293B' : '#e2e8f0', letterSpacing: '1px' }}>
                2nd
              </div>

              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: isLight ? '#0F172A' : '#f1f5f9' }}>
                  {secondPlace.points.toLocaleString()} XP
                </div>
                <div style={{ fontSize: '0.7rem', color: isLight ? '#475569' : '#cbd5e1', marginTop: '2px', fontWeight: 700 }}>
                  {secondPlace.coursesCompleted} Courses &bull; {secondPlace.certificates} Diplomas
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* #1 GOLD (Center, Tallest - Champion)                      */}
        {/* ========================================================= */}
        {firstPlace && (
          <div
            className="podium-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              zIndex: 2,
              animation: 'podiumEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both',
              cursor: 'pointer',
            }}
            onClick={() => onSelectMember(firstPlace)}
            title="Click to inspect champion details"
          >
            {/* Animated Crown above Champion */}
            <div className="champion-crown" style={{ animation: 'championCrownFloat 3.5s ease-in-out infinite', marginBottom: '-2px' }}>
              <Crown size={28} color="#ffd700" strokeWidth={2.4} />
            </div>

            {/* Champion Avatar with Radiant Gold Border & Pulsing Aura */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <AnimatedAvatar
                avatarId={firstPlace.avatarId}
                name={firstPlace.name}
                size={76}
                rank={1}
                isCurrentUser={firstPlace.isCurrentUser}
                ringVariant="gold"
                interactive={true}
              />

              {/* 1st Place Trophy Medal */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffd700, #f59e0b)',
                  color: '#78350f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 900,
                  border: isLight ? '2px solid #FFFFFF' : '2px solid #0f172a',
                  boxShadow: isLight ? '0 4px 12px rgba(245, 158, 11, 0.4)' : '0 4px 12px rgba(245, 158, 11, 0.6)',
                }}
              >
                🥇
              </div>
            </div>

            {/* Champion Name & Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-main)' }}>{firstPlace.name.replace(' (You)', '')}</span>
              {firstPlace.isCurrentUser && <span className="badge badge-primary" style={{ fontSize: '0.62rem' }}>YOU</span>}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.64rem',
                padding: '2px 8px',
                borderRadius: '999px',
                marginBottom: '8px',
                boxShadow: isLight ? '0 2px 6px rgba(245, 158, 11, 0.3)' : 'none',
              }}
            >
              <Trophy size={10} /> CHAMPION
            </div>

            {/* Badges preview */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {computeMemberBadges(firstPlace, 1).map((b) => (
                <span
                  key={b.id}
                  title={`${b.name}: ${b.description}`}
                  style={{
                    fontSize: '0.9rem',
                    background: isLight ? '#FEF3C7' : 'rgba(255, 215, 0, 0.15)',
                    border: isLight ? '1px solid #FDE68A' : '1px solid rgba(255, 215, 0, 0.3)',
                    borderRadius: '50%',
                    padding: '2px 4px',
                  }}
                >
                  {b.icon}
                </span>
              ))}
            </div>

            {/* Gold Pedestal Block (156px) */}
            <div
              className="podium-pedestal"
              style={{
                width: '100%',
                height: '156px',
                background: isLight
                  ? 'linear-gradient(180deg, #FEF3C7 0%, #FDE68A 55%, #F59E0B 100%)'
                  : 'linear-gradient(180deg, rgba(255, 215, 0, 0.35) 0%, rgba(180, 83, 9, 0.45) 100%)',
                border: isLight ? '2.5px solid #F59E0B' : '2px solid rgba(255, 215, 0, 0.75)',
                borderBottom: 'none',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                padding: '14px 12px 10px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isLight
                  ? '0 16px 36px -4px rgba(245, 158, 11, 0.38), inset 0 2px 0 rgba(255, 255, 255, 0.9), inset 0 -4px 0 rgba(180, 83, 9, 0.35)'
                  : '0 10px 28px rgba(245, 158, 11, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '1.85rem', fontWeight: 900, color: isLight ? '#78350F' : '#ffd700', letterSpacing: '1px' }}>
                1st
              </div>

              <div>
                <div style={{ fontSize: '1.65rem', fontWeight: 900, color: isLight ? '#78350F' : '#ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <Zap size={20} color={isLight ? '#92400E' : '#ffd700'} />
                  {firstPlace.points.toLocaleString()} XP
                </div>
                <div style={{ fontSize: '0.75rem', color: isLight ? '#78350F' : '#fef3c7', marginTop: '4px', fontWeight: 800 }}>
                  {firstPlace.coursesCompleted} Courses &bull; {firstPlace.certificates} Diplomas (100%)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* #3 BRONZE (Right, Lowest Height)                          */}
        {/* ========================================================= */}
        {thirdPlace && (
          <div
            className="podium-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              animation: 'podiumEntrance 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both',
              cursor: 'pointer',
            }}
            onClick={() => onSelectMember(thirdPlace)}
            title="Click to inspect scholar details"
          >
            {/* Avatar & Bronze Medal Indicator */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <AnimatedAvatar
                avatarId={thirdPlace.avatarId}
                name={thirdPlace.name}
                size={62}
                rank={3}
                isCurrentUser={thirdPlace.isCurrentUser}
                ringVariant="bronze"
                interactive={true}
              />

              {/* 3rd Place Medal Icon */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  right: '-4px',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ea580c, #9a3412)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  border: isLight ? '2px solid #FFFFFF' : '2px solid #0f172a',
                  boxShadow: isLight ? '0 2px 8px rgba(234, 88, 12, 0.3)' : '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                🥉
              </div>
            </div>

            {/* Member Info */}
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '2px' }}>
              {thirdPlace.name.replace(' (You)', '')}
              {thirdPlace.isCurrentUser && <span className="badge badge-primary" style={{ marginLeft: '6px', fontSize: '0.6rem' }}>YOU</span>}
            </div>
            <div className="text-secondary text-xs" style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
              {thirdPlace.cohort}
            </div>

            {/* Badges preview */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              {computeMemberBadges(thirdPlace, 3).map((b) => (
                <span
                  key={b.id}
                  title={`${b.name}: ${b.description}`}
                  style={{
                    fontSize: '0.85rem',
                    background: isLight ? '#FFEDD5' : 'var(--bg-input)',
                    border: isLight ? '1px solid #FED7AA' : 'none',
                    borderRadius: '50%',
                    padding: '2px 4px',
                  }}
                >
                  {b.icon}
                </span>
              ))}
            </div>

            {/* Bronze Pedestal Block */}
            <div
              className="podium-pedestal"
              style={{
                width: '100%',
                height: '98px',
                background: isLight
                  ? 'linear-gradient(180deg, #FFEDD5 0%, #FED7AA 60%, #FB923C 100%)'
                  : 'linear-gradient(180deg, rgba(217, 119, 6, 0.25) 0%, rgba(120, 53, 15, 0.4) 100%)',
                border: isLight ? '2px solid #EA580C' : '1.5px solid rgba(217, 119, 6, 0.45)',
                borderBottom: 'none',
                borderTopLeftRadius: '14px',
                borderTopRightRadius: '14px',
                padding: '12px 10px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isLight
                  ? '0 10px 24px -4px rgba(234, 88, 12, 0.24), inset 0 2px 0 #FFF7ED, inset 0 -3px 0 rgba(154, 52, 18, 0.3)'
                  : '0 6px 18px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '1.35rem', fontWeight: 900, color: isLight ? '#7C2D12' : '#f59e0b', letterSpacing: '1px' }}>
                3rd
              </div>

              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: isLight ? '#7C2D12' : '#fed7aa' }}>
                  {thirdPlace.points.toLocaleString()} XP
                </div>
                <div style={{ fontSize: '0.7rem', color: isLight ? '#9A3412' : '#fdba74', marginTop: '2px', fontWeight: 700 }}>
                  {thirdPlace.coursesCompleted} Courses &bull; {thirdPlace.certificates} Diplomas
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shared Stage Platform Plinth */}
      <div
        style={{
          height: '14px',
          width: '100%',
          maxWidth: '720px',
          margin: '0 auto',
          borderRadius: '8px',
          background: isLight
            ? 'linear-gradient(90deg, #CBD5E1 0%, #94A3B8 25%, #F59E0B 50%, #94A3B8 75%, #CBD5E1 100%)'
            : 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,215,0,0.4) 50%, rgba(255,255,255,0.02) 100%)',
          boxShadow: isLight
            ? '0 6px 18px rgba(100, 116, 139, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
            : '0 4px 16px rgba(0,0,0,0.5)',
          marginBottom: '4px',
        }}
      />
    </div>
  );
};
