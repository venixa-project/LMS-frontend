import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useOrganisationBranding } from '../../lib/useOrganisationBranding';
import {
  BookOpen,
  ShieldCheck,
  Video,
  Trophy,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Shield,
  GraduationCap,
  CheckCircle2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@lms.demo');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showDemoRoles, setShowDemoRoles] = useState(true);
  const [mfaModal, setMfaModal] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuthStore();
  const { companyName, companyLogo } = useOrganisationBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const brandTitle = companyName || 'RAPA Technologies';

  const searchParams = new URLSearchParams(location.search);
  const redirectQuery = searchParams.get('redirect');
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || (redirectQuery ? decodeURIComponent(redirectQuery) : undefined);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.removeItem('venilearn_logged_out');
    clearError();
    await login(email, password, searchParams.get('tenantId') || undefined);
    const storeState = useAuthStore.getState();
    if (storeState.isAuthenticated && storeState.user) {
      if (storeState.user.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      const target = from && from !== '/login' ? from : '/dashboard';
      navigate(target, { replace: true });
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    sessionStorage.removeItem('venilearn_logged_out');
    clearError();
    setEmail(demoEmail);
    setPassword('demoPass123');
    await login(demoEmail, 'demoPass123');
    const storeState = useAuthStore.getState();
    if (storeState.isAuthenticated && storeState.user) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="lms-dark-login-container">
      <style>{`
        .lms-dark-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at 15% 20%, #0d122b 0%, #050816 55%, #02030a 100%);
          padding: 32px 24px;
          position: relative;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          overflow: hidden;
          color: #F8FAFC;
        }

        /* Ambient Glow Spheres */
        .ambient-glow-1 {
          position: absolute;
          top: -10%;
          left: -5%;
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, rgba(84, 71, 255, 0.22) 0%, rgba(37, 99, 235, 0.1) 50%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
          border-radius: 50%;
        }
        .ambient-glow-2 {
          position: absolute;
          bottom: -10%;
          right: -5%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(236, 72, 153, 0.18) 0%, rgba(129, 140, 248, 0.08) 50%, transparent 70%);
          filter: blur(90px);
          pointer-events: none;
          border-radius: 50%;
        }
        .ambient-glow-center {
          position: absolute;
          top: 30%;
          right: 25%;
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.14) 0%, transparent 65%);
          filter: blur(75px);
          pointer-events: none;
          border-radius: 50%;
        }

        /* 2-Column Grid */
        .lms-login-grid {
          width: 100%;
          max-width: 1220px;
          display: grid;
          grid-template-columns: 1.24fr 0.96fr;
          gap: 56px;
          align-items: center;
          z-index: 10;
        }

        .lms-left-pane {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        /* 4 LMS Feature Cards matching Application Dashboard */
        .lms-feature-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 36px;
        }

        .lms-feature-card {
          background: rgba(21, 19, 41, 0.7);
          border: 1px solid rgba(129, 140, 248, 0.18);
          border-radius: 16px;
          padding: 14px 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: default;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(12px);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .lms-feature-card:hover {
          transform: translateY(-3px);
          border-color: rgba(129, 140, 248, 0.45);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.65), 0 0 15px rgba(84, 71, 255, 0.2);
        }

        .lms-feature-card .icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          transition: transform 0.25s ease;
        }

        .lms-feature-card:hover .icon-badge {
          transform: scale(1.08);
        }

        /* Right Column: Floating Dark Glassmorphic Card */
        .lms-dark-login-card {
          background: rgba(19, 27, 46, 0.88);
          border: 1px solid rgba(129, 140, 248, 0.24);
          border-radius: 24px;
          padding: 40px 36px;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.8), 0 0 35px -5px rgba(84, 71, 255, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          position: relative;
        }

        /* Inputs */
        .lms-dark-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border-radius: 12px;
          border: 1.5px solid #242244;
          font-size: 0.875rem;
          color: #F8FAFC;
          background: #0B0B2A;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .lms-dark-input:focus {
          border-color: #5447FF;
          box-shadow: 0 0 0 3px rgba(84, 71, 255, 0.25);
          background: #0e1236;
        }
        .lms-dark-input::placeholder {
          color: #64748B;
        }

        .lms-dark-input-password {
          padding-right: 44px;
        }

        /* Primary Button */
        .lms-gradient-submit-btn {
          width: 100%;
          padding: 13px 20px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #EC4899 100%);
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 10px 25px -4px rgba(84, 71, 255, 0.5), 0 0 20px -2px rgba(236, 72, 153, 0.35);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lms-gradient-submit-btn:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 14px 30px -4px rgba(84, 71, 255, 0.65), 0 0 25px rgba(236, 72, 153, 0.45);
        }
        .lms-gradient-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Demo Role Pills */
        .demo-role-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 8px;
          background: #0d1326;
          border: 1px solid #242244;
          font-size: 0.74rem;
          font-weight: 600;
          color: #E2E8F0;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }
        .demo-role-btn:hover {
          background: #151d38;
          border-color: rgba(129, 140, 248, 0.5);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        @media (max-width: 960px) {
          .lms-login-grid {
            grid-template-columns: 1fr;
            gap: 36px;
            padding: 16px 0;
          }
          .lms-left-pane {
            text-align: center;
            align-items: center !important;
          }
          .lms-left-pane p {
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .lms-illustration-wrap {
            margin: 0 auto 20px auto !important;
          }
          .lms-footer-tagline {
            justify-content: center;
          }
        }

        @media (max-width: 560px) {
          .lms-dark-login-container {
            padding: 20px 14px;
          }
          .lms-feature-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .lms-dark-login-card {
            padding: 28px 20px !important;
            border-radius: 20px !important;
          }
          .lms-left-pane h1 {
            font-size: 2.1rem !important;
          }
        }
      `}</style>

      {/* Ambient Deep Glow Lights */}
      <div className="ambient-glow-1" />
      <div className="ambient-glow-2" />
      <div className="ambient-glow-center" />

      {/* Main 2-Column Grid */}
      <div className="lms-login-grid">
        {/* ========================================================= */}
        {/* LEFT COLUMN: LMS Value Proposition, 4 Dark Feature Cards  */}
        {/* ========================================================= */}
        <div className="lms-left-pane">
          {/* Main Headline */}
          <h1 style={{
            fontSize: '2.75rem',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#FFFFFF',
            letterSpacing: '-0.03em',
            margin: '0 0 16px 0'
          }}>
            Better Minds. Stronger Skills.{' '}
            <span style={{
              background: 'linear-gradient(135deg, #38BDF8 0%, #818CF8 50%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              display: 'inline-block'
            }}>
              A Brighter Future.
            </span>
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: '1rem',
            lineHeight: 1.6,
            color: '#94A3B8',
            margin: '0 0 32px 0',
            maxWidth: '540px'
          }}>
            Empower learners, streamline course delivery, and build a more productive tomorrow with our intelligent, next-gen enterprise LMS.
          </p>

          {/* 4 Feature Cards (Dark Application Theme Aligned) */}
          <div className="lms-feature-grid">
            {/* Card 1: Course Studio */}
            <div className="lms-feature-card">
              <div
                className="icon-badge"
                style={{
                  background: 'rgba(37, 99, 235, 0.18)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#60A5FA',
                  boxShadow: '0 0 15px rgba(37, 99, 235, 0.2)'
                }}
              >
                <BookOpen size={20} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.25, marginBottom: '2px' }}>
                Course Studio
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#38BDF8' }}>
                12+ Tracks
              </span>
            </div>

            {/* Card 2: AI Assessments & Proctoring */}
            <div className="lms-feature-card">
              <div
                className="icon-badge"
                style={{
                  background: 'rgba(16, 185, 129, 0.18)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34D399',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                }}
              >
                <ShieldCheck size={20} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.25, marginBottom: '2px' }}>
                Assessments
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#34D399' }}>
                AI Proctoring
              </span>
            </div>

            {/* Card 3: Live Classes & Cohorts */}
            <div className="lms-feature-card">
              <div
                className="icon-badge"
                style={{
                  background: 'rgba(129, 140, 248, 0.18)',
                  border: '1px solid rgba(129, 140, 248, 0.4)',
                  color: '#A5B4FC',
                  boxShadow: '0 0 15px rgba(129, 140, 248, 0.2)'
                }}
              >
                <Video size={20} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.25, marginBottom: '2px' }}>
                Live Cohorts
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#A5B4FC' }}>
                Meet & Zoom
              </span>
            </div>

            {/* Card 4: Leaderboard & Growth (Direct match to Image 2's gold card!) */}
            <div className="lms-feature-card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
              <div
                className="icon-badge"
                style={{
                  background: 'rgba(245, 158, 11, 0.18)',
                  border: '1px solid rgba(245, 158, 11, 0.45)',
                  color: '#FBBF24',
                  boxShadow: '0 0 15px rgba(245, 158, 11, 0.25)'
                }}
              >
                <Trophy size={20} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC', lineHeight: 1.25, marginBottom: '2px' }}>
                Leaderboard
              </span>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#FBBF24' }}>
                Top 5% Rank
              </span>
            </div>
          </div>

          {/* Dark Mode LMS Tech Vector Illustration */}
          <div
            className="lms-illustration-wrap"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '480px',
              height: '200px',
              margin: '0 auto 20px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg viewBox="0 0 460 190" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
              {/* Ground Glow Shadow */}
              <ellipse cx="230" cy="180" rx="190" ry="8" fill="rgba(84, 71, 255, 0.15)" />

              {/* Central Desk & Laptop */}
              <rect x="150" y="115" width="160" height="6" rx="3" fill="#1e293b" />
              <rect x="180" y="121" width="6" height="55" rx="3" fill="#0f172a" />
              <rect x="274" y="121" width="6" height="55" rx="3" fill="#0f172a" />
              
              {/* Laptop Display */}
              <rect x="195" y="80" width="70" height="42" rx="4" fill="#0b0f19" stroke="rgba(129, 140, 248, 0.3)" strokeWidth="1" />
              <rect x="198" y="83" width="64" height="36" rx="2" fill="#050816" />
              <path d="M190 122H270L266 126H194L190 122Z" fill="#334155" />
              {/* Screen Content: Neon Learning Analytics Bar Chart */}
              <rect x="204" y="98" width="8" height="15" rx="2" fill="#38BDF8" />
              <rect x="216" y="92" width="8" height="21" rx="2" fill="#818CF8" />
              <rect x="228" y="88" width="8" height="25" rx="2" fill="#EC4899" />
              <rect x="240" y="95" width="8" height="18" rx="2" fill="#10B981" />

              {/* Floating Dark Academic Dashboard Card */}
              <rect x="160" y="24" width="140" height="68" rx="10" fill="#151329" stroke="rgba(129, 140, 248, 0.35)" strokeWidth="1.5" />
              <circle cx="178" cy="40" r="8" fill="rgba(84, 71, 255, 0.3)" />
              <path d="M174 40L177 43L183 37" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="192" y="36" width="65" height="5" rx="2.5" fill="#242244" />
              <rect x="192" y="44" width="40" height="4" rx="2" fill="#1e1b38" />
              <circle cx="282" cy="40" r="7" fill="#0B0B2A" stroke="#242244" strokeWidth="1.2" />
              <path d="M282 36V40H285" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
              {/* Big Analytics Glowing Bars */}
              <rect x="178" y="60" width="10" height="22" rx="2" fill="#3B82F6" />
              <rect x="194" y="52" width="10" height="30" rx="2" fill="#818CF8" />
              <rect x="210" y="64" width="10" height="18" rx="2" fill="#EC4899" />

              {/* Learner 1 (Standing Left) */}
              <circle cx="120" cy="85" r="10" fill="#E2E8F0" />
              <rect x="110" y="98" width="20" height="42" rx="6" fill="#1E293B" />
              <rect x="112" y="140" width="6" height="38" rx="3" fill="#0F172A" />
              <rect x="122" y="140" width="6" height="38" rx="3" fill="#0F172A" />
              <rect x="126" y="112" width="14" height="18" rx="2" fill="#0B0B2A" stroke="#242244" strokeWidth="1" />
              <rect x="129" y="116" width="8" height="2" fill="#818CF8" />

              {/* Learner 2 (Seated Center) */}
              <circle cx="175" cy="98" r="9" fill="#E2E8F0" />
              <path d="M168 110C168 107 182 107 182 110V145H168V110Z" fill="#5447FF" />
              <rect x="166" y="140" width="16" height="4" rx="2" fill="#3B82F6" />
              <rect x="173" y="144" width="3" height="32" rx="1.5" fill="#1E293B" />

              {/* Instructor / Mentor (Standing Right) */}
              <circle cx="340" cy="88" r="10" fill="#E2E8F0" />
              <rect x="330" y="100" width="20" height="40" rx="6" fill="#0284C7" />
              <rect x="332" y="140" width="6" height="38" rx="3" fill="#0F172A" />
              <rect x="342" y="140" width="6" height="38" rx="3" fill="#0F172A" />
              <path d="M330 112L312 120" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />

              {/* Potted Tech Plant */}
              <path d="M86 150L83 175H97L94 150H86Z" fill="#334155" />
              <ellipse cx="90" cy="144" rx="5" ry="10" fill="#10B981" />
              <ellipse cx="83" cy="147" rx="8" ry="4" fill="#059669" />
              <ellipse cx="97" cy="147" rx="8" ry="4" fill="#059669" />
            </svg>
          </div>

          {/* Left Footer Tagline */}
          <div
            className="lms-footer-tagline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.82rem',
              color: '#94A3B8',
              fontWeight: 500
            }}
          >
            <span style={{ fontWeight: 700, color: '#38BDF8' }}>{brandTitle}</span>
            <span>•</span>
            <span>LMS Workspace</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10B981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Cloud Enterprise
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Ultra-Sleek Dark Glassmorphic Login Card   */}
        {/* ========================================================= */}
        <div className="lms-dark-login-card">
          {/* Card Header with Brand Logo (Matches Dashboard Topbar) */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '8px'
            }}>
              {/* Logo Icon Mark */}
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={brandTitle}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    objectFit: 'contain',
                    border: '1px solid rgba(129, 140, 248, 0.3)'
                  }}
                />
              ) : (
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #EC4899 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 15px rgba(84, 71, 255, 0.45)'
                }}>
                  <GraduationCap size={22} strokeWidth={2.4} />
                </div>
              )}
              <span style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: '#FFFFFF'
              }}>
                {brandTitle}
              </span>
            </div>
            <p style={{
              fontSize: '0.86rem',
              color: '#94A3B8',
              margin: 0
            }}>
              Sign in with your enterprise credentials to access your portal
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#FCA5A5',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#CBD5E1',
                marginBottom: '7px'
              }}>
                Email Address
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Mail size={18} color="#818CF8" style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} />
                <input
                  type="email"
                  required
                  placeholder="Enter your work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="lms-dark-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#CBD5E1',
                marginBottom: '7px'
              }}>
                Password
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Lock size={18} color="#818CF8" style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="lms-dark-input lms-dark-input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#818CF8',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              fontSize: '0.84rem'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#94A3B8',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    accentColor: '#5447FF',
                    width: '15px',
                    height: '15px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                />
                Remember me
              </label>

              <Link
                to="/forgot-password"
                style={{
                  color: '#60A5FA',
                  fontWeight: 600,
                  textDecoration: 'none',
                  fontSize: '0.84rem'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Forgot password?
              </Link>
            </div>

            {/* Gradient Primary Sign In Button (Matching Image 2 Theme) */}
            <button
              type="submit"
              disabled={isLoading}
              className="lms-gradient-submit-btn"
            >
              {isLoading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Contact Admin Footer */}
          <div style={{
            marginTop: '22px',
            textAlign: 'center',
            fontSize: '0.84rem',
            color: '#94A3B8'
          }}>
            Don't have an account?{' '}
            <a
              href="mailto:support@rapa.edu"
              style={{
                color: '#818CF8',
                fontWeight: 600,
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              Contact your administrator
            </a>
          </div>

          {/* 1-Click Demo Role Switcher Toggle */}
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(129, 140, 248, 0.15)'
          }}>
            <div
              onClick={() => setShowDemoRoles(!showDemoRoles)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#818CF8',
                cursor: 'pointer',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: showDemoRoles ? '10px' : '0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color="#818CF8" />
                <span>Instant Demo Role Login</span>
              </div>
              <span style={{ fontSize: '0.7rem' }}>{showDemoRoles ? '▲' : '▼'}</span>
            </div>

            {showDemoRoles && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Platform Admin', email: 'admin@lms.demo', color: '#ef4444' },
                  { label: 'Org Admin', email: 'orgadmin@lms.demo', color: '#3b82f6' },
                  { label: 'Trainer / Lead', email: 'trainer@lms.demo', color: '#06b6d4' },
                  { label: 'Student Learner', email: 'student@lms.demo', color: '#a855f7' },
                ].map((item) => (
                  <button
                    key={item.email}
                    type="button"
                    onClick={() => handleQuickLogin(item.email)}
                    className="demo-role-btn"
                  >
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: item.color,
                      flexShrink: 0
                    }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulated SSO / MFA Dialog (Dark Theme Styled) */}
      {mfaModal && (
        <div className="modal-overlay" onClick={() => setMfaModal(false)}>
          <div
            className="modal-card"
            style={{
              maxWidth: '440px',
              background: '#131b2e',
              border: '1px solid rgba(129, 140, 248, 0.25)',
              borderRadius: '20px',
              color: '#F8FAFC'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #242244' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="#818CF8" />
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#FFFFFF' }}>Enterprise SSO Simulation</h3>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '16px' }}>
                In production, this routes through your Identity Provider (SAML 2.0 / OIDC). For this prototype, enter demo verification code <strong>123456</strong>.
              </p>
              <div className="form-group">
                <label className="form-label" style={{ color: '#CBD5E1' }}>2FA / MFA Passcode</label>
                <input
                  type="text"
                  className="form-input lms-dark-input"
                  style={{ paddingLeft: '14px' }}
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #242244' }}>
              <button
                className="btn btn-secondary"
                style={{ background: '#0d1326', borderColor: '#242244', color: '#94A3B8' }}
                onClick={() => setMfaModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)', color: '#ffffff' }}
                onClick={async () => {
                  setMfaModal(false);
                  await handleQuickLogin('orgadmin@lms.demo');
                }}
              >
                Verify & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
