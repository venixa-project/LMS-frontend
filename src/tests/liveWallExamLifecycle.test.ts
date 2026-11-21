import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ProctoringSocketClient } from '../lib/proctoringSocket.ts';

export interface ExamLifecycleToastData {
  id: string;
  type: 'start' | 'end';
  studentId: string;
  studentName: string;
  rollNo?: string;
  assessmentTitle?: string;
  assessmentId?: string;
  timestamp: string;
  reason?: string;
}

export interface ProctorParticipant {
  id: string;
  name: string;
  rollNo?: string;
  assessmentId: string;
  status: 'connected' | 'disconnected' | 'submitted' | 'completed' | 'terminated' | 'in_progress';
  cameraActive: boolean;
  micActive?: boolean;
  audioLevel?: number;
  screenShareActive?: boolean;
  tabFocused?: boolean;
  faceDetected?: boolean;
  joinedAt: string;
  lastPingAt: string;
  activeWarningCount?: number;
  sessionId?: string;
}

class LiveWallStateManager {
  participants: ProctorParticipant[] = [];
  sessions: any[] = [];

  upsertLiveCandidate(candidate: Partial<ProctorParticipant> & { id: string; assessmentId: string }) {
    const idx = this.participants.findIndex((p) => p.id === candidate.id && p.assessmentId === candidate.assessmentId);
    const updated: ProctorParticipant = {
      id: candidate.id,
      name: candidate.name || 'Candidate',
      rollNo: candidate.rollNo,
      assessmentId: candidate.assessmentId,
      status: (candidate.status as any) || 'in_progress',
      cameraActive: candidate.cameraActive ?? true,
      micActive: candidate.micActive ?? true,
      audioLevel: candidate.audioLevel ?? 0.1,
      screenShareActive: candidate.screenShareActive ?? false,
      tabFocused: candidate.tabFocused ?? true,
      faceDetected: candidate.faceDetected ?? true,
      joinedAt: candidate.joinedAt || new Date().toISOString(),
      lastPingAt: candidate.lastPingAt || new Date().toISOString(),
      activeWarningCount: candidate.activeWarningCount || 0,
      sessionId: candidate.sessionId,
    };

    if (idx >= 0) {
      this.participants[idx] = { ...this.participants[idx], ...updated };
    } else {
      this.participants.push(updated);
    }
  }

  removeLiveCandidate(studentId: string, assessmentId?: string) {
    this.participants = this.participants.filter((p) => {
      if (p.id === studentId) {
        if (!assessmentId || p.assessmentId === assessmentId) return false;
      }
      return true;
    });
    this.sessions = this.sessions.filter((s) => {
      if (s.learnerId === studentId) {
        if (!assessmentId || s.assessmentId === assessmentId) return false;
      }
      return true;
    });
  }

  getActiveLiveCandidates(assessmentId: string, maxHeartbeatAgeMs = 35000): ProctorParticipant[] {
    const now = Date.now();
    return this.participants.filter((p) => {
      if (p.assessmentId !== assessmentId) return false;
      if (
        p.status === 'submitted' ||
        p.status === 'completed' ||
        p.status === 'terminated' ||
        p.status === 'disconnected'
      ) {
        return false;
      }
      const pingTime = new Date(p.lastPingAt || 0).getTime();
      const isFresh = !isNaN(pingTime) && pingTime > 0 && (now - pingTime) < maxHeartbeatAgeMs;
      return isFresh && (p.status === 'in_progress' || p.status === 'connected');
    });
  }

  reset() {
    this.participants = [];
    this.sessions = [];
  }
}

describe('Live Proctoring Wall Candidate Visibility & Exam Lifecycle Suite', () => {
  let socket: ProctoringSocketClient;
  let wallStore: LiveWallStateManager;

  beforeEach(() => {
    socket = new ProctoringSocketClient();
    wallStore = new LiveWallStateManager();
  });

  it('1. Shows 0 candidates on live wall when no student is currently writing exam', () => {
    const assessmentId = 'asm-lifecycle-001';
    const liveCandidates = wallStore.getActiveLiveCandidates(assessmentId);

    assert.strictEqual(liveCandidates.length, 0, 'Wall must be completely empty when no candidate is writing');
  });

  it('2. Reflects candidate on the live wall when student starts the examination', () => {
    const assessmentId = 'asm-lifecycle-002';
    let startedCandidate: any = null;

    socket.on('STUDENT_EXAM_STARTED', (data) => {
      startedCandidate = data;
      wallStore.upsertLiveCandidate({
        id: data.studentId,
        name: data.studentName,
        rollNo: data.rollNo,
        assessmentId: data.assessmentId,
        sessionId: data.sessionId,
        status: 'in_progress',
        cameraActive: true,
        joinedAt: data.startedAt,
        lastPingAt: data.startedAt,
      });
    });

    // Simulate student clicking "Start Assessment"
    (socket as any).trigger('STUDENT_EXAM_STARTED', {
      studentId: 'stu-maria-001',
      studentName: 'Maria Garcia',
      rollNo: 'STU-2026-003',
      assessmentId,
      sessionId: 'sess-maria-001',
      startedAt: new Date().toISOString(),
    });

    assert.ok(startedCandidate, 'STUDENT_EXAM_STARTED event must be received');
    assert.strictEqual(startedCandidate.studentId, 'stu-maria-001');

    const liveCandidates = wallStore.getActiveLiveCandidates(assessmentId);
    assert.strictEqual(liveCandidates.length, 1, 'Maria Garcia must appear on the live wall');
    assert.strictEqual(liveCandidates[0].name, 'Maria Garcia');
  });

  it('3. Generates bottom-right popup toast when candidate starts exam', () => {
    const toasts: ExamLifecycleToastData[] = [];

    const handleExamStarted = (data: any) => {
      toasts.push({
        id: `toast-${Date.now()}`,
        type: 'start',
        studentId: data.studentId,
        studentName: data.studentName,
        rollNo: data.rollNo,
        assessmentTitle: 'Midterm Examination',
        assessmentId: data.assessmentId,
        timestamp: data.startedAt,
      });
    };

    socket.on('STUDENT_EXAM_STARTED', handleExamStarted);

    (socket as any).trigger('STUDENT_EXAM_STARTED', {
      studentId: 'stu-david-002',
      studentName: 'David Kim',
      rollNo: 'STU-2026-004',
      assessmentId: 'asm-lifecycle-003',
      startedAt: new Date().toISOString(),
    });

    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].type, 'start');
    assert.strictEqual(toasts[0].studentName, 'David Kim');
    assert.strictEqual(toasts[0].studentId, 'stu-david-002');
  });

  it('4. Immediately removes candidate from live wall when exam is submitted', () => {
    const assessmentId = 'asm-lifecycle-004';

    // Maria Garcia starts
    wallStore.upsertLiveCandidate({
      id: 'stu-maria-001',
      name: 'Maria Garcia',
      rollNo: 'STU-2026-003',
      assessmentId,
      status: 'in_progress',
      cameraActive: true,
      lastPingAt: new Date().toISOString(),
    });

    assert.strictEqual(wallStore.getActiveLiveCandidates(assessmentId).length, 1);

    // Maria Garcia submits
    let submissionData: any = null;
    socket.on('STUDENT_EXAM_SUBMITTED', (data) => {
      submissionData = data;
      wallStore.removeLiveCandidate(data.studentId, data.assessmentId);
    });

    (socket as any).trigger('STUDENT_EXAM_SUBMITTED', {
      studentId: 'stu-maria-001',
      studentName: 'Maria Garcia',
      rollNo: 'STU-2026-003',
      assessmentId,
      sessionId: 'sess-maria-001',
      reason: 'Final answers submitted normally',
      submittedAt: new Date().toISOString(),
    });

    assert.ok(submissionData, 'STUDENT_EXAM_SUBMITTED must be received');
    const remainingLive = wallStore.getActiveLiveCandidates(assessmentId);
    assert.strictEqual(remainingLive.length, 0, 'Candidate must NOT be on the live wall after submission');
  });

  it('5. Generates bottom-right popup toast when candidate ends and submits exam', () => {
    const toasts: ExamLifecycleToastData[] = [];

    socket.on('STUDENT_EXAM_SUBMITTED', (data) => {
      toasts.push({
        id: `toast-${Date.now()}`,
        type: 'end',
        studentId: data.studentId,
        studentName: data.studentName,
        rollNo: data.rollNo,
        assessmentTitle: 'Final Certification Exam',
        assessmentId: data.assessmentId,
        timestamp: data.submittedAt,
        reason: data.reason,
      });
    });

    (socket as any).trigger('STUDENT_EXAM_SUBMITTED', {
      studentId: 'stu-aisha-005',
      studentName: 'Aisha Patel',
      rollNo: 'STU-2026-005',
      assessmentId: 'asm-lifecycle-005',
      reason: 'Completed and submitted examination',
      submittedAt: new Date().toISOString(),
    });

    assert.strictEqual(toasts.length, 1);
    assert.strictEqual(toasts[0].type, 'end');
    assert.strictEqual(toasts[0].studentName, 'Aisha Patel');
    assert.strictEqual(toasts[0].reason, 'Completed and submitted examination');
  });

  it('6. Automatically removes candidate from live wall on three-strike auto-submission', () => {
    const assessmentId = 'asm-lifecycle-006';

    wallStore.upsertLiveCandidate({
      id: 'stu-michael-007',
      name: 'Michael Chang',
      assessmentId,
      status: 'in_progress',
      cameraActive: true,
      lastPingAt: new Date().toISOString(),
    });

    socket.on('EXAM_AUTO_SUBMITTED', (data) => {
      wallStore.removeLiveCandidate(data.studentId, data.assessmentId);
    });

    (socket as any).trigger('EXAM_AUTO_SUBMITTED', {
      studentId: 'stu-michael-007',
      assessmentId,
      submittedAt: new Date().toISOString(),
      reason: 'Assessment auto-submitted after 3rd proctoring warning strike.',
    });

    const active = wallStore.getActiveLiveCandidates(assessmentId);
    assert.strictEqual(active.length, 0, 'Auto-submitted candidate must be removed from live wall');
  });

  it('7. Immediately removes candidate from live wall when Admin force-stops examination', () => {
    const assessmentId = 'asm-lifecycle-007';

    wallStore.upsertLiveCandidate({
      id: 'stu-james-011',
      name: 'James Wilson',
      assessmentId,
      status: 'in_progress',
      cameraActive: true,
      lastPingAt: new Date().toISOString(),
    });

    socket.on('EXAM_TERMINATED', (data) => {
      wallStore.removeLiveCandidate(data.studentId, data.assessmentId);
    });

    (socket as any).trigger('EXAM_TERMINATED', {
      studentId: 'stu-james-011',
      assessmentId,
      reason: 'Unauthorized secondary screen detected',
      adminName: 'Chief Invigilator',
      terminatedAt: new Date().toISOString(),
    });

    const active = wallStore.getActiveLiveCandidates(assessmentId);
    assert.strictEqual(active.length, 0, 'Terminated candidate must be removed from live wall');
  });

  it('8. Excludes stale candidates whose heartbeat has stopped (> 35 seconds)', () => {
    const assessmentId = 'asm-lifecycle-008';
    const now = Date.now();

    wallStore.upsertLiveCandidate({
      id: 'stu-stale-001',
      name: 'Stale Student',
      rollNo: 'STU-STALE',
      assessmentId,
      status: 'connected',
      cameraActive: true,
      joinedAt: new Date(now - 600000).toISOString(),
      lastPingAt: new Date(now - 60000).toISOString(), // 60s ago (> 35s)
    });

    const active = wallStore.getActiveLiveCandidates(assessmentId, 35000);
    assert.strictEqual(active.length, 0, 'Stale candidate must NOT appear on the live wall');
  });

  it('9. Handles sequential starts and ends for multiple students cleanly', () => {
    const assessmentId = 'asm-lifecycle-009';
    const toasts: ExamLifecycleToastData[] = [];

    socket.on('STUDENT_EXAM_STARTED', (data) => {
      wallStore.upsertLiveCandidate({
        id: data.studentId,
        name: data.studentName,
        assessmentId: data.assessmentId,
        status: 'in_progress',
        cameraActive: true,
        joinedAt: data.startedAt,
        lastPingAt: data.startedAt,
      });
      toasts.push({
        id: `toast-start-${data.studentId}`,
        type: 'start',
        studentId: data.studentId,
        studentName: data.studentName,
        timestamp: data.startedAt,
      });
    });

    socket.on('STUDENT_EXAM_SUBMITTED', (data) => {
      wallStore.removeLiveCandidate(data.studentId, data.assessmentId);
      toasts.push({
        id: `toast-end-${data.studentId}`,
        type: 'end',
        studentId: data.studentId,
        studentName: data.studentName,
        timestamp: data.submittedAt,
        reason: data.reason,
      });
    });

    // Student A & Student B start
    (socket as any).trigger('STUDENT_EXAM_STARTED', {
      studentId: 'stu-A',
      studentName: 'Alice',
      assessmentId,
      startedAt: new Date().toISOString(),
    });
    (socket as any).trigger('STUDENT_EXAM_STARTED', {
      studentId: 'stu-B',
      studentName: 'Bob',
      assessmentId,
      startedAt: new Date().toISOString(),
    });

    assert.strictEqual(wallStore.getActiveLiveCandidates(assessmentId).length, 2, 'Both Alice and Bob must be on wall');
    assert.strictEqual(toasts.length, 2);

    // Student A submits
    (socket as any).trigger('STUDENT_EXAM_SUBMITTED', {
      studentId: 'stu-A',
      studentName: 'Alice',
      assessmentId,
      submittedAt: new Date().toISOString(),
      reason: 'Exam completed',
    });

    let activeList = wallStore.getActiveLiveCandidates(assessmentId);
    assert.strictEqual(activeList.length, 1, 'Only Bob should remain on wall');
    assert.strictEqual(activeList[0].id, 'stu-B');

    // Student B submits
    (socket as any).trigger('STUDENT_EXAM_SUBMITTED', {
      studentId: 'stu-B',
      studentName: 'Bob',
      assessmentId,
      submittedAt: new Date().toISOString(),
      reason: 'Exam completed',
    });

    activeList = wallStore.getActiveLiveCandidates(assessmentId);
    assert.strictEqual(activeList.length, 0, 'Wall must be empty after all students submit');
    assert.strictEqual(toasts.length, 4);
    assert.strictEqual(toasts[3].type, 'end');
    assert.strictEqual(toasts[3].studentName, 'Bob');
  });
});
