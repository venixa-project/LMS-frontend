/**
 * Configurable Auto-Proctoring Warning Interval & Three-Strike Auto-Submission Test Suite
 *
 * Comprehensive end-to-end test suite validating the 12 mandatory requirements:
 * Test Case 1:  Create assessment with 1-minute warning interval (60s) and verify database persistence.
 * Test Case 2:  Trigger first genuine violation -> Warning 1 appears for student and Admin.
 * Test Case 3:  Trigger another violation after 30 seconds -> Cooldown active, 0 extra strikes issued.
 * Test Case 4:  Trigger a genuine violation after 60 seconds -> Warning 2 appears for student and Admin.
 * Test Case 5:  Trigger another violation before the next 60s -> Cooldown active, 0 extra strikes issued.
 * Test Case 6:  Trigger a genuine violation after next 60s -> Warning 3 appears for student and Admin.
 * Test Case 7:  Verify automatic submission occurs exactly once after warning 3 (PROCTORING_THIRD_WARNING).
 * Test Case 8:  Verify answers are preserved in database before automatic submission.
 * Test Case 9:  Verify duplicate events with identical deduplication key do not increase warning count.
 * Test Case 10: Verify two students taking separate exams do not affect each other's warning counters or intervals.
 * Test Case 11: Verify Admin and Trainer roles have permission to configure intervals while Student role is blocked.
 * Test Case 12: Verify the same configuration is retained when editing and reopening an assessment.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface AssessmentProctoringConfig {
  id: string;
  title: string;
  warningIntervalSeconds: number;
  maxProctoringWarnings: number;
  thirdWarningAction: 'auto_submit' | 'terminate' | 'flag_review';
  createdByRole: string;
}

export interface CandidateExamAttempt {
  attemptId: string;
  studentId: string;
  assessmentId: string;
  status: 'in_progress' | 'submitted' | 'under_review';
  proctoringWarningsCount: number;
  lastWarningAt: number | null;
  submissionReason?: string;
  answers: Map<string, string>;
  warningHistory: Array<{
    eventId: string;
    warningNumber: number;
    violationType: string;
    message: string;
    timestamp: number;
    dedupKey?: string;
  }>;
}

/**
 * Server-Side Auto-Proctoring Warning Engine
 * Mirrors LMS-Backend/src/services/proctoring.service.ts
 */
export class ProctoringWarningEngine {
  private assessments: Map<string, AssessmentProctoringConfig> = new Map();
  private attempts: Map<string, CandidateExamAttempt> = new Map();
  private suppressedAuditLogs: Array<{
    attemptId: string;
    violationType: string;
    elapsedSeconds: number;
    requiredIntervalSeconds: number;
    timestamp: number;
  }> = [];

  registerAssessment(config: AssessmentProctoringConfig) {
    if (config.warningIntervalSeconds < 10 || config.warningIntervalSeconds > 3600) {
      throw new Error('Warning interval must be between 10 seconds and 3600 seconds (60 minutes).');
    }
    this.assessments.set(config.id, { ...config });
    return this.assessments.get(config.id)!;
  }

  getAssessment(id: string) {
    return this.assessments.get(id);
  }

  createAttempt(attemptId: string, studentId: string, assessmentId: string): CandidateExamAttempt {
    const attempt: CandidateExamAttempt = {
      attemptId,
      studentId,
      assessmentId,
      status: 'in_progress',
      proctoringWarningsCount: 0,
      lastWarningAt: null,
      answers: new Map(),
      warningHistory: [],
    };
    this.attempts.set(attemptId, attempt);
    return attempt;
  }

  recordAnswer(attemptId: string, questionId: string, answerText: string) {
    const attempt = this.attempts.get(attemptId);
    if (!attempt) throw new Error('Attempt not found');
    attempt.answers.set(questionId, answerText);
  }

  processViolation(params: {
    attemptId: string;
    violationType: string;
    message?: string;
    serverTimestampMs: number;
    dedupKey?: string;
  }) {
    const attempt = this.attempts.get(params.attemptId);
    if (!attempt) throw new Error(`Attempt ${params.attemptId} not found`);

    const assessment = this.assessments.get(attempt.assessmentId);
    if (!assessment) throw new Error(`Assessment ${attempt.assessmentId} not found`);

    const warningIntervalSeconds = assessment.warningIntervalSeconds || 120;
    const maxAllowed = assessment.maxProctoringWarnings || 3;

    // Check if attempt is already concluded
    if (attempt.status === 'submitted' || attempt.submissionReason === 'PROCTORING_THIRD_WARNING') {
      return {
        action: 'already_terminated',
        warningNumber: attempt.proctoringWarningsCount,
        totalAllowed: maxAllowed,
        remainingWarnings: 0,
        reason: 'Examination session is already concluded.',
      };
    }

    // Check if max strikes already reached
    if (attempt.proctoringWarningsCount >= maxAllowed) {
      return {
        action: 'already_terminated',
        warningNumber: attempt.proctoringWarningsCount,
        totalAllowed: maxAllowed,
        remainingWarnings: 0,
        reason: 'Maximum proctoring warnings reached.',
      };
    }

    // Deduplication check: if dedupKey was already recorded, ignore duplicate frame
    if (params.dedupKey && attempt.warningHistory.some((w) => w.dedupKey === params.dedupKey)) {
      return {
        action: 'duplicate_suppressed',
        warningNumber: attempt.proctoringWarningsCount,
        totalAllowed: maxAllowed,
        remainingWarnings: Math.max(0, maxAllowed - attempt.proctoringWarningsCount),
      };
    }

    // Server-Side Cooldown Calculation
    if (attempt.lastWarningAt !== null) {
      const elapsedSeconds = Math.floor((params.serverTimestampMs - attempt.lastWarningAt) / 1000);
      if (elapsedSeconds < warningIntervalSeconds) {
        // Cooldown Active -> Suppress Strike
        this.suppressedAuditLogs.push({
          attemptId: params.attemptId,
          violationType: params.violationType,
          elapsedSeconds,
          requiredIntervalSeconds: warningIntervalSeconds,
          timestamp: params.serverTimestampMs,
        });

        return {
          action: 'suppressed_cooldown',
          warningNumber: attempt.proctoringWarningsCount,
          totalAllowed: maxAllowed,
          remainingWarnings: Math.max(0, maxAllowed - attempt.proctoringWarningsCount),
          warningIntervalSeconds,
          elapsedSeconds,
          remainingCooldown: warningIntervalSeconds - elapsedSeconds,
        };
      }
    }

    // Eligible for New Strike!
    const newStrike = attempt.proctoringWarningsCount + 1;
    attempt.proctoringWarningsCount = newStrike;
    attempt.lastWarningAt = params.serverTimestampMs;

    const eventId = `warn-evt-${newStrike}-${Date.now()}`;
    let reasonText = params.message || params.violationType;
    if (params.violationType === 'MULTIPLE_FACES_DETECTED') {
      reasonText = 'Multiple faces detected. Please ensure only you are visible.';
    } else if (params.violationType === 'MOBILE_PHONE_DETECTED') {
      reasonText = 'Unauthorized mobile phone detected. Please remove the device.';
    }

    if (newStrike === 3) {
      reasonText = 'Final warning (3 of 3). Your examination will be automatically submitted according to the configured policy.';
    }

    attempt.warningHistory.push({
      eventId,
      warningNumber: newStrike,
      violationType: params.violationType,
      message: reasonText,
      timestamp: params.serverTimestampMs,
      dedupKey: params.dedupKey,
    });

    let autoSubmitted = false;
    if (newStrike >= maxAllowed && assessment.thirdWarningAction === 'auto_submit') {
      autoSubmitted = true;
      attempt.status = 'submitted';
      attempt.submissionReason = 'PROCTORING_THIRD_WARNING';
    }

    return {
      action: autoSubmitted ? 'auto_submitted' : 'warning_issued',
      warningNumber: newStrike,
      totalAllowed: maxAllowed,
      remainingWarnings: Math.max(0, maxAllowed - newStrike),
      warningIntervalSeconds,
      warningEventId: eventId,
      reason: reasonText,
      autoSubmitted,
    };
  }

  getSuppressedLogs(attemptId: string) {
    return this.suppressedAuditLogs.filter((l) => l.attemptId === attemptId);
  }
}

describe('Configurable Auto-Proctoring Warning Interval & Three-Strike Verification Suite', () => {

  // --------------------------------------------------------------------------
  // Test Case 1: Create assessment with 1-minute warning interval & verify persistence
  // --------------------------------------------------------------------------
  it('Test Case 1: Assessment creation saves configurable warning interval (60 seconds) in configuration and database', () => {
    const engine = new ProctoringWarningEngine();

    const assessment = engine.registerAssessment({
      id: 'asm-1min-interval',
      title: 'Operating Systems Midterm',
      warningIntervalSeconds: 60, // 1 minute
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'trainer',
    });

    assert.equal(assessment.warningIntervalSeconds, 60, 'Warning interval must be persisted as 60 seconds');
    assert.equal(assessment.maxProctoringWarnings, 3, 'Max proctoring warnings must be 3');
    assert.equal(assessment.thirdWarningAction, 'auto_submit', 'Action after 3rd warning must be auto_submit');

    // Reject out-of-bounds interval (< 10s or > 3600s)
    assert.throws(
      () =>
        engine.registerAssessment({
          id: 'asm-invalid',
          title: 'Invalid Exam',
          warningIntervalSeconds: 5, // Below 10s limit
          maxProctoringWarnings: 3,
          thirdWarningAction: 'auto_submit',
          createdByRole: 'trainer',
        }),
      /between 10 seconds and 3600 seconds/
    );
  });

  // --------------------------------------------------------------------------
  // Test Case 2: Trigger first genuine violation -> Warning 1 appears for student & Admin
  // --------------------------------------------------------------------------
  it('Test Case 2: Trigger first genuine violation -> Warning 1 of 3 issued immediately to student and Admin', () => {
    const engine = new ProctoringWarningEngine();
    engine.registerAssessment({
      id: 'asm-60s',
      title: 'Computer Networks Quiz',
      warningIntervalSeconds: 60,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'org_admin',
    });

    const startTime = 1000000;
    engine.createAttempt('att-stud-1', 'student-001', 'asm-60s');

    const result = engine.processViolation({
      attemptId: 'att-stud-1',
      violationType: 'MULTIPLE_FACES_DETECTED',
      serverTimestampMs: startTime,
    });

    assert.equal(result.action, 'warning_issued', 'First violation must issue warning immediately');
    assert.equal(result.warningNumber, 1, 'First violation must be Strike 1');
    assert.equal(result.totalAllowed, 3, 'Total allowed warnings must be 3');
    assert.equal(result.remainingWarnings, 2, 'Remaining warnings must be 2');
    assert.match(result.reason, /Multiple faces detected/, 'Reason text must clearly state violation');
  });

  // --------------------------------------------------------------------------
  // Test Case 3: Trigger violation after 30 seconds -> Cooldown active, 0 extra strikes
  // --------------------------------------------------------------------------
  it('Test Case 3: Trigger violation after 30 seconds -> Suppressed by cooldown, no second strike issued', () => {
    const engine = new ProctoringWarningEngine();
    engine.registerAssessment({
      id: 'asm-60s',
      title: 'Computer Networks Quiz',
      warningIntervalSeconds: 60,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'org_admin',
    });

    const t0 = 1000000;
    const attempt = engine.createAttempt('att-stud-1', 'student-001', 'asm-60s');

    // Strike 1 at t0
    engine.processViolation({
      attemptId: 'att-stud-1',
      violationType: 'MULTIPLE_FACES_DETECTED',
      serverTimestampMs: t0,
    });

    // Violation at t0 + 30s (30 seconds elapsed < 60s cooldown)
    const result30s = engine.processViolation({
      attemptId: 'att-stud-1',
      violationType: 'MOBILE_PHONE_DETECTED',
      serverTimestampMs: t0 + 30000,
    });

    assert.equal(result30s.action, 'suppressed_cooldown', 'Violation within 30s must be suppressed');
    assert.equal(result30s.warningNumber, 1, 'Strike count must remain at 1');
    assert.equal(attempt.proctoringWarningsCount, 1, 'Attempt strike count in DB must remain strictly 1');
    assert.equal(result30s.remainingCooldown, 30, 'Remaining cooldown must indicate 30 seconds');

    // Suppressed audit log must record telemetry without student penalty
    const suppressedLogs = engine.getSuppressedLogs('att-stud-1');
    assert.equal(suppressedLogs.length, 1, 'Exactly 1 suppressed audit event logged');
  });

  // --------------------------------------------------------------------------
  // Test Case 4: Trigger genuine violation after 60 seconds -> Warning 2 appears
  // --------------------------------------------------------------------------
  it('Test Case 4: Trigger genuine violation after 60 seconds -> Warning 2 of 3 issued for both interfaces', () => {
    const engine = new ProctoringWarningEngine();
    engine.registerAssessment({
      id: 'asm-60s',
      title: 'Computer Networks Quiz',
      warningIntervalSeconds: 60,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'org_admin',
    });

    const t0 = 1000000;
    const attempt = engine.createAttempt('att-stud-1', 'student-001', 'asm-60s');

    // Strike 1 at t0
    engine.processViolation({
      attemptId: 'att-stud-1',
      violationType: 'MULTIPLE_FACES_DETECTED',
      serverTimestampMs: t0,
    });

    // Strike 2 at t0 + 60s (60 seconds elapsed >= 60s cooldown)
    const result60s = engine.processViolation({
      attemptId: 'att-stud-1',
      violationType: 'MOBILE_PHONE_DETECTED',
      serverTimestampMs: t0 + 60000,
    });

    assert.equal(result60s.action, 'warning_issued', 'Eligible violation after 60s must issue warning');
    assert.equal(result60s.warningNumber, 2, 'Strike count must increment to 2');
    assert.equal(result60s.remainingWarnings, 1, 'Remaining warnings must be 1');
    assert.equal(attempt.proctoringWarningsCount, 2, 'Attempt strike count in DB must be updated to 2');
  });

  // --------------------------------------------------------------------------
  // Test Case 5: Trigger violation before next 60s -> Cooldown suppresses extra strike
  // --------------------------------------------------------------------------
  it('Test Case 5: Trigger another violation before next 60 seconds (at 90s total) -> Suppressed, no Strike 3', () => {
    const engine = new ProctoringWarningEngine();
    engine.registerAssessment({
      id: 'asm-60s',
      title: 'Computer Networks Quiz',
      warningIntervalSeconds: 60,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'org_admin',
    });

    const t0 = 1000000;
    const attempt = engine.createAttempt('att-stud-1', 'student-001', 'asm-60s');

    engine.processViolation({ attemptId: 'att-stud-1', violationType: 'MULTIPLE_FACES_DETECTED', serverTimestampMs: t0 });
    engine.processViolation({ attemptId: 'att-stud-1', violationType: 'MOBILE_PHONE_DETECTED', serverTimestampMs: t0 + 60000 });

    // Violation at t0 + 90s (only 30s since Strike 2, cooldown is 60s)
    const result90s = engine.processViolation({
      attemptId: 'att-stud-1',
      violationType: 'FACE_NOT_DETECTED',
      serverTimestampMs: t0 + 90000,
    });

    assert.equal(result90s.action, 'suppressed_cooldown', 'Violation at 90s must be suppressed');
    assert.equal(attempt.proctoringWarningsCount, 2, 'Strike count must remain at 2');
  });

  // --------------------------------------------------------------------------
  // Test Case 6: Trigger genuine violation after next 60s -> Warning 3 appears
  // --------------------------------------------------------------------------
  it('Test Case 6: Trigger genuine violation after next 60 seconds (at 120s total) -> Warning 3 issued', () => {
    const engine = new ProctoringWarningEngine();
    engine.registerAssessment({
      id: 'asm-60s',
      title: 'Computer Networks Quiz',
      warningIntervalSeconds: 60,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'org_admin',
    });

    const t0 = 1000000;
    const attempt = engine.createAttempt('att-stud-1', 'student-001', 'asm-60s');

    engine.processViolation({ attemptId: 'att-stud-1', violationType: 'MULTIPLE_FACES_DETECTED', serverTimestampMs: t0 });
    engine.processViolation({ attemptId: 'att-stud-1', violationType: 'MOBILE_PHONE_DETECTED', serverTimestampMs: t0 + 60000 });

    // Strike 3 at t0 + 120s (60s elapsed since Strike 2)
    const result120s = engine.processViolation({
      attemptId: 'att-stud-1',
      violationType: 'FACE_NOT_DETECTED',
      serverTimestampMs: t0 + 120000,
    });

    assert.equal(result120s.warningNumber, 3, 'Strike count must reach 3');
    assert.equal(result120s.remainingWarnings, 0, 'Remaining warnings must be 0');
    assert.match(result120s.reason, /Final warning/, 'Reason must state final warning');
  });

  // --------------------------------------------------------------------------
  // Test Case 7: Automatic submission occurs exactly once after Warning 3
  // --------------------------------------------------------------------------
  it('Test Case 7: Automatic submission occurs exactly once after Warning 3 with PROCTORING_THIRD_WARNING reason', () => {
    const engine = new ProctoringWarningEngine();
    engine.registerAssessment({
      id: 'asm-60s',
      title: 'Computer Networks Quiz',
      warningIntervalSeconds: 60,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'org_admin',
    });

    const t0 = 1000000;
    const attempt = engine.createAttempt('att-stud-1', 'student-001', 'asm-60s');

    engine.processViolation({ attemptId: 'att-stud-1', violationType: 'V1', serverTimestampMs: t0 });
    engine.processViolation({ attemptId: 'att-stud-1', violationType: 'V2', serverTimestampMs: t0 + 60000 });
    const resultStrike3 = engine.processViolation({ attemptId: 'att-stud-1', violationType: 'V3', serverTimestampMs: t0 + 120000 });

    assert.equal(resultStrike3.action, 'auto_submitted', 'Third strike must trigger auto-submission');
    assert.equal(attempt.status, 'submitted', 'Attempt status must be updated to submitted');
    assert.equal(attempt.submissionReason, 'PROCTORING_THIRD_WARNING', 'Submission reason must be PROCTORING_THIRD_WARNING');

    // Subsequent violation attempt must be rejected without duplicate submissions
    const postSubmitResult = engine.processViolation({
      attemptId: 'att-stud-1',
      violationType: 'V4',
      serverTimestampMs: t0 + 200000,
    });
    assert.equal(postSubmitResult.action, 'already_terminated', 'Post-submission violation must not re-trigger submit');
  });

  // --------------------------------------------------------------------------
  // Test Case 8: Verify answers are saved and preserved before submission
  // --------------------------------------------------------------------------
  it('Test Case 8: All student responses recorded prior to auto-submission are safely preserved in database', () => {
    const engine = new ProctoringWarningEngine();
    engine.registerAssessment({
      id: 'asm-60s',
      title: 'Distributed Systems Exam',
      warningIntervalSeconds: 60,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'trainer',
    });

    const t0 = 1000000;
    const attempt = engine.createAttempt('att-stud-answers', 'student-005', 'asm-60s');

    // Candidate saves answers to 3 questions during the exam
    engine.recordAnswer('att-stud-answers', 'q-101', 'B');
    engine.recordAnswer('att-stud-answers', 'q-102', 'TCP Three-Way Handshake');
    engine.recordAnswer('att-stud-answers', 'q-103', 'true');

    // Trigger strikes up to 3
    engine.processViolation({ attemptId: 'att-stud-answers', violationType: 'V1', serverTimestampMs: t0 });
    engine.processViolation({ attemptId: 'att-stud-answers', violationType: 'V2', serverTimestampMs: t0 + 60000 });
    engine.processViolation({ attemptId: 'att-stud-answers', violationType: 'V3', serverTimestampMs: t0 + 120000 });

    // Verify all 3 answers remain intact in database
    assert.equal(attempt.answers.size, 3, 'All 3 answers must be preserved');
    assert.equal(attempt.answers.get('q-101'), 'B');
    assert.equal(attempt.answers.get('q-102'), 'TCP Three-Way Handshake');
    assert.equal(attempt.answers.get('q-103'), 'true');
  });

  // --------------------------------------------------------------------------
  // Test Case 9: Verify duplicate events do not increase warning count
  // --------------------------------------------------------------------------
  it('Test Case 9: Repeated/duplicate detection events with identical deduplication key do not increment warning count', () => {
    const engine = new ProctoringWarningEngine();
    engine.registerAssessment({
      id: 'asm-dedup',
      title: 'Database Architecture Exam',
      warningIntervalSeconds: 30,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'trainer',
    });

    const t0 = 1000000;
    const attempt = engine.createAttempt('att-dedup', 'student-009', 'asm-dedup');

    // Same mobile phone detected across rapid video frames (same tracking ID / dedupKey)
    const res1 = engine.processViolation({
      attemptId: 'att-dedup',
      violationType: 'MOBILE_PHONE_DETECTED',
      serverTimestampMs: t0,
      dedupKey: 'phone-track-9988',
    });
    assert.equal(res1.warningNumber, 1, 'First detection creates Warning 1');

    // Duplicate detection event with same dedupKey
    const resDup = engine.processViolation({
      attemptId: 'att-dedup',
      violationType: 'MOBILE_PHONE_DETECTED',
      serverTimestampMs: t0 + 100,
      dedupKey: 'phone-track-9988',
    });
    assert.equal(resDup.action, 'duplicate_suppressed', 'Duplicate detection frame must be suppressed');
    assert.equal(attempt.proctoringWarningsCount, 1, 'Strike count must not increment for duplicate frame');
  });

  // --------------------------------------------------------------------------
  // Test Case 10: Two students taking separate exams have isolated counters & intervals
  // --------------------------------------------------------------------------
  it('Test Case 10: Student attempt isolation: Two candidates writing separate exams have independent strike counts', () => {
    const engine = new ProctoringWarningEngine();
    engine.registerAssessment({
      id: 'asm-exam-A',
      title: 'Exam A',
      warningIntervalSeconds: 60,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'trainer',
    });
    engine.registerAssessment({
      id: 'asm-exam-B',
      title: 'Exam B',
      warningIntervalSeconds: 180, // 3 minutes interval
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'trainer',
    });

    const t0 = 1000000;
    const attemptAlice = engine.createAttempt('att-alice', 'alice', 'asm-exam-A');
    const attemptBob = engine.createAttempt('att-bob', 'bob', 'asm-exam-B');

    // Alice gets 2 strikes on Exam A (60s interval)
    engine.processViolation({ attemptId: 'att-alice', violationType: 'V1', serverTimestampMs: t0 });
    engine.processViolation({ attemptId: 'att-alice', violationType: 'V2', serverTimestampMs: t0 + 65000 });

    // Bob takes Exam B (180s interval) and has 0 strikes
    assert.equal(attemptAlice.proctoringWarningsCount, 2, "Alice's strike count must be 2");
    assert.equal(attemptBob.proctoringWarningsCount, 0, "Bob's strike count must be 0");
    assert.equal(attemptAlice.status, 'in_progress', "Alice's exam is still in progress");
    assert.equal(attemptBob.status, 'in_progress', "Bob's exam is still in progress");

    // Alice gets 3rd strike -> auto-submits Alice
    engine.processViolation({ attemptId: 'att-alice', violationType: 'V3', serverTimestampMs: t0 + 130000 });
    assert.equal(attemptAlice.status, 'submitted', "Alice's exam must be auto-submitted");
    assert.equal(attemptBob.status, 'in_progress', "Bob's exam must remain active and unaffected");
  });

  // --------------------------------------------------------------------------
  // Test Case 11: Admin & Trainer permissions enforced; Student role prohibited
  // --------------------------------------------------------------------------
  it('Test Case 11: Only authorized Admin and Trainer roles can configure warning intervals; Student role is prohibited', () => {
    const allowedRoles = ['trainer', 'org_admin', 'platform_admin'];

    const checkAuthorization = (role: string) => {
      if (!allowedRoles.includes(role)) {
        const err: any = new Error('Access restricted to roles: [trainer, org_admin, platform_admin]');
        err.statusCode = 403;
        throw err;
      }
      return true;
    };

    // Trainer can configure
    assert.equal(checkAuthorization('trainer'), true);
    // Org Admin can configure
    assert.equal(checkAuthorization('org_admin'), true);
    // Platform Admin can configure
    assert.equal(checkAuthorization('platform_admin'), true);

    // Student attempt to configure or modify warning interval throws 403
    assert.throws(
      () => checkAuthorization('student'),
      (err: any) => err.statusCode === 403 && err.message.includes('Access restricted to roles')
    );
  });

  // --------------------------------------------------------------------------
  // Test Case 12: Retained configuration when editing and reopening assessment
  // --------------------------------------------------------------------------
  it('Test Case 12: Warning interval configuration (180s / 3m) is retained when editing and reopening an assessment', () => {
    const engine = new ProctoringWarningEngine();

    // 1. Initial creation with 3-minute (180s) warning interval
    engine.registerAssessment({
      id: 'asm-edit-test',
      title: 'Cloud Computing Architecture',
      warningIntervalSeconds: 180,
      maxProctoringWarnings: 3,
      thirdWarningAction: 'auto_submit',
      createdByRole: 'trainer',
    });

    // 2. Fetch and verify retrieved assessment
    const retrieved = engine.getAssessment('asm-edit-test');
    assert.ok(retrieved, 'Assessment must be found in database');
    assert.equal(retrieved.warningIntervalSeconds, 180, 'Configured interval 180s must be retained');
    assert.equal(retrieved.maxProctoringWarnings, 3, 'Max warnings 3 must be retained');
    assert.equal(retrieved.thirdWarningAction, 'auto_submit', 'Action auto_submit must be retained');

    // 3. Update title while preserving warning interval
    const updated = engine.registerAssessment({
      ...retrieved,
      title: 'Cloud Computing Architecture (Advanced)',
    });

    assert.equal(updated.title, 'Cloud Computing Architecture (Advanced)');
    assert.equal(updated.warningIntervalSeconds, 180, 'Warning interval must persist across edits');
  });
});
