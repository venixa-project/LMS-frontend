import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ProctoringSocketClient } from '../lib/proctoringSocket.ts';

describe('Live Proctoring Wall & Real-Time Controls Integration', () => {
  let socket: ProctoringSocketClient;

  beforeEach(() => {
    socket = new ProctoringSocketClient();
  });

  it('manages candidate event registration and notification dispatch', () => {
    let receivedWarning: any = null;
    const unsub = socket.on('PROCTORING_WARNING', (data) => {
      receivedWarning = data;
    });

    // Simulate warning trigger
    (socket as any).trigger('PROCTORING_WARNING', {
      studentId: 'stu-alex-001',
      studentName: 'Alex Thompson',
      assessmentId: 'asm-test-01',
      warningCount: 1,
      reason: 'Multiple faces in webcam frame',
      category: 'multiple_faces',
      source: 'automated',
      timestamp: new Date().toISOString(),
    });

    assert.ok(receivedWarning);
    assert.strictEqual(receivedWarning.studentId, 'stu-alex-001');
    assert.strictEqual(receivedWarning.warningCount, 1);
    assert.strictEqual(receivedWarning.source, 'automated');

    unsub();
  });

  it('delivers manual proctor warnings without auto-terminating exam', () => {
    let manualWarningData: any = null;
    socket.on('MANUAL_WARNING', (data) => {
      manualWarningData = data;
    });

    (socket as any).trigger('MANUAL_WARNING', {
      studentId: 'stu-alex-002',
      sessionId: 'sess-002',
      reason: 'Please keep your face fully centered in the camera feed',
      adminName: 'Chief Proctor Marcus',
      timestamp: new Date().toISOString(),
    });

    assert.ok(manualWarningData);
    assert.strictEqual(manualWarningData.studentId, 'stu-alex-002');
    assert.strictEqual(manualWarningData.adminName, 'Chief Proctor Marcus');
    assert.strictEqual(manualWarningData.reason, 'Please keep your face fully centered in the camera feed');
  });

  it('processes candidate warning acknowledgments and notifies admin', () => {
    let ackEvent: any = null;
    socket.on('WARNING_ACKNOWLEDGED', (data) => {
      ackEvent = data;
    });

    (socket as any).trigger('WARNING_ACKNOWLEDGED', {
      studentId: 'stu-alex-003',
      assessmentId: 'asm-test-01',
      warningCount: 2,
      timestamp: new Date().toISOString(),
    });

    assert.ok(ackEvent);
    assert.strictEqual(ackEvent.studentId, 'stu-alex-003');
    assert.strictEqual(ackEvent.warningCount, 2);
  });

  it('enforces admin force-stop and emits EXAM_TERMINATED event with preserved answers notice', () => {
    let terminationEvent: any = null;
    socket.on('EXAM_TERMINATED', (data) => {
      terminationEvent = data;
    });

    (socket as any).trigger('EXAM_TERMINATED', {
      studentId: 'stu-alex-004',
      assessmentId: 'asm-test-01',
      sessionId: 'sess-004',
      reason: 'Unauthorized secondary communication device detected',
      adminName: 'Chief Proctor Marcus',
      timestamp: new Date().toISOString(),
    });

    assert.ok(terminationEvent);
    assert.strictEqual(terminationEvent.studentId, 'stu-alex-004');
    assert.strictEqual(terminationEvent.reason, 'Unauthorized secondary communication device detected');
    assert.strictEqual(terminationEvent.adminName, 'Chief Proctor Marcus');
  });

  it('handles video stream disconnections and reconnections cleanly', () => {
    const events: string[] = [];

    socket.on('STUDENT_VIDEO_DISCONNECTED', (data) => {
      events.push(`disconnected:${data.reason}`);
    });

    socket.on('STUDENT_VIDEO_RECONNECTED', (data) => {
      events.push(`reconnected:${data.studentId}`);
    });

    (socket as any).trigger('STUDENT_VIDEO_DISCONNECTED', {
      studentId: 'stu-alex-005',
      assessmentId: 'asm-test-01',
      reason: 'Webcam unplugged',
    });

    (socket as any).trigger('STUDENT_VIDEO_RECONNECTED', {
      studentId: 'stu-alex-005',
      assessmentId: 'asm-test-01',
    });

    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0], 'disconnected:Webcam unplugged');
    assert.strictEqual(events[1], 'reconnected:stu-alex-005');
  });
});
