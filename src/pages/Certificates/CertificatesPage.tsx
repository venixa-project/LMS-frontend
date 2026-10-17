import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockCertificates } from '../../data/mockData';
import { Certificate } from '../../types';
import { Link } from 'react-router-dom';
import {
  Award, Download, ExternalLink, ShieldCheck, Search,
  Eye, Calendar, CheckCircle2, X, Printer, Lock, BookOpen, Clock
} from 'lucide-react';

export const CertificatesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isLearner = user?.activeRole === 'learner';
  const [certificates, setCertificates] = useState<Certificate[]>(mockCertificates);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Filter for learner
  const visibleCertificates = isLearner
    ? certificates.filter((c) => c.learnerName.includes('Alex') || c.learnerId === 'u-007' || c.learnerId === user?.id)
    : certificates;

  const handleSimulatedDownload = (cert: Certificate) => {
    setDownloadNotice(`Downloading digital credential diploma PDF for "${cert.courseTitle}" (ECDSA verification embedded)...`);
    setTimeout(() => {
      setDownloadNotice(null);
      // Trigger a clean text/pdf-like blob download
      const content = `ACUITY LMS VERIFIED CREDENTIAL DIPLOMA\n======================================\n\nRecipient: ${cert.learnerName}\nCredential ID: ${cert.id}\nCourse Title: ${cert.courseTitle}\nIssue Date: ${new Date(cert.issuedAt || cert.issueDate || Date.now()).toLocaleDateString()}\nStatus: Verified\nCryptographic Proof: SHA256-${(cert.verificationHash || cert.id)}\nAuthority: Acme Learning Corp & Academic Affairs\n`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Certificate_${cert.id}_${cert.learnerName.replace(/\s+/g, '_')}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 800);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">{isLearner ? 'Verified Credentials' : 'Certificates'}</span>
            <span className="text-muted text-xs">Acme Learning Corp &bull; Verified Registry</span>
            {isLearner && <span className="badge badge-active">Alex Thompson</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
            {isLearner ? 'My Verified Certificates & Awards' : 'Certificates & Verified Credentials'}
          </h1>
          <p className="text-secondary text-sm">
            {isLearner
              ? 'Cryptographically verified graduation awards, course certificates, and downloadable digital diplomas'
              : 'Digitally signed credentials, course completion awards, and public verification hashes'}
          </p>
        </div>

        {!isLearner ? (
          <button
            className="btn btn-secondary"
            onClick={() => alert("Certificate Template Designer: Configure organizational logo, signature keys, and custom badge borders.")}
          >
            <Award size={16} /> Certificate Template Designer
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/my-learning" className="btn btn-secondary">
              <BookOpen size={16} /> My Enrolled Courses
            </Link>
          </div>
        )}
      </div>

      {downloadNotice && (
        <div style={{
          background: 'var(--info-bg)',
          border: '1px solid var(--info-border)',
          color: 'var(--info)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem'
        }}>
          <Clock size={18} />
          <span>{downloadNotice}</span>
        </div>
      )}

      {/* Active Earned Certificates */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>
          {isLearner ? 'Earned & Active Credentials (1)' : 'All Issued Certificates'}
        </h2>

        <div className="grid-3">
          {visibleCertificates.map((cert) => (
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

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                  onClick={() => setSelectedCert(cert)}
                >
                  <Eye size={14} /> View Diploma
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, gap: '6px', justifyContent: 'center' }}
                  onClick={() => handleSimulatedDownload(cert)}
                >
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* In-Progress Certificates for Student */}
      {isLearner && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>In-Progress Course Certifications & Unlocking Criteria</h2>
          <div className="grid-2">
            <div className="card" style={{ borderLeft: '3px solid var(--primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span className="badge badge-primary">65% Progress</span>
                  <h3 style={{ fontSize: '1.1rem', marginTop: '6px', marginBottom: '4px' }}>
                    Distributed Systems & Cloud Architecture
                  </h3>
                  <p className="text-muted text-xs">Issued by Department of Engineering</p>
                </div>
                <Lock size={18} color="var(--text-muted)" />
              </div>

              <div className="progress-bar-bg" style={{ height: '6px', marginBottom: '14px' }}>
                <div className="progress-bar-fill" style={{ width: '65%' }} />
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                  <CheckCircle2 size={13} /> Complete 6 Curriculum Modules (4/6 done)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                  <CheckCircle2 size={13} /> Pass Midterm Examination (Score: 25/25 pts)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--warning)' }}>
                  <Clock size={13} /> Pending Capstone Project Evaluation (Score &gt;= 70%)
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <Link to="/course-player/crs-001" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  Continue Learning to Unlock &rarr;
                </Link>
              </div>
            </div>

            <div className="card" style={{ borderLeft: '3px solid var(--info)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <span className="badge badge-info">30% Progress</span>
                  <h3 style={{ fontSize: '1.1rem', marginTop: '6px', marginBottom: '4px' }}>
                    Advanced React & Component Design Patterns
                  </h3>
                  <p className="text-muted text-xs">Issued by Web Architecture Faculty</p>
                </div>
                <Lock size={18} color="var(--text-muted)" />
              </div>

              <div className="progress-bar-bg" style={{ height: '6px', marginBottom: '14px' }}>
                <div className="progress-bar-fill" style={{ width: '30%', background: 'var(--info)' }} />
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                  <CheckCircle2 size={13} /> Complete 5 Advanced Modules (1/5 done)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                  <Clock size={13} /> Complete Proctored React Midterm Exam
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                  <Clock size={13} /> Submit Offline Kanban Board Deliverable
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <Link to="/course-player/crs-002" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
                  Continue Learning to Unlock &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

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
