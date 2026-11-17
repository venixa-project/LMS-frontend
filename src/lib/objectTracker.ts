/**
 * ByteTrack-Inspired Multi-Class Object & Face Tracker
 * 
 * Algorithm:
 * - High-speed Two-Stage Matching (IoU similarity + Centroid Proximity)
 * - Class-Aware Association: Faces (classId 0) track independently from Phones (classId 67)
 * - Persistent Monotonic ID assignment:
 *     - 'face-1', 'face-2'... for human faces
 *     - 'trk-1', 'trk-2'... for mobile devices
 * - Bounding box trajectory smoothing via Exponential Moving Average (EMA)
 * - Handles temporary detection gaps / occlusions across configurable missed frame window
 * - Clean state reset upon exam session end
 */

import type { YOLOBoundingBox, YOLODetectionResult } from './yoloDetector.ts';

export type TrackState = 'tentative' | 'confirmed' | 'lost';

export interface TrackedObject {
  trackingId: string;
  classId: number;
  className: string;
  box: YOLOBoundingBox;
  normalizedBox: YOLOBoundingBox;
  confidence: number;
  orientation: 'portrait' | 'landscape' | 'tilted';
  isPartiallyVisible: boolean;
  firstSeenTimestamp: number;
  lastSeenTimestamp: number;
  hits: number;
  consecutiveHits: number;
  missedFrames: number;
  state: TrackState;
}

export interface ByteTrackerConfig {
  iouThreshold: number; // default: 0.30
  maxMissedFrames: number; // default: 3
  minHitsToConfirm: number; // default: 2
}

export class ByteObjectTracker {
  private config: ByteTrackerConfig;
  private tracks: Map<string, TrackedObject> = new Map();
  private nextTrackSequence = 1;
  private nextFaceSequence = 1;

  constructor(config?: Partial<ByteTrackerConfig>) {
    this.config = {
      iouThreshold: config?.iouThreshold ?? 0.30,
      maxMissedFrames: config?.maxMissedFrames ?? 3,
      minHitsToConfirm: config?.minHitsToConfirm ?? 2,
    };
  }

  /**
   * Resets all active tracks when exam session concludes.
   */
  public reset(): void {
    this.tracks.clear();
    this.nextTrackSequence = 1;
    this.nextFaceSequence = 1;
  }

  /**
   * Returns all currently active tracks.
   */
  public getActiveTracks(): TrackedObject[] {
    return Array.from(this.tracks.values()).filter(t => t.state !== 'lost');
  }

  /**
   * Returns all active face tracks.
   */
  public getFaceTracks(): TrackedObject[] {
    return this.getActiveTracks().filter(t => t.classId === 0 || t.className === 'face');
  }

  /**
   * Returns all active mobile phone tracks.
   */
  public getPhoneTracks(): TrackedObject[] {
    return this.getActiveTracks().filter(t => t.classId === 67 || t.className === 'cell phone');
  }

  /**
   * Returns confirmed active tracks (validated across multiple frames).
   */
  public getConfirmedTracks(): TrackedObject[] {
    return Array.from(this.tracks.values()).filter(t => t.state === 'confirmed');
  }

  /**
   * Calculates IoU between two bounding boxes.
   */
  private calculateIoU(boxA: YOLOBoundingBox, boxB: YOLOBoundingBox): number {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA.width * boxA.height;
    const boxBArea = boxB.width * boxB.height;
    const unionArea = boxAArea + boxBArea - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  /**
   * Calculates normalized Euclidean centroid distance between two boxes.
   */
  private calculateCentroidDistance(boxA: YOLOBoundingBox, boxB: YOLOBoundingBox): number {
    const cAx = boxA.x + boxA.width / 2;
    const cAy = boxA.y + boxA.height / 2;
    const cBx = boxB.x + boxB.width / 2;
    const cBy = boxB.y + boxB.height / 2;
    const dx = cAx - cBx;
    const dy = cAy - cBy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Updates tracker with current frame's YOLO detections.
   * Performs class-aware bipartite matching using IoU and centroid proximity.
   */
  public update(detections: YOLODetectionResult[], timestamp: number = Date.now()): TrackedObject[] {
    const matchedTrackIds = new Set<string>();
    const matchedDetectionIndices = new Set<number>();

    const trackEntries = Array.from(this.tracks.entries()).filter(
      ([, track]) => track.state !== 'lost'
    );

    // Compute cost matrix: Class matching + IoU similarity + Centroid proximity
    const matches: Array<{ trackId: string; detIndex: number; score: number }> = [];

    for (const [trackId, track] of trackEntries) {
      for (let d = 0; d < detections.length; d++) {
        const det = detections[d];
        // Enforce strict class matching (faces only match face tracks, phones only match phone tracks)
        if (track.classId !== det.classId) continue;

        const iou = this.calculateIoU(track.box, det.box);
        const centroidDist = this.calculateCentroidDistance(track.box, det.box);
        const maxDiagonal = Math.sqrt(
          Math.max(track.box.width, det.box.width) ** 2 +
          Math.max(track.box.height, det.box.height) ** 2
        ) * 2;

        const isCloseCentroid = centroidDist <= Math.max(100, maxDiagonal);

        if (iou >= this.config.iouThreshold || (isCloseCentroid && iou > 0.05)) {
          const score = iou * 0.7 + (1 - Math.min(1, centroidDist / 300)) * 0.3;
          matches.push({ trackId, detIndex: d, score });
        }
      }
    }

    // Sort matches descending by score
    matches.sort((a, b) => b.score - a.score);

    for (const match of matches) {
      if (matchedTrackIds.has(match.trackId) || matchedDetectionIndices.has(match.detIndex)) {
        continue;
      }

      const track = this.tracks.get(match.trackId);
      const det = detections[match.detIndex];
      if (!track || !det) continue;

      matchedTrackIds.add(match.trackId);
      matchedDetectionIndices.add(match.detIndex);

      // Smooth bounding box (exponential moving average: 0.7 current + 0.3 previous)
      const alpha = 0.7;
      track.box = {
        x: Math.round(track.box.x * (1 - alpha) + det.box.x * alpha),
        y: Math.round(track.box.y * (1 - alpha) + det.box.y * alpha),
        width: Math.round(track.box.width * (1 - alpha) + det.box.width * alpha),
        height: Math.round(track.box.height * (1 - alpha) + det.box.height * alpha),
      };
      track.normalizedBox = det.normalizedBox;
      track.confidence = Number((track.confidence * 0.3 + det.confidence * 0.7).toFixed(3));
      track.orientation = det.orientation;
      track.isPartiallyVisible = det.isPartiallyVisible;
      track.lastSeenTimestamp = timestamp;
      track.hits++;
      track.consecutiveHits++;
      track.missedFrames = 0;

      if (track.consecutiveHits >= this.config.minHitsToConfirm) {
        track.state = 'confirmed';
      }
    }

    // Handle unmatched existing tracks (missed frame gap)
    for (const [trackId, track] of trackEntries) {
      if (!matchedTrackIds.has(trackId)) {
        track.missedFrames++;
        track.consecutiveHits = 0;

        if (track.missedFrames > this.config.maxMissedFrames) {
          track.state = 'lost';
        }
      }
    }

    // Spawn new tracks for unmatched detections
    for (let d = 0; d < detections.length; d++) {
      if (!matchedDetectionIndices.has(d)) {
        const det = detections[d];
        const newTrackId = det.classId === 0
          ? `face-${this.nextFaceSequence++}`
          : `trk-${this.nextTrackSequence++}`;

        const newTrack: TrackedObject = {
          trackingId: newTrackId,
          classId: det.classId,
          className: det.className,
          box: { ...det.box },
          normalizedBox: { ...det.normalizedBox },
          confidence: det.confidence,
          orientation: det.orientation,
          isPartiallyVisible: det.isPartiallyVisible,
          firstSeenTimestamp: timestamp,
          lastSeenTimestamp: timestamp,
          hits: 1,
          consecutiveHits: 1,
          missedFrames: 0,
          state: this.config.minHitsToConfirm <= 1 ? 'confirmed' : 'tentative',
        };
        this.tracks.set(newTrackId, newTrack);
      }
    }

    // Clean up permanently lost tracks older than 15 seconds
    const pruneCutoff = timestamp - 15000;
    for (const [id, track] of this.tracks.entries()) {
      if (track.state === 'lost' && track.lastSeenTimestamp < pruneCutoff) {
        this.tracks.delete(id);
      }
    }

    return this.getActiveTracks();
  }
}

export const byteObjectTracker = new ByteObjectTracker();
