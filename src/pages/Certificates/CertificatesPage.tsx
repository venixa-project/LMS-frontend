import React, { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { mockCertificates } from '../../data/mockData';
import { Certificate } from '../../types';
import { Link } from 'react-router-dom';
import {
  Award, Download, ExternalLink, ShieldCheck, Search,
  Eye, Calendar, CheckCircle2, X, Printer, Lock, BookOpen, Clock, FileCheck
} from 'lucide-react';
import { generateCertificatePdf, printCertificateDiploma } from '../../lib/certificatePdf';

export const CertificatesPage: React.FC = () => {
  const { user } = useAuthStore();
  const isLearner = user?.activeRole === 'student' || user?.activeRole === 'learner';
  const [certificates, setCertificates] = useState<Certificate[]>(mockCertificates);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Filter for learner
  const visibleCertificates = isLearner
    ? certificates.filter((c) => c.learnerName.includes('Alex') || c.learnerId === 'u-007' || c.learnerId === user?.id)
    : certificates;

  const handleDownloadPdf = async (cert: Certificate) => {
    const title = cert.courseTitle || cert.courseName || 'Certified Program';
    setDownloadNotice(`Generating and downloading cryptographically verified PDF diploma with company logo for "${title}"...`);
    try {
      await generateCertificatePdf(cert);
      setDownloadNotice(`✓ Official verified certificate PDF with company branding downloaded successfully!`);
      setTimeout(() => setDownloadNotice(null), 3500);
    } catch (err) {
      console.error('Failed to generate certificate PDF:', err);
      setDownloadNotice('Opening print preview instead...');
      printCertificateDiploma(cert);
    }
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

                <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{cert.courseTitle || cert.courseName}</h3>
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
                  onClick={() => handleDownloadPdf(cert)}
                >
                  <Download size={14} /> Download PDF
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

            <div className="modal-body" style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{
                border: '3px double #d97706',
                borderRadius: 'var(--radius-lg)',
                padding: '32px 28px',
                background: 'radial-gradient(ellipse at center, rgba(254, 243, 199, 0.08) 0%, transparent 80%), var(--bg-card)',
                boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.15)',
                position: 'relative'
              }}>
                {/* Official Company Logo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <img
                    src="/logo.png"
                    alt="VeniLearn Logo"
                    style={{
                      height: '42px',
                      width: 'auto',
                      maxWidth: '180px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                    }}
                  />
                </div>

                <div style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  VeniLearn Enterprise LMS &bull; Acme Learning Corp
                </div>
                <div style={{ fontSize: '0.65rem', letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Department of Academic Affairs &bull; Official Credentials Registry
                </div>
                <div style={{ width: '90px', height: '2px', background: 'linear-gradient(90deg, transparent, #d97706, transparent)', margin: '0 auto 14px' }} />

                <div style={{ fontSize: '1.45rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-main)', marginBottom: '2px' }}>
                  Certificate of Achievement
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#d97706', marginBottom: '12px' }}>
                  Excellence in Professional & Technical Mastery
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  This credential is officially conferred upon
                </div>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  marginBottom: '6px',
                  fontFamily: 'Georgia, serif',
                  letterSpacing: '-0.02em'
                }}>
                  {selectedCert.learnerName}
                </div>

                <div style={{ width: '180px', height: '2px', background: 'linear-gradient(90deg, transparent, #d97706, transparent)', margin: '0 auto 14px' }} />

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 12px', lineHeight: 1.5 }}>
                  for successfully satisfying all rigorous academic standards, proctored examinations, and applied laboratory competencies required for the professional credential in
                </div>

                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '4px' }}>
                  {selectedCert.courseTitle || selectedCert.courseName || 'Certified Program'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '24px' }}>
                  Demonstrating advanced engineering rigor, technical competency, and verified professional excellence.
                </div>

                {/* Signatures & Seal Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', paddingLeft: '16px', paddingRight: '16px' }}>
                  <div style={{ textAlign: 'center', width: '150px' }}>
                    <div style={{ fontFamily: 'Georgia, cursive', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                      Dr. James Wilson
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-main)' }}>
                      Dr. James Wilson, Ph.D.
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Lead Academic Faculty</div>
                  </div>

                  {/* Golden Seal in Modal */}
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: '3px solid #d97706',
                    background: 'rgba(217, 119, 6, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 16px rgba(217, 119, 6, 0.25)',
                    margin: '0 10px'
                  }}>
                    <Award size={20} color="#d97706" />
                    <span style={{ fontSize: '0.55rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      OFFICIAL
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', width: '150px' }}>
                    <div style={{ fontFamily: 'Georgia, cursive', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                      Sarah Chen
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-main)' }}>
                      Sarah Chen, M.Sc.
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Dean of Academic Affairs</div>
                  </div>
                </div>

                {/* Security Bottom Bar */}
                <div style={{
                  marginTop: '20px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)'
                }}>
                  <div><strong>Issued:</strong> {new Date(selectedCert.issuedAt || selectedCert.issueDate || Date.now()).toLocaleDateString()} &bull; <strong>ID:</strong> {selectedCert.id}</div>
                  <div><strong>Proof:</strong> SHA256-{(selectedCert.verificationHash || selectedCert.id).slice(0, 10)}...</div>
                  <div style={{ color: 'var(--primary)', fontWeight: 600 }}>Cryptographically Verified &bull; Active</div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => printCertificateDiploma(selectedCert)}
                style={{ gap: '6px' }}
              >
                <Printer size={14} /> Print / Save as PDF
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleDownloadPdf(selectedCert)}
                style={{ gap: '6px' }}
              >
                <Download size={14} /> Download Verified PDF
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCert(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
