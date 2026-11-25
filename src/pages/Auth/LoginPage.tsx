import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useOrganisationBranding } from '../../lib/useOrganisationBranding';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  User,
  Settings
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  type RoleTab = 'student' | 'trainer' | 'admin';
  const [activeRoleTab, setActiveRoleTab] = useState<RoleTab>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const { login, isLoading, error, clearError, isAuthenticated, user } = useAuthStore();
  const { companyName, companyLogo } = useOrganisationBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const brandTitle = companyName || 'VeniLearn';

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
    if (!email.trim() || !password.trim()) {
      return;
    }
    sessionStorage.removeItem('venilearn_logged_out');
    clearError();
    await login(email.trim(), password, searchParams.get('tenantId') || undefined);
    const storeState = useAuthStore.getState();
    if (storeState.isAuthenticated && storeState.user) {
      if (storeState.user.mustChangePassword) {
        navigate('/change-password', { replace: true });
        return;
      }
      // If user selected a specific role tab, switch to it if they possess multi-role access
      const targetRoleName = activeRoleTab === 'student' ? 'student' : (activeRoleTab === 'trainer' ? 'trainer' : 'org_admin');
      const hasRoleAccess =
        storeState.user.activeRole === targetRoleName ||
        (storeState.user as any).role === targetRoleName ||
        ((storeState.user.roles as any[]) || []).some((r: any) => (r?.name || r) === targetRoleName || (r?.name || r) === 'platform_admin' || (r?.name || r) === 'org_admin' || (r?.name || r) === 'admin') ||
        (storeState.user as any).role === 'admin' ||
        (storeState.user as any).role === 'org_admin' ||
        storeState.user.activeRole === 'platform_admin' ||
        storeState.user.activeRole === 'org_admin';

      if (storeState.user.activeRole !== targetRoleName && hasRoleAccess) {
        try {
          await storeState.switchRole(targetRoleName as any);
        } catch {
          // fallback gracefully
        }
      }
      const target = from && from !== '/login' ? from : '/dashboard';
      navigate(target, { replace: true });
    }
  };

  return (
    <div className="venilearn-campus-login-root">
      <style>{`
        .venilearn-campus-login-root {
          min-height: 100vh;
          width: 100vw;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 0;
          background: #dbeafe url('/assets/campus_login_bg.jpg') no-repeat center center;
          background-size: cover;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
          overflow-y: auto;
          box-sizing: border-box;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Subtle lighting vignette */
        .campus-vignette-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 50%, rgba(255,255,255,0.04) 0%, rgba(15, 23, 42, 0.06) 100%);
          pointer-events: none;
        }

        /* Mobile Header */
        .campus-mobile-branding {
          display: none;
          margin-bottom: 22px;
          text-align: center;
        }

        /* Form Card: Seamlessly integrates with the 8K campus artwork on desktop */
        .venilearn-glass-card {
          width: 44%;
          max-width: 530px;
          min-width: 380px;
          margin-right: 2.8%;
          background: transparent;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          border: none;
          border-radius: 0;
          box-shadow: none;
          padding: 24px 38px;
          z-index: 10;
          position: relative;
          box-sizing: border-box;
          animation: cardFadeSlide 0.35s ease-out;
        }

        /* 3 Role Selection Tabs matching Image 2 (Student, Trainer, Admin) */
        .campus-role-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 22px;
          background: transparent;
          padding: 0;
          border: none;
        }

        .campus-role-pill {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          height: 40px;
          border: 1.5px solid #E2E8F0;
          border-radius: 24px;
          background: #FFFFFF;
          color: #334155;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .campus-role-pill:hover:not(.active) {
          color: #0F172A;
          border-color: #CBD5E1;
          background: #F8FAFC;
        }

        .campus-role-pill.active {
          background: linear-gradient(135deg, #6347EA 0%, #4F46E5 100%);
          border-color: transparent;
          color: #FFFFFF;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(99, 71, 234, 0.32);
        }

        /* Universal Laptop Screen Calibration (1280x720, 1366x768, 1440x900) */
        @media (max-height: 800px) and (min-width: 961px) {
          .venilearn-glass-card {
            padding: 18px 30px;
            max-width: 460px;
          }
          .venilearn-title {
            font-size: 1.95rem;
            margin-bottom: 4px;
          }
          .venilearn-subtitle {
            margin-bottom: 14px;
            font-size: 0.88rem;
          }
          .campus-role-tabs {
            margin-bottom: 14px;
          }
          .campus-field-group {
            margin-bottom: 12px;
          }
          .campus-input {
            height: 48px;
          }
          .campus-options-row {
            margin-bottom: 16px;
          }
          .campus-signin-btn {
            height: 48px;
          }
        }

        @keyframes cardFadeSlide {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Typography matching Reference Image 1 */
        .venilearn-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 6px 0;
          letter-spacing: -0.035em;
          line-height: 1.2;
          text-align: center;
        }

        .venilearn-subtitle {
          font-size: 0.95rem;
          color: #64748B;
          margin: 0 0 26px 0;
          text-align: center;
          font-weight: 500;
          line-height: 1.45;
        }

        /* Form Controls */
        .campus-field-group {
          margin-bottom: 18px;
          position: relative;
        }

        .campus-input-container {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .campus-input-icon {
          position: absolute;
          left: 18px;
          color: #64748B;
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .campus-input {
          width: 100%;
          height: 52px;
          padding: 14px 16px 14px 50px;
          background: rgba(255, 255, 255, 0.68);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1.5px solid rgba(226, 232, 240, 0.9);
          border-radius: 16px;
          font-size: 0.95rem;
          color: #0F172A;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .campus-input::placeholder {
          color: #64748B;
          font-weight: 400;
        }

        .campus-input:focus {
          background: rgba(255, 255, 255, 0.94);
          border-color: #6366F1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.16);
        }

        .campus-input:focus + .campus-input-icon {
          color: #6366F1;
        }

        .campus-input-password {
          padding-right: 50px;
        }

        .campus-eye-toggle {
          position: absolute;
          right: 14px;
          background: transparent;
          border: none;
          color: #64748B;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 6px;
          transition: color 0.2s ease;
        }

        .campus-eye-toggle:hover {
          color: #1E293B;
        }

        /* Options Row: Remember Me & Forgot Password */
        .campus-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
          font-size: 0.9rem;
        }

        .campus-remember-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #334155;
          cursor: pointer;
          font-weight: 500;
          user-select: none;
        }

        .campus-remember-checkbox {
          accent-color: #4F46E5;
          width: 17px;
          height: 17px;
          border-radius: 5px;
          cursor: pointer;
        }

        .campus-forgot-link {
          color: #4F46E5;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .campus-forgot-link:hover {
          color: #3730A3;
          text-decoration: underline;
        }

        /* Prominent Sign In Button matching Image 1 */
        .campus-signin-btn {
          width: 100%;
          height: 52px;
          padding: 0 24px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366F1 0%, #3B82F6 100%);
          color: #FFFFFF;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 12px 24px -5px rgba(99, 102, 241, 0.45);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .campus-signin-btn:hover:not(:disabled) {
          transform: translateY(-1.5px);
          box-shadow: 0 16px 28px -5px rgba(99, 102, 241, 0.58);
          background: linear-gradient(135deg, #5558E8 0%, #2563EB 100%);
        }

        .campus-signin-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .campus-signin-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Subtle Divider matching Image 1 */
        .campus-divider {
          display: flex;
          align-items: center;
          margin: 22px 0 18px 0;
          gap: 12px;
        }

        .campus-divider-line {
          flex: 1;
          height: 1px;
          background: #E2E8F0;
        }

        .campus-divider-text {
          font-size: 0.82rem;
          color: #94A3B8;
          font-weight: 500;
          white-space: nowrap;
        }

        /* Card Footer */
        .campus-card-footer {
          text-align: center;
          font-size: 0.9rem;
          color: #475569;
        }

        .campus-create-link {
          color: #4F46E5;
          font-weight: 700;
          text-decoration: none;
          margin-left: 4px;
          transition: color 0.2s ease;
        }

        .campus-create-link:hover {
          color: #3730A3;
          text-decoration: underline;
        }

        /* Error Alert */
        .campus-error-alert {
          background: #FEF2F2;
          border: 1px solid #FCA5A5;
          color: #B91C1C;
          padding: 12px 14px;
          border-radius: 12px;
          font-size: 0.86rem;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 18px;
        }

        .campus-field-label-row {
          display: none;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
          font-size: 0.88rem;
          font-weight: 700;
          color: #0F172A;
        }

        .campus-mobile-wave {
          display: none;
        }

        /* Responsive Breakpoints: Tablet & Mobile */
        @media (max-width: 960px) {
          .venilearn-campus-login-root {
            justify-content: center;
            align-items: center;
            padding: 24px 16px 36px 16px;
            background: #dbeafe url('/assets/mobile_seamless_bg_4k.jpg') no-repeat center center;
            background-size: cover;
          }
          .campus-desktop-branding-col {
            display: none;
          }
          .campus-mobile-branding {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 18px;
            width: 100%;
          }
          .campus-mobile-subtitle-row {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 6px;
            width: 100%;
            max-width: 340px;
          }
          .campus-mobile-subtitle-line {
            flex: 1;
            height: 1.2px;
            background: rgba(99, 102, 241, 0.35);
            margin: 0 8px;
          }
          .campus-field-label-row {
            display: flex;
          }
          .venilearn-glass-card {
            width: 100%;
            max-width: 420px;
            min-width: 0;
            margin-right: 0;
            background: rgba(255, 255, 255, 0.66);
            backdrop-filter: blur(28px) saturate(190%);
            -webkit-backdrop-filter: blur(28px) saturate(190%);
            border: 1.5px solid rgba(255, 255, 255, 0.88);
            border-radius: 32px;
            padding: 30px 22px;
            box-shadow: 0 20px 45px -10px rgba(15, 23, 42, 0.16);
          }
          .campus-mobile-wave {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 22px;
            width: 100%;
            max-width: 420px;
            padding: 10px 16px;
            border-radius: 20px;
            background: linear-gradient(135deg, #4F46E5 0%, #2563EB 100%);
            color: #FFFFFF;
            font-size: 0.78rem;
            font-weight: 600;
            letter-spacing: 0.2px;
            text-align: center;
            box-shadow: 0 4px 14px rgba(79, 70, 229, 0.28);
          }
        }

        @media (max-width: 480px) {
          .venilearn-glass-card {
            padding: 26px 18px;
            border-radius: 28px;
          }
          .venilearn-title {
            font-size: 1.8rem;
          }
          .campus-options-row {
            font-size: 0.84rem;
          }
        }
      `}</style>

      <div className="campus-vignette-overlay" />

      {/* Main Glassmorphic Login Card */}
      <div className="venilearn-glass-card">
        {/* Mobile Header Branding (Shown on small screens) */}
        <div className="campus-mobile-branding">
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
            color: '#FFFFFF',
            boxShadow: '0 8px 18px rgba(79, 70, 229, 0.35)',
            marginBottom: '10px'
          }}>
            {companyLogo ? (
              <img src={companyLogo} alt={brandTitle} style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
            ) : (
              <GraduationCap size={30} strokeWidth={2.4} />
            )}
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>{brandTitle} LMS</div>
          <div style={{ fontSize: '0.86rem', color: '#4F46E5', fontWeight: 700, marginTop: '2px' }}>Learn • Grow • Achieve</div>
          <div className="campus-mobile-subtitle-row">
            <div className="campus-mobile-subtitle-line" />
            <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500, whiteSpace: 'nowrap' }}>
              Your complete learning platform for a brighter future
            </span>
            <div className="campus-mobile-subtitle-line" />
          </div>
        </div>

        {/* Card Title & Subtitle */}
        <h1 className="venilearn-title">Welcome Back!</h1>
        <p className="venilearn-subtitle">Sign in to continue your learning journey</p>

        {/* 3 Role Selection Tabs (Student, Trainer, Admin) */}
        <div className="campus-role-tabs">
          <button
            type="button"
            onClick={() => setActiveRoleTab('student')}
            className={`campus-role-pill ${activeRoleTab === 'student' ? 'active' : ''}`}
          >
            <GraduationCap size={16} />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleTab('trainer')}
            className={`campus-role-pill ${activeRoleTab === 'trainer' ? 'active' : ''}`}
          >
            <User size={16} />
            <span>Trainer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveRoleTab('admin')}
            className={`campus-role-pill ${activeRoleTab === 'admin' ? 'active' : ''}`}
          >
            <Settings size={16} />
            <span>Admin</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="campus-error-alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600 }}>{error}</div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Email Address Field */}
          <div className="campus-field-group">
            <div className="campus-field-label-row">
              <Mail size={14} style={{ color: '#0F172A' }} />
              <span>Email Address</span>
            </div>
            <div className="campus-input-container">
              <Mail size={19} className="campus-input-icon" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) clearError();
                }}
                className="campus-input"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="campus-field-group">
            <div className="campus-field-label-row">
              <Lock size={14} style={{ color: '#0F172A' }} />
              <span>Password</span>
            </div>
            <div className="campus-input-container">
              <Lock size={19} className="campus-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) clearError();
                }}
                className="campus-input campus-input-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="campus-eye-toggle"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="campus-options-row">
            <label className="campus-remember-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="campus-remember-checkbox"
              />
              <span>Remember me</span>
            </label>

            <Link to="/forgot-password" className="campus-forgot-link">
              Forgot password?
            </Link>
          </div>

          {/* Purple-to-Blue Gradient Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="campus-signin-btn"
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} strokeWidth={2.4} />
              </>
            )}
          </button>
        </form>

        {/* Footer: Create Account Link */}
        <div className="campus-card-footer" style={{ marginTop: '22px' }}>
          Don't have an account?{' '}
          <Link to="/register" className="campus-create-link">
            Create account
          </Link>
        </div>

        {/* Mobile Curved Wave Footer */}
        <div className="campus-mobile-wave">
          VeniLearn LMS - Educational Excellence
        </div>
      </div>
    </div>
  );
};
