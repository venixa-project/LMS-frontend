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
  
  // Temporal Sliding Window Validation (8 out of 12 sampled frames)
  frameHistory: boolean[];
  confirmedFramesCount: number;
  isTemporallyConfirmed: boolean;
  movementStability: number;
}

export interface ByteTrackerConfig {
  iouThreshold: number; // default: 0.30
  maxMissedFrames: number; // default: 4
  minHitsToConfirm: number; // default: 2
  phoneTemporalWindow: number; // default: 12 sampled frames
  minPhoneConfirmedFrames: number; // default: 8 out of 12 frames
  faceTemporalWindow?: number; // default: 12 sampled frames
  minMultiFaceConfirmedFrames?: number; // default: 8 out of 12 frames
}

export class ByteObjectTracker {
  private config: ByteTrackerConfig;
  private tracks: Map<string, TrackedObject> = new Map();
  private nextTrackSequence = 1;
  private nextFaceSequence = 1;

  constructor(config?: Partial<ByteTrackerConfig>) {
    const minHits = config?.minHitsToConfirm ?? 2;
    const phoneFrames = config?.minPhoneConfirmedFrames ?? 8;
    const multiFaceFrames = config?.minMultiFaceConfirmedFrames ?? 8;
    this.config = {
      iouThreshold: config?.iouThreshold ?? 0.30,
      maxMissedFrames: config?.maxMissedFrames ?? 4,
      minHitsToConfirm: minHits,
      phoneTemporalWindow: config?.phoneTemporalWindow ?? 12,
      minPhoneConfirmedFrames: phoneFrames,
      faceTemporalWindow: config?.faceTemporalWindow ?? 12,
      minMultiFaceConfirmedFrames: multiFaceFrames,
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
   * Returns confirmed active face tracks:
   * - Primary student face: confirmed when hits >= minHitsToConfirm (fast response for genuine candidate).
   * - Secondary / additional faces: confirmed ONLY after temporal sliding-window validation (>= 8/12 frames).
   */
  public getConfirmedFaceTracks(): TrackedObject[] {
    const faceTracks = this.getFaceTracks();
    if (faceTracks.length === 0) return [];

    // Sort descending by hits so the continuous candidate face is primary
    faceTracks.sort((a, b) => b.hits - a.hits);

    const primaryFace = faceTracks[0];
    const confirmedList: TrackedObject[] = [];

    const minHits = this.config.minHitsToConfirm;
    const minMulti = this.config.minMultiFaceConfirmedFrames ?? 8;

    if (primaryFace.hits >= minHits || primaryFace.state === 'confirmed') {
      confirmedList.push(primaryFace);
    }

    // Secondary / extra persons must be strictly confirmed via temporal validation
    for (let i = 1; i < faceTracks.length; i++) {
      const extra = faceTracks[i];
      if (extra.isTemporallyConfirmed || (extra.state === 'confirmed' && extra.hits >= minMulti)) {
        confirmedList.push(extra);
      }
    }

    return confirmedList;
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

      // Temporal frame history update
      const temporalWindow = track.classId === 67
        ? this.config.phoneTemporalWindow
        : (this.config.faceTemporalWindow ?? 12);
      const minRequiredFrames = track.classId === 67
        ? this.config.minPhoneConfirmedFrames
        : (this.config.minMultiFaceConfirmedFrames ?? 8);

      if (!track.frameHistory) track.frameHistory = [];
      track.frameHistory.push(true);
      if (track.frameHistory.length > temporalWindow) {
        track.frameHistory.shift();
      }
      track.confirmedFramesCount = track.frameHistory.filter(Boolean).length;
      track.isTemporallyConfirmed = track.confirmedFramesCount >= minRequiredFrames && track.hits >= minRequiredFrames;

      // Confirmation rule:
      // Phone: confirmed when temporally validated (8/12 frames) or minHitsToConfirm reached
      // Face:
      // - Primary face (candidate): confirmed when consecutiveHits >= minHitsToConfirm
      // - Secondary / extra face: confirmed ONLY when isTemporallyConfirmed (8/12 frames) or minMultiFaceConfirmedFrames reached
      if (track.classId === 67) {
        if (track.isTemporallyConfirmed || track.hits >= minRequiredFrames) {
          track.state = 'confirmed';
        } else {
          track.state = 'tentative';
        }
      } else {
        const isPrimary = track.trackingId === 'face-1' || track.hits > 5;
        if (isPrimary) {
          if (track.consecutiveHits >= this.config.minHitsToConfirm) {
            track.state = 'confirmed';
          }
        } else {
          if (track.isTemporallyConfirmed || track.hits >= minRequiredFrames) {
            track.state = 'confirmed';
          } else {
            track.state = 'tentative';
          }
        }
      }
    }

    // Handle unmatched existing tracks (missed frame gap)
    for (const [trackId, track] of trackEntries) {
      if (!matchedTrackIds.has(trackId)) {
        track.missedFrames++;
        track.consecutiveHits = 0;

        const temporalWindow = track.classId === 67
          ? this.config.phoneTemporalWindow
          : (this.config.faceTemporalWindow ?? 12);
        const minRequiredFrames = track.classId === 67
          ? this.config.minPhoneConfirmedFrames
          : (this.config.minMultiFaceConfirmedFrames ?? 8);

        if (!track.frameHistory) track.frameHistory = [];
        track.frameHistory.push(false);
        if (track.frameHistory.length > temporalWindow) {
          track.frameHistory.shift();
        }
        track.confirmedFramesCount = track.frameHistory.filter(Boolean).length;
        track.isTemporallyConfirmed = track.confirmedFramesCount >= minRequiredFrames && track.hits >= minRequiredFrames;

        // If an unconfirmed tentative extra face disappears for 2 missed frames, immediately drop it
        const maxMiss = (track.classId === 0 && track.state === 'tentative') ? 2 : this.config.maxMissedFrames;
        if (track.missedFrames > maxMiss) {
          track.state = 'lost';
        }
      }
    }

    // Spawn new tracks for unmatched detections
    for (let d = 0; d < detections.length; d++) {
      if (!matchedDetectionIndices.has(d)) {
        const det = detections[d];

        // Deduplication safeguard for faces: Do not spawn a new face track if this detection
        // is physically overlapping or very close to any active face track
        if (det.classId === 0) {
          let mergedWithExisting = false;
          for (const [, existingTrack] of this.tracks.entries()) {
            if (existingTrack.classId === 0 && existingTrack.state !== 'lost') {
              const iou = this.calculateIoU(existingTrack.box, det.box);
              const centroidDist = this.calculateCentroidDistance(existingTrack.box, det.box);
              const avgW = (existingTrack.box.width + det.box.width) / 2;
              const avgH = (existingTrack.box.height + det.box.height) / 2;
              if (iou >= 0.15 || (centroidDist < avgW * 0.65 && Math.abs((existingTrack.box.y + existingTrack.box.height / 2) - (det.box.y + det.box.height / 2)) < avgH * 0.45)) {
                // Merge into existing track
                existingTrack.box = {
                  x: Math.min(existingTrack.box.x, det.box.x),
                  y: Math.min(existingTrack.box.y, det.box.y),
                  width: Math.max(existingTrack.box.x + existingTrack.box.width, det.box.x + det.box.width) - Math.min(existingTrack.box.x, det.box.x),
                  height: Math.max(existingTrack.box.y + existingTrack.box.height, det.box.y + det.box.height) - Math.min(existingTrack.box.y, det.box.y),
                };
                existingTrack.lastSeenTimestamp = timestamp;
                existingTrack.hits++;
                existingTrack.consecutiveHits++;
                existingTrack.missedFrames = 0;
                mergedWithExisting = true;
                break;
              }
            }
          }
          if (mergedWithExisting) continue;
        }

        const newTrackId = det.classId === 0
          ? `face-${this.nextFaceSequence++}`
          : `trk-${this.nextTrackSequence++}`;

        const isInitiallyConfirmed = this.config.minHitsToConfirm <= 1;

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
          state: isInitiallyConfirmed ? 'confirmed' : 'tentative',
          frameHistory: [true],
          confirmedFramesCount: 1,
          isTemporallyConfirmed: (det.classId === 67 ? this.config.minPhoneConfirmedFrames : (this.config.minMultiFaceConfirmedFrames ?? 8)) <= 1,
          movementStability: 1.0,
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
