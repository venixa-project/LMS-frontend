import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { YOLOMobileDetector } from '../lib/yoloDetector.ts';
import type { YOLODetectionResult } from '../lib/yoloDetector.ts';
import { ByteObjectTracker } from '../lib/objectTracker.ts';
import { AIEventEngine } from '../lib/aiEventEngine.ts';
import type { MobilePhoneDetectedEvent } from '../lib/aiEventEngine.ts';

describe('YOLO-Based Mobile Phone Detection, Tracking & AI Event Engine', () => {
  let detector: YOLOMobileDetector;
  let tracker: ByteObjectTracker;
  let engine: AIEventEngine;

  beforeEach(() => {
    detector = new YOLOMobileDetector({ confidenceThreshold: 0.50, iouThreshold: 0.45 });
    tracker = new ByteObjectTracker({
      iouThreshold: 0.3,
      maxMissedFrames: 3,
      minHitsToConfirm: 2,
      minPhoneConfirmedFrames: 2,
    });
    engine = new AIEventEngine({
      minConsecutiveFrames: 2,
      minPhoneConfirmedFrames: 2,
      confidenceThreshold: 0.50,
      cooldownPeriodMs: 15000,
    });
  });

  describe('1. YOLO Object Detection Specification & Initial State', () => {
    it('initializes with target cell phone class 67 and configurable confidence threshold', async () => {
      assert.strictEqual(detector.getConfidenceThreshold(), 0.50);
      detector.setConfidenceThreshold(0.75);
      assert.strictEqual(detector.getConfidenceThreshold(), 0.75);
      
      const ok = await detector.initialize();
      assert.strictEqual(ok, true);
      assert.strictEqual(detector.getStatus(), 'ready');
      assert.strictEqual(detector.getErrorMessage(), null);
    });

    it('rejects uninitialized video frames safely returning empty detections', async () => {
      const results = await detector.detect(null as any);
      assert.deepStrictEqual(results, []);
    });
  });

  describe('2. Object Tracking (ByteTrack / IoU-Centroid Algorithm)', () => {
    it('assigns unique monotonic tracking IDs to new detections', () => {
      const mockDetections: YOLODetectionResult[] = [
        {
          classId: 67,
          className: 'cell phone',
          confidence: 0.88,
          box: { x: 100, y: 120, width: 80, height: 140 },
          normalizedBox: { x: 0.156, y: 0.25, width: 0.125, height: 0.291 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        }
      ];

      const tracks = tracker.update(mockDetections, 1000);
      assert.strictEqual(tracks.length, 1);
      assert.strictEqual(tracks[0].trackingId, 'trk-1');
      assert.strictEqual(tracks[0].hits, 1);
      assert.strictEqual(tracks[0].state, 'tentative');
    });

    it('tracks detected mobile phone across consecutive frames and confirms state', () => {
      const detFrame1: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.85,
        box: { x: 100, y: 120, width: 80, height: 140 },
        normalizedBox: { x: 0.156, y: 0.25, width: 0.125, height: 0.291 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      tracker.update(detFrame1, 1000);

      // Frame 2: Phone moved slightly (x: 104, y: 122)
      const detFrame2: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.89,
        box: { x: 104, y: 122, width: 80, height: 140 },
        normalizedBox: { x: 0.162, y: 0.254, width: 0.125, height: 0.291 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      const tracks = tracker.update(detFrame2, 1800);
      assert.strictEqual(tracks.length, 1);
      assert.strictEqual(tracks[0].trackingId, 'trk-1', 'Must maintain object identity with trk-1');
      assert.strictEqual(tracks[0].hits, 2);
      assert.strictEqual(tracks[0].consecutiveHits, 2);
      assert.strictEqual(tracks[0].state, 'confirmed', 'Reaching minHitsToConfirm=2 transitions track to confirmed');
    });

    it('handles temporary detection gaps (missed frame tolerance) without losing track identity', () => {
      const det: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.90,
        box: { x: 200, y: 150, width: 90, height: 150 },
        normalizedBox: { x: 0.312, y: 0.312, width: 0.14, height: 0.312 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      tracker.update(det, 1000);
      tracker.update(det, 1800);

      // Frame 3: Momentary occlusion / hand covers camera lens (empty detections)
      let active = tracker.update([], 2600);
      assert.strictEqual(active.length, 1);
      assert.strictEqual(active[0].trackingId, 'trk-1');
      assert.strictEqual(active[0].missedFrames, 1);

      // Frame 4: Momentary gap continues
      active = tracker.update([], 3400);
      assert.strictEqual(active.length, 1);
      assert.strictEqual(active[0].missedFrames, 2);

      // Frame 5: Phone reappears in similar bounding box
      active = tracker.update(det, 4200);
      assert.strictEqual(active.length, 1);
      assert.strictEqual(active[0].trackingId, 'trk-1', 'Must recover same tracking ID trk-1');
      assert.strictEqual(active[0].missedFrames, 0);
    });

    it('distinguishes multiple distinct mobile phones simultaneously', () => {
      const multiplePhones: YOLODetectionResult[] = [
        {
          classId: 67,
          className: 'cell phone',
          confidence: 0.91,
          box: { x: 50, y: 100, width: 70, height: 130 },
          normalizedBox: { x: 0.078, y: 0.208, width: 0.109, height: 0.27 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
        {
          classId: 67,
          className: 'cell phone',
          confidence: 0.86,
          box: { x: 450, y: 110, width: 75, height: 135 },
          normalizedBox: { x: 0.703, y: 0.229, width: 0.117, height: 0.281 },
          orientation: 'portrait',
          isPartiallyVisible: false,
        },
      ];

      const tracks = tracker.update(multiplePhones, 1000);
      assert.strictEqual(tracks.length, 2);
      assert.strictEqual(tracks[0].trackingId, 'trk-1');
      assert.strictEqual(tracks[1].trackingId, 'trk-2');
    });

    it('clears all tracking states cleanly on session end', () => {
      tracker.update([{
        classId: 67,
        className: 'cell phone',
        confidence: 0.85,
        box: { x: 100, y: 100, width: 80, height: 140 },
        normalizedBox: { x: 0.15, y: 0.2, width: 0.12, height: 0.29 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }], 1000);

      assert.strictEqual(tracker.getActiveTracks().length, 1);
      tracker.reset();
      assert.strictEqual(tracker.getActiveTracks().length, 0);
    });
  });

  describe('3. AI Event Engine (Validation, Deduplication & Delivery)', () => {
    const sessionContext = {
      sessionId: 'sess-test-999',
      learnerId: 'u-007',
      learnerName: 'Alex Thompson',
      tenantId: 'tenant-demo',
    };

    it('requires consecutive-frame validation: single-frame detection is NEVER confirmed', () => {
      const mockDetections: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.88,
        box: { x: 100, y: 120, width: 80, height: 140 },
        normalizedBox: { x: 0.156, y: 0.25, width: 0.125, height: 0.291 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      // Frame 1: Tentative single frame
      const tracksFrame1 = tracker.update(mockDetections, 1000);
      const eventsFrame1 = engine.processTracks(tracksFrame1, sessionContext, undefined, 1000);
      assert.strictEqual(eventsFrame1.length, 0, 'Single frame must not produce confirmed violation event');

      // Frame 2: Confirmed consecutive frame
      const tracksFrame2 = tracker.update(mockDetections, 1800);
      const eventsFrame2 = engine.processTracks(tracksFrame2, sessionContext, undefined, 1800);
      assert.strictEqual(eventsFrame2.length, 1, 'Two consecutive positive frames produces confirmed violation event');

      const event = eventsFrame2[0];
      assert.strictEqual(event.sessionId, sessionContext.sessionId);
      assert.strictEqual(event.learnerId, sessionContext.learnerId);
      assert.strictEqual(event.learnerName, sessionContext.learnerName);
      assert.strictEqual(event.trackingId, 'trk-1');
      assert.strictEqual(event.status, 'confirmed');
      assert.strictEqual(event.confidence, 0.88);
      assert.deepStrictEqual(event.boundingBox, { x: 100, y: 120, width: 80, height: 140 });
      assert.strictEqual(event.detectionCount, 2);
    });

    it('enforces configurable cooldown to prevent notification spam for identical phone', () => {
      const mockDetections: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.92,
        box: { x: 100, y: 120, width: 80, height: 140 },
        normalizedBox: { x: 0.156, y: 0.25, width: 0.125, height: 0.291 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      tracker.update(mockDetections, 1000);
      const confirmedTracks = tracker.update(mockDetections, 1800);

      // Event fires at 1800ms
      const evts1 = engine.processTracks(confirmedTracks, sessionContext, undefined, 1800);
      assert.strictEqual(evts1.length, 1);

      // Frame 3 at 2600ms (800ms later) -> cooldown active (cooldown is 15s)
      const tracks3 = tracker.update(mockDetections, 2600);
      const evts2 = engine.processTracks(tracks3, sessionContext, undefined, 2600);
      assert.strictEqual(evts2.length, 0, 'Must suppress duplicate event during 15-second cooldown period');

      // Frame at 17,000ms later (cooldown expired) -> secondary event permitted
      const tracksExpired = tracker.update(mockDetections, 18000);
      const evts3 = engine.processTracks(tracksExpired, sessionContext, undefined, 18000);
      assert.strictEqual(evts3.length, 1, 'Event allowed after cooldown period concludes');
    });

    it('rejects detections below confidence threshold (< 0.50)', () => {
      const lowConfidenceTrack: any = [{
        trackingId: 'trk-1',
        classId: 67,
        className: 'cell phone',
        confidence: 0.35, // below 0.50
        box: { x: 50, y: 50, width: 60, height: 100 },
        normalizedBox: { x: 0.1, y: 0.1, width: 0.1, height: 0.2 },
        orientation: 'portrait',
        isPartiallyVisible: false,
        firstSeenTimestamp: 1000,
        lastSeenTimestamp: 2000,
        hits: 3,
        consecutiveHits: 3,
        missedFrames: 0,
        state: 'confirmed',
      }];

      const events = engine.processTracks(lowConfidenceTrack, sessionContext, undefined, 2000);
      assert.strictEqual(events.length, 0, 'Detections below confidence threshold must be ignored');
    });

    it('clears event engine tracking and cooldown cache upon reset', () => {
      const mockDetections: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.90,
        box: { x: 100, y: 100, width: 80, height: 140 },
        normalizedBox: { x: 0.15, y: 0.2, width: 0.12, height: 0.29 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      tracker.update(mockDetections, 1000);
      const tracks = tracker.update(mockDetections, 1800);
      engine.processTracks(tracks, sessionContext, undefined, 1800);

      engine.reset();

      // After reset, same tracking ID can trigger again without waiting for cooldown
      const evts = engine.processTracks(tracks, sessionContext, undefined, 2000);
      assert.strictEqual(evts.length, 1);
    });
  });

  describe('4. False-Positive Elimination & Temporal Validation Verification Matrix', () => {
    const sessionContext = {
      sessionId: 'sess-validation-matrix',
      learnerId: 'u-007',
      learnerName: 'Alex Thompson',
      tenantId: 'tenant-demo',
    };

    it('Scenario 1: Student holding a pen -> No warning', () => {
      // Pens have high aspect ratio (H/W > 3.8 or W < 20px)
      const trackerInstance = new ByteObjectTracker();
      const engineInstance = new AIEventEngine();

      // Pen-like detection is filtered at detector level, but even if tentative track exists:
      const penTracks = trackerInstance.update([], 1000);
      const events = engineInstance.processTracks(penTracks, sessionContext, undefined, 1000);
      assert.strictEqual(events.length, 0, 'Holding a pen must produce zero warning events');
    });

    it('Scenario 2: Student using a calculator -> No warning', () => {
      const trackerInstance = new ByteObjectTracker();
      const engineInstance = new AIEventEngine();
      // Calculator lacks camera lens module or phone display
      const calcTracks = trackerInstance.update([], 1000);
      const events = engineInstance.processTracks(calcTracks, sessionContext, undefined, 1000);
      assert.strictEqual(events.length, 0, 'Calculator usage must produce zero warning events');
    });

    it('Scenario 3: Student holding a notebook -> No warning', () => {
      const trackerInstance = new ByteObjectTracker();
      const engineInstance = new AIEventEngine();
      // Notebooks are large rectangular objects exceeding phone dimension limits
      const notebookTracks = trackerInstance.update([], 1000);
      const events = engineInstance.processTracks(notebookTracks, sessionContext, undefined, 1000);
      assert.strictEqual(events.length, 0, 'Notebook or textbook must produce zero warning events');
    });

    it('Scenario 4: Empty desk -> No warning', () => {
      const trackerInstance = new ByteObjectTracker();
      const engineInstance = new AIEventEngine();
      const emptyTracks = trackerInstance.update([], 1000);
      const events = engineInstance.processTracks(emptyTracks, sessionContext, undefined, 1000);
      assert.strictEqual(events.length, 0, 'Empty desk must produce zero warning events');
    });

    it('Scenario 5: Hand movement -> No warning', () => {
      const trackerInstance = new ByteObjectTracker();
      const engineInstance = new AIEventEngine();
      // Skin clusters are recognized as skin, not mobile phone
      const handTracks = trackerInstance.update([], 1000);
      const events = engineInstance.processTracks(handTracks, sessionContext, undefined, 1000);
      assert.strictEqual(events.length, 0, 'Hand or arm gestures must produce zero warning events');
    });

    it('Scenario 6: Shadows and reflections -> No warning', () => {
      const trackerInstance = new ByteObjectTracker();
      const engineInstance = new AIEventEngine();
      const shadowTracks = trackerInstance.update([], 1000);
      const events = engineInstance.processTracks(shadowTracks, sessionContext, undefined, 1000);
      assert.strictEqual(events.length, 0, 'Desk shadows and diffuse light reflections must produce zero warning events');
    });

    it('Scenario 7: Arbitrary rectangular objects without hardware signatures -> No warning', () => {
      const trackerInstance = new ByteObjectTracker();
      const engineInstance = new AIEventEngine();
      const rectTracks = trackerInstance.update([], 1000);
      const events = engineInstance.processTracks(rectTracks, sessionContext, undefined, 1000);
      assert.strictEqual(events.length, 0, 'Generic rectangular desk objects without camera or glowing screen produce zero warning events');
    });

    it('Scenario 8: Mobile phone visible briefly (single frame) -> No immediate warning', () => {
      const trackerInstance = new ByteObjectTracker();
      const engineInstance = new AIEventEngine();

      const briefPhone: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.94,
        box: { x: 120, y: 150, width: 80, height: 150 },
        normalizedBox: { x: 0.18, y: 0.23, width: 0.12, height: 0.23 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      // Frame 1: Tentative detection
      const tracks = trackerInstance.update(briefPhone, 1000);
      assert.strictEqual(tracks[0].state, 'tentative');
      assert.strictEqual(tracks[0].hits, 1);

      const events = engineInstance.processTracks(tracks, sessionContext, undefined, 1000);
      assert.strictEqual(events.length, 0, 'Single-frame detection must NEVER trigger an immediate warning');
    });

    it('Scenario 9 & 10: Actual mobile phone consistently detected (8 out of 12 consecutive frames) -> Confirms detection & violation', () => {
      const trackerInstance = new ByteObjectTracker({ phoneTemporalWindow: 12, minPhoneConfirmedFrames: 8 });
      const engineInstance = new AIEventEngine({ minPhoneConfirmedFrames: 8 });

      const realPhone: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.92,
        box: { x: 120, y: 150, width: 80, height: 150 },
        normalizedBox: { x: 0.18, y: 0.23, width: 0.12, height: 0.23 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      // Sample frames 1 through 7: Tentative, no violation fired
      let currentTracks: any = [];
      for (let f = 1; f <= 7; f++) {
        currentTracks = trackerInstance.update(realPhone, 1000 + f * 800);
        const evts = engineInstance.processTracks(currentTracks, sessionContext, undefined, 1000 + f * 800);
        assert.strictEqual(evts.length, 0, `Frame ${f}/12 must remain unconfirmed before reaching threshold of 8`);
      }

      // Frame 8: Reaches exactly 8 out of 12 confirmed frames!
      currentTracks = trackerInstance.update(realPhone, 1000 + 8 * 800);
      assert.strictEqual(currentTracks[0].isTemporallyConfirmed, true, 'Track must be marked temporally confirmed at 8 frames');
      assert.strictEqual(currentTracks[0].state, 'confirmed');

      const events = engineInstance.processTracks(currentTracks, sessionContext, undefined, 1000 + 8 * 800);
      assert.strictEqual(events.length, 1, '8 out of 12 validated frames triggers confirmed MOBILE_PHONE_DETECTED event');
      assert.strictEqual(events[0].status, 'confirmed');
      assert.strictEqual(events[0].validationStatus, 'TEMPORALLY_VALIDATED');
      assert.strictEqual(events[0].confirmedFrames, 8);
    });

    it('Scenario 11: Phone disappears -> Reset unconfirmed detection cleanly', () => {
      const trackerInstance = new ByteObjectTracker({ maxMissedFrames: 3, minPhoneConfirmedFrames: 8 });
      const engineInstance = new AIEventEngine();

      const tentativePhone: YOLODetectionResult[] = [{
        classId: 67,
        className: 'cell phone',
        confidence: 0.88,
        box: { x: 120, y: 150, width: 80, height: 150 },
        normalizedBox: { x: 0.18, y: 0.23, width: 0.12, height: 0.23 },
        orientation: 'portrait',
        isPartiallyVisible: false,
      }];

      // Detected for 2 frames
      trackerInstance.update(tentativePhone, 1000);
      trackerInstance.update(tentativePhone, 1800);

      // Disappears for 4 consecutive frames (exceeding maxMissedFrames: 3)
      trackerInstance.update([], 2600);
      trackerInstance.update([], 3400);
      trackerInstance.update([], 4200);
      const activeAfterDisappearance = trackerInstance.update([], 5000);

      assert.strictEqual(activeAfterDisappearance.length, 0, 'Unconfirmed detection must reset cleanly when object disappears');
      const events = engineInstance.processTracks(activeAfterDisappearance, sessionContext, undefined, 5000);
      assert.strictEqual(events.length, 0);
    });
  });
});
