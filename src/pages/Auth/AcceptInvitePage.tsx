import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import {
  CheckCircle, Shield, Lock, Eye, EyeOff, User,
  Building, Check, AlertTriangle
} from 'lucide-react';

export const AcceptInvitePage: React.FC = () => {
  const [tokenStatus] = useState<'valid' | 'expired'>('valid');
  const [firstName, setFirstName] = useState('Taylor');
  const [lastName, setLastName] = useState('Morgan');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*]/.test(password);
  const isMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpper && hasNumber && hasSpecial && isMatch;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid || !acceptedTerms) return;

    setIsLoading(true);
    setTimeout(async () => {
      setIsLoading(false);
      setIsCompleted(true);
      await login('alex@lms.demo', 'demoPass123');
    }, 1200);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #090d16 70%)',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '560px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div className="brand-logo-card" style={{ padding: '6px 14px', borderRadius: '10px' }}>
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
        </div>

        {isCompleted ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <CheckCircle size={36} />
            </div>

            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Welcome to VeniLearn LMS!</h2>
            <p className="text-secondary text-sm" style={{ marginBottom: '24px', lineHeight: 1.5 }}>
              Your account has been successfully configured. You are now enrolled in Acme Learning Corp as a <strong>Learner</strong>.
            </p>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
              onClick={() => navigate('/dashboard')}
            >
              Go to Learner Dashboard
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Building size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Accept Organization Invitation</h2>
                <p className="text-muted text-xs">Acme Learning Corp &bull; Invited by Sarah Chen</p>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assigned Role & Scope</div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Learner &bull; Cohort: Spring 2026 Engineering</div>
              </div>
              <span className="badge badge-active">Invitation Active</span>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Create Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="form-input"
                    placeholder="Enter new password"
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

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-input"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              {/* Password complexity checklist */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '0.75rem'
              }}>
                <span style={{ color: hasMinLength ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> At least 8 characters
                </span>
                <span style={{ color: hasUpper ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> 1 uppercase letter
                </span>
                <span style={{ color: hasNumber ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> 1 number
                </span>
                <span style={{ color: hasSpecial ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={12} /> 1 special character
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    style={{ accentColor: 'var(--primary)', marginTop: '3px' }}
                  />
                  <span>
                    I accept the Organization Terms of Service and acknowledge the Proctoring and Data Privacy Disclosure.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isPasswordValid || !acceptedTerms}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                {isLoading ? 'Setting up account...' : 'Complete Account Setup'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
