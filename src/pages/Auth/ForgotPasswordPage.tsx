import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 1000);
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
        maxWidth: '480px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px',
        boxShadow: 'var(--shadow-xl)'
      }}>
        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '20px'
          }}
        >
          <ArrowLeft size={16} />
          Back to login
        </Link>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--success-bg)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Check your email</h2>
            <p className="text-secondary text-sm" style={{ marginBottom: '20px', lineHeight: 1.5 }}>
              If an account matches <strong>{email}</strong>, we have sent instructions to reset your password. (Neutral message per security guidelines to prevent account enumeration).
            </p>

            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              <strong>Simulated Email Token:</strong> In production, an encrypted single-use HMAC token valid for 30 minutes will be generated and delivered via transactional email service.
            </div>

            <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
              Return to Login
            </Link>
          </div>
        ) : (
          <div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <ShieldCheck size={24} />
            </div>

            <h2 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Reset your password</h2>
            <p className="text-secondary text-sm" style={{ marginBottom: '24px' }}>
              Enter the email address registered with your organization. We will send a secure password reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  <Mail size={14} />
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@organization.com"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', marginTop: '12px' }}
              >
                {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
