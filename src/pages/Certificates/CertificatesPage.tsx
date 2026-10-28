// ============================================================
// LMS - Course Completion Certificate Management Page
// Dedicated role-based views for:
// - Institution Admin: Metrics, search/filter ledger, revocation audit, settings
// - Trainer/Faculty: Course-authorized eligibility monitoring & issued certificates
// - Student: Personal earned certificates, PDF downloads, and in-progress unlocking
// ============================================================
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { useCertificateStore } from '../../lib/certificateStore';
import { useCourseStore } from '../../lib/courseStore';
import { usePeopleStore } from '../../lib/peopleStore';
import { useCohortStore } from '../../lib/cohortStore';
import { mockDepartments } from '../../data/mockData';
import { Certificate, Course } from '../../types';
import { generateCertificatePdf, printCertificateDiploma } from '../../lib/certificatePdf';
import {
  Award, Download, ExternalLink, ShieldCheck, Search, Eye, Calendar,
  CheckCircle2, X, Printer, Lock, BookOpen, Clock, FileCheck,
  AlertTriangle, Filter, Users, Sparkles, RefreshCw, Sliders,
  ShieldAlert, Building2, Check, Shield, FileText, ChevronRight
} from 'lucide-react';

export const CertificatesPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    certificates,
    revokeCertificate,
    getCertificatesByLearner,
    getCertificatesForTrainer,
    issueCourseCertificate,
  } = useCertificateStore();

  const { courses, enrollments } = useCourseStore();
  const { getStudents, getFaculty } = usePeopleStore();
  const { cohorts } = useCohortStore();

  // Role determinations
  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const isOrgAdmin =
    user?.activeRole === 'org_admin' ||
    user?.activeRole === 'lms_admin' ||
    (user?.activeRole as string) === 'industrial_admin';
  const isAdmin = isPlatformAdmin || isOrgAdmin;
  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';
  const isLearner = !isAdmin && !isTrainer;

  // Selected Diploma View Modal
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  // Admin Ledger Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked' | 'expired'>('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');

  // Revocation Modal State
  const [certToRevoke, setCertToRevoke] = useState<Certificate | null>(null);
  const [revocationReason, setRevocationReason] = useState('');
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Trainer Course View State
  const trainerCourses = useMemo(() => {
    if (!isTrainer) return [];
    return courses.filter(
      (c) =>
        c.instructors?.includes(user?.id || '') ||
        c.instructors?.includes('u-004') || // Dr. James Wilson default persona
        c.createdBy === user?.id
    );
  }, [courses, isTrainer, user]);

  const [selectedTrainerCourseId, setSelectedTrainerCourseId] = useState<string>(
    trainerCourses[0]?.id || 'crs-001'
  );
  const [trainerTab, setTrainerTab] = useState<'eligibility' | 'issued'>('eligibility');

  // Admin Active Tab
  const [adminTab, setAdminTab] = useState<'ledger' | 'courses' | 'templates'>('ledger');

  // -----------------------------------------------------------
  // Data Filtering for Admin
  // -----------------------------------------------------------
  const filteredCertificates = useMemo(() => {
    return certificates.filter((cert) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = cert.learnerName.toLowerCase().includes(q);
        const matchCourse = (cert.courseTitle || cert.courseName || '').toLowerCase().includes(q);
        const matchId = cert.id.toLowerCase().includes(q);
        const matchHash = (cert.verificationHash || '').toLowerCase().includes(q);
        if (!matchName && !matchCourse && !matchId && !matchHash) return false;
      }

      // Course filter
      if (courseFilter !== 'all' && cert.courseId !== courseFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && cert.status !== statusFilter) {
        return false;
      }

      // Department filter
      if (deptFilter !== 'all' && cert.departmentId !== deptFilter) {
        return false;
      }

      // Date Range Filter
      if (dateRangeFilter !== 'all') {
        const certDate = new Date(cert.issuedAt || cert.issueDate || 0).getTime();
        const now = Date.now();
        if (dateRangeFilter === '30d' && now - certDate > 30 * 24 * 3600 * 1000) return false;
        if (dateRangeFilter === '90d' && now - certDate > 90 * 24 * 3600 * 1000) return false;
        if (dateRangeFilter === 'year' && now - certDate > 365 * 24 * 3600 * 1000) return false;
      }

      return true;
    });
  }, [certificates, searchQuery, courseFilter, statusFilter, deptFilter, dateRangeFilter]);

  // Learner Certificates
  const studentCertificates = useMemo(() => {
    const studentId = user?.id || 'u-007';
    return certificates.filter(
      (c) => c.learnerId === studentId || (studentId === 'u-007' && c.learnerName.includes('Alex'))
    );
  }, [certificates, user]);

  // Trainer Issued Certificates
  const trainerIssuedCertificates = useMemo(() => {
    const courseIds = trainerCourses.map((c) => c.id);
    return certificates.filter((c) => courseIds.includes(c.courseId));
  }, [certificates, trainerCourses]);

  // Trainer Selected Course Learners Eligibility
  const trainerSelectedCourse = courses.find((c) => c.id === selectedTrainerCourseId) || trainerCourses[0];

  const trainerLearnersEligibility = useMemo(() => {
    if (!trainerSelectedCourse) return [];
    const allStudents = getStudents();
    const courseEnrollments = enrollments.filter((e) => e.courseId === trainerSelectedCourse.id);
    const totalLessons = trainerSelectedCourse.modules.flatMap((m) => m.lessons).length || 6;

    return allStudents.slice(0, 8).map((st, idx) => {
      // Deterministic synthetic progress for demo
      const completedLessons = idx === 0 || idx === 1 ? totalLessons : Math.max(1, totalLessons - idx);
      const isComplete = completedLessons >= totalLessons;
      const score = isComplete ? 85 + (idx * 5) % 15 : 60 + (idx * 3);
      const isEligible = isComplete && score >= (trainerSelectedCourse.certificateConfig?.minimumAssessmentScore || 70);

      const existingCert = certificates.find(
        (c) => (c.learnerId === st.id || c.learnerName === st.displayName) && c.courseId === trainerSelectedCourse.id
      );

      return {
        student: st,
        completedLessons,
        totalLessons,
        progressPercent: Math.round((completedLessons / totalLessons) * 100),
        assessmentScore: score,
        isEligible,
        issuedCertificate: existingCert,
      };
    });
  }, [trainerSelectedCourse, getStudents, enrollments, certificates]);

  // Handle PDF Download
  const handleDownloadPdf = async (cert: Certificate) => {
    const title = cert.courseTitle || cert.courseName || 'Certified Program';
    setDownloadNotice(`Generating and downloading cryptographically verified PDF diploma for "${title}"...`);
    try {
      await generateCertificatePdf(cert);
      setDownloadNotice(`✓ Official verified certificate PDF downloaded successfully!`);
      setTimeout(() => setDownloadNotice(null), 3500);
    } catch (err) {
      console.error('Failed to generate certificate PDF:', err);
      setDownloadNotice('Opening print preview instead...');
      printCertificateDiploma(cert);
    }
  };

  // Handle Revoke
  const handleConfirmRevoke = () => {
    if (!certToRevoke) return;
    if (!revocationReason.trim()) {
      setRevokeError('An audited revocation reason is required.');
      return;
    }
    const adminName = user?.displayName || 'Institution Administrator';
    const result = revokeCertificate(certToRevoke.id, adminName, revocationReason.trim());
    if (result.success) {
      setCertToRevoke(null);
      setRevocationReason('');
      setRevokeError(null);
    } else {
      setRevokeError(result.message);
    }
  };

  // Manual Issuance for Eligible Student by Trainer
  const handleManualIssueForStudent = (item: typeof trainerLearnersEligibility[0]) => {
    if (!trainerSelectedCourse) return;
    const res = issueCourseCertificate({
      course: trainerSelectedCourse,
      learner: {
        id: item.student.id,
        name: item.student.displayName || `${item.student.firstName} ${item.student.lastName}`,
        email: item.student.email,
      },
      scoreAchieved: item.assessmentScore,
      completionPercentage: item.progressPercent,
    });
    alert(res.message);
  };

  return (
    <div>
      {/* Top Banner Navigation & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">
              {isAdmin ? 'Institution Administration' : isTrainer ? 'Faculty & Grading' : 'Verified Credentials'}
            </span>
            <span className="text-muted text-xs">Acme Learning Corp &bull; Official Credentials Registry</span>
            {isLearner && <span className="badge badge-active">{user?.displayName || 'Alex Thompson'}</span>}
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>
            {isAdmin
              ? 'Certificates & Credential Governance'
              : isTrainer
                ? 'Course Certificates & Learner Eligibility'
                : 'My Verified Certificates & Diplomas'}
          </h1>
          <p className="text-secondary text-sm">
            {isAdmin
              ? 'Oversee institution-wide credentials, audit issuance, configure template security, and govern validity'
              : isTrainer
                ? 'Monitor learner qualification standards, track completion requirements, and audit course certificates'
                : 'Cryptographically verified graduation awards, course completion diplomas, and official digital credentials'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link to="/verify-certificate" className="btn btn-secondary" style={{ gap: '6px' }}>
            <ShieldCheck size={16} /> Public Verification Portal
          </Link>
          {isAdmin && (
            <Link to="/course-builder" className="btn btn-primary" style={{ gap: '6px' }}>
              <Award size={16} /> Configure Course Certificates
            </Link>
          )}
          {isLearner && (
            <Link to="/my-learning" className="btn btn-secondary" style={{ gap: '6px' }}>
              <BookOpen size={16} /> My Enrolled Courses
            </Link>
          )}
        </div>
      </div>

      {downloadNotice && (
        <div style={{
          background: 'var(--info-bg, rgba(37, 99, 235, 0.1))',
          border: '1px solid var(--info-border, rgba(59, 130, 246, 0.3))',
          color: 'var(--info, #3b82f6)',
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

      {/* ========================================================= */}
      {/* 1. INSTITUTION ADMIN VIEW                                */}
      {/* ========================================================= */}
      {isAdmin && (
        <div>
          {/* Admin KPI Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '18px' }}>
              <span className="text-muted text-xs font-semibold uppercase">Total Issued Certificates</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary)', marginTop: '4px' }}>
                {certificates.length}
              </div>
              <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                Across {courses.length} courses
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <span className="text-muted text-xs font-semibold uppercase">Active Credentials</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                {certificates.filter((c) => c.status === 'active').length}
              </div>
              <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                Cryptographically registered
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <span className="text-muted text-xs font-semibold uppercase">Revoked Credentials</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--danger)', marginTop: '4px' }}>
                {certificates.filter((c) => c.status === 'revoked').length}
              </div>
              <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                Logged in audit registry
              </div>
            </div>

            <div className="card" style={{ padding: '18px' }}>
              <span className="text-muted text-xs font-semibold uppercase">Avg Qualification Score</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-purple, #a855f7)', marginTop: '4px' }}>
                93.2%
              </div>
              <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                Exam & assessment average
              </div>
            </div>
          </div>

          {/* Admin Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', gap: '8px' }}>
            <button
              className={`btn btn-ghost btn-sm ${adminTab === 'ledger' ? 'btn-active' : ''}`}
              onClick={() => setAdminTab('ledger')}
              style={{
                borderRadius: 0,
                borderBottom: adminTab === 'ledger' ? '2px solid var(--primary)' : '2px solid transparent',
                fontWeight: adminTab === 'ledger' ? 700 : 500,
                color: adminTab === 'ledger' ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              Issued Certificates Registry ({filteredCertificates.length})
            </button>
            <button
              className={`btn btn-ghost btn-sm ${adminTab === 'courses' ? 'btn-active' : ''}`}
              onClick={() => setAdminTab('courses')}
              style={{
                borderRadius: 0,
                borderBottom: adminTab === 'courses' ? '2px solid var(--primary)' : '2px solid transparent',
                fontWeight: adminTab === 'courses' ? 700 : 500,
                color: adminTab === 'courses' ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              Course Certificate Settings & Rules
            </button>
            <button
              className={`btn btn-ghost btn-sm ${adminTab === 'templates' ? 'btn-active' : ''}`}
              onClick={() => setAdminTab('templates')}
              style={{
                borderRadius: 0,
                borderBottom: adminTab === 'templates' ? '2px solid var(--primary)' : '2px solid transparent',
                fontWeight: adminTab === 'templates' ? 700 : 500,
                color: adminTab === 'templates' ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              Templates & Institution Branding
            </button>
          </div>

          {/* Tab 1: Issued Certificates Registry */}
          {adminTab === 'ledger' && (
            <div>
              {/* Filter Controls Bar */}
              <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search
                      size={16}
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search recipient, course, or certificate ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
                    />
                  </div>

                  <select
                    className="form-select"
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                    style={{ width: '180px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Courses</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    style={{ width: '140px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="revoked">Revoked</option>
                    <option value="expired">Expired</option>
                  </select>

                  <select
                    className="form-select"
                    value={dateRangeFilter}
                    onChange={(e) => setDateRangeFilter(e.target.value)}
                    style={{ width: '150px', fontSize: '0.85rem' }}
                  >
                    <option value="all">All Dates</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="year">Past Year</option>
                  </select>
                </div>
              </div>

              {/* Certificates Ledger Table */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Credential ID</th>
                      <th style={{ padding: '12px 16px' }}>Recipient Learner</th>
                      <th style={{ padding: '12px 16px' }}>Course Title</th>
                      <th style={{ padding: '12px 16px' }}>Issued Date</th>
                      <th style={{ padding: '12px 16px' }}>Score</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCertificates.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No certificates match the selected filters.
                        </td>
                      </tr>
                    ) : (
                      filteredCertificates.map((cert) => (
                        <tr key={cert.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <code style={{ fontSize: '0.78rem', color: 'var(--primary)' }}>{cert.id}</code>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 600 }}>{cert.learnerName}</div>
                            {cert.learnerEmail && (
                              <div className="text-muted text-xs">{cert.learnerEmail}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', maxWidth: '240px' }}>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cert.courseTitle || cert.courseName}
                            </div>
                            <div className="text-muted text-xs">{cert.issuingOrganization || 'Acme Learning Corp'}</div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {new Date(cert.issuedAt || cert.issueDate || '').toLocaleDateString()}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {cert.scoreAchieved ? (
                              <span style={{ fontWeight: 600, color: 'var(--success)' }}>{cert.scoreAchieved}%</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span className={`badge ${cert.status === 'active' ? 'badge-active' : cert.status === 'revoked' ? 'badge-inactive' : 'badge-secondary'}`}>
                              {cert.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedCert(cert)}
                                title="View Diploma Preview"
                                style={{ padding: '4px 8px' }}
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDownloadPdf(cert)}
                                title="Download Official PDF"
                                style={{ padding: '4px 8px' }}
                              >
                                <Download size={13} />
                              </button>
                              <Link
                                to={`/verify-certificate/${cert.id}`}
                                className="btn btn-secondary btn-sm"
                                title="Verify Online"
                                style={{ padding: '4px 8px' }}
                              >
                                <ExternalLink size={13} />
                              </Link>
                              {cert.status === 'active' && (
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => {
                                    setCertToRevoke(cert);
                                    setRevocationReason('');
                                    setRevokeError(null);
                                  }}
                                  title="Revoke Certificate"
                                  style={{ padding: '4px 8px', color: 'var(--danger)' }}
                                >
                                  <ShieldAlert size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Course Certificate Settings */}
          {adminTab === 'courses' && (
            <div className="grid-2">
              {courses.map((course) => {
                const cfg = course.certificateConfig;
                const isEnabled = cfg ? cfg.enabled !== false : true;
                const issuedCount = certificates.filter((c) => c.courseId === course.id).length;

                return (
                  <div key={course.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span className={`badge ${isEnabled ? 'badge-active' : 'badge-secondary'}`}>
                          {isEnabled ? 'Certificate Enabled' : 'Disabled'}
                        </span>
                        <span className="text-muted text-xs">{issuedCount} Issued</span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{course.title}</h3>
                      <p className="text-secondary text-xs" style={{ marginBottom: '14px' }}>
                        {course.description}
                      </p>

                      <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div><strong>Title:</strong> {cfg?.title || 'Certificate of Course Completion'}</div>
                        <div><strong>Template:</strong> {cfg?.templateId || 'standard'} &bull; <strong>Issuing Org:</strong> {cfg?.issuingOrganization || 'Acme Learning Corp'}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          Requirements: {cfg?.requireAllLessons ?? true ? 'All lessons required' : 'Lessons optional'} &bull; Min Exam Score: {cfg?.minimumAssessmentScore || 70}%
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <Link to={`/course-builder?id=${course.id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                        Edit Rules in Builder
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 3: Templates & Institution Branding */}
          {adminTab === 'templates' && (
            <div className="grid-3">
              <div className="card" style={{ borderTop: '4px solid #d97706' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="badge badge-primary">Default Template</span>
                  <Award size={18} color="#d97706" />
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Standard Executive Gold</h3>
                <p className="text-secondary text-xs" style={{ marginBottom: '16px' }}>
                  Double gold filigree border with official golden seal, serif calligraphy typography, and dual academic signers.
                </p>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '4px', fontSize: '0.78rem', marginBottom: '14px' }}>
                  Ideal for: Corporate training, executive leadership tracks, and general certifications.
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setSelectedCert(certificates[0])}
                >
                  <Eye size={14} /> Preview Template
                </button>
              </div>

              <div className="card" style={{ borderTop: '4px solid #dc2626' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="badge badge-secondary">Honors Template</span>
                  <Award size={18} color="#dc2626" />
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Academic Distinction</h3>
                <p className="text-secondary text-xs" style={{ marginBottom: '16px' }}>
                  Crimson seal ribbon with ornate corner rosettes, high-resolution institution logo, and academic honors citation.
                </p>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '4px', fontSize: '0.78rem', marginBottom: '14px' }}>
                  Ideal for: University degree programs, postgraduate diplomas, and academic honors.
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setSelectedCert(certificates[3] || certificates[0])}
                >
                  <Eye size={14} /> Preview Template
                </button>
              </div>

              <div className="card" style={{ borderTop: '4px solid #06b6d4' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="badge badge-secondary">Technical Track</span>
                  <Award size={18} color="#06b6d4" />
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Technical Mastery</h3>
                <p className="text-secondary text-xs" style={{ marginBottom: '16px' }}>
                  Deep midnight blue frame with cyan highlights, SHA-256 cryptographic verification ledger, and lab competencies badge.
                </p>
                <div style={{ background: 'var(--bg-input)', padding: '10px', borderRadius: '4px', fontSize: '0.78rem', marginBottom: '14px' }}>
                  Ideal for: Full-stack bootcamps, DevOps certifications, cybersecurity, and coding tracks.
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setSelectedCert(certificates[2] || certificates[0])}
                >
                  <Eye size={14} /> Preview Template
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TRAINER / FACULTY VIEW                                */}
      {/* ========================================================= */}
      {isTrainer && (
        <div>
          {/* Trainer Course Selector & Subtabs */}
          <div className="card" style={{ padding: '18px 22px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <BookOpen size={20} color="var(--primary)" />
                <div>
                  <span className="text-muted text-xs font-semibold uppercase">Authorized Instructor Course:</span>
                  <select
                    className="form-select"
                    value={selectedTrainerCourseId}
                    onChange={(e) => setSelectedTrainerCourseId(e.target.value)}
                    style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: '300px', marginTop: '2px' }}
                  >
                    {trainerCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={`btn ${trainerTab === 'eligibility' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setTrainerTab('eligibility')}
                  style={{ gap: '6px' }}
                >
                  <Users size={14} /> Learner Eligibility Monitor
                </button>
                <button
                  className={`btn ${trainerTab === 'issued' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setTrainerTab('issued')}
                  style={{ gap: '6px' }}
                >
                  <Award size={14} /> Issued Course Certificates ({trainerIssuedCertificates.length})
                </button>
              </div>
            </div>
          </div>

          {trainerTab === 'eligibility' && (
            <div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                      Enrolled Learners & Completion Requirements
                    </h3>
                    <p className="text-secondary text-xs" style={{ margin: 0 }}>
                      Tracking lesson completion and examination scores for "{trainerSelectedCourse?.title}"
                    </p>
                  </div>
                  <span className="badge badge-primary">
                    Min Pass Score: {trainerSelectedCourse?.certificateConfig?.minimumAssessmentScore || 70}%
                  </span>
                </div>

                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Student</th>
                      <th style={{ padding: '12px 16px' }}>Curriculum Progress</th>
                      <th style={{ padding: '12px 16px' }}>Assessment Score</th>
                      <th style={{ padding: '12px 16px' }}>Eligibility Status</th>
                      <th style={{ padding: '12px 16px' }}>Certificate Record</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainerLearnersEligibility.map((item) => (
                      <tr key={item.student.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{item.student.displayName || item.student.firstName}</div>
                          <div className="text-muted text-xs">{item.student.rollNo || item.student.id} &bull; {item.student.email}</div>
                        </td>
                        <td style={{ padding: '12px 16px', minWidth: '160px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="progress-bar-bg" style={{ height: '6px', flex: 1 }}>
                              <div className="progress-bar-fill" style={{ width: `${item.progressPercent}%` }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{item.progressPercent}%</span>
                          </div>
                          <div className="text-muted text-xs" style={{ marginTop: '2px' }}>
                            {item.completedLessons} of {item.totalLessons} lessons done
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 700, color: item.assessmentScore >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                            {item.assessmentScore}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {item.issuedCertificate ? (
                            <span className="badge badge-active">Issued & Active</span>
                          ) : item.isEligible ? (
                            <span className="badge badge-primary">Requirements Met</span>
                          ) : (
                            <span className="badge badge-secondary">In Progress</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {item.issuedCertificate ? (
                            <code style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                              {item.issuedCertificate.id}
                            </code>
                          ) : (
                            <span className="text-muted text-xs">Pending Completion</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {item.issuedCertificate ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedCert(item.issuedCertificate!)}
                                style={{ gap: '4px', fontSize: '0.75rem' }}
                              >
                                <Eye size={12} /> View
                              </button>
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleDownloadPdf(item.issuedCertificate!)}
                                style={{ gap: '4px', fontSize: '0.75rem' }}
                              >
                                <Download size={12} /> PDF
                              </button>
                            </div>
                          ) : item.isEligible ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleManualIssueForStudent(item)}
                              style={{ gap: '4px', fontSize: '0.75rem' }}
                            >
                              <Award size={12} /> Issue Certificate
                            </button>
                          ) : (
                            <span className="text-muted text-xs">Needs completion</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {trainerTab === 'issued' && (
            <div className="grid-3">
              {trainerIssuedCertificates.length === 0 ? (
                <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '36px' }}>
                  <Award size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                  <p className="text-muted">No certificates have been issued yet for your authorized courses.</p>
                </div>
              ) : (
                trainerIssuedCertificates.map((cert) => (
                  <div key={cert.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{
                        height: '120px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(244, 114, 182, 0.15))',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '14px',
                        position: 'relative'
                      }}>
                        <Award size={36} color="var(--primary)" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginTop: '4px' }}>
                          Verified Certificate
                        </span>
                        <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                          <span className={`badge badge-${cert.status}`}>{cert.status}</span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{cert.courseTitle || cert.courseName}</h3>
                      <p className="text-muted text-xs" style={{ marginBottom: '12px' }}>
                        Recipient: <strong>{cert.learnerName}</strong>
                      </p>

                      <div style={{ background: 'var(--bg-input)', padding: '10px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                        <div>
                          <span className="text-muted text-xs">Issued:</span>
                          <div style={{ fontWeight: 600 }}>{new Date(cert.issuedAt || cert.issueDate || '').toLocaleDateString()}</div>
                        </div>
                        <div>
                          <span className="text-muted text-xs">ID:</span>
                          <div><code>{cert.id}</code></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => setSelectedCert(cert)}
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => handleDownloadPdf(cert)}
                      >
                        <Download size={13} /> PDF
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. STUDENT / LEARNER VIEW                                */}
      {/* ========================================================= */}
      {isLearner && (
        <div>
          {/* Active Earned Certificates */}
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={20} color="var(--success)" />
              My Earned Certificates & Digital Diplomas ({studentCertificates.length})
            </h2>

            {studentCertificates.length === 0 ? (
              <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
                <Award size={44} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No Certificates Earned Yet</h3>
                <p className="text-secondary text-sm" style={{ maxWidth: '480px', margin: '0 auto 18px' }}>
                  You haven't earned any course completion certificates yet. Complete your enrolled course curriculum lessons and pass required evaluations to unlock official verified credentials!
                </p>
                <Link to="/my-learning" className="btn btn-primary" style={{ gap: '8px' }}>
                  <BookOpen size={16} /> Continue Learning in My Courses
                </Link>
              </div>
            ) : (
              <div className="grid-3">
                {studentCertificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      boxShadow: 'var(--shadow-md)'
                    }}
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
                          Verified Credential
                        </span>
                        <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                          <span className={`badge badge-${cert.status}`}>{cert.status}</span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>{cert.courseTitle || cert.courseName}</h3>
                      <p className="text-muted text-xs" style={{ marginBottom: '14px' }}>
                        Issuing Organization: <strong>{cert.issuingOrganization || 'Acme Learning Corp'}</strong>
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
                          <div style={{ fontWeight: 700 }}><code>{cert.id}</code></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                      <Link
                        to={`/verify-certificate/${cert.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', justifyContent: 'center', gap: '6px' }}
                      >
                        <ShieldCheck size={14} /> Verify Credential Online
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* In-Progress Course Certifications & Unlocking Criteria */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="var(--primary)" />
              In-Progress Course Certifications & Unlocking Criteria
            </h2>
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
                    <CheckCircle2 size={13} /> Complete 6 Curriculum Modules (4/6 completed)
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

              <div className="card" style={{ borderLeft: '3px solid var(--info, #06b6d4)' }}>
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
                  <div className="progress-bar-fill" style={{ width: '30%', background: 'var(--info, #06b6d4)' }} />
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)' }}>
                    <CheckCircle2 size={13} /> Complete 5 Advanced Modules (1/5 completed)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                    <Clock size={13} /> Complete Proctored React Final Exam (Required Score: 70%)
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
        </div>
      )}

      {/* ========================================================= */}
      {/* DIPLOMA PREVIEW MODAL                                     */}
      {/* ========================================================= */}
      {selectedCert && (
        <div className="modal-overlay" onClick={() => setSelectedCert(null)}>
          <div className="modal-card" style={{ maxWidth: '740px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--success)" />
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Verified Credential #{selectedCert.id}</h3>
              </div>
              <button onClick={() => setSelectedCert(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '26px', textAlign: 'center' }}>
              <div style={{
                border: '3px double #d97706',
                borderRadius: 'var(--radius-lg)',
                padding: '30px 24px',
                background: 'radial-gradient(ellipse at center, rgba(254, 243, 199, 0.12) 0%, transparent 80%), var(--bg-card)',
                boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.15)',
                position: 'relative'
              }}>
                {/* Official Logo */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <img
                    src="/logo.png"
                    alt="VeniLearn Logo"
                    style={{
                      height: '40px',
                      width: 'auto',
                      maxWidth: '180px',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                    }}
                  />
                </div>

                <div style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '2px' }}>
                  {selectedCert.issuingOrganization || 'Acme Learning Corp'} &bull; Official Credentials Registry
                </div>
                <div style={{ width: '90px', height: '2px', background: 'linear-gradient(90deg, transparent, #d97706, transparent)', margin: '0 auto 12px' }} />

                <div style={{ fontSize: '1.45rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-main)', marginBottom: '2px' }}>
                  Certificate of Achievement
                </div>
                <div style={{ fontSize: '0.725rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#d97706', marginBottom: '12px' }}>
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

                <div style={{ width: '180px', height: '2px', background: 'linear-gradient(90deg, transparent, #d97706, transparent)', margin: '0 auto 12px' }} />

                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 12px', lineHeight: 1.5 }}>
                  for successfully satisfying all rigorous academic coursework, proctored examinations, and applied evaluations required for the professional credential in
                </div>

                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-cyan, #06b6d4)', marginBottom: '4px' }}>
                  {selectedCert.courseTitle || selectedCert.courseName || 'Certified Program'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '22px' }}>
                  Demonstrating advanced engineering rigor, technical competency, and verified professional excellence.
                </div>

                {/* Signatures & Seal Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: '18px', paddingLeft: '16px', paddingRight: '16px' }}>
                  <div style={{ textAlign: 'center', width: '150px' }}>
                    <div style={{ fontFamily: 'Georgia, cursive', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '2px' }}>
                      {selectedCert.authorizedSignerName || 'Dr. James Wilson'}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-main)' }}>
                      {selectedCert.authorizedSignerName || 'Dr. James Wilson, Ph.D.'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {selectedCert.authorizedSignerTitle || 'Lead Academic Faculty'}
                    </div>
                  </div>

                  {/* Golden Seal */}
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
                      {selectedCert.secondarySignerName || 'Sarah Chen'}
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', fontWeight: 700, fontSize: '0.75rem', color: 'var(--text-main)' }}>
                      {selectedCert.secondarySignerName || 'Sarah Chen, M.Sc.'}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {selectedCert.secondarySignerTitle || 'Dean of Academic Affairs'}
                    </div>
                  </div>
                </div>

                {/* Security Bottom Bar */}
                <div style={{
                  marginTop: '18px',
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
                  <div style={{ color: 'var(--success)', fontWeight: 600 }}>Cryptographically Verified</div>
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
              <Link
                to={`/verify-certificate/${selectedCert.id}`}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
              >
                <ExternalLink size={14} /> Open Verification Link
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCert(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REVOKE CONFIRMATION MODAL                                 */}
      {/* ========================================================= */}
      {certToRevoke && (
        <div className="modal-overlay" onClick={() => setCertToRevoke(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
                <ShieldAlert size={20} />
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Revoke Certificate #{certToRevoke.id}</h3>
              </div>
              <button onClick={() => setCertToRevoke(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '20px' }}>
              <p className="text-secondary text-sm" style={{ marginBottom: '14px' }}>
                You are about to revoke the credential issued to <strong>{certToRevoke.learnerName}</strong> for <strong>{certToRevoke.courseTitle || certToRevoke.courseName}</strong>.
              </p>

              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: '16px',
                fontSize: '0.8rem',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  This action is permanent and audited. The certificate verification status will immediately change to <strong>REVOKED</strong> on the public registry.
                </span>
              </div>

              {revokeError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '10px' }}>
                  {revokeError}
                </div>
              )}

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Administrative Revocation Reason <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={revocationReason}
                  onChange={(e) => setRevocationReason(e.target.value)}
                  placeholder="e.g. Academic integrity violation confirmed in post-exam audit..."
                />
              </div>
            </div>

            <div className="modal-footer" style={{ gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setCertToRevoke(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmRevoke}
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
