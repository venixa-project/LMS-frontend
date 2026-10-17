import React, { useState } from 'react';
import { mockCertificates } from '../../data/mockData';
import { Certificate } from '../../types';
import {
  Award, Download, ExternalLink, ShieldCheck, Search,
  Eye, Calendar, CheckCircle2, X, Printer
} from 'lucide-react';

export const CertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>(mockCertificates);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Certificates & Verified Credentials</h1>
          <p className="text-secondary text-sm">Digitally signed credentials, course completion awards, and public verification hashes</p>
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => alert("Certificate Template Designer: Configure organizational logo, signature keys, and custom badge borders.")}
        >
          <Award size={16} /> Certificate Template Designer
        </button>
      </div>

      <div className="grid-3">
        {certificates.map((cert) => (
          <div
            key={cert.id}
            className="card"
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
          >
            <div>
              {/* Certificate badge visual */}
              <div style={{
                height: '140px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                position: 'relative'
              }}>
                <Award size={44} color="var(--success)" style={{ marginBottom: '6px' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--success)', textTransform: 'uppercase' }}>
                  Verified Certificate
                </span>
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <span className={`badge badge-${cert.status}`}>{cert.status}</span>
                </div>
              </div>

              <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{cert.courseTitle}</h3>
              <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
                Recipient: <strong>{cert.learnerName}</strong>
              </p>

              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                marginBottom: '16px'
              }}>
                <div>
                  <span className="text-muted text-xs">Issued Date:</span>
                  <div style={{ fontWeight: 600 }}>{new Date(cert.issuedAt || cert.issueDate || Date.now()).toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-muted text-xs">Credential ID:</span>
                  <code style={{ fontSize: '0.75rem' }}>{cert.id}</code>
                </div>
              </div>
            </div>

            <div>
              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', gap: '6px' }}
                onClick={() => setSelectedCert(cert)}
              >
                <Eye size={14} /> View Certificate Diploma
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Diploma Modal */}
      {selectedCert && (
        <div className="modal-overlay" onClick={() => setSelectedCert(null)}>
          <div className="modal-card" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--success)" />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Verified Credential #{selectedCert.id}</h3>
              </div>
              <button onClick={() => setSelectedCert(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{
                border: '4px double rgba(16, 185, 129, 0.4)',
                borderRadius: 'var(--radius-lg)',
                padding: '36px 28px',
                background: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.08) 0%, transparent 70%)'
              }}>
                <Award size={48} color="var(--success)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Certificate of Professional Achievement
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  This acknowledges that
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                  {selectedCert.learnerName}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                  has successfully completed the comprehensive enterprise curriculum and practical evaluations for
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '24px' }}>
                  {selectedCert.courseTitle || selectedCert.courseName || 'Certified Course'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-around', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>Dr. James Wilson</div>
                    <div>Lead Instructor</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {new Date(selectedCert.issuedAt || selectedCert.issueDate || Date.now()).toLocaleDateString()}
                    </div>
                    <div>Date of Issuance</div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      SHA256-{(selectedCert.verificationHash || selectedCert.id).slice(0, 10)}...
                    </div>
                    <div>Cryptographic Proof</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => alert("Printing simulated PDF diploma...")}
              >
                <Printer size={14} /> Print / Export PDF
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setSelectedCert(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
