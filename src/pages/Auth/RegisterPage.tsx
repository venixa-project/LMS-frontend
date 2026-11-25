import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { apiClient } from '../../lib/apiClient';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  User,
  CheckCircle2
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  type RoleTab = 'student' | 'trainer';
  const [activeRoleTab, setActiveRoleTab] = useState<RoleTab>('student');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (!/\d/.test(password)) {
      setErrorMessage('Password must contain at least one number.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/auth/register', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: activeRoleTab,
      });

      setSuccessMessage('Account created successfully! Logging you in...');
      
      // Auto-login with newly registered credentials
      await login(email.trim().toLowerCase(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed. Please check your details.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
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
          padding: 24px 0;
          background: #dbeafe url('/assets/campus_login_bg.jpg') no-repeat center center;
          background-size: cover;
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
          overflow-x: hidden;
          overflow-y: auto;
          box-sizing: border-box;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        .campus-vignette-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 50%, rgba(255,255,255,0.04) 0%, rgba(15, 23, 42, 0.06) 100%);
          pointer-events: none;
        }

        .venilearn-glass-card {
          width: 100%;
          max-width: 440px;
          margin-right: 6.5%;
          background: rgba(255, 255, 255, 0.76);
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          border: 1.5px solid rgba(255, 255, 255, 0.88);
          border-radius: 32px;
          box-shadow: 
            0 24px 60px -12px rgba(15, 23, 42, 0.16),
            0 8px 24px -4px rgba(15, 23, 42, 0.08),
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.95);
          padding: 30px 32px;
          z-index: 10;
          position: relative;
          box-sizing: border-box;
        }

        .campus-role-tabs {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 18px;
          background: rgba(241, 245, 249, 0.7);
          padding: 4px;
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.75);
        }

        .campus-role-tab {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 7px 12px;
          border-radius: 16px;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .campus-role-tab.active {
          background: #4f46e5;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
        }

        .campus-card-header {
          text-align: center;
          margin-bottom: 16px;
        }

        .campus-card-title {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 4px 0;
          letter-spacing: -0.025em;
        }

        .campus-card-subtitle {
          font-size: 0.83rem;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        .campus-field-group {
          margin-bottom: 12px;
        }

        .campus-field-label {
          display: block;
          font-size: 0.76rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 5px;
        }

        .campus-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .campus-input-icon {
          position: absolute;
          left: 12px;
          color: #64748b;
          pointer-events: none;
        }

        .campus-input-field {
          width: 100%;
          height: 42px;
          padding: 0 12px 0 38px;
          border-radius: 12px;
          border: 1px solid rgba(203, 213, 225, 0.8);
          background: rgba(255, 255, 255, 0.85);
          font-size: 0.85rem;
          color: #0f172a;
          box-sizing: border-box;
          outline: none;
          transition: all 0.2s ease;
        }

        .campus-input-field:focus {
          border-color: #6366f1;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
        }

        .campus-submit-btn {
          width: 100%;
          height: 44px;
          margin-top: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 8px 20px -4px rgba(79, 70, 229, 0.4);
        }

        .campus-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px -4px rgba(79, 70, 229, 0.5);
        }

        .campus-card-footer {
          margin-top: 16px;
          text-align: center;
          font-size: 0.8rem;
          color: #64748b;
        }

        .campus-create-link {
          color: #4f46e5;
          font-weight: 700;
          text-decoration: none;
          margin-left: 4px;
        }

        .campus-create-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 900px) {
          .venilearn-campus-login-root {
            justify-content: center;
            padding: 24px 16px;
          }
          .venilearn-glass-card {
            margin-right: 0;
            max-width: 94%;
          }
        }
      `}</style>

      <div className="campus-vignette-overlay" />

      <div className="venilearn-glass-card">
        {/* Header */}
        <div className="campus-card-header">
          <h1 className="campus-card-title">Create Account</h1>
          <p className="campus-card-subtitle">Register to start your learning journey</p>
        </div>

        {/* Role Selection Tabs */}
        <div className="campus-role-tabs">
          <button
            type="button"
            className={`campus-role-tab ${activeRoleTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveRoleTab('student')}
          >
            <GraduationCap size={15} />
            <span>Student</span>
          </button>
          <button
            type="button"
            className={`campus-role-tab ${activeRoleTab === 'trainer' ? 'active' : ''}`}
            onClick={() => setActiveRoleTab('trainer')}
          >
            <User size={15} />
            <span>Trainer</span>
          </button>
        </div>

        {/* Error / Success Alerts */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '10px 12px',
            marginBottom: '12px',
            color: '#dc2626',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            padding: '10px 12px',
            marginBottom: '12px',
            color: '#16a34a',
            fontSize: '0.8rem',
            fontWeight: 500
          }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="campus-field-group" style={{ flex: 1 }}>
              <label className="campus-field-label">First Name</label>
              <div className="campus-input-wrapper">
                <input
                  type="text"
                  className="campus-input-field"
                  style={{ paddingLeft: '12px' }}
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="campus-field-group" style={{ flex: 1 }}>
              <label className="campus-field-label">Last Name</label>
              <div className="campus-input-wrapper">
                <input
                  type="text"
                  className="campus-input-field"
                  style={{ paddingLeft: '12px' }}
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="campus-field-group">
            <label className="campus-field-label">Email Address</label>
            <div className="campus-input-wrapper">
              <Mail className="campus-input-icon" size={16} />
              <input
                type="email"
                className="campus-input-field"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="campus-field-group">
            <label className="campus-field-label">Password (min. 8 characters with 1 number)</label>
            <div className="campus-input-wrapper">
              <Lock className="campus-input-icon" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="campus-input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="campus-field-group">
            <label className="campus-field-label">Confirm Password</label>
            <div className="campus-input-wrapper">
              <Lock className="campus-input-icon" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="campus-input-field"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="campus-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight size={17} strokeWidth={2.4} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="campus-card-footer">
          Already have an account?{' '}
          <Link to="/login" className="campus-create-link">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
