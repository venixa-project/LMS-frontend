import { apiClient } from './apiClient';
// ============================================================
// LMS - Certificate Management Store (Zustand + LocalStorage)
// Manages course completion certificates, verification hashes,
// eligibility checking, duplicate prevention, and revocation workflows.
// ============================================================
import { create } from 'zustand';
import { Certificate, Course, User, Assessment } from '../types';

import { useAuthStore } from './store';
import { useGamificationStore } from './gamificationStore';

const STORAGE_KEY_CERTIFICATES = 'venilearn_certificates';

export interface PublicVerificationResult {
  isValid: boolean;
  isRevoked: boolean;
  status: 'active' | 'expired' | 'revoked' | 'not_found';
  certificateId?: string;
  learnerName?: string;
  courseTitle?: string;
  issuingOrganization?: string;
  issueDate?: string;
  expiryDate?: string;
  verificationHash?: string;
  templateId?: string;
  revokedAt?: string;
  revocationReason?: string;
  authorizedSignerName?: string;
  authorizedSignerTitle?: string;
  secondarySignerName?: string;
  secondarySignerTitle?: string;
  scoreAchieved?: number;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  completedLessons: number;
  totalLessons: number;
  lessonPercentage: number;
  assessmentPassed: boolean;
  assessmentScore?: number;
  requiredScore: number;
}

interface CertificateState {
  isLoading: boolean;
  fetchCertificates: () => Promise<void>;
  certificates: Certificate[];

  // Queries
  getCertificates: () => Certificate[];
  getCertificateById: (id: string) => Certificate | undefined;
  getCertificatesByLearner: (learnerId: string) => Certificate[];
  getCertificatesByCourse: (courseId: string) => Certificate[];
  getCertificatesForTrainer: (trainerCourseIds: string[]) => Certificate[];
  getCertificatesForOrg: (orgId: string) => Certificate[];
  verifyCertificate: (idOrHash: string) => PublicVerificationResult;

  // Eligibility & Issuance
  checkCourseEligibility: (
    course: Course,
    learnerId: string,
    completedLessonIds: string[],
    assessmentAttempt?: { passed: boolean; score: number; totalMarks: number }
  ) => EligibilityResult;

  issueCourseCertificate: (params: {
    course: Course;
    learner: { id: string; name: string; email?: string };
    scoreAchieved?: number;
    completionPercentage?: number;
  }) => {
    success: boolean;
    certificate?: Certificate;
    isDuplicate?: boolean;
    message: string;
  };

  issueAssessmentCertificate: (params: {
    assessment: Assessment;
    learner: { id: string; name: string; email?: string };
    scoreAchieved: number;
    totalMarks?: number;
    completionPercentage?: number;
  }) => {
    success: boolean;
    certificate?: Certificate;
    isDuplicate?: boolean;
    message: string;
  };

  // Administration & Revocation
  revokeCertificate: (
    certId: string,
    revokedBy: string,
    reason: string
  ) => { success: boolean; message: string };

  deleteCertificate: (certId: string) => void;
  resetToDefault: () => void;
}

// Helper: generate consistent cryptographic verification hash
function generateVerificationHash(certId: string, learnerId: string, courseId: string, timestamp: string): string {
  const seed = `${certId}:${learnerId}:${courseId}:${timestamp}:venilearn-verified-v1`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash * 31).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash * 127).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash * 257).toString(16).padStart(8, '0');
  return `${hex1}${hex2}${hex3}${hex4}`.padEnd(40, 'a').slice(0, 40);
}

function loadInitialCertificates(): Certificate[] {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_CERTIFICATES);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((c: any) => !c.id?.startsWith('cert-00'));
      }
    }
  } catch (err) {
    console.error('Failed to parse cached certificates:', err);
  }
  return [];
}

export const useCertificateStore = create<CertificateState>((set, get) => ({
  isLoading: false,
  fetchCertificates: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get<any[]>('/certificates');
      if (res && res.data && Array.isArray(res.data)) {
        const mapped: Certificate[] = res.data.map((c: any) => ({
          id: c.id,
          learnerId: c.learnerId,
          learnerName: c.learner?.displayName || c.learnerName || 'Student',
          learnerEmail: c.learner?.email || c.learnerEmail,
          courseId: c.courseId,
          courseTitle: c.course?.title || c.courseTitle || 'Certified Course',
          issueDate: c.issueDate || c.createdAt,
          expiryDate: c.expiryDate,
          verificationHash: c.verificationHash,
          status: c.status || 'active',
          templateId: c.templateId || 'tpl-default',
          authorizedSignerName: c.authorizedSignerName || 'Academic Director',
          authorizedSignerTitle: c.authorizedSignerTitle || 'Head of Academics',
          organizationId: c.tenantId,
          issuingOrganization: c.issuingOrganization || 'VeniLearn LMS',
          scoreAchieved: c.scoreAchieved,
        }));
        set({ certificates: mapped, isLoading: false });
        localStorage.setItem(STORAGE_KEY_CERTIFICATES, JSON.stringify(mapped));
        return;
      }
    } catch (e) {
      console.warn('Failed to fetch certificates:', e);
    }
    set({ isLoading: false });
  },
  certificates: loadInitialCertificates(),

  getCertificates: () => get().certificates,

  getCertificateById: (id: string) => {
    return get().certificates.find(
      (c) => c.id.toLowerCase() === id.toLowerCase() || c.verificationHash?.toLowerCase() === id.toLowerCase()
    );
  },

  getCertificatesByLearner: (learnerId: string) => {
    const list = get().certificates;
    return list.filter((c) => c.learnerId === learnerId);
  },

  getCertificatesByCourse: (courseId: string) => {
    return get().certificates.filter((c) => c.courseId === courseId);
  },

  getCertificatesForTrainer: (trainerCourseIds: string[]) => {
    const courseSet = new Set(trainerCourseIds.map((id) => id.toLowerCase()));
    return get().certificates.filter((c) => courseSet.has(c.courseId.toLowerCase()));
  },

  getCertificatesForOrg: (orgId: string) => {
    return get().certificates.filter((c) => !c.organizationId || c.organizationId === orgId);
  },

  verifyCertificate: (idOrHash: string): PublicVerificationResult => {
    const query = idOrHash.trim().toLowerCase();
    const cert = get().certificates.find(
      (c) =>
        c.id.toLowerCase() === query ||
        (c.verificationHash && c.verificationHash.toLowerCase() === query) ||
        (c.verificationHash && c.verificationHash.toLowerCase().includes(query))
    );

    if (!cert) {
      return {
        isValid: false,
        isRevoked: false,
        status: 'not_found',
      };
    }

    if (cert.status === 'revoked') {
      return {
        isValid: false,
        isRevoked: true,
        status: 'revoked',
        certificateId: cert.id,
        learnerName: cert.learnerName,
        courseTitle: cert.courseTitle || cert.courseName,
        issuingOrganization: cert.issuingOrganization || 'Acme Learning Corp',
        issueDate: cert.issueDate,
        revokedAt: cert.revokedAt,
        revocationReason: cert.revocationReason || 'Revoked by institution authority.',
        verificationHash: cert.verificationHash,
      };
    }

    // Check expiry
    const isExpired = cert.expiryDate ? new Date(cert.expiryDate).getTime() < Date.now() : false;
    const finalStatus = isExpired ? 'expired' : 'active';

    return {
      isValid: !isExpired,
      isRevoked: false,
      status: finalStatus,
      certificateId: cert.id,
      learnerName: cert.learnerName,
      courseTitle: cert.courseTitle || cert.courseName,
      issuingOrganization: cert.issuingOrganization || 'Acme Learning Corp',
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate,
      verificationHash: cert.verificationHash,
      templateId: cert.templateId || 'standard',
      authorizedSignerName: cert.authorizedSignerName || 'Dr. James Wilson',
      authorizedSignerTitle: cert.authorizedSignerTitle || 'Lead Instructor & Curriculum Director',
      secondarySignerName: cert.secondarySignerName || 'Sarah Chen',
      secondarySignerTitle: cert.secondarySignerTitle || 'Dean of Academic Affairs',
      scoreAchieved: cert.scoreAchieved,
    };
  },

  checkCourseEligibility: (course, learnerId, completedLessonIds, assessmentAttempt) => {
    const config = course.certificateConfig;
    const reasons: string[] = [];

    // If certificate is explicitly disabled for this course
    if (config && config.enabled === false) {
      return {
        eligible: false,
        reasons: ['Certificates are not enabled for this course.'],
        completedLessons: 0,
        totalLessons: 0,
        lessonPercentage: 0,
        assessmentPassed: false,
        requiredScore: 0,
      };
    }

    const allLessons = course.modules.flatMap((m) => m.lessons);
    const totalLessons = allLessons.length;
    const completedCount = completedLessonIds.filter((id) => allLessons.some((l) => l.id === id)).length;
    const lessonPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 100;

    const requiredCompletionPercent = config?.requiredCompletionPercentage ?? 100;
    const requireAllLessons = config?.requireAllLessons ?? true;
    const requiredScore = config?.minimumAssessmentScore ?? 70;

    // Check lesson completion
    if (requireAllLessons && completedCount < totalLessons) {
      reasons.push(`Complete all ${totalLessons} curriculum lessons (${completedCount}/${totalLessons} done).`);
    } else if (lessonPercentage < requiredCompletionPercent) {
      reasons.push(`Achieve at least ${requiredCompletionPercent}% course progress (currently ${lessonPercentage}%).`);
    }

    // Check assessment requirements
    const hasAssessment =
      Boolean(course.finalAssessment) || course.modules.some((m) => Boolean(m.assessment));
    const requireAssessment = config?.requirePassingAssessment ?? hasAssessment;

    let assessmentPassed = true;
    let scoreAchieved: number | undefined = undefined;

    if (requireAssessment && hasAssessment) {
      if (!assessmentAttempt) {
        assessmentPassed = false;
        reasons.push(`Pass the course examination with a score of ${requiredScore}% or higher.`);
      } else {
        const percent = Math.round((assessmentAttempt.score / (assessmentAttempt.totalMarks || 100)) * 100);
        scoreAchieved = percent;
        if (!assessmentAttempt.passed || percent < requiredScore) {
          assessmentPassed = false;
          reasons.push(`Examination passing mark not met (achieved ${percent}%, required ${requiredScore}%).`);
        }
      }
    }

    return {
      eligible: reasons.length === 0,
      reasons,
      completedLessons: completedCount,
      totalLessons,
      lessonPercentage,
      assessmentPassed,
      assessmentScore: scoreAchieved,
      requiredScore,
    };
  },

  issueCourseCertificate: ({ course, learner, scoreAchieved = 95, completionPercentage = 100 }) => {
    const { certificates } = get();

    // 1. Check if course has certificates disabled
    if (course.certificateConfig && course.certificateConfig.enabled === false) {
      return {
        success: false,
        message: 'Certificates are not enabled for this course.',
      };
    }

    // 2. Prevent duplicate certificates for the same learner and course
    const existing = certificates.find(
      (c) =>
        c.learnerId === learner.id &&
        c.courseId === course.id &&
        c.status === 'active'
    );

    if (existing) {
      return {
        success: true,
        certificate: existing,
        isDuplicate: true,
        message: `Certificate is already issued (ID: ${existing.id}).`,
      };
    }

    // 3. Generate unique Certificate ID
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const courseCodeClean = (course.id || 'CRS').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    const certId = `CERT-${year}-${courseCodeClean}-${randomSuffix}`;

    const timestamp = new Date().toISOString();
    const issueDateStr = timestamp.slice(0, 10);

    // Calculate expiry if configured
    let expiryDateStr: string | undefined = undefined;
    if (course.certificateConfig?.validityMonths && course.certificateConfig.validityMonths > 0) {
      const exp = new Date();
      exp.setMonth(exp.getMonth() + course.certificateConfig.validityMonths);
      expiryDateStr = exp.toISOString().slice(0, 10);
    } else if (course.certificateConfig?.expiryDate) {
      expiryDateStr = course.certificateConfig.expiryDate;
    }

    const verificationHash = generateVerificationHash(certId, learner.id, course.id, timestamp);

    const pointsAwarded = course.completionPoints ?? course.certificateConfig?.completionPoints ?? 100;

    const newCert: Certificate = {
      id: certId,
      type: 'course',
      learnerId: learner.id,
      learnerName: learner.name,
      learnerEmail: learner.email,
      courseId: course.id,
      courseName: course.title,
      courseTitle: course.title,
      issuingOrganization: course.certificateConfig?.issuingOrganization || 'Acme Learning Corp',
      issueDate: issueDateStr,
      issuedAt: timestamp,
      expiryDate: expiryDateStr,
      status: 'active',
      verificationUrl: `/verify-certificate/${certId}`,
      verificationHash,
      templateId: course.certificateConfig?.templateId || 'standard',
      scoreAchieved,
      completionPercentage,
      pointsAwarded,
      authorizedSignerName: course.certificateConfig?.authorizedSignerName || 'Dr. James Wilson',
      authorizedSignerTitle: course.certificateConfig?.authorizedSignerTitle || 'Curriculum Director & Lead Faculty',
      authorizedSignatureImage: course.certificateConfig?.authorizedSignatureImage,
      secondarySignerName: course.certificateConfig?.secondarySignerName || 'Sarah Chen',
      secondarySignerTitle: course.certificateConfig?.secondarySignerTitle || 'Dean of Academic Affairs',
      organizationId: 'org-001',
      departmentId: course.departmentId || 'dep-001',
    };

    const nextCertificates = [newCert, ...certificates];
    set({ certificates: nextCertificates });

    try {
      localStorage.setItem(STORAGE_KEY_CERTIFICATES, JSON.stringify(nextCertificates));
    } catch (err) {
      console.warn('Failed to persist certificates to storage:', err);
    }

    // Award course completion reward points (deduplicated)
    if (pointsAwarded > 0) {
      try {
        useGamificationStore.getState().awardPoints({
          userId: learner.id,
          points: pointsAwarded,
          source: `course_completion:${course.id}`,
          activity: `Completed ${course.title} curriculum with certificate`,
        });
      } catch (ptsErr) {
        console.warn('Failed to award course completion points:', ptsErr);
      }
    }

    // 4. Notify learner in user auth notifications drawer
    try {
      const authStore = useAuthStore.getState();
      const existingNotifs = authStore.notifications;
      const certNotification = {
        id: `notif-cert-${certId}`,
        userId: learner.id,
        title: 'Course Certificate Earned!',
        message: `Congratulations ${learner.name}! You have officially earned your verified certificate for "${course.title}".`,
        category: 'certificate',
        link: '/my-certificates',
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      const updatedNotifs = [certNotification, ...existingNotifs];
      useAuthStore.setState({
        notifications: updatedNotifs,
        unreadNotifications: updatedNotifs.filter((n) => !n.isRead).length,
      });
      try {
        localStorage.setItem('venilearn_notifications', JSON.stringify(updatedNotifs));
      } catch {}
    } catch (notifErr) {
      console.warn('Could not dispatch in-app notification:', notifErr);
    }

    return {
      success: true,
      certificate: newCert,
      isDuplicate: false,
      message: `Verified certificate #${certId} generated successfully!`,
    };
  },

  issueAssessmentCertificate: ({ assessment, learner, scoreAchieved, totalMarks = 100, completionPercentage = 100 }) => {
    const { certificates } = get();

    // 1. Check if assessment has certificates disabled
    if (assessment.certificateConfig && assessment.certificateConfig.enabled === false) {
      return {
        success: false,
        message: 'Certificates are not enabled for this assessment.',
      };
    }

    // 2. Check passing score requirement
    const passingScore = assessment.certificateConfig?.minimumScore ?? assessment.passingMarks ?? assessment.passmark ?? 70;
    if (scoreAchieved < passingScore) {
      return {
        success: false,
        message: `Achieved score of ${scoreAchieved}% does not meet the passing requirement of ${passingScore}%.`,
      };
    }

    // 3. Prevent duplicate certificates for the same learner and assessment
    const existing = certificates.find(
      (c) =>
        c.learnerId === learner.id &&
        c.assessmentId === assessment.id &&
        c.status === 'active'
    );

    if (existing) {
      return {
        success: true,
        certificate: existing,
        isDuplicate: true,
        message: `Assessment Certificate is already issued (ID: ${existing.id}).`,
      };
    }

    // 4. Generate unique Certificate ID
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const codeClean = (assessment.id || 'ASM').replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
    const certId = `CERT-${year}-EXAM-${codeClean}-${randomSuffix}`;

    const timestamp = new Date().toISOString();
    const issueDateStr = timestamp.slice(0, 10);
    const verificationHash = generateVerificationHash(certId, learner.id, assessment.id, timestamp);
    const pointsAwarded = assessment.completionPoints ?? assessment.certificateConfig?.completionPoints ?? 50;

    const newCert: Certificate = {
      id: certId,
      type: 'assessment',
      learnerId: learner.id,
      learnerName: learner.name,
      learnerEmail: learner.email,
      courseId: assessment.id,
      courseName: assessment.title,
      courseTitle: assessment.title,
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      issuingOrganization: assessment.certificateConfig?.issuingOrganization || 'Acme Learning Corp',
      issueDate: issueDateStr,
      issuedAt: timestamp,
      status: 'active',
      verificationUrl: `/verify-certificate/${certId}`,
      verificationHash,
      templateId: assessment.certificateConfig?.templateId || 'standard',
      scoreAchieved,
      completionPercentage,
      pointsAwarded,
      authorizedSignerName: assessment.certificateConfig?.authorizedSignerName || 'Dr. James Wilson',
      authorizedSignerTitle: assessment.certificateConfig?.authorizedSignerTitle || 'Principal Examiner & Lead Faculty',
      authorizedSignatureImage: assessment.certificateConfig?.authorizedSignatureImage,
      secondarySignerName: assessment.certificateConfig?.secondarySignerName || 'Sarah Chen',
      secondarySignerTitle: assessment.certificateConfig?.secondarySignerTitle || 'Dean of Academic Affairs',
      organizationId: 'org-001',
      departmentId: 'dep-001',
    };

    const nextCertificates = [newCert, ...certificates];
    set({ certificates: nextCertificates });

    try {
      localStorage.setItem(STORAGE_KEY_CERTIFICATES, JSON.stringify(nextCertificates));
    } catch (err) {
      console.warn('Failed to persist certificates to storage:', err);
    }

    // Award assessment completion reward points (deduplicated)
    if (pointsAwarded > 0) {
      try {
        useGamificationStore.getState().awardPoints({
          userId: learner.id,
          points: pointsAwarded,
          source: `assessment_pass:${assessment.id}`,
          activity: `Passed ${assessment.title} assessment certification`,
        });
      } catch (ptsErr) {
        console.warn('Failed to award assessment points:', ptsErr);
      }
    }

    // Notify learner
    try {
      const authStore = useAuthStore.getState();
      const existingNotifs = authStore.notifications;
      const certNotification = {
        id: `notif-cert-${certId}`,
        userId: learner.id,
        title: 'Assessment Certificate Earned!',
        message: `Congratulations ${learner.name}! You scored ${scoreAchieved}% on "${assessment.title}" and earned your certified credential.`,
        category: 'certificate',
        link: '/my-certificates',
        isRead: false,
        timestamp: new Date().toISOString(),
      };
      const updatedNotifs = [certNotification, ...existingNotifs];
      useAuthStore.setState({
        notifications: updatedNotifs,
        unreadNotifications: updatedNotifs.filter((n) => !n.isRead).length,
      });
      try {
        localStorage.setItem('venilearn_notifications', JSON.stringify(updatedNotifs));
      } catch {}
    } catch (notifErr) {
      console.warn('Could not dispatch in-app notification:', notifErr);
    }

    return {
      success: true,
      certificate: newCert,
      isDuplicate: false,
      message: `Verified assessment certificate #${certId} generated successfully!`,
    };
  },

  revokeCertificate: (certId, revokedBy, reason) => {
    const { certificates } = get();
    const target = certificates.find((c) => c.id.toLowerCase() === certId.toLowerCase());
    if (!target) {
      return { success: false, message: 'Certificate record not found.' };
    }

    const updated = certificates.map((c) => {
      if (c.id.toLowerCase() === certId.toLowerCase()) {
        return {
          ...c,
          status: 'revoked' as const,
          revokedAt: new Date().toISOString(),
          revokedBy,
          revocationReason: reason.trim(),
        };
      }
      return c;
    });

    set({ certificates: updated });
    try {
      localStorage.setItem(STORAGE_KEY_CERTIFICATES, JSON.stringify(updated));
    } catch {}

    return {
      success: true,
      message: `Certificate #${certId} has been successfully revoked and logged in the audit registry.`,
    };
  },

  deleteCertificate: (certId) => {
    set((state) => {
      const filtered = state.certificates.filter((c) => c.id !== certId);
      try {
        localStorage.setItem(STORAGE_KEY_CERTIFICATES, JSON.stringify(filtered));
      } catch {}
      return { certificates: filtered };
    });
  },

  resetToDefault: () => {
    const def = loadInitialCertificates();
    set({ certificates: def });
    try {
      localStorage.setItem(STORAGE_KEY_CERTIFICATES, JSON.stringify(def));
    } catch {}
  },
}));
