import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import {
  BookOpen,
  ShieldCheck,
  Video,
  TrendingUp,
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Shield,
  GraduationCap
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
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectQuery = searchParams.get('redirect');
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || (redirectQuery ? decodeURIComponent(redirectQuery) : undefined);

  useEffect(() => {
    if (isAuthenticated && user) {
      const isStudent = user.activeRole === 'student' || user.activeRole === 'learner' || user.activeRole === 'guest';
      navigate(isStudent ? '/leaderboard' : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sessionStorage.removeItem('venilearn_logged_out');
    clearError();
    await login(email, password);
    const storeState = useAuthStore.getState();
    if (storeState.isAuthenticated && storeState.user) {
      const isStudent = storeState.user.activeRole === 'student' || storeState.user.activeRole === 'learner' || storeState.user.activeRole === 'guest';
      if (isStudent) {
        sessionStorage.setItem('show_student_leaderboard_popup', 'true');
      }
      const target = isStudent ? '/leaderboard' : (from && from !== '/login' ? from : '/dashboard');
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
      const isStudent = storeState.user.activeRole === 'student' || storeState.user.activeRole === 'learner' || storeState.user.activeRole === 'guest';
      if (isStudent) {
        sessionStorage.setItem('show_student_leaderboard_popup', 'true');
      }
      navigate(isStudent ? '/leaderboard' : '/dashboard', { replace: true });
    }
  };

  return (
    <div className="lms-login-container">
      <style>{`
        .lms-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at 15% 20%, rgba(245, 238, 255, 0.85) 0%, rgba(255, 255, 255, 0.95) 45%, rgba(240, 245, 255, 0.8) 100%);
          padding: 32px 24px;
          position: relative;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          overflow: hidden;
        }
        .lms-login-grid {
          width: 100%;
          max-width: 1200px;
          display: grid;
          grid-template-columns: 1.25fr 0.95fr;
          gap: 56px;
          align-items: center;
          z-index: 10;
        }
        .lms-left-pane {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .lms-feature-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 36px;
        }
        .lms-feature-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          cursor: default;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lms-feature-card:hover {
          transform: translateY(-3px);
        }
        .lms-feature-card .icon-badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lms-feature-card:hover .icon-badge {
          transform: scale(1.08);
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.08);
        }
        .lms-login-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 40px 36px;
          box-shadow: 0 20px 45px -12px rgba(147, 51, 234, 0.12), 0 0 0 1px rgba(226, 232, 240, 0.8);
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          position: relative;
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
          .lms-login-container {
            padding: 20px 14px;
          }
          .lms-feature-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
          .lms-login-card {
            padding: 28px 20px !important;
            border-radius: 20px !important;
          }
          .lms-left-pane h1 {
            font-size: 2.1rem !important;
          }
        }
      `}</style>

      {/* Soft Ambient Background Glows */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, rgba(147, 51, 234, 0.05) 50%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '-5%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(244, 114, 182, 0.15) 0%, rgba(129, 140, 248, 0.08) 50%, transparent 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none',
        borderRadius: '50%'
      }} />

      {/* Main 2-Column Container */}
      <div className="lms-login-grid">
        {/* ========================================================= */}
        {/* LEFT COLUMN: LMS Value Proposition, 4 Feature Cards & Art */}
        {/* ========================================================= */}
        <div className="lms-left-pane">
          {/* Main Headline */}
          <h1 style={{
            fontSize: '2.75rem',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#1e293b',
            letterSpacing: '-0.03em',
            margin: '0 0 16px 0'
          }}>
            Better Minds. Stronger Skills.{' '}
            <span style={{
              background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
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
            color: '#64748b',
            margin: '0 0 32px 0',
            maxWidth: '540px'
          }}>
            Empower learners, streamline course delivery, and build a more productive tomorrow with our intelligent, next-gen enterprise LMS.
          </p>

          {/* 4 Feature Cards (Direct LMS equivalent of the reference layout) */}
          <div className="lms-feature-grid">
            {/* Card 1: Course Studio */}
            <div className="lms-feature-card">
              <div
                className="icon-badge"
                style={{
                  background: '#eff6ff',
                  color: '#2563eb',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
                }}
              >
                <BookOpen size={20} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', lineHeight: 1.25 }}>
                Course<br />Management
              </span>
            </div>

            {/* Card 2: AI Assessments & Proctoring */}
            <div className="lms-feature-card">
              <div
                className="icon-badge"
                style={{
                  background: '#f0fdf4',
                  color: '#16a34a',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)',
                }}
              >
                <ShieldCheck size={20} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', lineHeight: 1.25 }}>
                Assessments &<br />Proctoring
              </span>
            </div>

            {/* Card 3: Live Classes & Cohorts */}
            <div className="lms-feature-card">
              <div
                className="icon-badge"
                style={{
                  background: '#faf5ff',
                  color: '#9333ea',
                  boxShadow: '0 4px 12px rgba(147, 51, 234, 0.08)',
                }}
              >
                <Video size={20} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', lineHeight: 1.25 }}>
                Live Classes &<br />Cohorts
              </span>
            </div>

            {/* Card 4: Performance & Growth */}
            <div className="lms-feature-card">
              <div
                className="icon-badge"
                style={{
                  background: '#fff7ed',
                  color: '#ea580c',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)',
                }}
              >
                <TrendingUp size={20} strokeWidth={2.2} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', lineHeight: 1.25 }}>
                Performance &<br />Growth
              </span>
            </div>
          </div>

          {/* LMS Vector Graphic Illustration */}
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
              {/* Ground Shadow */}
              <ellipse cx="230" cy="180" rx="190" ry="8" fill="#f1f5f9" />

              {/* Central Desk & Laptop */}
              <rect x="150" y="115" width="160" height="6" rx="3" fill="#cbd5e1" />
              <rect x="180" y="121" width="6" height="55" rx="3" fill="#94a3b8" />
              <rect x="274" y="121" width="6" height="55" rx="3" fill="#94a3b8" />
              
              {/* Laptop Display */}
              <rect x="195" y="80" width="70" height="42" rx="4" fill="#0f172a" />
              <rect x="198" y="83" width="64" height="36" rx="2" fill="#1e293b" />
              <path d="M190 122H270L266 126H194L190 122Z" fill="#94a3b8" />
              {/* Screen Content: Learning Analytics Bar Chart */}
              <rect x="204" y="98" width="8" height="15" rx="2" fill="#3b82f6" />
              <rect x="216" y="92" width="8" height="21" rx="2" fill="#9333ea" />
              <rect x="228" y="88" width="8" height="25" rx="2" fill="#ec4899" />
              <rect x="240" y="95" width="8" height="18" rx="2" fill="#10b981" />

              {/* Floating Academic Dashboard Card */}
              <rect x="160" y="24" width="140" height="68" rx="8" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5" />
              <circle cx="178" cy="40" r="8" fill="#9333ea" fillOpacity="0.15" />
              <path d="M174 40L177 43L183 37" stroke="#9333ea" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="192" y="36" width="65" height="5" rx="2.5" fill="#e2e8f0" />
              <rect x="192" y="44" width="40" height="4" rx="2" fill="#f1f5f9" />
              <circle cx="282" cy="40" r="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
              <path d="M282 36V40H285" stroke="#64748b" strokeWidth="1.2" strokeLinecap="round" />
              {/* Big Analytics Chart */}
              <rect x="178" y="60" width="10" height="22" rx="2" fill="#3b82f6" />
              <rect x="194" y="52" width="10" height="30" rx="2" fill="#38bdf8" />
              <rect x="210" y="64" width="10" height="18" rx="2" fill="#9333ea" />

              {/* Learner 1 (Standing Left) */}
              <circle cx="120" cy="85" r="10" fill="#1e293b" />
              <rect x="110" y="98" width="20" height="42" rx="6" fill="#1e293b" />
              <rect x="112" y="140" width="6" height="38" rx="3" fill="#0f172a" />
              <rect x="122" y="140" width="6" height="38" rx="3" fill="#0f172a" />
              <rect x="126" y="112" width="14" height="18" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
              <rect x="129" y="116" width="8" height="2" fill="#9333ea" />

              {/* Learner 2 (Seated Center) */}
              <circle cx="175" cy="98" r="9" fill="#1e293b" />
              <path d="M168 110C168 107 182 107 182 110V145H168V110Z" fill="#9333ea" />
              <rect x="166" y="140" width="16" height="4" rx="2" fill="#6b21a8" />
              <rect x="173" y="144" width="3" height="32" rx="1.5" fill="#475569" />

              {/* Instructor / Mentor (Standing Right) */}
              <circle cx="340" cy="88" r="10" fill="#1e293b" />
              <rect x="330" y="100" width="20" height="40" rx="6" fill="#93c5fd" />
              <rect x="332" y="140" width="6" height="38" rx="3" fill="#0f172a" />
              <rect x="342" y="140" width="6" height="38" rx="3" fill="#0f172a" />
              <path d="M330 112L312 120" stroke="#93c5fd" strokeWidth="5" strokeLinecap="round" />

              {/* Potted Plant */}
              <path d="M86 150L83 175H97L94 150H86Z" fill="#f87171" />
              <ellipse cx="90" cy="144" rx="5" ry="10" fill="#34d399" />
              <ellipse cx="83" cy="147" rx="8" ry="4" fill="#10b981" />
              <ellipse cx="97" cy="147" rx="8" ry="4" fill="#10b981" />
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
              color: '#94a3b8',
              fontWeight: 500
            }}
          >
            <span style={{ fontWeight: 700, color: '#9333ea' }}>VeniLearn</span>
            <span>•</span>
            <span>Your Learning, Our Priority</span>
            <span>•</span>
            <span>Cloud Enterprise</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Modern White Floating Login Card           */}
        {/* ========================================================= */}
        <div className="lms-login-card">
          {/* Card Header with Brand Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '8px'
            }}>
              {/* Logo Icon Mark */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)'
              }}>
                <GraduationCap size={20} strokeWidth={2.4} />
              </div>
              <span style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                background: 'linear-gradient(135deg, #1e293b 40%, #9333ea 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                VeniLearn
              </span>
            </div>
            <p style={{
              fontSize: '0.86rem',
              color: '#64748b',
              margin: 0
            }}>
              Sign in with your credentials to access your portal
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#dc2626',
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
                color: '#334155',
                marginBottom: '7px'
              }}>
                Email Address
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} />
                <input
                  type="email"
                  required
                  placeholder="Enter your work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px 11px 42px',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.875rem',
                    color: '#1e293b',
                    background: '#ffffff',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#9333ea';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147, 51, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '7px'
              }}>
                Password
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 42px 11px 42px',
                    borderRadius: '12px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '0.875rem',
                    color: '#1e293b',
                    background: '#ffffff',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#9333ea';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(147, 51, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
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
                    color: '#94a3b8',
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
                color: '#64748b',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    accentColor: '#9333ea',
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
                  color: '#9333ea',
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

            {/* Gradient Primary Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '13px 20px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #9333ea 0%, #ec4899 100%)',
                color: '#ffffff',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 8px 20px -4px rgba(236, 72, 153, 0.4)',
                transition: 'all 0.2s ease',
                opacity: isLoading ? 0.8 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 12px 24px -4px rgba(236, 72, 153, 0.5)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(236, 72, 153, 0.4)';
              }}
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
            color: '#64748b'
          }}>
            Don't have an account?{' '}
            <a
              href="mailto:support@acuitylms.com"
              style={{
                color: '#9333ea',
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
            borderTop: '1px solid #f1f5f9'
          }}>
            <div
              onClick={() => setShowDemoRoles(!showDemoRoles)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#94a3b8',
                cursor: 'pointer',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: showDemoRoles ? '10px' : '0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} color="#9333ea" />
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
                  { label: 'Student Learner', email: 'student@lms.demo', color: '#9333ea' },
                ].map((item) => (
                  <button
                    key={item.email}
                    type="button"
                    onClick={() => handleQuickLogin(item.email)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#334155',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = item.color;
                      e.currentTarget.style.background = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                    }}
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

      {/* Simulated SSO / MFA Dialog */}
      {mfaModal && (
        <div className="modal-overlay" onClick={() => setMfaModal(false)}>
          <div className="modal-card" style={{ maxWidth: '440px', background: '#ffffff', borderRadius: '18px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="#9333ea" />
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#1e293b' }}>Enterprise SSO Simulation</h3>
              </div>
            </div>
            <div className="modal-body">
              <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '16px' }}>
                In production, this routes through your Identity Provider (SAML 2.0 / OIDC). For this frontend prototype, enter demo verification code <strong>123456</strong>.
              </p>
              <div className="form-group">
                <label className="form-label">2FA / MFA Passcode</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setMfaModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
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
