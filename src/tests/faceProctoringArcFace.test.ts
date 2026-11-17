import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { YOLOMobileDetector } from '../lib/yoloDetector.ts';
import type { YOLODetectionResult } from '../lib/yoloDetector.ts';
import { ByteObjectTracker } from '../lib/objectTracker.ts';
import { ArcFaceRecognizer } from '../lib/arcFaceRecognizer.ts';
import { AIEventEngine } from '../lib/aiEventEngine.ts';
import type { ProctoringAIEvent } from '../lib/aiEventEngine.ts';

describe('Advanced Face Proctoring: YOLO Face Detection, ByteTrack & ArcFace AI Event Engine', () => {
  let detector: YOLOMobileDetector;
  let tracker: ByteObjectTracker;
  let arcFace: ArcFaceRecognizer;
  let engine: AIEventEngine;

  const sessionContext = {
    sessionId: 'sess-arcface-001',
    learnerId: 'u-007',
    learnerName: 'Alex Thompson',
    tenantId: 'tenant-demo',
    trackFaceAbsence: true,
  };

  beforeEach(() => {
    detector = new YOLOMobileDetector({ confidenceThreshold: 0.50, iouThreshold: 0.45 });
    tracker = new ByteObjectTracker({
      iouThreshold: 0.3,
      maxMissedFrames: 3,
      minHitsToConfirm: 2,
    });
    arcFace = new ArcFaceRecognizer({
      matchThreshold: 0.65,
      mismatchThreshold: 0.45,
      minFaceResolution: 40,
      embeddingDimension: 512,
    });
    engine = new AIEventEngine({
      minConsecutiveFrames: 2,
      confidenceThreshold: 0.50,
      cooldownPeriodMs: 15000,
      faceAbsenceThresholdMs: 5000,
      enableFaceAbsenceMonitoring: true,
    });
  });

  describe('1. YOLO Multi-Class Detection: Faces & Mobile Phones', () => {
    it('initializes and provides class-separated helper filters', async () => {
      const ok = await detector.initialize();
      assert.strictEqual(ok, true);
      assert.strictEqual(detector.getStatus(), 'ready');

      // Uninitialized / empty source handling
      const emptyFaces = await detector.detectFaces(null as any);
      assert.deepStrictEqual(emptyFaces, []);

      const emptyPhones = await detector.detectPhones(null as any);
      assert.deepStrictEqual(emptyPhones, []);
    });

    it('simultaneously outputs face (class 0) and cell phone (class 67) detections', () => {
      const multiClassDetections: YOLODetectionResult[] = [
        {
          classId: 0,
          className: 'face',
          confidence: 0.94,
          box: { x: 120, y: 80, width: 80, height: 110 },
          normalizedBox: { x: 0.187, y: 0.166, width: 0.125, height: 0.229 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 67,
          className: 'cell phone',
          confidence: 0.88,
          box: { x: 40, y: 150, width: 60, height: 100 },
          normalizedBox: { x: 0.062, y: 0.312, width: 0.093, height: 0.208 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
      ];

      const tracks = tracker.update(multiClassDetections, 1000);
      assert.strictEqual(tracks.length, 2);

      const faceTrack = tracks.find(t => t.classId === 0);
      const phoneTrack = tracks.find(t => t.classId === 67);

      assert.ok(faceTrack, 'Face track must exist');
      assert.ok(phoneTrack, 'Phone track must exist');
      assert.strictEqual(faceTrack.trackingId, 'face-1');
      assert.strictEqual(phoneTrack.trackingId, 'trk-1');
    });

    it('detects multiple faces simultaneously (candidate + intruder)', () => {
      const twoFaces: YOLODetectionResult[] = [
        {
          classId: 0,
          className: 'face',
          confidence: 0.95,
          box: { x: 100, y: 70, width: 85, height: 120 },
          normalizedBox: { x: 0.156, y: 0.145, width: 0.132, height: 0.25 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 0,
          className: 'face',
          confidence: 0.89,
          box: { x: 380, y: 80, width: 80, height: 115 },
          normalizedBox: { x: 0.593, y: 0.166, width: 0.125, height: 0.239 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
      ];

      const tracks = tracker.update(twoFaces, 1000);
      assert.strictEqual(tracks.length, 2);
      assert.strictEqual(tracks[0].trackingId, 'face-1');
      assert.strictEqual(tracks[1].trackingId, 'face-2');
    });
  });

  describe('2. ByteTrack Face Tracking & Tracking Continuity', () => {
    it('maintains face track identity across consecutive frames and confirms state', () => {
      const faceDetFrame1: YOLODetectionResult[] = [{
        classId: 0,
        className: 'face',
        confidence: 0.92,
        box: { x: 120, y: 80, width: 80, height: 110 },
        normalizedBox: { x: 0.187, y: 0.166, width: 0.125, height: 0.229 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      tracker.update(faceDetFrame1, 1000);

      // Frame 2: Minor head shift
      const faceDetFrame2: YOLODetectionResult[] = [{
        classId: 0,
        className: 'face',
        confidence: 0.94,
        box: { x: 122, y: 82, width: 80, height: 110 },
        normalizedBox: { x: 0.19, y: 0.17, width: 0.125, height: 0.229 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      const tracks = tracker.update(faceDetFrame2, 1800);
      assert.strictEqual(tracks.length, 1);
      assert.strictEqual(tracks[0].trackingId, 'face-1');
      assert.strictEqual(tracks[0].state, 'confirmed');
      assert.strictEqual(tracks[0].hits, 2);
    });

    it('survives momentary face occlusion without losing track ID', () => {
      const faceDet: YOLODetectionResult[] = [{
        classId: 0,
        className: 'face',
        confidence: 0.93,
        box: { x: 150, y: 90, width: 80, height: 110 },
        normalizedBox: { x: 0.234, y: 0.187, width: 0.125, height: 0.229 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      tracker.update(faceDet, 1000);
      tracker.update(faceDet, 1800);

      // Momentary hand rub / blink / occlusion
      let active = tracker.update([], 2600);
      assert.strictEqual(active.length, 1);
      assert.strictEqual(active[0].trackingId, 'face-1');
      assert.strictEqual(active[0].missedFrames, 1);

      // Face reappears
      active = tracker.update(faceDet, 3400);
      assert.strictEqual(active.length, 1);
      assert.strictEqual(active[0].trackingId, 'face-1', 'Must maintain face identity face-1');
      assert.strictEqual(active[0].missedFrames, 0);
    });

    it('enforces strict class isolation: face track never matches phone detection', () => {
      const faceDet: YOLODetectionResult[] = [{
        classId: 0,
        className: 'face',
        confidence: 0.90,
        box: { x: 100, y: 100, width: 80, height: 100 },
        normalizedBox: { x: 0.15, y: 0.15, width: 0.12, height: 0.2 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      tracker.update(faceDet, 1000);

      // Next frame: phone appears in same spatial coordinate
      const phoneDet: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.88,
        box: { x: 100, y: 100, width: 80, height: 100 },
        normalizedBox: { x: 0.15, y: 0.15, width: 0.12, height: 0.2 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      const tracks = tracker.update(phoneDet, 1800);
      assert.strictEqual(tracks.length, 2, 'Must keep face track and phone track separated');
      assert.strictEqual(tracks.find(t => t.classId === 0)?.trackingId, 'face-1');
      assert.strictEqual(tracks.find(t => t.classId === 67)?.trackingId, 'trk-1');
    });
  });

  describe('3. ArcFace Biometric Recognition & Hypersphere Embeddings', () => {
    it('produces unit-length L2-normalized 512-dimensional embeddings', () => {
      const rawVector = new Float32Array(512);
      for (let i = 0; i < 512; i++) rawVector[i] = (i % 10) - 5;

      const normalized = arcFace.normalizeEmbedding(rawVector);
      assert.strictEqual(normalized.length, 512);

      let sumSq = 0;
      for (let i = 0; i < 512; i++) sumSq += normalized[i] * normalized[i];
      assert.ok(Math.abs(sumSq - 1.0) < 1e-4, 'L2 norm must equal 1.0 on unit hypersphere');
    });

    it('calculates Cosine Similarity accurately', () => {
      const vecA = new Float32Array(512);
      const vecB = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        vecA[i] = 1 / Math.sqrt(512);
        vecB[i] = 1 / Math.sqrt(512);
      }

      // Identical vectors -> similarity 1.00
      const simIdentical = arcFace.calculateCosineSimilarity(vecA, vecB);
      assert.strictEqual(simIdentical, 1.0);

      // Orthogonal vectors
      const vecC = new Float32Array(512);
      for (let i = 0; i < 256; i++) vecC[i] = Math.sqrt(2 / 512);
      for (let i = 256; i < 512; i++) vecC[i] = -Math.sqrt(2 / 512);

      const simOrthogonal = arcFace.calculateCosineSimilarity(vecA, vecC);
      assert.ok(Math.abs(simOrthogonal) < 1e-3);
    });

    it('locks registered student reference embedding preventing in-exam replacement', () => {
      const studentEmb = new Float32Array(512).fill(0.04419);
      const ok1 = arcFace.setReferenceEmbedding(studentEmb);
      assert.strictEqual(ok1, true);

      // Attempt to tamper / replace reference identity with impostor
      const impostorEmb = new Float32Array(512).fill(0.088);
      const ok2 = arcFace.setReferenceEmbedding(impostorEmb);
      assert.strictEqual(ok2, false, 'Reference identity must be locked and tamper-proof during exam');

      // Reference embedding matches original
      const currentRef = arcFace.getReferenceEmbedding();
      assert.ok(currentRef);
      assert.ok(arcFace.calculateCosineSimilarity(currentRef!, studentEmb) >= 0.99);
    });

    it('classifies MATCH when candidate matches reference embedding (similarity >= 0.65)', () => {
      const refEmb = new Float32Array(512);
      for (let i = 0; i < 512; i++) refEmb[i] = Math.sin(i);
      arcFace.setReferenceEmbedding(refEmb);

      // Perturbed sample of same person (e.g. minor lighting variation) -> 92% similarity
      const candidateEmb = new Float32Array(512);
      for (let i = 0; i < 512; i++) candidateEmb[i] = Math.sin(i) + (Math.sin(i * 3) * 0.15);

      const result = arcFace.verifyAgainstReference(arcFace.normalizeEmbedding(candidateEmb), { isSufficient: true, qualityScore: 0.9 });
      assert.strictEqual(result.status, 'MATCH');
      assert.ok(result.similarity >= 0.65);
    });

    it('classifies MISMATCH when different individual appears (similarity < 0.45)', () => {
      const refEmb = new Float32Array(512);
      for (let i = 0; i < 512; i++) refEmb[i] = Math.cos(i);
      arcFace.setReferenceEmbedding(refEmb);

      // Impostor / completely different facial biometric structure
      const impostorEmb = new Float32Array(512);
      for (let i = 0; i < 512; i++) impostorEmb[i] = Math.sin(i * 7);

      const result = arcFace.verifyAgainstReference(arcFace.normalizeEmbedding(impostorEmb), { isSufficient: true, qualityScore: 0.85 });
      assert.strictEqual(result.status, 'MISMATCH');
      assert.ok(result.similarity < 0.45);
    });

    it('classifies poor lighting / blurry frames as INCONCLUSIVE avoiding false mismatch', () => {
      const refEmb = new Float32Array(512).fill(0.04419);
      arcFace.setReferenceEmbedding(refEmb);

      const noisyCandidate = new Float32Array(512).fill(0.01);

      // Low quality: extreme angle or dark lighting
      const result = arcFace.verifyAgainstReference(noisyCandidate, {
        isSufficient: false,
        qualityScore: 0.25,
        reason: 'Lighting too dark',
      });

      assert.strictEqual(result.status, 'INCONCLUSIVE', 'Poor lighting must be inconclusive, NOT mismatch');
      assert.strictEqual(result.isQualitySufficient, false);
    });
  });

  describe('4. AI Event Engine: Face Monitoring, Absence, Recovery & Mismatch', () => {
    it('detects continuous face absence (>= 5.0s) and fires FACE_NOT_DETECTED', () => {
      // Frame 1 at 1000ms: student absent
      const evts1 = engine.processFaceTracks([], sessionContext, undefined, 1000);
      assert.strictEqual(evts1.length, 0, 'Must NOT trigger absence immediately on first frame');

      // Frame 2 at 3000ms: 2s elapsed
      const evts2 = engine.processFaceTracks([], sessionContext, undefined, 3000);
      assert.strictEqual(evts2.length, 0, 'Must NOT trigger before 5s threshold');

      // Frame 3 at 6200ms: 5.2s elapsed -> triggers FACE_NOT_DETECTED
      const evts3 = engine.processFaceTracks([], sessionContext, undefined, 6200);
      assert.strictEqual(evts3.length, 1);
      assert.strictEqual(evts3[0].eventType, 'FACE_NOT_DETECTED');
      assert.strictEqual(evts3[0].faceCount, 0);
      assert.strictEqual(evts3[0].status, 'confirmed');

      // Frame 4 at 7000ms: continues absent -> does NOT spam duplicate event
      const evts4 = engine.processFaceTracks([], sessionContext, undefined, 7000);
      assert.strictEqual(evts4.length, 0, 'Must suppress duplicate event during active absence');
    });

    it('fires FACE_RECOVERED when student returns after face absence', () => {
      // 1. Trigger absence
      engine.processFaceTracks([], sessionContext, undefined, 1000);
      engine.processFaceTracks([], sessionContext, undefined, 6500);

      // 2. Student returns to camera
      const returnTrack: any = [{
        trackingId: 'face-1',
        classId: 0,
        className: 'face',
        box: { x: 100, y: 100, width: 80, height: 110 },
        confidence: 0.94,
        hits: 1,
      }];

      const recoverEvents = engine.processFaceTracks(returnTrack, sessionContext, undefined, 7200);
      assert.strictEqual(recoverEvents.length, 1);
      assert.strictEqual(recoverEvents[0].eventType, 'FACE_RECOVERED');
      assert.strictEqual(recoverEvents[0].status, 'resolved');
      assert.strictEqual(recoverEvents[0].trackingId, 'face-1');
    });

    it('detects MULTIPLE_FACES_DETECTED when two or more faces appear', () => {
      const twoFaceTracks: any = [
        {
          trackingId: 'face-1',
          classId: 0,
          className: 'face',
          box: { x: 100, y: 80, width: 80, height: 110 },
          confidence: 0.94,
          hits: 1,
        },
        {
          trackingId: 'face-2',
          classId: 0,
          className: 'face',
          box: { x: 300, y: 90, width: 80, height: 110 },
          confidence: 0.88,
          hits: 1,
        }
      ];

      // Frame 1: Tentative
      const evts1 = engine.processFaceTracks(twoFaceTracks, sessionContext, undefined, 1000);
      assert.strictEqual(evts1.length, 0);

      // Frame 2: Confirmed multi-face
      const evts2 = engine.processFaceTracks(twoFaceTracks, sessionContext, undefined, 1800);
      assert.strictEqual(evts2.length, 1);
      assert.strictEqual(evts2[0].eventType, 'MULTIPLE_FACES_DETECTED');
      assert.strictEqual(evts2[0].faceCount, 2);
      assert.strictEqual(evts2[0].status, 'confirmed');
    });

    it('validates ArcFace identity and fires FACE_MISMATCH on persistent impostor', () => {
      const impostorTrack: any = [{
        trackingId: 'face-impostor',
        classId: 0,
        className: 'face',
        box: { x: 100, y: 80, width: 80, height: 110 },
        confidence: 0.92,
        hits: 2,
      }];

      const mismatchMap = new Map();
      mismatchMap.set('face-impostor', {
        similarity: 0.32,
        status: 'MISMATCH',
        isQualitySufficient: true,
        qualityScore: 0.88,
        message: 'Unauthorized person detected',
      });

      // Frame 1: Tentative mismatch (requires multi-frame persistence)
      const evts1 = engine.processFaceTracks(impostorTrack, sessionContext, undefined, 1000, mismatchMap);
      assert.strictEqual(evts1.length, 0, 'Single mismatch frame must not confirm violation');

      // Frame 2: Confirmed mismatch
      const evts2 = engine.processFaceTracks(impostorTrack, sessionContext, undefined, 1800, mismatchMap);
      assert.strictEqual(evts2.length, 1);
      assert.strictEqual(evts2[0].eventType, 'FACE_MISMATCH');
      assert.strictEqual(evts2[0].similarityScore, 0.32);
      assert.strictEqual(evts2[0].status, 'confirmed');
    });

    it('fires FACE_VERIFIED when student matches reference biometrics', () => {
      const studentTrack: any = [{
        trackingId: 'face-student',
        classId: 0,
        className: 'face',
        box: { x: 100, y: 80, width: 80, height: 110 },
        confidence: 0.95,
        hits: 2,
      }];

      const matchMap = new Map();
      matchMap.set('face-student', {
        similarity: 0.93,
        status: 'MATCH',
        isQualitySufficient: true,
        qualityScore: 0.92,
        message: 'Candidate identity verified',
      });

      const evts = engine.processFaceTracks(studentTrack, sessionContext, undefined, 1000, matchMap);
      assert.strictEqual(evts.length, 1);
      assert.strictEqual(evts[0].eventType, 'FACE_VERIFIED');
      assert.strictEqual(evts[0].similarityScore, 0.93);
      assert.strictEqual(evts[0].status, 'info');
    });
  });
});
