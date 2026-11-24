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
  GraduationCap
} from 'lucide-react';

export const LoginPage: React.FC = () => {
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
          background: #dbeafe url('/assets/campus_login_bg.jpg') no-repeat center center;
          background-size: cover;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 24px 6% 24px 24px;
          box-sizing: border-box;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* 4K ambient lighting vignette */
        .campus-vignette-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 82% 50%, rgba(255,255,255,0.06) 0%, rgba(15, 23, 42, 0.08) 100%);
          pointer-events: none;
        }

        /* Responsive Mobile Header */
        .campus-mobile-branding {
          display: none;
          margin-bottom: 22px;
          text-align: center;
        }

        /* 4K Ultra-Crisp Frosted Glassmorphism Card */
        .venilearn-glass-card {
          width: 100%;
          max-width: 440px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border: 1.5px solid rgba(255, 255, 255, 0.85);
          border-radius: 28px;
          padding: 44px 38px;
          box-shadow: 0 30px 60px -12px rgba(15, 23, 42, 0.2), 0 0 1px 1px rgba(255, 255, 255, 0.9) inset;
          z-index: 10;
          position: relative;
          box-sizing: border-box;
          animation: cardFadeSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes cardFadeSlide {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Typography */
        .venilearn-title {
          font-size: 2.1rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0 0 6px 0;
          letter-spacing: -0.03em;
          line-height: 1.2;
          text-align: center;
        }

        .venilearn-subtitle {
          font-size: 0.93rem;
          color: #64748B;
          margin: 0 0 28px 0;
          text-align: center;
          font-weight: 500;
          line-height: 1.45;
        }

        /* Form Controls */
        .campus-field-group {
          margin-bottom: 20px;
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
          left: 16px;
          color: #64748B;
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .campus-input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          background: rgba(255, 255, 255, 0.76);
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          font-size: 0.95rem;
          color: #0F172A;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .campus-input::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }

        .campus-input:focus {
          background: #FFFFFF;
          border-color: #6366F1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.16);
        }

        .campus-input:focus + .campus-input-icon {
          color: #6366F1;
        }

        .campus-input-password {
          padding-right: 48px;
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
          padding: 4px;
          border-radius: 6px;
          transition: color 0.2s ease;
        }

        .campus-eye-toggle:hover {
          color: #334155;
        }

        /* Options Row: Remember Me & Forgot Password */
        .campus-options-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          font-size: 0.88rem;
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

        /* Ultra HD Gradient Action Button */
        .campus-signin-btn {
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 14px;
          background: linear-gradient(135deg, #6366F1 0%, #3B82F6 100%);
          color: #FFFFFF;
          font-size: 1rem;
          font-weight: 600;
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

        /* Card Footer */
        .campus-card-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 0.88rem;
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
          margin-bottom: 20px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 960px) {
          .venilearn-campus-login-root {
            justify-content: center;
            padding: 32px 16px;
            background-position: center;
          }
          .campus-mobile-branding {
            display: block;
          }
        }

        @media (max-width: 480px) {
          .venilearn-glass-card {
            padding: 32px 22px;
            border-radius: 22px;
          }
          .venilearn-title {
            font-size: 1.7rem;
          }
          .campus-options-row {
            flex-direction: row;
            font-size: 0.82rem;
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
            width: '50px',
            height: '50px',
            borderRadius: '15px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 100%)',
            color: '#FFFFFF',
            boxShadow: '0 8px 18px rgba(79, 70, 229, 0.35)',
            marginBottom: '8px'
          }}>
            {companyLogo ? (
              <img src={companyLogo} alt={brandTitle} style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
            ) : (
              <GraduationCap size={28} strokeWidth={2.4} />
            )}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>{brandTitle} LMS</div>
          <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>Learn • Grow • Achieve</div>
        </div>

        {/* Card Title & Subtitle */}
        <h1 className="venilearn-title">Welcome Back!</h1>
        <p className="venilearn-subtitle">Sign in to continue your learning journey</p>

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
        <div className="campus-card-footer">
          Don't have an account?{' '}
          <Link to="/register" className="campus-create-link">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
};
