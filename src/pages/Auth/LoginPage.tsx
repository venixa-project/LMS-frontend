import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import {
  GraduationCap, Eye, EyeOff, Lock, Mail, AlertCircle,
  Shield, CheckCircle, ArrowRight, Sparkles
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@lms.demo');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [mfaModal, setMfaModal] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectQuery = searchParams.get('redirect');
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || (redirectQuery ? decodeURIComponent(redirectQuery) : undefined);

  useEffect(() => {
    if (isAuthenticated) {
      const currentUser = useAuthStore.getState().user || user;
      const isStudent = currentUser?.activeRole === 'student' || currentUser?.activeRole === 'learner' || currentUser?.activeRole === 'guest';
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
      const target = isStudent
        ? (from && from !== '/login' && from !== '/dashboard' && from !== '/' ? from : '/leaderboard')
        : (from && from !== '/login' ? from : '/dashboard');
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
      const target = isStudent ? '/leaderboard' : '/dashboard';
      navigate(target, { replace: true });
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 70%)',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative gradient glow */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '1020px', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px', zIndex: 10 }}>
        {/* Left Side: Brand & Quick Demo Switcher */}
        <div style={{
          background: 'rgba(19, 27, 46, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div className="brand-logo-card" style={{ padding: '8px 18px', borderRadius: '12px', marginBottom: '12px' }}>
                <img
                  src="/logo.png"
                  alt="VeniLearn Logo"
                  className="brand-logo-img"
                  style={{
                    height: '42px',
                    width: 'auto',
                    maxWidth: '200px',
                    objectFit: 'contain'
                  }}
                />
              </div>
              <p className="text-muted text-xs" style={{ margin: 0 }}>
                Enterprise Next-Gen Learning & Assessment Platform
              </p>
            </div>

            <h2 style={{ fontSize: '1.3rem', marginBottom: '12px', lineHeight: 1.3 }}>
              Experience the 3 core enterprise roles with instant demo credentials
            </h2>
            <p className="text-secondary text-sm" style={{ marginBottom: '24px' }}>
              Test complete role-based permissions, course authoring, proctoring queues, AI scoring and learner workflows.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                One-Click Role Selection
              </div>

              {[
                { name: 'Platform Admin', email: 'admin@lms.demo', persona: 'Sarah Chen', badge: 'Super Admin', color: '#ef4444' },
                { name: 'Institution Admin', email: 'orgadmin@lms.demo', persona: 'Marcus Johnson', badge: 'Campus Admin', color: '#3b82f6' },
                { name: 'Trainer / Faculty', email: 'trainer@lms.demo', persona: 'Dr. James Wilson', badge: 'Faculty Lead', color: '#06b6d4' },
                { name: 'Student / Learner', email: 'student@lms.demo', persona: 'Alex Thompson', badge: 'Enrolled Scholar', color: '#8b5cf6' },
              ].map((role) => (
                <button
                  key={role.email}
                  type="button"
                  onClick={() => handleQuickLogin(role.email)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'var(--transition)',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = role.color;
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: role.color
                    }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{role.name} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem' }}>({role.persona})</span></div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{role.email}</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: `${role.color}18`,
                    color: role.color,
                    fontWeight: 600
                  }}>
                    {role.badge} &rarr;
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleQuickLogin('suspended@lms.demo')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  border: '1px dashed var(--danger)',
                  color: 'var(--danger)',
                  fontSize: '0.75rem',
                  marginTop: '4px'
                }}
              >
                <span>Simulate Suspended User Account Error</span>
                <span>Test &rarr;</span>
              </button>
            </div>
          </div>

          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <Sparkles size={14} color="var(--primary)" />
            <span>Built according to PRD v1.0 specifications for frontend UAT</span>
          </div>
        </div>

        {/* Right Side: Standard Login Form */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '36px',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ marginBottom: '24px' }}>
            <div className="brand-logo-card" style={{ padding: '6px 14px', borderRadius: '10px', marginBottom: '16px' }}>
              <img
                src="/logo.png"
                alt="VeniLearn Logo"
                className="brand-logo-img"
                style={{
                  height: '32px',
                  width: 'auto',
                  maxWidth: '160px',
                  objectFit: 'contain'
                }}
              />
            </div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>Sign in to your account</h2>
            <p className="text-secondary text-sm">Enter your organizational credentials</p>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <Mail size={14} />
                Work Email or Username
              </label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@organization.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">
                  <Lock size={14} />
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }}
                />
                Remember this device (30 days)
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
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

          {/* SSO Integration Placeholders */}
          <div style={{ margin: '24px 0 16px', position: 'relative', textAlign: 'center' }}>
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border-subtle)' }} />
            <span style={{ position: 'relative', background: 'var(--bg-surface)', padding: '0 12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Or sign in with SSO
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {['Okta SSO', 'Google', 'Azure AD'].map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => setMfaModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                {provider}
              </button>
            ))}
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Have an invitation code?{' '}
            <Link to="/accept-invite" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Accept Invitation
            </Link>
          </div>
        </div>
      </div>

      {/* Simulated SSO / MFA Dialog */}
      {mfaModal && (
        <div className="modal-overlay" onClick={() => setMfaModal(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Enterprise SSO Simulation</h3>
              </div>
            </div>
            <div className="modal-body">
              <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
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
