import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '480px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <HelpCircle size={40} />
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: 0, color: 'var(--primary)', letterSpacing: '-0.03em' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Page Not Found</h2>
        <p className="text-secondary text-sm" style={{ marginBottom: '24px', lineHeight: 1.5 }}>
          The learning resource, assessment, or operational route you requested could not be located in this organization tenant.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link to="/dashboard" className="btn btn-primary">
            <Home size={15} /> Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};
