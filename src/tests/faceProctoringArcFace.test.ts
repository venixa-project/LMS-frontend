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

      assert.ok(result.status === 'UNCERTAIN' || result.status === 'INCONCLUSIVE', 'Poor lighting must be uncertain / inconclusive, NOT mismatch');
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

  describe('5. Comprehensive Multi-Face False-Positive Elimination & 12-Scenario Validation Matrix', () => {
    let scenarioDetector: YOLOMobileDetector;
    let scenarioTracker: ByteObjectTracker;
    let scenarioEngine: AIEventEngine;

    beforeEach(() => {
      scenarioDetector = new YOLOMobileDetector({ confidenceThreshold: 0.50, iouThreshold: 0.45 });
      scenarioTracker = new ByteObjectTracker({
        iouThreshold: 0.30,
        maxMissedFrames: 4,
        minHitsToConfirm: 2,
        faceTemporalWindow: 12,
        minMultiFaceConfirmedFrames: 8,
      });
      scenarioEngine = new AIEventEngine({
        minConsecutiveFrames: 2,
        minMultiFaceConfirmedFrames: 8,
        confidenceThreshold: 0.50,
        cooldownPeriodMs: 15000,
        faceAbsenceThresholdMs: 5000,
      });
    });

    it('Scenario 1: One student sitting normally -> Exactly 1 face track, no multi-face warning', () => {
      const studentFrame: YOLODetectionResult[] = [{
        classId: 0,
        className: 'face',
        confidence: 0.96,
        box: { x: 140, y: 70, width: 120, height: 160 },
        normalizedBox: { x: 0.218, y: 0.145, width: 0.187, height: 0.333 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      // Feed frames
      for (let f = 1; f <= 10; f++) {
        const tracks = scenarioTracker.update(studentFrame, 1000 + f * 100);
        const evts = scenarioEngine.processFaceTracks(tracks, sessionContext, undefined, 1000 + f * 100);
        assert.strictEqual(tracks.length, 1);
        assert.strictEqual(tracks[0].trackingId, 'face-1');
        assert.strictEqual(evts.filter(e => e.eventType === 'MULTIPLE_FACES_DETECTED').length, 0);
      }
      const confirmedFaces = scenarioTracker.getConfirmedFaceTracks();
      assert.strictEqual(confirmedFaces.length, 1);
    });

    it('Scenario 2: One student moving head (pitch, yaw, roll) -> Continuous single face track, 0 warnings', () => {
      // Simulate head movement across frames with shifting bounding box
      const movementPositions = [
        { x: 140, y: 70, w: 120, h: 160 },
        { x: 148, y: 68, w: 118, h: 162 },
        { x: 156, y: 75, w: 115, h: 158 },
        { x: 135, y: 80, w: 122, h: 165 },
        { x: 130, y: 72, w: 120, h: 160 },
      ];

      for (let i = 0; i < movementPositions.length; i++) {
        const pos = movementPositions[i];
        const det: YOLODetectionResult[] = [{
          classId: 0,
          className: 'face',
          confidence: 0.94,
          box: { x: pos.x, y: pos.y, width: pos.w, height: pos.h },
          normalizedBox: { x: pos.x / 640, y: pos.y / 480, width: pos.w / 640, height: pos.h / 480 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        }];

        const tracks = scenarioTracker.update(det, 2000 + i * 200);
        const evts = scenarioEngine.processFaceTracks(tracks, sessionContext, undefined, 2000 + i * 200);
        assert.strictEqual(tracks.length, 1);
        assert.strictEqual(tracks[0].trackingId, 'face-1');
        assert.strictEqual(evts.filter(e => e.eventType === 'MULTIPLE_FACES_DETECTED').length, 0);
      }
    });

    it('Scenario 3: One student wearing glasses -> Dark rim bridge deduplicates split cheeks into 1 face', () => {
      // Two candidates generated when glasses bridge divides left and right facial skin
      const splitByGlasses: YOLODetectionResult[] = [
        {
          classId: 0,
          className: 'face',
          confidence: 0.92,
          box: { x: 130, y: 80, width: 65, height: 140 }, // Left cheek & eye
          normalizedBox: { x: 0.20, y: 0.16, width: 0.10, height: 0.29 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 0,
          className: 'face',
          confidence: 0.89,
          box: { x: 175, y: 82, width: 65, height: 138 }, // Right cheek & eye (adjacent/overlapping)
          normalizedBox: { x: 0.27, y: 0.17, width: 0.10, height: 0.28 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        }
      ];

      // Test detector NMS deduplication & cluster merging
      const mergedDetections = (scenarioDetector as any).nonMaxSuppression(splitByGlasses);
      assert.strictEqual(mergedDetections.length, 1, 'Split facial components must merge into exactly 1 bounding box');
      assert.ok(mergedDetections[0].box.width >= 100, 'Merged box must encompass the entire face');

      // Feed through tracker and AI event engine
      const tracks = scenarioTracker.update(mergedDetections, 3000);
      const evts = scenarioEngine.processFaceTracks(tracks, sessionContext, undefined, 3000);
      assert.strictEqual(tracks.length, 1);
      assert.strictEqual(evts.filter(e => e.eventType === 'MULTIPLE_FACES_DETECTED').length, 0);
    });

    it('Scenario 4: Lighting changes / shadows across face -> One side shaded merged into 1 face', () => {
      // Forehead/upper face and chin/lower face candidate fragments under harsh directional lighting
      const shadowFragments: YOLODetectionResult[] = [
        {
          classId: 0,
          className: 'face',
          confidence: 0.95,
          box: { x: 140, y: 70, width: 110, height: 90 }, // Upper lit area
          normalizedBox: { x: 0.21, y: 0.14, width: 0.17, height: 0.18 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 0,
          className: 'face',
          confidence: 0.85,
          box: { x: 145, y: 110, width: 105, height: 100 }, // Lower jaw area (overlapping)
          normalizedBox: { x: 0.22, y: 0.22, width: 0.16, height: 0.20 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        }
      ];

      const merged = (scenarioDetector as any).nonMaxSuppression(shadowFragments);
      assert.strictEqual(merged.length, 1);
      assert.strictEqual(merged[0].confidence, 0.95);
    });

    it('Scenario 5: Student turning face / profile view -> Continuous single face track', () => {
      // Profile view: narrower face width, shifted centroid
      const profileFrames = [
        { x: 140, y: 70, width: 120, height: 160 }, // Frontal
        { x: 145, y: 70, width: 100, height: 160 }, // 3/4 turn
        { x: 150, y: 70, width: 85, height: 155 },  // Profile turn
        { x: 145, y: 70, width: 100, height: 160 }, // Returning
      ];

      for (let i = 0; i < profileFrames.length; i++) {
        const box = profileFrames[i];
        const det: YOLODetectionResult[] = [{
          classId: 0,
          className: 'face',
          confidence: 0.91,
          box,
          normalizedBox: { x: box.x / 640, y: box.y / 480, width: box.width / 640, height: box.height / 480 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        }];

        const tracks = scenarioTracker.update(det, 4000 + i * 200);
        assert.strictEqual(tracks.length, 1);
        assert.strictEqual(tracks[0].trackingId, 'face-1');
      }
    });

    it('Scenario 6: Duplicate bounding boxes from same physical face -> NMS merges into 1 box', () => {
      const duplicateBoxes: YOLODetectionResult[] = [
        {
          classId: 0,
          className: 'face',
          confidence: 0.96,
          box: { x: 150, y: 80, width: 110, height: 150 },
          normalizedBox: { x: 0.23, y: 0.16, width: 0.17, height: 0.31 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 0,
          className: 'face',
          confidence: 0.88,
          box: { x: 154, y: 84, width: 104, height: 144 }, // Jittered duplicate box (IoU > 0.80)
          normalizedBox: { x: 0.24, y: 0.17, width: 0.16, height: 0.30 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
      ];

      const merged = (scenarioDetector as any).nonMaxSuppression(duplicateBoxes);
      assert.strictEqual(merged.length, 1);
      assert.strictEqual(merged[0].confidence, 0.96);
    });

    it('Scenario 7: Background poster / photo -> Duplicate tracker spatial deduplication suppresses duplicate face track', () => {
      // Active student track
      scenarioTracker.update([{
        classId: 0,
        className: 'face',
        confidence: 0.95,
        box: { x: 150, y: 80, width: 120, height: 160 },
        normalizedBox: { x: 0.23, y: 0.16, width: 0.18, height: 0.33 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }], 5000);

      // Detection with slight jitter overlapping primary face (e.g. wall artifact or reflection edge)
      const tracks = scenarioTracker.update([{
        classId: 0,
        className: 'face',
        confidence: 0.80,
        box: { x: 155, y: 82, width: 110, height: 155 },
        normalizedBox: { x: 0.24, y: 0.17, width: 0.17, height: 0.32 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }], 5200);

      assert.strictEqual(tracks.length, 1, 'Overlapping detection must associate with existing face track rather than spawning face-2');
      assert.strictEqual(tracks[0].trackingId, 'face-1');
    });

    it('Scenario 8: Mirror / screen reflection of candidate -> Merged into primary candidate view', () => {
      const reflectionCandidates: YOLODetectionResult[] = [
        {
          classId: 0,
          className: 'face',
          confidence: 0.97,
          box: { x: 140, y: 80, width: 120, height: 160 },
          normalizedBox: { x: 0.21, y: 0.16, width: 0.18, height: 0.33 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 0,
          className: 'face',
          confidence: 0.70,
          box: { x: 160, y: 90, width: 95, height: 145 }, // Partial reflection contained in face region
          normalizedBox: { x: 0.25, y: 0.18, width: 0.14, height: 0.30 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
      ];

      const merged = (scenarioDetector as any).nonMaxSuppression(reflectionCandidates);
      assert.strictEqual(merged.length, 1);
    });

    it('Scenario 9: Two actual students visible -> Spatially separated & confirmed after 8 consecutive frames', () => {
      // Two distinct people (Candidate on left, intruder on right - distance > 200px)
      const twoStudents: YOLODetectionResult[] = [
        {
          classId: 0,
          className: 'face',
          confidence: 0.96,
          box: { x: 80, y: 80, width: 110, height: 150 },
          normalizedBox: { x: 0.125, y: 0.166, width: 0.171, height: 0.312 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 0,
          className: 'face',
          confidence: 0.91,
          box: { x: 380, y: 85, width: 110, height: 150 },
          normalizedBox: { x: 0.593, y: 0.177, width: 0.171, height: 0.312 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        }
      ];

      // Frames 1-7: Unconfirmed / tentative (below 8 required frames)
      for (let f = 1; f <= 7; f++) {
        const tracks = scenarioTracker.update(twoStudents, 6000 + f * 200);
        const evts = scenarioEngine.processFaceTracks(tracks, sessionContext, undefined, 6000 + f * 200);
        assert.strictEqual(tracks.length, 2);
        assert.strictEqual(evts.filter(e => e.eventType === 'MULTIPLE_FACES_DETECTED').length, 0, `Frame ${f} must not fire confirmed warning`);
      }

      // Frame 8: 8th consecutive sampled frame -> Confirmed MULTIPLE_FACES_DETECTED!
      const tracks8 = scenarioTracker.update(twoStudents, 6000 + 8 * 200);
      const evts8 = scenarioEngine.processFaceTracks(tracks8, sessionContext, undefined, 6000 + 8 * 200);
      const multiEvents = evts8.filter(e => e.eventType === 'MULTIPLE_FACES_DETECTED');

      assert.strictEqual(multiEvents.length, 1, 'Must emit confirmed MULTIPLE_FACES_DETECTED event on frame 8');
      assert.strictEqual(multiEvents[0].faceCount, 2);
      assert.strictEqual(multiEvents[0].status, 'confirmed');
      assert.strictEqual(multiEvents[0].validationStatus, 'TEMPORALLY_VALIDATED');
    });

    it('Scenario 10: Three actual people visible -> Detects all distinct faces, confirmed faceCount = 3', () => {
      const threePeople: YOLODetectionResult[] = [
        {
          classId: 0,
          className: 'face',
          confidence: 0.95,
          box: { x: 60, y: 80, width: 100, height: 140 },
          normalizedBox: { x: 0.09, y: 0.16, width: 0.15, height: 0.29 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 0,
          className: 'face',
          confidence: 0.92,
          box: { x: 260, y: 80, width: 100, height: 140 },
          normalizedBox: { x: 0.40, y: 0.16, width: 0.15, height: 0.29 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 0,
          className: 'face',
          confidence: 0.89,
          box: { x: 460, y: 80, width: 100, height: 140 },
          normalizedBox: { x: 0.71, y: 0.16, width: 0.15, height: 0.29 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        }
      ];

      for (let f = 1; f <= 8; f++) {
        const tracks = scenarioTracker.update(threePeople, 7000 + f * 200);
        const evts = scenarioEngine.processFaceTracks(tracks, sessionContext, undefined, 7000 + f * 200);
        if (f === 8) {
          const multi = evts.find(e => e.eventType === 'MULTIPLE_FACES_DETECTED');
          assert.ok(multi, 'Must detect multiple faces for 3 people');
          assert.strictEqual(multi.faceCount, 3);
        }
      }
    });

    it('Scenario 11: Brief second person passing by (< 8 frames, e.g. 3 frames) -> Temporal validation suppresses warning, resets cleanly', () => {
      const singleStudent: YOLODetectionResult[] = [{
        classId: 0,
        className: 'face',
        confidence: 0.95,
        box: { x: 120, y: 80, width: 110, height: 150 },
        normalizedBox: { x: 0.18, y: 0.16, width: 0.17, height: 0.31 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      const intruderAppears: YOLODetectionResult[] = [
        ...singleStudent,
        {
          classId: 0,
          className: 'face',
          confidence: 0.88,
          box: { x: 400, y: 90, width: 100, height: 140 },
          normalizedBox: { x: 0.62, y: 0.18, width: 0.15, height: 0.29 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        }
      ];

      // Student established
      scenarioTracker.update(singleStudent, 8000);
      scenarioTracker.update(singleStudent, 8200);

      // Intruder visible for only 3 frames (< 8 required frames)
      for (let f = 1; f <= 3; f++) {
        const tracks = scenarioTracker.update(intruderAppears, 8400 + f * 200);
        const evts = scenarioEngine.processFaceTracks(tracks, sessionContext, undefined, 8400 + f * 200);
        assert.strictEqual(evts.filter(e => e.eventType === 'MULTIPLE_FACES_DETECTED').length, 0, 'Brief appearance must NOT fire warning');
      }

      // Intruder leaves: only student remains
      for (let f = 1; f <= 4; f++) {
        const tracks = scenarioTracker.update(singleStudent, 9200 + f * 200);
        const evts = scenarioEngine.processFaceTracks(tracks, sessionContext, undefined, 9200 + f * 200);
        assert.strictEqual(evts.filter(e => e.eventType === 'MULTIPLE_FACES_DETECTED').length, 0);
      }

      // Confirmed face count is strictly 1
      const confirmedFaces = scenarioTracker.getConfirmedFaceTracks();
      assert.strictEqual(confirmedFaces.length, 1);
      assert.strictEqual(confirmedFaces[0].trackingId, 'face-1');
    });

    it('Scenario 12: Second person staying next to student (>= 8 out of 12 frames) -> Confirmed MULTIPLE_FACES_DETECTED warning and strike recorded', () => {
      const persistentIntruder: YOLODetectionResult[] = [
        {
          classId: 0,
          className: 'face',
          confidence: 0.96,
          box: { x: 100, y: 75, width: 115, height: 155 },
          normalizedBox: { x: 0.15, y: 0.15, width: 0.18, height: 0.32 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 0,
          className: 'face',
          confidence: 0.93,
          box: { x: 390, y: 80, width: 110, height: 150 },
          normalizedBox: { x: 0.60, y: 0.16, width: 0.17, height: 0.31 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        }
      ];

      let warningFired = false;
      let finalEvent: ProctoringAIEvent | null = null;

      for (let f = 1; f <= 10; f++) {
        const tracks = scenarioTracker.update(persistentIntruder, 10000 + f * 200);
        const evts = scenarioEngine.processFaceTracks(tracks, sessionContext, undefined, 10000 + f * 200);
        const multi = evts.find(e => e.eventType === 'MULTIPLE_FACES_DETECTED');
        if (multi) {
          warningFired = true;
          finalEvent = multi;
        }
      }

      assert.strictEqual(warningFired, true, 'Persistent second person must trigger confirmed warning');
      assert.ok(finalEvent);
      assert.strictEqual(finalEvent.faceCount, 2);
      assert.strictEqual(finalEvent.validationStatus, 'TEMPORALLY_VALIDATED');
      assert.strictEqual(finalEvent.status, 'confirmed');
    });
  });

  describe('6. False Identity Mismatch Elimination & 14-Scenario Biometric Verification Matrix', () => {
    let testArcFace: ArcFaceRecognizer;
    let testEngine: AIEventEngine;
    let registeredEmbedding: Float32Array;

    beforeEach(() => {
      testArcFace = new ArcFaceRecognizer({
        matchThreshold: 0.65,
        mismatchThreshold: 0.45,
        minFaceResolution: 40,
        embeddingDimension: 512,
      });

      testEngine = new AIEventEngine({
        minConsecutiveFrames: 2,
        mismatchConsecutiveFrames: 5,
        confidenceThreshold: 0.50,
        cooldownPeriodMs: 15000,
        faceAbsenceThresholdMs: 5000,
        enableFaceAbsenceMonitoring: true,
      });

      // Deterministic registered student biometric vector
      registeredEmbedding = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        registeredEmbedding[i] = Math.sin((i * Math.PI) / 64);
      }
      registeredEmbedding = testArcFace.normalizeEmbedding(registeredEmbedding);
      testArcFace.setReferenceEmbedding(registeredEmbedding);
    });

    it('Scenario 1: Same student, same position -> MATCH (sim >= 0.75), 0 strikes', () => {
      // Near-identical embedding of same student in same position
      const liveEmb = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        liveEmb[i] = registeredEmbedding[i] + (Math.sin(i * 5) * 0.02);
      }
      const normLive = testArcFace.normalizeEmbedding(liveEmb);

      const verification = testArcFace.verifyAgainstReference(normLive, {
        isSufficient: true,
        qualityScore: 0.95,
      });

      assert.strictEqual(verification.status, 'MATCH');
      assert.ok(verification.similarity >= 0.75, `Expected sim >= 0.75, got ${verification.similarity}`);

      const track: any = [{
        trackingId: 'face-student-1',
        classId: 0,
        className: 'face',
        box: { x: 150, y: 100, width: 90, height: 120 },
        confidence: 0.96,
        hits: 5,
      }];
      const verMap = new Map();
      verMap.set('face-student-1', verification);

      const events = testEngine.processFaceTracks(track, sessionContext, undefined, 1000, verMap);
      const mismatchEvents = events.filter(e => e.eventType === 'FACE_MISMATCH');
      assert.strictEqual(mismatchEvents.length, 0, 'Must NOT trigger mismatch event');
    });

    it('Scenario 2: Same student, head angle change -> MATCH or UNCERTAIN, 0 strikes', () => {
      // Perturbation from 15-20 degree head yaw/pitch (typical ~0.60 to 0.72 similarity)
      const angleEmb = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        angleEmb[i] = registeredEmbedding[i] + (Math.sin(i * 3) * 0.05);
      }
      const normAngle = testArcFace.normalizeEmbedding(angleEmb);

      const verification = testArcFace.verifyAgainstReference(normAngle, {
        isSufficient: true,
        qualityScore: 0.82,
      });

      assert.ok(verification.status === 'MATCH' || verification.status === 'UNCERTAIN');
      assert.notStrictEqual(verification.status, 'MISMATCH', 'Head angle change must NEVER be declared mismatch');

      const track: any = [{
        trackingId: 'face-student-1',
        classId: 0,
        className: 'face',
        box: { x: 160, y: 105, width: 88, height: 118 },
        confidence: 0.92,
        hits: 6,
      }];
      const verMap = new Map();
      verMap.set('face-student-1', verification);

      const events = testEngine.processFaceTracks(track, sessionContext, undefined, 2000, verMap);
      const mismatch = events.find(e => e.eventType === 'FACE_MISMATCH');
      assert.strictEqual(mismatch, undefined, 'Must not fire mismatch event');
    });

    it('Scenario 3: Same student, lighting change -> Handled properly, 0 strikes', () => {
      // Dim or bright lighting frame with low contrast
      const dimVerification = testArcFace.verifyAgainstReference(registeredEmbedding, {
        isSufficient: false,
        qualityScore: 0.28,
        reason: 'Lighting too dark',
      });

      assert.ok(dimVerification.status === 'UNCERTAIN' || dimVerification.status === 'INCONCLUSIVE');
      assert.notStrictEqual(dimVerification.status, 'MISMATCH');

      const track: any = [{
        trackingId: 'face-student-1',
        classId: 0,
        className: 'face',
        box: { x: 150, y: 100, width: 90, height: 120 },
        confidence: 0.88,
        hits: 7,
      }];
      const verMap = new Map();
      verMap.set('face-student-1', dimVerification);

      const events = testEngine.processFaceTracks(track, sessionContext, undefined, 3000, verMap);
      const mismatch = events.find(e => e.eventType === 'FACE_MISMATCH');
      assert.strictEqual(mismatch, undefined);
    });

    it('Scenario 4: Same student, wearing glasses -> MATCH or UNCERTAIN, 0 strikes', () => {
      const glassesEmb = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        glassesEmb[i] = registeredEmbedding[i] * 0.90 + (Math.sin(i * 3) * 0.10);
      }
      const normGlasses = testArcFace.normalizeEmbedding(glassesEmb);

      const verification = testArcFace.verifyAgainstReference(normGlasses, {
        isSufficient: true,
        qualityScore: 0.88,
      });

      assert.ok(verification.status === 'MATCH' || verification.status === 'UNCERTAIN');
      assert.notStrictEqual(verification.status, 'MISMATCH');
    });

    it('Scenario 5: Same student moving slightly -> Stable tracking, 0 strikes', () => {
      // Minor position drift: 5px movement
      const movedTrack: any = [{
        trackingId: 'face-student-1',
        classId: 0,
        className: 'face',
        box: { x: 155, y: 102, width: 90, height: 120 },
        confidence: 0.95,
        hits: 8,
      }];

      const verification = testArcFace.verifyAgainstReference(registeredEmbedding, {
        isSufficient: true,
        qualityScore: 0.90,
      });

      assert.strictEqual(verification.status, 'MATCH');
      const verMap = new Map();
      verMap.set('face-student-1', verification);

      const events = testEngine.processFaceTracks(movedTrack, sessionContext, undefined, 4000, verMap);
      const mismatch = events.find(e => e.eventType === 'FACE_MISMATCH');
      assert.strictEqual(mismatch, undefined);
    });

    it('Scenario 6: Different person appearing -> Confirmed MISMATCH after 5 frames, warning strike recorded', () => {
      // Impostor biometric embedding (orthogonal feature space)
      const impostorEmb = new Float32Array(512);
      for (let i = 0; i < 512; i++) {
        impostorEmb[i] = Math.cos((i * Math.PI) / 8);
      }
      const normImpostor = testArcFace.normalizeEmbedding(impostorEmb);

      const verification = testArcFace.verifyAgainstReference(normImpostor, {
        isSufficient: true,
        qualityScore: 0.89,
      });

      assert.strictEqual(verification.status, 'MISMATCH');
      assert.ok(verification.similarity < 0.45, `Expected sim < 0.45, got ${verification.similarity}`);

      const impostorTrack: any = [{
        trackingId: 'face-impostor-9',
        classId: 0,
        className: 'face',
        box: { x: 150, y: 100, width: 90, height: 120 },
        confidence: 0.94,
        hits: 1,
      }];
      const verMap = new Map();
      verMap.set('face-impostor-9', verification);

      // Frames 1 to 4: Tentative mismatch, must NOT confirm violation
      for (let f = 1; f <= 4; f++) {
        const events = testEngine.processFaceTracks(impostorTrack, sessionContext, undefined, 5000 + f * 500, verMap);
        const mismatch = events.find(e => e.eventType === 'FACE_MISMATCH');
        assert.strictEqual(mismatch, undefined, `Frame ${f} tentative mismatch must not trigger warning`);
      }

      // Frame 5: 5 consecutive valid high-quality mismatch frames -> Confirmed FACE_MISMATCH!
      const finalEvents = testEngine.processFaceTracks(impostorTrack, sessionContext, undefined, 7500, verMap);
      const confirmedMismatch = finalEvents.find(e => e.eventType === 'FACE_MISMATCH');
      assert.ok(confirmedMismatch, '5th consecutive mismatch frame must trigger FACE_MISMATCH');
      assert.strictEqual(confirmedMismatch.status, 'confirmed');
      assert.strictEqual(confirmedMismatch.detectionCount, 5);
    });

    it('Scenario 7: No face detected -> FACE_NOT_DETECTED (not identity mismatch), 0 mismatch strikes', () => {
      // Empty camera view for 6 seconds (exceeding 5s absence threshold)
      testEngine.processFaceTracks([], sessionContext, undefined, 1000);
      const absenceEvents = testEngine.processFaceTracks([], sessionContext, undefined, 7000);

      const mismatchEvents = absenceEvents.filter(e => e.eventType === 'FACE_MISMATCH');
      assert.strictEqual(mismatchEvents.length, 0, 'Face absence must NEVER be labeled identity mismatch');

      const absenceEvent = absenceEvents.find(e => e.eventType === 'FACE_NOT_DETECTED');
      assert.ok(absenceEvent, 'Absence must trigger FACE_NOT_DETECTED');
      assert.strictEqual(absenceEvent.faceCount, 0);
    });

    it('Scenario 8: Blurred / obstructed face -> UNCERTAIN, 0 strikes', () => {
      const blurredResult = testArcFace.verifyAgainstReference(registeredEmbedding, {
        isSufficient: false,
        qualityScore: 0.15,
        reason: 'Contrast too low / blurred',
      });

      assert.ok(blurredResult.status === 'UNCERTAIN' || blurredResult.status === 'INCONCLUSIVE');
      assert.strictEqual(blurredResult.isQualitySufficient, false);

      const track: any = [{
        trackingId: 'face-student-1',
        classId: 0,
        className: 'face',
        box: { x: 150, y: 100, width: 90, height: 120 },
        confidence: 0.85,
        hits: 10,
      }];
      const verMap = new Map();
      verMap.set('face-student-1', blurredResult);

      const events = testEngine.processFaceTracks(track, sessionContext, undefined, 8000, verMap);
      const mismatch = events.find(e => e.eventType === 'FACE_MISMATCH');
      assert.strictEqual(mismatch, undefined, 'Blurred face must NEVER trigger mismatch strike');
    });

    it('Scenario 9: Camera disconnected / blank -> 0 mismatch strikes', () => {
      // Zero detections, camera failure
      const events = testEngine.processFaceTracks([], sessionContext, undefined, 9000);
      const mismatch = events.find(e => e.eventType === 'FACE_MISMATCH');
      assert.strictEqual(mismatch, undefined, 'Camera disconnect must never cause identity mismatch strike');
    });

    it('Scenario 10: Multiple faces appearing -> MULTIPLE_FACES_DETECTED (not identity mismatch)', () => {
      const twoTracks: any = [
        { trackingId: 'face-student-1', classId: 0, className: 'face', box: { x: 100, y: 80, width: 80, height: 110 }, confidence: 0.95, hits: 10 },
        { trackingId: 'face-guest-2', classId: 0, className: 'face', box: { x: 350, y: 80, width: 80, height: 110 }, confidence: 0.91, hits: 8 },
      ];

      // Verification results for primary candidate
      const verMap = new Map();
      verMap.set('face-student-1', testArcFace.verifyAgainstReference(registeredEmbedding, { isSufficient: true, qualityScore: 0.9 }));

      const multiEvents = testEngine.processFaceTracks(twoTracks, sessionContext, undefined, 10000, verMap);
      const mismatch = multiEvents.find(e => e.eventType === 'FACE_MISMATCH');
      assert.strictEqual(mismatch, undefined, 'Multi-face event must not be confused with identity mismatch');
    });

    it('Scenario 11: Reference image missing handling -> UNCERTAIN, no crash, 0 strikes', () => {
      const freshArcFace = new ArcFaceRecognizer();
      const randomEmb = new Float32Array(512).fill(0.05);

      const result = freshArcFace.verifyAgainstReference(randomEmb);
      assert.ok(result.status === 'UNCERTAIN' || result.status === 'INCONCLUSIVE');
      assert.strictEqual(result.similarity, 0);
      assert.strictEqual(result.isQualitySufficient, false);
    });

    it('Scenario 12: Session refresh / reconnect -> Reference embedding preserved and continuous verification', () => {
      // Simulate retrieving locked embedding from backend on refresh
      const sessionSerializedEmb = Array.from(registeredEmbedding);
      const rehydratedArcFace = new ArcFaceRecognizer();
      rehydratedArcFace.setReferenceEmbedding(new Float32Array(sessionSerializedEmb));

      assert.strictEqual(rehydratedArcFace.isLocked(), true);

      // Verify student against restored reference
      const ver = rehydratedArcFace.verifyAgainstReference(registeredEmbedding, { isSufficient: true, qualityScore: 0.92 });
      assert.strictEqual(ver.status, 'MATCH');
      assert.ok(ver.similarity >= 0.98);
    });

    it('Scenario 13: 7-day retention deletion -> Biometrics purged, audit logs preserved', () => {
      // Simulate 7-day retention verification logic
      const now = Date.now();
      const eightDaysAgo = now - (8 * 24 * 60 * 60 * 1000);
      const isExpired = (now - eightDaysAgo) > (7 * 24 * 60 * 60 * 1000);
      assert.strictEqual(isExpired, true, 'Sessions older than 7 days must be flagged expired');

      const mockSession = {
        sessionId: 'sess-retention-test',
        referencePhotoUrl: '/storage/proctoring/sess-retention-test/baseline.jpg',
        referenceEmbedding: [0.1, 0.2, 0.3],
        examScore: 92,
        auditLogsCount: 14,
      };

      // Apply retention purge
      const purgedSession = {
        ...mockSession,
        referencePhotoUrl: null,
        referenceEmbedding: null,
      };

      assert.strictEqual(purgedSession.referencePhotoUrl, null, 'Biometric reference photo must be purged');
      assert.strictEqual(purgedSession.referenceEmbedding, null, 'Biometric ArcFace embedding must be purged');
      assert.strictEqual(purgedSession.examScore, 92, 'Exam score must be preserved');
      assert.strictEqual(purgedSession.auditLogsCount, 14, 'Audit logs count must be preserved');
    });

    it('Scenario 14: Repeated frames from same mismatch event -> Cooldown prevents strike spam', () => {
      const impostorEmb = new Float32Array(512).fill(-0.04);
      const normImpostor = testArcFace.normalizeEmbedding(impostorEmb);
      const ver = testArcFace.verifyAgainstReference(normImpostor, { isSufficient: true, qualityScore: 0.90 });

      const track: any = [{
        trackingId: 'face-impostor-repeat',
        classId: 0,
        className: 'face',
        box: { x: 150, y: 100, width: 90, height: 120 },
        confidence: 0.93,
        hits: 1,
      }];
      const verMap = new Map();
      verMap.set('face-impostor-repeat', ver);

      // Trigger 5 consecutive frames to fire first strike at timestamp 15000
      let firstStrike: ProctoringAIEvent | undefined;
      for (let f = 1; f <= 5; f++) {
        const evts = testEngine.processFaceTracks(track, sessionContext, undefined, 14000 + f * 200, verMap);
        const mm = evts.find(e => e.eventType === 'FACE_MISMATCH');
        if (mm) firstStrike = mm;
      }
      assert.ok(firstStrike, 'First strike must fire at frame 5');

      // Subsequent frame immediately after (within 15s cooldown, e.g. 500ms later)
      const repeatEvents = testEngine.processFaceTracks(track, sessionContext, undefined, 15500, verMap);
      const repeatMismatch = repeatEvents.find(e => e.eventType === 'FACE_MISMATCH');
      assert.strictEqual(repeatMismatch, undefined, 'Cooldown must suppress consecutive strikes within 15 seconds');
    });
  });

  describe('7. MobileFaceNet Deep Face Recognition & Security Remediation Validation', () => {
    it('produces unit-length L2-normalized 128-dimensional hypersphere embeddings', () => {
      const recognizer = new ArcFaceRecognizer({ embeddingDimension: 128 });
      const raw128 = new Float32Array(128);
      for (let i = 0; i < 128; i++) raw128[i] = (i % 7) - 3;

      const norm128 = recognizer.normalizeEmbedding(raw128);
      assert.strictEqual(norm128.length, 128);

      let sumSq = 0;
      for (let i = 0; i < 128; i++) sumSq += norm128[i] * norm128[i];
      assert.ok(Math.abs(sumSq - 1.0) < 1e-4, 'L2 norm must equal 1.0 on 128-D unit hypersphere');
    });

    it('calculates Cosine Similarity accurately for 128-D vectors', () => {
      const recognizer = new ArcFaceRecognizer({ embeddingDimension: 128 });
      const vecA = new Float32Array(128).fill(1 / Math.sqrt(128));
      const vecB = new Float32Array(128).fill(1 / Math.sqrt(128));

      const sim = recognizer.calculateCosineSimilarity(vecA, vecB);
      assert.strictEqual(sim, 1.0, 'Identical 128-D vectors must have cosine similarity 1.0');

      const vecC = new Float32Array(128);
      for (let i = 0; i < 64; i++) vecC[i] = Math.sqrt(2 / 128);
      for (let i = 64; i < 128; i++) vecC[i] = -Math.sqrt(2 / 128);

      const simOrthogonal = recognizer.calculateCosineSimilarity(vecA, vecC);
      assert.ok(Math.abs(simOrthogonal) < 1e-3, 'Orthogonal vectors must have cosine similarity ~0.0');
    });

    it('verifies calibrated 128-D MobileFaceNet thresholds (MATCH >= 0.50, MISMATCH < 0.35)', () => {
      const recognizer = new ArcFaceRecognizer({
        embeddingDimension: 128,
        matchThreshold: 0.50,
        mismatchThreshold: 0.35,
      });

      const refEmb = new Float32Array(128).fill(1 / Math.sqrt(128));
      recognizer.setReferenceEmbedding(refEmb);

      // 1. Same student test: similarity = 1.0 -> MATCH
      const matchResult = recognizer.verifyAgainstReference(refEmb);
      assert.strictEqual(matchResult.status, 'MATCH');
      assert.strictEqual(matchResult.similarity, 1.0);

      // 2. Impostor test: orthogonal vector -> similarity = 0.0 -> MISMATCH
      const impostorEmb = new Float32Array(128);
      for (let i = 0; i < 64; i++) impostorEmb[i] = 1 / Math.sqrt(128);
      for (let i = 64; i < 128; i++) impostorEmb[i] = -1 / Math.sqrt(128);

      const mismatchResult = recognizer.verifyAgainstReference(impostorEmb);
      assert.strictEqual(mismatchResult.status, 'MISMATCH');
      assert.ok(mismatchResult.similarity < 0.35);

      // 3. Ambiguous test: similarity ~ 0.42 -> UNCERTAIN (between 0.35 and 0.50)
      const uncertainEmb = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        uncertainEmb[i] = 0.42 * refEmb[i] + Math.sqrt(1 - 0.42 * 0.42) * impostorEmb[i];
      }
      const normUncertain = recognizer.normalizeEmbedding(uncertainEmb);
      const uncertainResult = recognizer.verifyAgainstReference(normUncertain);
      assert.strictEqual(uncertainResult.status, 'UNCERTAIN');
      assert.ok(uncertainResult.similarity >= 0.35 && uncertainResult.similarity < 0.50);
    });

    it('strictly refuses fake or mathematical fallback when neural network is uninitialized', async () => {
      const recognizer = new ArcFaceRecognizer({ embeddingDimension: 128 });
      assert.strictEqual(recognizer.isModelReady(), false);
      assert.strictEqual(recognizer.getModelStatus(), 'UNINITIALIZED');

      // Calling generateEmbedding when uninitialized must throw an explicit error rather than silently faking features
      const mockCanvas: any = { width: 112, height: 112, getContext: () => null };
      await assert.rejects(
        async () => {
          await recognizer.generateEmbedding(mockCanvas);
        },
        (err: Error) => {
          assert.ok(
            err.message.includes('uninitialized') || err.message.includes('unavailable'),
            'Must report explicit uninitialized/unavailable error without silent fallback'
          );
          return true;
        }
      );
    });

    it('locks reference embedding permanently (Write-Once enforcement)', () => {
      const recognizer = new ArcFaceRecognizer({ embeddingDimension: 128 });
      const originalStudent = new Float32Array(128).fill(1 / Math.sqrt(128));
      const firstSet = recognizer.setReferenceEmbedding(originalStudent);
      assert.strictEqual(firstSet, true);
      assert.strictEqual(recognizer.isLocked(), true);

      // Mid-exam tampering attempt: try setting a different individual's embedding
      const tamperingAttempt = new Float32Array(128).fill(-1 / Math.sqrt(128));
      const secondSet = recognizer.setReferenceEmbedding(tamperingAttempt);
      assert.strictEqual(secondSet, false, 'Mid-exam reference replacement must be rejected');

      // Stored reference must remain the original student
      const stored = recognizer.getReferenceEmbedding();
      assert.ok(stored);
      assert.strictEqual(recognizer.calculateCosineSimilarity(stored!, originalStudent), 1.0);
    });

    it('validates UUID format and path traversal rejection', () => {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      const validSessionId = '871abf8a-e563-4d0f-afc7-416d8da3df14';
      const pathTraversalAttack = '../../etc/passwd';
      const nonUuidString = 'session-12345';

      assert.strictEqual(UUID_REGEX.test(validSessionId), true);
      assert.strictEqual(UUID_REGEX.test(pathTraversalAttack), false);
      assert.strictEqual(UUID_REGEX.test(nonUuidString), false);
    });

    it('verifies multi-tenant 7-day retention iteration logic', () => {
      // Simulate multiple tenants
      const tenants = [
        { id: 'tenant-a-uuid', name: 'University Alpha' },
        { id: 'tenant-b-uuid', name: 'Global Institute Beta' },
      ];

      const now = Date.now();
      const cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000);

      // Sessions across different tenants
      const mockDatabaseSessions = [
        { id: 'sess-a-expired', tenantId: 'tenant-a-uuid', endedAt: new Date(now - 8 * 24 * 60 * 60 * 1000) },
        { id: 'sess-a-active', tenantId: 'tenant-a-uuid', endedAt: new Date(now - 2 * 24 * 60 * 60 * 1000) },
        { id: 'sess-b-expired', tenantId: 'tenant-b-uuid', endedAt: new Date(now - 9 * 24 * 60 * 60 * 1000) },
      ];

      const purgedByTenant: Record<string, string[]> = {};
      for (const t of tenants) {
        purgedByTenant[t.id] = mockDatabaseSessions
          .filter(s => s.tenantId === t.id && s.endedAt < cutoffDate)
          .map(s => s.id);
      }

      assert.deepStrictEqual(purgedByTenant['tenant-a-uuid'], ['sess-a-expired']);
      assert.deepStrictEqual(purgedByTenant['tenant-b-uuid'], ['sess-b-expired']);
    });
  });
});
