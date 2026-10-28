import React, { useEffect, useRef } from 'react';
import { Trophy, Crown, Sparkles, X, ArrowRight, Zap, Award } from 'lucide-react';
import { AnimatedAvatar } from '../../../components/AnimatedAvatar';

interface VictoryCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  points: number;
  onContinueLearning?: () => void;
}

interface ConfettiParticle {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
}

export const VictoryCelebrationModal: React.FC<VictoryCelebrationModalProps> = ({
  isOpen,
  onClose,
  studentName,
  points,
  onContinueLearning,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Confetti Particle System
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Resize canvas to full window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Color palette: Gold, Amber, Cyan, Electric Purple, Hot Pink, Emerald
    const colors = ['#ffd700', '#f59e0b', '#38bdf8', '#818cf8', '#f43f5e', '#10b981', '#ffffff'];

    const particleCount = 85;
    const particles: ConfettiParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 120,
        y: canvas.height * 0.45 + (Math.random() - 0.5) * 40,
        w: Math.random() * 8 + 5,
        h: Math.random() * 12 + 6,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 1,
      });
    }

    let startTime = performance.now();

    const render = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let activeCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Apply physics: gravity + air resistance
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.vx *= 0.985; // friction
        p.rotation += p.rotationSpeed;

        // Gradual fade out after 2.5s
        if (elapsed > 2500) {
          p.opacity -= 0.015;
        }

        if (p.opacity > 0 && p.y < canvas.height + 20) {
          activeCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (activeCount > 0 && elapsed < 5500) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="First Place Victory Celebration"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'rgba(5, 8, 22, 0.85)',
        backdropFilter: 'blur(10px)',
        animation: 'victoryFadeIn 0.35s ease-out forwards',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes victoryFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes victoryModalPop {
          0% { opacity: 0; transform: scale(0.88) translateY(20px); }
          60% { opacity: 1; transform: scale(1.02) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes trophyGlowPulse {
          0%, 100% { filter: drop-shadow(0 0 16px rgba(255, 215, 0, 0.6)) drop-shadow(0 0 35px rgba(245, 158, 11, 0.35)); }
          50% { filter: drop-shadow(0 0 28px rgba(255, 215, 0, 0.95)) drop-shadow(0 0 55px rgba(245, 158, 11, 0.55)); }
        }
        @keyframes haloSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes floatUpDown {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .victory-modal-anim {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* Confetti Background Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Main Celebration Card */}
      <div
        className="victory-modal-anim"
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '520px',
          width: '100%',
          background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0b0f19 80%)',
          border: '2px solid rgba(255, 215, 0, 0.5)',
          borderRadius: '24px',
          padding: '36px 30px 28px',
          textAlign: 'center',
          boxShadow: '0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 60px rgba(245, 158, 11, 0.25)',
          animation: 'victoryModalPop 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Spinning Ray Aura */}
        <div
          style={{
            position: 'absolute',
            top: '25%',
            left: '50%',
            width: '380px',
            height: '380px',
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255, 215, 0, 0.12) 60deg, transparent 120deg, rgba(255, 215, 0, 0.12) 180deg, transparent 240deg, rgba(255, 215, 0, 0.12) 300deg, transparent 360deg)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
            zIndex: 0,
            animation: 'haloSpin 25s linear infinite',
          }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close celebration dialog"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#94a3b8',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            zIndex: 3,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
        >
          <X size={16} />
        </button>

        {/* Trophy & Crown Visual Centerpiece */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px', zIndex: 1 }}>
          {/* Floating Crown above Trophy */}
          <div style={{ animation: 'floatUpDown 3s ease-in-out infinite' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '-6px' }}>
              <Crown
                size={38}
                color="#ffd700"
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.8))',
                }}
              />
            </div>

            {/* Glowing Golden Trophy */}
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255, 215, 0, 0.25) 0%, rgba(245, 158, 11, 0.08) 70%)',
                border: '2px solid rgba(255, 215, 0, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                boxShadow: '0 0 35px rgba(245, 158, 11, 0.45)',
                animation: 'trophyGlowPulse 2.5s ease-in-out infinite',
              }}
            >
              <Trophy size={54} color="#ffd700" strokeWidth={2.2} />
            </div>
          </div>

          {/* Golden #1 Pill Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #ffd700, #f59e0b)',
              color: '#0f172a',
              fontSize: '0.85rem',
              fontWeight: 900,
              padding: '3px 14px',
              borderRadius: '999px',
              border: '2px solid #0f172a',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={12} /> #1 RANK
          </div>
        </div>

        {/* Celebration Headlines */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '22px' }}>
          <h2
            style={{
              fontSize: '1.85rem',
              fontWeight: 900,
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 30%, #ffd700 80%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            You're #1! Outstanding Achievement!
          </h2>

          <p
            style={{
              fontSize: '0.95rem',
              color: '#cbd5e1',
              margin: 0,
              lineHeight: 1.5,
              maxWidth: '430px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Your hard work and dedication have taken you to the very top of the academy leaderboard.
          </p>
        </div>

        {/* Student Performance Showcase Pill */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            borderRadius: '16px',
            padding: '14px 20px',
            marginBottom: '26px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
            <AnimatedAvatar
              size={48}
              isCurrentUser={true}
              name={studentName}
              rank={1}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>{studentName}</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={12} color="#ffd700" /> Academy Champion &bull; Spring 2026
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Points</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffd700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={15} color="#ffd700" />
              {points.toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* Action Button: Continue Learning */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              if (onContinueLearning) onContinueLearning();
              onClose();
            }}
            className="btn btn-primary"
            style={{
              padding: '12px 28px',
              fontSize: '0.95rem',
              fontWeight: 800,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              border: 'none',
              color: '#0f172a',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 30px rgba(245, 158, 11, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.45)';
            }}
          >
            <span>Continue Learning</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              padding: '12px 20px',
              fontSize: '0.9rem',
              fontWeight: 700,
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#cbd5e1',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
