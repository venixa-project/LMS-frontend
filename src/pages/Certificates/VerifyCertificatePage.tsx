// ============================================================
// LMS - Public Certificate Verification Portal
// Verifies authentic course completion credentials using real
// certificate IDs or cryptographic verification hashes.
// Never exposes student emails, passwords, or sensitive answers.
// ============================================================
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useCertificateStore, PublicVerificationResult } from '../../lib/certificateStore';
import { printCertificateDiploma } from '../../lib/certificatePdf';
import {
  ShieldCheck, ShieldAlert, Award, Search, CheckCircle2,
  Calendar, Building2, Printer, Copy, Check, ExternalLink,
  Lock, ArrowLeft, AlertCircle, FileCheck
} from 'lucide-react';

export const VerifyCertificatePage: React.FC = () => {
  const { certId: paramCertId } = useParams<{ certId?: string }>();
  const [searchParams] = useSearchParams();
  const queryParamCertId = searchParams.get('id') || searchParams.get('certId');

  const initialQuery = paramCertId || queryParamCertId || '';
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [searchedQuery, setSearchedQuery] = useState(initialQuery);
  const [copied, setCopied] = useState(false);

  const { verifyCertificate, getCertificateById } = useCertificateStore();

  const [result, setResult] = useState<PublicVerificationResult | null>(() => {
    if (initialQuery.trim()) {
      return verifyCertificate(initialQuery.trim());
    }
    return null;
  });

  useEffect(() => {
    if (initialQuery.trim()) {
      setSearchInput(initialQuery.trim());
      setSearchedQuery(initialQuery.trim());
      setResult(verifyCertificate(initialQuery.trim()));
    }
  }, [initialQuery]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    setSearchedQuery(query);
    if (!query) {
      setResult(null);
      return;
    }
    const res = verifyCertificate(query);
    setResult(res);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    if (!result?.certificateId) return;
    const cert = getCertificateById(result.certificateId);
    if (cert) {
      printCertificateDiploma(cert);
    }
  };

  return (
    <div style={{ minHeight: '80vh', padding: '32px 16px', maxWidth: '840px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <img
            src="/logo.png"
            alt="VeniLearn Logo"
            style={{ height: '36px', objectFit: 'contain' }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="badge badge-primary" style={{ letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Official Credential Verification Registry
          </span>
        </div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '6px 0 8px' }}>
          Verify Academic Credentials & Diplomas
        </h1>
        <p className="text-secondary text-sm" style={{ maxWidth: '580px', margin: '0 auto' }}>
          Enter a VeniLearn Credential ID or cryptographic verification hash to instantly confirm validity, issuing authority, and qualification details.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Enter Certificate ID (e.g. cert-001) or SHA-256 Hash..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ paddingLeft: '42px', fontSize: '0.95rem' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ gap: '8px', padding: '10px 24px', fontWeight: 700 }}>
            <ShieldCheck size={18} /> Verify Credential
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          <span>Try quick sample:</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            onClick={() => {
              setSearchInput('cert-001');
              setSearchedQuery('cert-001');
              setResult(verifyCertificate('cert-001'));
            }}
          >
            cert-001 (Alex Thompson)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            onClick={() => {
              setSearchInput('cert-002');
              setSearchedQuery('cert-002');
              setResult(verifyCertificate('cert-002'));
            }}
          >
            cert-002 (David Kim)
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            onClick={() => {
              setSearchInput('cert-004');
              setSearchedQuery('cert-004');
              setResult(verifyCertificate('cert-004'));
            }}
          >
            cert-004 (Marcus Vance)
          </button>
        </div>
      </div>

      {/* Verification Results View */}
      {result && result.status === 'active' && (
        <div
          className="card"
          style={{
            padding: 0,
            overflow: 'hidden',
            border: '2px solid rgba(16, 185, 129, 0.4)',
            boxShadow: '0 12px 32px rgba(16, 185, 129, 0.15)',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          {/* Green Verified Banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 182, 212, 0.15))',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--success)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
              }}>
                <ShieldCheck size={26} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--success)' }}>
                    OFFICIALLY VERIFIED CREDENTIAL
                  </span>
                  <span className="badge badge-active">Active &bull; Valid</span>
                </div>
                <div className="text-secondary text-xs">
                  Cryptographically registered in the official VeniLearn credential repository
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCopyLink}
                style={{ gap: '6px' }}
              >
                {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                {copied ? 'Link Copied!' : 'Copy Verification Link'}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handlePrint}
                style={{ gap: '6px' }}
              >
                <Printer size={14} /> Print / Download
              </button>
            </div>
          </div>

          {/* Credential Data Table */}
          <div style={{ padding: '28px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              <div>
                <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', marginBottom: '4px' }}>
                  Conferred Recipient
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'Georgia, serif' }}>
                  {result.learnerName}
                </div>
                <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                  Identity verified through institution authentication
                </div>
              </div>

              <div>
                <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', marginBottom: '4px' }}>
                  Certified Course / Curriculum
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {result.courseTitle}
                </div>
                <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                  Demonstrating comprehensive subject mastery
                </div>
              </div>

              <div>
                <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', marginBottom: '4px' }}>
                  Issuing Organization
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} color="var(--text-muted)" />
                  {result.issuingOrganization}
                </div>
                <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                  Accredited Enterprise & Academic Tenant
                </div>
              </div>

              <div>
                <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', marginBottom: '4px' }}>
                  Issue & Validity Timeline
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={16} color="var(--text-muted)" />
                  {new Date(result.issueDate || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                  {result.expiryDate ? `Expires: ${new Date(result.expiryDate).toLocaleDateString()}` : 'Lifetime validity (No expiry)'}
                </div>
              </div>
            </div>

            {/* Verification & Signer Metadata Box */}
            <div style={{
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px',
              fontSize: '0.8rem'
            }}>
              <div>
                <span className="text-muted text-xs font-semibold">Credential ID:</span>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>
                  <code>{result.certificateId}</code>
                </div>
              </div>

              <div>
                <span className="text-muted text-xs font-semibold">Primary Academic Signatory:</span>
                <div style={{ fontWeight: 700, marginTop: '2px' }}>
                  {result.authorizedSignerName} &bull; <span className="text-muted font-normal">{result.authorizedSignerTitle}</span>
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <span className="text-muted text-xs font-semibold">Cryptographic Ledger Proof (SHA-256):</span>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  background: 'var(--bg-card)',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  marginTop: '4px',
                  wordBreak: 'break-all'
                }}>
                  {result.verificationHash}
                </div>
              </div>
            </div>

            {/* Privacy Safeguard Notice */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '18px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}>
              <Lock size={14} color="var(--primary)" />
              <span>
                <strong>Privacy Protected:</strong> Public verification displays only credential authenticity. Personal contact info, private grades, and proctoring telemetry remain confidential.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Revoked State */}
      {result && result.status === 'revoked' && (
        <div
          className="card"
          style={{
            padding: '28px',
            border: '2px solid var(--danger)',
            background: 'rgba(239, 68, 68, 0.05)',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)',
            textAlign: 'center',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--danger)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)'
          }}>
            <ShieldAlert size={32} />
          </div>
          <span className="badge badge-inactive" style={{ marginBottom: '8px', background: 'var(--danger)', color: '#fff' }}>
            STATUS: REVOKED
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '6px 0 10px', color: 'var(--danger)' }}>
            This Credential Has Been Officially Revoked
          </h2>
          <p className="text-secondary text-sm" style={{ maxWidth: '540px', margin: '0 auto 16px' }}>
            Certificate <strong>#{result.certificateId}</strong> issued to <strong>{result.learnerName}</strong> for <strong>{result.courseTitle}</strong> is no longer recognized as an active credential.
          </p>
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            maxWidth: '480px',
            margin: '0 auto 16px',
            textAlign: 'left',
            fontSize: '0.82rem'
          }}>
            <div><strong>Revocation Date:</strong> {result.revokedAt ? new Date(result.revokedAt).toLocaleString() : 'Recorded'}</div>
            <div style={{ marginTop: '4px' }}><strong>Administrative Reason:</strong> {result.revocationReason}</div>
          </div>
          <p className="text-muted text-xs">
            For questions regarding this record, contact the institution academic governance registry at <strong>admin@acmelearning.com</strong>.
          </p>
        </div>
      )}

      {/* Not Found State */}
      {result && result.status === 'not_found' && (
        <div
          className="card"
          style={{
            padding: '36px',
            textAlign: 'center',
            border: '1px solid var(--warning)',
            background: 'rgba(245, 158, 11, 0.05)',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <AlertCircle size={44} color="var(--warning)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 8px' }}>
            No Matching Certificate Record Found
          </h3>
          <p className="text-secondary text-sm" style={{ maxWidth: '520px', margin: '0 auto 16px' }}>
            We could not locate an official issued certificate corresponding to <strong>"{searchedQuery}"</strong> in the VeniLearn registry.
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto' }}>
            Please check the spelling of the Certificate ID (e.g. <code>cert-001</code>) or verify the link provided on the recipient's diploma.
          </div>
        </div>
      )}

      {/* Return to LMS Link */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <Link to="/certificates" className="btn btn-secondary btn-sm" style={{ gap: '6px' }}>
          <ArrowLeft size={14} /> Back to LMS Certificates Dashboard
        </Link>
      </div>
    </div>
  );
};
