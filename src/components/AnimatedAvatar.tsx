// ============================================================
// LMS - Animated Vector Profile Avatars & Cosmetic Auras
// ============================================================

import React, { useMemo } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { AVATAR_ARCHETYPES, useUserAvatar } from '../lib/avatarStore';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;

export interface AnimatedAvatarProps {
  avatarId?: string;
  name?: string;
  size?: AvatarSize;
  rank?: number;
  isCurrentUser?: boolean;
  showCrown?: boolean;
  showRankBadge?: boolean;
  showStatusIndicator?: boolean;
  ringVariant?: 'gold' | 'silver' | 'bronze' | 'cyan' | 'purple' | 'emerald' | 'none' | 'auto';
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  interactive?: boolean;
}

const SIZE_MAP: Record<string, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 64,
  xl: 80,
  '2xl': 96,
};

export const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  avatarId,
  name = '',
  size = 'md',
  rank,
  isCurrentUser = false,
  showCrown,
  showRankBadge = false,
  showStatusIndicator = false,
  ringVariant = 'auto',
  className = '',
  style = {},
  onClick,
  title,
  interactive = false,
}) => {
  const { avatarId: currentSelectedAvatar } = useUserAvatar();

  // Determine size in pixels
  const pxSize = typeof size === 'number' ? size : SIZE_MAP[size] || 44;

  // Resolve which avatar archetype to render
  const resolvedAvatarId = useMemo(() => {
    if (isCurrentUser) {
      return currentSelectedAvatar;
    }
    if (avatarId && AVATAR_ARCHETYPES[avatarId]) {
      return avatarId;
    }
    const lowerName = name.toLowerCase();
    if (lowerName.includes('alex')) return currentSelectedAvatar;
    if (lowerName.includes('priya')) return 'priya';
    if (lowerName.includes('marcus')) return 'marcus';
    if (lowerName.includes('elena')) return 'elena';
    if (lowerName.includes('daniel')) return 'daniel';
    if (lowerName.includes('sophia')) return 'sophia';
    if (lowerName.includes('kwame')) return 'kwame';
    if (lowerName.includes('chloe')) return 'chloe';
    if (lowerName.includes('liam')) return 'liam';
    if (lowerName.includes('aisha')) return 'aisha';

    // Hash-based deterministic fallback for any arbitrary name
    const keys = Object.keys(AVATAR_ARCHETYPES);
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % keys.length;
    return keys[idx] || 'alex';
  }, [avatarId, name, isCurrentUser, currentSelectedAvatar]);

  const archetype = AVATAR_ARCHETYPES[resolvedAvatarId] || AVATAR_ARCHETYPES.alex;

  // Determine outer ring styling
  const { ringGradient, ringShadow, hasCrown } = useMemo(() => {
    const isFirst = rank === 1 || showCrown;
    const isSecond = rank === 2;
    const isThird = rank === 3;

    if (ringVariant === 'none') {
      return { ringGradient: 'transparent', ringShadow: 'none', hasCrown: false };
    }

    if (ringVariant === 'gold' || isFirst) {
      return {
        ringGradient: 'conic-gradient(from 0deg, #ffd700, #f59e0b, #fde047, #ffd700)',
        ringShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.3)',
        hasCrown: true,
      };
    }
    if (ringVariant === 'silver' || isSecond) {
      return {
        ringGradient: 'conic-gradient(from 0deg, #f1f5f9, #94a3b8, #cbd5e1, #f1f5f9)',
        ringShadow: '0 0 16px rgba(203, 213, 225, 0.5)',
        hasCrown: false,
      };
    }
    if (ringVariant === 'bronze' || isThird) {
      return {
        ringGradient: 'conic-gradient(from 0deg, #fdba74, #ea580c, #c2410c, #fdba74)',
        ringShadow: '0 0 16px rgba(234, 88, 12, 0.45)',
        hasCrown: false,
      };
    }
    if (ringVariant === 'cyan' || (isCurrentUser && !rank)) {
      return {
        ringGradient: 'conic-gradient(from 0deg, #38bdf8, #818cf8, #a855f7, #38bdf8)',
        ringShadow: '0 0 16px rgba(56, 189, 248, 0.5)',
        hasCrown: false,
      };
    }

    // Default archetype ring
    return {
      ringGradient: archetype.ringGradient,
      ringShadow: `0 0 12px ${archetype.themeColor}55`,
      hasCrown: false,
    };
  }, [rank, showCrown, ringVariant, isCurrentUser, archetype]);

  const strokeWidth = pxSize >= 80 ? 4 : pxSize >= 44 ? 3 : 2;
  const innerSize = pxSize - strokeWidth * 2;

  return (
    <div
      className={`animated-avatar-wrapper ${interactive ? 'interactive' : ''} ${className}`}
      onClick={onClick}
      title={title || `${name || archetype.name} (${archetype.title})`}
      style={{
        position: 'relative',
        width: `${pxSize}px`,
        height: `${pxSize}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        userSelect: 'none',
        cursor: onClick || interactive ? 'pointer' : 'default',
        ...style,
      }}
    >
      <style>{`
        @keyframes avatarRingSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes avatarBreathe {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.015); }
        }
        @keyframes crownFloatAnim {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(-2deg); }
        }
        @keyframes visorGlint {
          0%, 100% { opacity: 0.3; transform: translateX(-15px); }
          50% { opacity: 1; transform: translateX(15px); }
        }
        @keyframes blinkEyes {
          0%, 96%, 100% { transform: scaleY(1); }
          98% { transform: scaleY(0.1); }
        }
        @keyframes pulseGlowAura {
          0%, 100% { opacity: 0.6; filter: blur(6px); }
          50% { opacity: 0.95; filter: blur(10px); }
        }
        .animated-avatar-wrapper.interactive:hover .avatar-ring {
          animation-duration: 2.5s !important;
          filter: brightness(1.2);
        }
        .animated-avatar-wrapper.interactive:hover .avatar-svg-inner {
          transform: scale(1.06);
        }
        @media (prefers-reduced-motion: reduce) {
          .avatar-ring, .avatar-svg-inner, .crown-float {
            animation: none !important;
          }
        }
      `}</style>

      {/* Floating Crown for Champion / 1st place */}
      {hasCrown && pxSize >= 40 && (
        <div
          className="crown-float"
          style={{
            position: 'absolute',
            top: pxSize >= 80 ? '-22px' : '-16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4,
            animation: 'crownFloatAnim 3s ease-in-out infinite',
            filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.8))',
            pointerEvents: 'none',
          }}
        >
          <Crown
            size={pxSize >= 80 ? 28 : pxSize >= 60 ? 20 : 16}
            color="#ffd700"
            fill="#ffd700"
            strokeWidth={1.5}
          />
        </div>
      )}

      {/* Ambient Pulsing Aura Blur */}
      {ringVariant !== 'none' && pxSize >= 36 && (
        <div
          style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '50%',
            background: ringGradient,
            opacity: 0.7,
            filter: 'blur(8px)',
            zIndex: 0,
            animation: 'pulseGlowAura 4s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Rotating Conic Ring */}
      {ringVariant !== 'none' && (
        <div
          className="avatar-ring"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: ringGradient,
            boxShadow: ringShadow,
            animation: 'avatarRingSpin 8s linear infinite',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main Avatar Circular Frame */}
      <div
        className="avatar-inner-frame"
        style={{
          position: 'relative',
          width: `${innerSize}px`,
          height: `${innerSize}px`,
          borderRadius: '50%',
          overflow: 'hidden',
          background: archetype.bgGradient,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <div
          className="avatar-svg-inner"
          style={{
            width: '100%',
            height: '100%',
            animation: 'avatarBreathe 4s ease-in-out infinite',
            transformOrigin: 'bottom center',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <AvatarCharacterSvg archetypeId={resolvedAvatarId} />
        </div>
      </div>

      {/* Rank Indicator Badge (Optional) */}
      {showRankBadge && rank && (
        <div
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            zIndex: 10,
            minWidth: pxSize >= 60 ? '28px' : '22px',
            height: pxSize >= 60 ? '22px' : '18px',
            padding: '0 5px',
            borderRadius: '999px',
            background:
              rank === 1
                ? 'linear-gradient(135deg, #ffd700, #f59e0b)'
                : rank === 2
                ? 'linear-gradient(135deg, #f1f5f9, #94a3b8)'
                : rank === 3
                ? 'linear-gradient(135deg, #fdba74, #ea580c)'
                : 'linear-gradient(135deg, #2563eb, #7c3aed)',
            color: rank <= 2 ? '#0f172a' : '#fff',
            fontWeight: 900,
            fontSize: pxSize >= 60 ? '0.72rem' : '0.62rem',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #0b0f19',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
          }}
        >
          #{rank}
        </div>
      )}

      {/* Online Status Dot */}
      {showStatusIndicator && (
        <span
          style={{
            position: 'absolute',
            bottom: '1px',
            right: '1px',
            width: pxSize >= 60 ? '12px' : '8px',
            height: pxSize >= 60 ? '12px' : '8px',
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid #0f172a',
            boxShadow: '0 0 6px #10b981',
            zIndex: 4,
          }}
        />
      )}
    </div>
  );
};

// ============================================================
// VECTOR SVG CHARACTER ILLUSTRATION SUITE
// ============================================================

interface SvgProps {
  archetypeId: string;
}

const AvatarCharacterSvg: React.FC<SvgProps> = ({ archetypeId }) => {
  switch (archetypeId) {
    case 'priya':
      // Golden Crown Champion Scholar
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <radialGradient id="priya-glow" cx="50%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#ffd700" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="priya-skin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f7d0a6" />
              <stop offset="100%" stopColor="#e2ad75" />
            </linearGradient>
            <linearGradient id="priya-hair" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2e1065" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id="priya-suit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill="url(#priya-glow)" />
          {/* Hair back */}
          <path d="M26 44C26 25 74 25 74 44C74 65 78 78 78 78H22C22 78 26 65 26 44Z" fill="url(#priya-hair)" />
          {/* Body/Suit */}
          <path d="M24 96C24 80 34 72 50 72C66 72 76 80 76 96Z" fill="#18181b" />
          <path d="M38 72L50 86L62 72L50 75Z" fill="url(#priya-suit)" />
          {/* Neck */}
          <rect x="44" y="62" width="12" height="12" rx="2" fill="#e2ad75" />
          {/* Face */}
          <ellipse cx="50" cy="52" rx="19" ry="21" fill="url(#priya-skin)" />
          {/* Hair front */}
          <path d="M31 46C31 34 40 32 50 32C60 32 69 34 69 46C65 40 58 37 50 37C42 37 35 40 31 46Z" fill="#2e1065" />
          {/* Golden Tiara / Circuit Headpiece */}
          <path d="M34 38L50 28L66 38L50 33Z" fill="#ffd700" stroke="#f59e0b" strokeWidth="1" />
          <circle cx="50" cy="30" r="3" fill="#fff" filter="drop-shadow(0 0 4px #ffd700)" />
          {/* Eyebrows */}
          <path d="M38 46Q44 44 46 47" stroke="#451a03" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M62 46Q56 44 54 47" stroke="#451a03" strokeWidth="1.6" strokeLinecap="round" />
          {/* Eyes with blinking */}
          <g style={{ transformOrigin: '50px 52px', animation: 'blinkEyes 4s ease-in-out infinite' }}>
            <ellipse cx="42" cy="52" rx="3.2" ry="2.2" fill="#312e81" />
            <circle cx="43" cy="51" r="1" fill="#fff" />
            <ellipse cx="58" cy="52" rx="3.2" ry="2.2" fill="#312e81" />
            <circle cx="59" cy="51" r="1" fill="#fff" />
          </g>
          {/* Round Golden Glasses */}
          <circle cx="42" cy="52" r="7" stroke="#ffd700" strokeWidth="1.4" fill="rgba(255, 215, 0, 0.15)" />
          <circle cx="58" cy="52" r="7" stroke="#ffd700" strokeWidth="1.4" fill="rgba(255, 215, 0, 0.15)" />
          <line x1="49" y1="52" x2="51" y2="52" stroke="#ffd700" strokeWidth="1.4" />
          {/* Nose & Smile */}
          <path d="M49 56Q50 59 52 59" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M45 64Q50 67 55 64" stroke="#be123c" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'marcus':
      // Systems Titan / Platinum Headset
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="marcus-skin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a16207" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="marcus-headset" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          {/* Shoulders */}
          <path d="M22 96C22 78 32 70 50 70C68 70 78 78 78 96Z" fill="#1e293b" />
          <path d="M42 70L50 82L58 70Z" fill="#38bdf8" />
          {/* Neck */}
          <rect x="43" y="60" width="14" height="14" rx="2" fill="#78350f" />
          {/* Head & Fade Hair */}
          <ellipse cx="50" cy="50" rx="19" ry="21" fill="url(#marcus-skin)" />
          <path d="M31 44C31 28 40 26 50 26C60 26 69 28 69 44C69 36 62 30 50 30C38 30 31 36 31 44Z" fill="#0f172a" />
          {/* Eyebrows */}
          <path d="M37 44L47 43" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M63 44L53 43" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
          {/* Eyes */}
          <g style={{ transformOrigin: '50px 50px', animation: 'blinkEyes 4.5s ease-in-out infinite' }}>
            <ellipse cx="42" cy="49" rx="3" ry="2" fill="#0f172a" />
            <circle cx="43" cy="48" r="0.9" fill="#fff" />
            <ellipse cx="58" cy="49" rx="3" ry="2" fill="#0f172a" />
            <circle cx="59" cy="48" r="0.9" fill="#fff" />
          </g>
          {/* Holographic Monocle over left eye */}
          <circle cx="58" cy="49" r="6" stroke="#38bdf8" strokeWidth="1.5" fill="rgba(56, 189, 248, 0.25)" />
          <line x1="58" y1="43" x2="72" y2="40" stroke="#38bdf8" strokeWidth="1.2" />
          {/* Nose & Confident Smile */}
          <path d="M48 53Q50 56 52 56" stroke="#451a03" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M44 61Q50 64 56 61" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Headset Arc & Glowing Earpiece */}
          <path d="M28 46C28 32 38 24 50 24C62 24 72 32 72 46" stroke="url(#marcus-headset)" strokeWidth="3" fill="none" />
          <rect x="25" y="44" width="7" height="12" rx="3.5" fill="url(#marcus-headset)" />
          <circle cx="28.5" cy="50" r="2" fill="#38bdf8" filter="drop-shadow(0 0 3px #38bdf8)" />
          {/* Headset mic */}
          <path d="M28 54Q32 63 40 63" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
          <circle cx="40" cy="63" r="1.8" fill="#38bdf8" />
        </svg>
      );

    case 'elena':
      // Cloud Visionary / Neural Earpiece & Amber Specs
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="elena-hair" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>
            <linearGradient id="elena-skin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>
          </defs>
          {/* High Ponytail Back */}
          <path d="M62 30C72 16 82 24 80 44C78 52 70 54 64 50Z" fill="url(#elena-hair)" />
          {/* Shoulders */}
          <path d="M24 96C24 78 34 72 50 72C66 72 76 78 76 96Z" fill="#3b0764" />
          <path d="M38 72L50 85L62 72Z" fill="#f97316" />
          {/* Neck */}
          <rect x="44" y="60" width="12" height="14" rx="2" fill="#fdba74" />
          {/* Face */}
          <ellipse cx="50" cy="50" rx="18" ry="20" fill="url(#elena-skin)" />
          {/* Hair Front */}
          <path d="M31 46C31 32 40 28 50 28C60 28 69 32 69 46C64 38 56 34 48 34C40 34 34 38 31 46Z" fill="url(#elena-hair)" />
          {/* Eyebrows */}
          <path d="M37 44Q43 42 46 45" stroke="#7c2d12" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M63 44Q57 42 54 45" stroke="#7c2d12" strokeWidth="1.6" strokeLinecap="round" />
          {/* Amber Smart Specs */}
          <rect x="34" y="45" width="13" height="10" rx="2" stroke="#f97316" strokeWidth="1.5" fill="rgba(249, 115, 22, 0.2)" />
          <rect x="53" y="45" width="13" height="10" rx="2" stroke="#f97316" strokeWidth="1.5" fill="rgba(249, 115, 22, 0.2)" />
          <line x1="47" y1="49" x2="53" y2="49" stroke="#f97316" strokeWidth="1.5" />
          {/* Eyes */}
          <g style={{ transformOrigin: '50px 50px', animation: 'blinkEyes 3.8s ease-in-out infinite' }}>
            <circle cx="40.5" cy="50" r="2" fill="#431407" />
            <circle cx="59.5" cy="50" r="2" fill="#431407" />
          </g>
          {/* Nose & Smile */}
          <path d="M49 55L51 57" stroke="#c2410c" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M45 62Q50 65 55 62" stroke="#be123c" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          {/* Neural Earpiece */}
          <circle cx="31" cy="49" r="2.8" fill="#f97316" filter="drop-shadow(0 0 4px #f97316)" />
        </svg>
      );

    case 'daniel':
      // Matrix Engineer / Deep Green Spectacles & High Turtleneck
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="daniel-skin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffedd5" />
              <stop offset="100%" stopColor="#fed7aa" />
            </linearGradient>
          </defs>
          {/* Dark Cyber Turtleneck */}
          <path d="M24 96C24 76 34 68 50 68C66 68 76 76 76 96Z" fill="#064e3b" />
          <rect x="42" y="60" width="16" height="14" rx="4" fill="#022c22" stroke="#10b981" strokeWidth="0.8" />
          {/* Head & Modern Undercut */}
          <ellipse cx="50" cy="49" rx="18" ry="20" fill="url(#daniel-skin)" />
          <path d="M30 42C30 24 40 22 50 22C60 22 70 24 70 42C66 32 58 28 50 28C42 28 34 32 30 42Z" fill="#0f172a" />
          {/* Eyebrows */}
          <path d="M36 42L46 41" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <path d="M64 42L54 41" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          {/* Emerald Matrix Spectacles */}
          <rect x="33" y="43" width="14" height="10" rx="3" stroke="#10b981" strokeWidth="1.6" fill="rgba(16, 185, 129, 0.22)" />
          <rect x="53" y="43" width="14" height="10" rx="3" stroke="#10b981" strokeWidth="1.6" fill="rgba(16, 185, 129, 0.22)" />
          <line x1="47" y1="47" x2="53" y2="47" stroke="#10b981" strokeWidth="1.5" />
          {/* Eyes */}
          <g style={{ transformOrigin: '50px 48px', animation: 'blinkEyes 4s ease-in-out infinite' }}>
            <circle cx="40" cy="48" r="2.2" fill="#064e3b" />
            <circle cx="60" cy="48" r="2.2" fill="#064e3b" />
          </g>
          {/* Nose & Smile */}
          <path d="M49 54L51 56" stroke="#9a3412" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M45 61Q50 63 55 61" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'sophia':
      // Security Sentinel / UV Goggles & Purple Streak
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="sophia-skin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          {/* Shoulders */}
          <path d="M22 96C22 78 32 72 50 72C68 72 78 78 78 96Z" fill="#1e1b4b" />
          <path d="M40 72L50 84L60 72Z" fill="#c084fc" />
          {/* Neck */}
          <rect x="44" y="62" width="12" height="12" rx="2" fill="#f59e0b" />
          {/* Face */}
          <ellipse cx="50" cy="51" rx="18" ry="20" fill="url(#sophia-skin)" />
          {/* Dark Hair with Violet Accent Streak */}
          <path d="M30 46C30 26 40 24 50 24C60 24 70 26 70 46C65 34 56 30 50 30C44 30 35 34 30 46Z" fill="#18181b" />
          <path d="M30 46C34 38 42 32 50 32C42 34 36 40 34 48Z" fill="#c084fc" />
          {/* UV Visor Goggles */}
          <path d="M32 45H68V55C68 57 66 59 64 59H36C34 59 32 57 32 55V45Z" fill="rgba(192, 132, 252, 0.3)" stroke="#c084fc" strokeWidth="1.6" />
          <line x1="32" y1="50" x2="68" y2="50" stroke="#f0abfc" strokeWidth="1" strokeDasharray="3 2" />
          {/* Goggle side straps */}
          <rect x="28" y="47" width="5" height="6" rx="1.5" fill="#a855f7" />
          <rect x="67" y="47" width="5" height="6" rx="1.5" fill="#a855f7" />
          {/* Nose & Smile */}
          <path d="M49 57L51 59" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M45 64Q50 67 55 64" stroke="#831843" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'kwame':
      // DevOps Maestro / Teal Vest & Dual-Focus Frames
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          {/* Shoulders / Teal Vest */}
          <path d="M22 96C22 78 32 70 50 70C68 70 78 78 78 96Z" fill="#042f2e" />
          <path d="M34 70H66V96H34Z" fill="#0d9488" />
          {/* Neck */}
          <rect x="43" y="60" width="14" height="14" rx="2" fill="#582f0e" />
          {/* Head & Beard */}
          <ellipse cx="50" cy="49" rx="18" ry="20" fill="#7f4f24" />
          <path d="M34 54C34 65 42 68 50 68C58 68 66 65 66 54C62 60 56 62 50 62C44 62 38 60 34 54Z" fill="#1c1917" />
          {/* Hair */}
          <path d="M32 40C32 26 40 24 50 24C60 24 68 26 68 40C64 30 56 28 50 28C44 28 36 30 32 40Z" fill="#1c1917" />
          {/* Eyebrows */}
          <path d="M37 42L47 41" stroke="#1c1917" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M63 42L53 41" stroke="#1c1917" strokeWidth="2.2" strokeLinecap="round" />
          {/* Dual-Focus Teal Frames */}
          <circle cx="41" cy="47" r="6.5" stroke="#14b8a6" strokeWidth="1.6" fill="rgba(20, 184, 166, 0.2)" />
          <circle cx="59" cy="47" r="6.5" stroke="#14b8a6" strokeWidth="1.6" fill="rgba(20, 184, 166, 0.2)" />
          <line x1="47.5" y1="47" x2="52.5" y2="47" stroke="#14b8a6" strokeWidth="1.6" />
          {/* Eyes */}
          <g style={{ transformOrigin: '50px 47px', animation: 'blinkEyes 4.2s ease-in-out infinite' }}>
            <circle cx="41" cy="47" r="2.2" fill="#1c1917" />
            <circle cx="59" cy="47" r="2.2" fill="#1c1917" />
          </g>
          {/* Nose & Smile */}
          <path d="M48 52Q50 55 52 55" stroke="#3d2616" strokeWidth="1.4" strokeLinecap="round" fill="none" />
          <path d="M45 59Q50 62 55 59" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'chloe':
      // Algorithm Master / Magenta Bob & Audio Shades
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="chloe-hair" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#9f1239" />
            </linearGradient>
          </defs>
          {/* Hair Bob back */}
          <path d="M26 44C26 24 74 24 74 44C74 62 70 70 70 70H30C30 70 26 62 26 44Z" fill="url(#chloe-hair)" />
          {/* Shoulders */}
          <path d="M24 96C24 78 34 72 50 72C66 72 76 78 76 96Z" fill="#18181b" />
          <path d="M40 72L50 84L60 72Z" fill="#f43f5e" />
          {/* Neck */}
          <rect x="44" y="60" width="12" height="14" rx="2" fill="#fed7aa" />
          {/* Face */}
          <ellipse cx="50" cy="50" rx="17" ry="19" fill="#fde68a" />
          {/* Hair Bob front bangs */}
          <path d="M30 46C30 32 38 28 50 28C62 28 70 32 70 46C64 36 58 34 50 34C42 34 36 36 30 46Z" fill="url(#chloe-hair)" />
          {/* Audio Shades */}
          <path d="M33 46H67V54C67 56 65 58 63 58H37C35 58 33 56 33 54V46Z" fill="rgba(244, 63, 94, 0.35)" stroke="#f43f5e" strokeWidth="1.5" />
          <line x1="33" y1="50" x2="67" y2="50" stroke="#fda4af" strokeWidth="1" strokeDasharray="2 2" />
          {/* Nose & Smile */}
          <path d="M49 55L51 57" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M46 62Q50 65 54 62" stroke="#be123c" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'liam':
      // Mobile Pioneer / Reversed Cap & Solar Earbuds
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          {/* Shoulders */}
          <path d="M22 96C22 76 32 70 50 70C68 70 78 76 78 96Z" fill="#d97706" />
          <path d="M44 70H56V96H44Z" fill="#451a03" />
          {/* Neck */}
          <rect x="44" y="60" width="12" height="12" rx="2" fill="#fed7aa" />
          {/* Face */}
          <ellipse cx="50" cy="50" rx="18" ry="20" fill="#fde68a" />
          {/* Reversed Tech Cap */}
          <path d="M32 40C32 26 40 22 50 22C60 22 68 26 68 40H32Z" fill="#334155" />
          {/* Cap Back Snap / Brim */}
          <path d="M30 40H70V44H30Z" fill="#f59e0b" />
          {/* Eyebrows */}
          <path d="M37 43L46 42" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
          <path d="M63 43L54 42" stroke="#451a03" strokeWidth="2" strokeLinecap="round" />
          {/* Eyes with blinking */}
          <g style={{ transformOrigin: '50px 48px', animation: 'blinkEyes 3.9s ease-in-out infinite' }}>
            <circle cx="41.5" cy="48" r="2.2" fill="#1e293b" />
            <circle cx="58.5" cy="48" r="2.2" fill="#1e293b" />
          </g>
          {/* Nose & Smile */}
          <path d="M49 53L51 55" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M44 60Q50 64 56 60" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Solar Neon Earbuds */}
          <circle cx="31" cy="50" r="2.5" fill="#f59e0b" filter="drop-shadow(0 0 3px #f59e0b)" />
          <circle cx="69" cy="50" r="2.5" fill="#f59e0b" filter="drop-shadow(0 0 3px #f59e0b)" />
        </svg>
      );

    case 'aisha':
      // Quantum Researcher / Celestial Circuit Headwrap & Monocle
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="aisha-wrap" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="aisha-skin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f7d0a6" />
              <stop offset="100%" stopColor="#e2ad75" />
            </linearGradient>
          </defs>
          {/* Celestial Wrap */}
          <path d="M26 44C26 24 74 24 74 44C74 72 74 96 74 96H26C26 96 26 72 26 44Z" fill="url(#aisha-wrap)" />
          {/* Gold Circuit Traces on Wrap */}
          <path d="M30 36L44 26M68 34L54 26M72 60L60 70" stroke="#ffd700" strokeWidth="0.9" strokeDasharray="3 2" />
          {/* Face */}
          <ellipse cx="50" cy="51" rx="17" ry="19" fill="url(#aisha-skin)" />
          {/* Eyebrows */}
          <path d="M38 45Q44 43 47 46" stroke="#451a03" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M62 45Q56 43 53 46" stroke="#451a03" strokeWidth="1.8" strokeLinecap="round" />
          {/* Eyes */}
          <g style={{ transformOrigin: '50px 50px', animation: 'blinkEyes 4.1s ease-in-out infinite' }}>
            <ellipse cx="42" cy="50" rx="3.2" ry="2" fill="#1e1b4b" />
            <circle cx="43" cy="49" r="0.9" fill="#fff" />
            <ellipse cx="58" cy="50" rx="3.2" ry="2" fill="#1e1b4b" />
            <circle cx="59" cy="49" r="0.9" fill="#fff" />
          </g>
          {/* Smart Ocular Lens over right eye */}
          <circle cx="42" cy="50" r="5.5" stroke="#38bdf8" strokeWidth="1.4" fill="rgba(56, 189, 248, 0.2)" />
          <circle cx="42" cy="50" r="2" fill="#38bdf8" opacity="0.6" />
          {/* Nose & Smile */}
          <path d="M49 55L51 57" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M46 63Q50 66 54 63" stroke="#be123c" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      );

    case 'alex':
    default:
      // Alex Thompson: Cyber Prodigy / AI Scholar
      return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="alex-skin" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>
            <linearGradient id="alex-hair" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="alex-visor" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          {/* High-Tech Cyber Hoodie */}
          <path d="M22 96C22 76 32 68 50 68C68 68 78 76 78 96Z" fill="#0f172a" />
          <path d="M38 68L50 82L62 68Z" fill="#2563eb" />
          <path d="M44 82L50 96L56 82Z" fill="#38bdf8" />
          {/* Glowing Collar Accents */}
          <line x1="32" y1="78" x2="42" y2="88" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" filter="drop-shadow(0 0 3px #38bdf8)" />
          <line x1="68" y1="78" x2="58" y2="88" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" filter="drop-shadow(0 0 3px #38bdf8)" />
          {/* Neck */}
          <rect x="43" y="58" width="14" height="14" rx="2" fill="#fed7aa" />
          {/* Face */}
          <ellipse cx="50" cy="49" rx="18" ry="20" fill="url(#alex-skin)" />
          {/* Sleek Undercut Hair with Electric Tips */}
          <path d="M30 42C30 22 40 20 50 20C60 20 70 22 70 42C64 30 56 26 50 26C42 26 34 30 30 42Z" fill="url(#alex-hair)" />
          <path d="M42 20L44 26M50 19L51 25M58 20L57 26" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
          {/* Eyebrows */}
          <path d="M36 41L46 40" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          <path d="M64 41L54 40" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
          {/* Holographic Visor with Glint Animation */}
          <path d="M30 43H70V53C70 56 67 58 64 58H36C33 58 30 56 30 53V43Z" fill="rgba(56, 189, 248, 0.35)" stroke="url(#alex-visor)" strokeWidth="1.8" />
          {/* Visor Glint Scanner Line */}
          <rect x="36" y="46" width="6" height="8" rx="1" fill="#fff" opacity="0.8" style={{ animation: 'visorGlint 2.8s ease-in-out infinite' }} />
          {/* Nose & Smile */}
          <path d="M49 54L51 56" stroke="#b45309" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M44 61Q50 65 56 61" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {/* Audio Headset on Side */}
          <rect x="26" y="44" width="5" height="10" rx="2.5" fill="#38bdf8" filter="drop-shadow(0 0 3px #38bdf8)" />
          <rect x="69" y="44" width="5" height="10" rx="2.5" fill="#38bdf8" filter="drop-shadow(0 0 3px #38bdf8)" />
        </svg>
      );
  }
};
