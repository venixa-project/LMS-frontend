import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { proctoringSuites, PROCTORING_MODEL_SUITES } from '../lib/proctoringSuites.ts';

describe('AI Proctoring Architecture: Dual Model Suites (Recommended vs Alternative)', () => {
  beforeEach(() => {
    proctoringSuites.setActiveSuite('recommended');
  });

  describe('1. Model Suite Architectural Mapping Specifications', () => {
    it('accurately maps Recommended Model Suite components to specification table', () => {
      const rec = PROCTORING_MODEL_SUITES.recommended;
      assert.strictEqual(rec.faceDetection, 'YuNet');
      assert.strictEqual(rec.faceRecognition, 'AdaFace');
      assert.strictEqual(rec.faceAlignment, '5-point landmarks');
      assert.strictEqual(rec.faceTracking, 'ByteTrack');
      assert.strictEqual(rec.faceLiveness, 'MiniFASNet');
      assert.strictEqual(rec.headPose, 'MediaPipe Face Landmarker');
      assert.strictEqual(rec.objectDetection, 'YOLO');
      assert.strictEqual(rec.inferenceEngine, 'ONNX Runtime');
    });

    it('accurately maps Alternative Model Suite components to specification table', () => {
      const alt = PROCTORING_MODEL_SUITES.alternative;
      assert.strictEqual(alt.faceDetection, 'SCRFD');
      assert.strictEqual(alt.faceRecognition, 'ArcFace');
      assert.strictEqual(alt.faceAlignment, 'RetinaFace landmarks');
      assert.strictEqual(alt.faceTracking, 'SORT');
      assert.ok(alt.faceLiveness.includes('Anti-Spoof') || alt.faceLiveness.includes('Fourier'));
      assert.strictEqual(alt.headPose, '6DRepNet');
      assert.strictEqual(alt.objectDetection, 'RT-DETR');
      assert.strictEqual(alt.inferenceEngine, 'OpenVINO');
    });

    it('manages active suite state transitions correctly', () => {
      assert.strictEqual(proctoringSuites.getActiveSuite(), 'recommended');
      proctoringSuites.setActiveSuite('alternative');
      assert.strictEqual(proctoringSuites.getActiveSuite(), 'alternative');
      assert.strictEqual(proctoringSuites.getSuiteMetadata().inferenceEngine, 'OpenVINO');
    });
  });

  describe('2. Recommended Suite Pipeline (YuNet + AdaFace + ByteTrack + MiniFASNet + MediaPipe + YOLO + ONNX)', () => {
    it('processes normal candidate frame with verified identity and focused head pose', async () => {
      const result = await proctoringSuites.analyzeRecommended({
        sessionId: 'rec-test-01',
        detectedFaces: [
          { box: { x: 100, y: 100, width: 200, height: 200 }, confidence: 0.95 }
        ],
        rawLandmarks: [
          { x: 150, y: 150 }, // left eye
          { x: 250, y: 150 }, // right eye
          { x: 200, y: 200 }, // nose
          { x: 160, y: 260 }, // left mouth
          { x: 240, y: 260 }, // right mouth
        ],
      });

      assert.strictEqual(result.pipeline, 'recommended');
      assert.strictEqual(result.runtime, 'ONNX_Runtime');
      assert.strictEqual(result.telemetry.faceCount, 1);
      assert.strictEqual(result.telemetry.isPrimaryFacePresent, true);
      assert.strictEqual(result.telemetry.isIdentityVerified, true);
      assert.strictEqual(result.telemetry.isLivenessConfirmed, true);
      assert.strictEqual(result.telemetry.isLookingAtScreen, true);
      assert.strictEqual(result.faces[0].trackingId, 'byte-1');
      assert.strictEqual(result.faces[0].recognition.model, 'AdaFace');
      assert.strictEqual(result.faces[0].liveness.model, 'MiniFASNet');
      assert.strictEqual(result.violations.length, 0);
    });

    it('flags mobile device detection using YOLO object detection', async () => {
      const result = await proctoringSuites.analyzeRecommended({
        sessionId: 'rec-test-phone',
        detectedFaces: [{ box: { x: 100, y: 100, width: 200, height: 200 }, confidence: 0.95 }],
        detectedObjects: [
          { box: { x: 300, y: 300, width: 100, height: 180 }, confidence: 0.88, classId: 67, className: 'cell phone' }
        ],
      });

      assert.strictEqual(result.telemetry.prohibitedDeviceCount, 1);
      assert.strictEqual(result.objects.length, 1);
      assert.strictEqual(result.objects[0].className, 'cell phone');
    });

    it('flags face absence when no candidate face is detected', async () => {
      const result = await proctoringSuites.analyzeRecommended({
        sessionId: 'rec-test-empty',
        detectedFaces: [],
      });

      assert.strictEqual(result.telemetry.faceCount, 0);
      assert.strictEqual(result.telemetry.isPrimaryFacePresent, false);
      const noFaceViolation = result.violations.find((v) => v.type === 'NO_FACE');
      assert.ok(noFaceViolation);
    });
  });

  describe('3. Alternative Suite Pipeline (SCRFD + ArcFace + SORT + AntiSpoof + 6DRepNet + RT-DETR + OpenVINO)', () => {
    it('processes candidate frame using OpenVINO runtime and SORT tracking ID convention', async () => {
      const result = await proctoringSuites.analyzeAlternative({
        sessionId: 'alt-test-01',
        detectedFaces: [
          { box: { x: 120, y: 120, width: 180, height: 220 }, confidence: 0.94 }
        ],
        rawLandmarks: [
          { x: 150, y: 150 },
          { x: 250, y: 150 },
          { x: 200, y: 200 },
        ],
      });

      assert.strictEqual(result.pipeline, 'alternative');
      assert.strictEqual(result.runtime, 'OpenVINO');
      assert.strictEqual(result.telemetry.faceCount, 1);
      assert.strictEqual(result.faces[0].trackingId, 'sort-1');
      assert.strictEqual(result.faces[0].recognition.model, 'ArcFace');
      assert.ok(result.faces[0].liveness.model.includes('Fourier') || result.faces[0].liveness.model.includes('PAD'));
    });

    it('detects head turned away (gaze deviation) using 6D pose estimation', async () => {
      const result = await proctoringSuites.analyzeAlternative({
        sessionId: 'alt-test-pose',
        detectedFaces: [{ box: { x: 100, y: 100, width: 200, height: 200 }, confidence: 0.92 }],
        rawLandmarks: [
          { x: 100, y: 150 }, // left eye shifted
          { x: 180, y: 150 }, // right eye shifted
          { x: 230, y: 200 }, // nose shifted far right
        ],
      });

      assert.strictEqual(result.faces[0].headPose.status, 'looking_right');
      const gazeViolation = result.violations.find((v) => v.type === 'GAZE_AWAY');
      assert.ok(gazeViolation);
      assert.ok(gazeViolation.message.includes('6DRepNet'));
    });

    it('detects multiple persons in camera view', async () => {
      const result = await proctoringSuites.analyzeAlternative({
        sessionId: 'alt-test-multiface',
        detectedFaces: [
          { box: { x: 100, y: 100, width: 150, height: 180 }, confidence: 0.94 },
          { box: { x: 320, y: 100, width: 150, height: 180 }, confidence: 0.91 },
        ],
      });

      assert.strictEqual(result.telemetry.faceCount, 2);
      const multiViolation = result.violations.find((v) => v.type === 'MULTIPLE_FACES');
      assert.ok(multiViolation);
    });
  });

  describe('4. Active Suite Dispatcher & Standby Architecture', () => {
    it('dispatches to Recommended as 1st line primary suite by default', async () => {
      proctoringSuites.restorePrimarySuite();
      const res = await proctoringSuites.analyzeActiveFrame({ sessionId: 'dispatch-rec' });
      assert.strictEqual(res.pipeline, 'recommended');
      assert.strictEqual(res.runtime, 'ONNX_Runtime');
      const status = proctoringSuites.getFailoverStatus();
      assert.strictEqual(status.primarySuite, 'recommended');
      assert.strictEqual(status.standbySuite, 'alternative');
      assert.strictEqual(status.isFailoverActive, false);
    });

    it('keeps Alternative Model Suite on standby and allows manual failover switch', async () => {
      proctoringSuites.triggerManualFailover('Simulated manual proctor failover test');
      const status = proctoringSuites.getFailoverStatus();
      assert.strictEqual(status.isFailoverActive, true);
      assert.strictEqual(status.activeSuite, 'alternative');
      assert.strictEqual(status.lastFailoverReason, 'Simulated manual proctor failover test');

      const res = await proctoringSuites.analyzeActiveFrame({ sessionId: 'dispatch-alt' });
      assert.strictEqual(res.pipeline, 'alternative');
      assert.strictEqual(res.runtime, 'OpenVINO');
    });

    it('restores back to Primary Recommended Suite seamlessly', async () => {
      proctoringSuites.restorePrimarySuite();
      const status = proctoringSuites.getFailoverStatus();
      assert.strictEqual(status.isFailoverActive, false);
      assert.strictEqual(status.activeSuite, 'recommended');

      const res = await proctoringSuites.analyzeActiveFrame({ sessionId: 'restore-rec' });
      assert.strictEqual(res.pipeline, 'recommended');
      assert.strictEqual(res.runtime, 'ONNX_Runtime');
    });
  });
});
