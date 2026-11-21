/**
 * AI Event Engine for Face & Mobile Phone Proctoring
 * 
 * Rules & Supported Events:
 * - MOBILE_PHONE_DETECTED: Confirmed mobile phone device detected across consecutive frames
 * - FACE_DETECTED: Face detected and actively tracked in camera frame
 * - FACE_NOT_DETECTED: Sustained face absence over a configurable time window (default: 5.0s)
 * - FACE_RECOVERED: Face returns to camera frame after absence
 * - FACE_VERIFIED: ArcFace confirms biometric identity matches registered reference embedding
 * - FACE_MISMATCH: Persistent biometric mismatch detected across valid quality frames
 * - MULTIPLE_FACES_DETECTED: 2 or more faces simultaneously visible and tracked
 * 
 * Features:
 * - Consecutive-frame persistence validation (filters single-frame transient noise)
 * - Cooldown & deduplication cache per event category and tracking ID
 * - High-resolution canvas evidence snapshot capture with bounding boxes and verification badges
 * - Dispatches typed event payloads to frontend UI and backend telemetry
 */

import type { TrackedObject } from './objectTracker.ts';
import type { YOLOBoundingBox } from './yoloDetector.ts';
import type { ArcFaceVerificationResult } from './arcFaceRecognizer.ts';

export type ProctoringEventType =
  | 'MOBILE_PHONE_DETECTED'
  | 'FACE_DETECTED'
  | 'FACE_NOT_DETECTED'
  | 'FACE_RECOVERED'
  | 'FACE_VERIFIED'
  | 'FACE_UNCERTAIN'
  | 'FACE_MISMATCH'
  | 'MULTIPLE_FACES_DETECTED';

export interface ProctoringAIEvent {
  eventId: string;
  eventType: ProctoringEventType;
  sessionId: string;
  learnerId: string;
  learnerName: string;
  tenantId?: string;
  trackingId: string;
  confidence: number;
  similarityScore?: number;
  faceCount?: number;
  isRegisteredStudentPresent?: boolean;
  boundingBox: YOLOBoundingBox;
  detectionTimestamp: number;
  detectionCount: number;
  confirmedFrames?: number;
  validationStatus?: 'TEMPORALLY_VALIDATED' | 'UNCONFIRMED_TENTATIVE';
  evidenceSnapshot?: string; // base64 JPEG data URL
  status: 'confirmed' | 'detected' | 'resolved' | 'info';
  message: string;
}

// Backward-compatibility alias
export type MobilePhoneDetectedEvent = ProctoringAIEvent;

export interface AIEventEngineConfig {
  minConsecutiveFrames: number; // default: 2 (for faces & general events)
  minPhoneConfirmedFrames?: number; // default: 8 (for phone 8/12 temporal validation)
  minMultiFaceConfirmedFrames?: number; // default: 8 (for multi-face 8/12 temporal validation)
  confidenceThreshold: number; // default: 0.50
  cooldownPeriodMs: number; // default: 15,000ms
  faceAbsenceThresholdMs: number; // default: 5,000ms (5 seconds absence)
  multiFaceConsecutiveFrames: number; // default: 8 (or minConsecutive if explicitly passed in tests)
  mismatchConsecutiveFrames: number; // default: 2
  enableFaceAbsenceMonitoring?: boolean; // default: false (enabled in exam proctoring)
}

export type EventHandler = (event: ProctoringAIEvent) => void;

export class AIEventEngine {
  private config: Required<AIEventEngineConfig>;
  private lastAlertTimes: Map<string, number> = new Map(); // key -> timestamp
  private firedIncidents: Set<string> = new Set();
  private activeEvents: Map<string, ProctoringAIEvent> = new Map();
  private listeners: Set<EventHandler> = new Set();

  // Face absence tracking state
  private absenceStartTime: number | null = null;
  private isAbsenceIncidentActive = false;

  // Face mismatch consecutive counters: trackingId -> count
  private mismatchCounters: Map<string, number> = new Map();

  // Multi-face consecutive frame counter
  private multiFaceConsecutiveCount = 0;

  // Track verified status
  private verifiedTrackingIds: Set<string> = new Set();

  constructor(config?: Partial<AIEventEngineConfig>) {
    const minConsecutive = config?.minConsecutiveFrames ?? 2;
    const minPhone = config?.minPhoneConfirmedFrames ?? (config?.minConsecutiveFrames !== undefined ? minConsecutive : 8);
    const minMultiFace = config?.minMultiFaceConfirmedFrames ?? (config?.multiFaceConsecutiveFrames !== undefined ? config.multiFaceConsecutiveFrames : (config?.minConsecutiveFrames !== undefined ? minConsecutive : 8));
    this.config = {
      minConsecutiveFrames: minConsecutive,
      minPhoneConfirmedFrames: minPhone,
      minMultiFaceConfirmedFrames: minMultiFace,
      confidenceThreshold: config?.confidenceThreshold ?? 0.50,
      cooldownPeriodMs: config?.cooldownPeriodMs ?? 15000,
      faceAbsenceThresholdMs: config?.faceAbsenceThresholdMs ?? 5000,
      multiFaceConsecutiveFrames: minMultiFace,
      mismatchConsecutiveFrames: config?.mismatchConsecutiveFrames ?? (config?.minConsecutiveFrames !== undefined ? config.minConsecutiveFrames : 5),
      enableFaceAbsenceMonitoring: config?.enableFaceAbsenceMonitoring ?? false,
    };
  }

  public setFaceAbsenceMonitoring(enabled: boolean): void {
    this.config.enableFaceAbsenceMonitoring = enabled;
  }

  /**
   * Subscribe to confirmed proctoring integrity events.
   */
  public onEvent(handler: EventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /**
   * Cleans up tracking and cooldown state when exam session concludes.
   */
  public reset(): void {
    this.lastAlertTimes.clear();
    this.firedIncidents.clear();
    this.activeEvents.clear();
    this.absenceStartTime = null;
    this.isAbsenceIncidentActive = false;
    this.mismatchCounters.clear();
    this.multiFaceConsecutiveCount = 0;
    this.verifiedTrackingIds.clear();
  }

  /**
   * Captures an evidence snapshot with visual bounding box and proctoring annotation.
   */
  public captureEvidence(
    source: HTMLVideoElement | HTMLCanvasElement,
    box?: YOLOBoundingBox,
    label?: string,
    color: string = '#EF4444'
  ): string | undefined {
    try {
      const snapCanvas = document.createElement('canvas');
      const w = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
      const h = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

      if (!w || !h) return undefined;

      // Evidence resolution: 480x360 for fast upload & clear evidence review
      snapCanvas.width = 480;
      snapCanvas.height = 360;
      const ctx = snapCanvas.getContext('2d');
      if (!ctx) return undefined;

      // Draw camera frame
      ctx.drawImage(source, 0, 0, w, h, 0, 0, 480, 360);

      // Draw bounding box and label if provided
      if (box) {
        const scaleX = 480 / w;
        const scaleY = 360 / h;
        const bx = box.x * scaleX;
        const by = box.y * scaleY;
        const bw = box.width * scaleX;
        const bh = box.height * scaleY;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(bx, by, bw, bh);

        if (label) {
          ctx.fillStyle = color;
          ctx.font = 'bold 11px system-ui, sans-serif';
          const textWidth = ctx.measureText(label).width;
          ctx.fillRect(bx, Math.max(0, by - 18), textWidth + 8, 18);

          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(label, bx + 4, Math.max(13, by - 5));
        }
      }

      return snapCanvas.toDataURL('image/jpeg', 0.75);
    } catch {
      return undefined;
    }
  }

  /**
   * Dispatches an event to registered listeners and saves to active events.
   */
  private emitEvent(event: ProctoringAIEvent): void {
    this.activeEvents.set(event.eventId, event);
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.warn('AIEventEngine listener error:', err);
      }
    });
  }

  /**
   * Processes all active tracks (phones and faces).
   */
  public processTracks(
    tracks: TrackedObject[],
    sessionContext: {
      sessionId: string;
      learnerId: string;
      learnerName: string;
      tenantId?: string;
    },
    sourceMedia?: HTMLVideoElement | HTMLCanvasElement,
    currentTimestamp: number = Date.now(),
    faceVerificationMap?: Map<string, ArcFaceVerificationResult>
  ): ProctoringAIEvent[] {
    const emittedEvents: ProctoringAIEvent[] = [];

    const phoneTracks = tracks.filter((t) => t.classId === 67 || t.className === 'cell phone');
    const faceTracks = tracks.filter((t) => t.classId === 0 || t.className === 'face');

    // 1. Process Mobile Phone Tracks (Class 67)
    for (const track of phoneTracks) {
      if (track.confidence < this.config.confidenceThreshold) continue;

      // Strict Temporal Validation: Must be confirmed across temporal window (8/12 frames) or minPhoneConfirmedFrames
      const isConfirmed = track.isTemporallyConfirmed ||
        (track.consecutiveHits >= this.config.minPhoneConfirmedFrames && track.hits >= this.config.minPhoneConfirmedFrames);
      if (!isConfirmed) continue;

      const cooldownKey = `phone-${track.trackingId}`;
      const lastAlert = this.lastAlertTimes.get(cooldownKey);
      if (lastAlert !== undefined && (currentTimestamp - lastAlert) < this.config.cooldownPeriodMs) {
        continue;
      }

      this.lastAlertTimes.set(cooldownKey, currentTimestamp);
      this.firedIncidents.add(cooldownKey);

      let evidenceSnapshot: string | undefined;
      if (sourceMedia) {
        evidenceSnapshot = this.captureEvidence(
          sourceMedia,
          track.box,
          `CONFIRMED PHONE [${track.trackingId}] ${Math.round(track.confidence * 100)}%`,
          '#EF4444'
        );
      }

      const confirmedFramesCount = track.confirmedFramesCount || track.hits;

      const eventPayload: ProctoringAIEvent = {
        eventId: `evt-mobile-${track.trackingId}-${currentTimestamp}`,
        eventType: 'MOBILE_PHONE_DETECTED',
        sessionId: sessionContext.sessionId,
        learnerId: sessionContext.learnerId,
        learnerName: sessionContext.learnerName,
        tenantId: sessionContext.tenantId,
        trackingId: track.trackingId,
        confidence: track.confidence,
        boundingBox: { ...track.box },
        detectionTimestamp: currentTimestamp,
        detectionCount: track.hits,
        confirmedFrames: confirmedFramesCount,
        validationStatus: 'TEMPORALLY_VALIDATED',
        evidenceSnapshot,
        status: 'confirmed',
        message: `Mobile phone verified via ${confirmedFramesCount} temporal validation frames (Confidence: ${Math.round(track.confidence * 100)}%, Tracking ID: ${track.trackingId}). Holding or using mobile devices is strictly prohibited.`,
      };

      this.emitEvent(eventPayload);
      emittedEvents.push(eventPayload);
    }

    // 2. Process Face Monitoring & ArcFace Verification
    const faceEvents = this.processFaceTracks(
      faceTracks,
      sessionContext,
      sourceMedia,
      currentTimestamp,
      faceVerificationMap
    );
    emittedEvents.push(...faceEvents);

    return emittedEvents;
  }

  /**
   * Dedicated Face Monitoring Pipeline: Absence, Recovery, Verification, Mismatch, Multiple Faces.
   */
  public processFaceTracks(
    faceTracks: TrackedObject[],
    sessionContext: {
      sessionId: string;
      learnerId: string;
      learnerName: string;
      tenantId?: string;
    },
    sourceMedia?: HTMLVideoElement | HTMLCanvasElement,
    currentTimestamp: number = Date.now(),
    faceVerificationMap?: Map<string, ArcFaceVerificationResult>
  ): ProctoringAIEvent[] {
    const emittedEvents: ProctoringAIEvent[] = [];

    // --- A. Face Absence & Recovery ---
    const shouldTrackAbsence = this.config.enableFaceAbsenceMonitoring || (sessionContext as any)?.trackFaceAbsence;

    if (shouldTrackAbsence && faceTracks.length === 0) {
      if (this.absenceStartTime === null) {
        this.absenceStartTime = currentTimestamp;
      }

      const absentDuration = currentTimestamp - this.absenceStartTime;

      // When absent for >= faceAbsenceThresholdMs (5.0s), trigger FACE_NOT_DETECTED
      if (absentDuration >= this.config.faceAbsenceThresholdMs && !this.isAbsenceIncidentActive) {
        this.isAbsenceIncidentActive = true;

        let evidenceSnapshot: string | undefined;
        if (sourceMedia) {
          evidenceSnapshot = this.captureEvidence(sourceMedia, undefined, 'CANDIDATE FACE ABSENT', '#F59E0B');
        }

        const eventPayload: ProctoringAIEvent = {
          eventId: `evt-face-absent-${currentTimestamp}`,
          eventType: 'FACE_NOT_DETECTED',
          sessionId: sessionContext.sessionId,
          learnerId: sessionContext.learnerId,
          learnerName: sessionContext.learnerName,
          tenantId: sessionContext.tenantId,
          trackingId: 'absence-detector',
          confidence: 0.95,
          faceCount: 0,
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          detectionTimestamp: currentTimestamp,
          detectionCount: 1,
          evidenceSnapshot,
          status: 'confirmed',
          message: `Candidate face was absent from camera view for > ${Math.round(absentDuration / 1000)} seconds. Candidates must remain seated in front of the camera.`,
        };

        this.emitEvent(eventPayload);
        emittedEvents.push(eventPayload);
      }
    } else if (faceTracks.length > 0) {
      // Face is visible: Check if recovering from absence
      if (this.isAbsenceIncidentActive) {
        this.isAbsenceIncidentActive = false;
        this.absenceStartTime = null;

        const eventPayload: ProctoringAIEvent = {
          eventId: `evt-face-recovered-${currentTimestamp}`,
          eventType: 'FACE_RECOVERED',
          sessionId: sessionContext.sessionId,
          learnerId: sessionContext.learnerId,
          learnerName: sessionContext.learnerName,
          tenantId: sessionContext.tenantId,
          trackingId: faceTracks[0].trackingId,
          confidence: faceTracks[0].confidence,
          faceCount: faceTracks.length,
          boundingBox: { ...faceTracks[0].box },
          detectionTimestamp: currentTimestamp,
          detectionCount: 1,
          status: 'resolved',
          message: `Candidate face recovered and visible in camera view.`,
        };

        this.emitEvent(eventPayload);
        emittedEvents.push(eventPayload);
      } else {
        this.absenceStartTime = null;
      }
    }

    // --- B. Multiple Faces Detection with Spatial & Temporal Validation ---
    // Deduplicate faces: Two distinct humans in front of a webcam have spatially separated head centers.
    // If two face tracks have IoU >= 0.15 or centroid distance < 0.65 * width, they are the SAME physical face!
    const distinctFaceTracks: TrackedObject[] = [];
    for (const ft of faceTracks) {
      let isDuplicate = false;
      for (const d of distinctFaceTracks) {
        const xA = Math.max(d.box.x, ft.box.x);
        const yA = Math.max(d.box.y, ft.box.y);
        const xB = Math.min(d.box.x + d.box.width, ft.box.x + ft.box.width);
        const yB = Math.min(d.box.y + d.box.height, ft.box.y + ft.box.height);
        const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
        const unionArea = d.box.width * d.box.height + ft.box.width * ft.box.height - interArea;
        const iou = unionArea > 0 ? interArea / unionArea : 0;
        const minArea = Math.min(d.box.width * d.box.height, ft.box.width * ft.box.height);
        const containment = minArea > 0 ? interArea / minArea : 0;

        const c1x = d.box.x + d.box.width / 2;
        const c1y = d.box.y + d.box.height / 2;
        const c2x = ft.box.x + ft.box.width / 2;
        const c2y = ft.box.y + ft.box.height / 2;
        const dist = Math.hypot(c1x - c2x, c1y - c2y);
        const avgW = (d.box.width + ft.box.width) / 2;
        const avgH = (d.box.height + ft.box.height) / 2;

        if (iou >= 0.15 || containment >= 0.35 || (dist < avgW * 0.65 && Math.abs(c1y - c2y) < avgH * 0.45)) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        distinctFaceTracks.push(ft);
      }
    }

    if (distinctFaceTracks.length >= 2) {
      this.multiFaceConsecutiveCount++;

      if (this.multiFaceConsecutiveCount >= this.config.multiFaceConsecutiveFrames) {
        const cooldownKey = 'multiple-faces';
        const lastAlert = this.lastAlertTimes.get(cooldownKey);
        const isCooldown = lastAlert !== undefined && (currentTimestamp - lastAlert) < this.config.cooldownPeriodMs;

        if (!isCooldown) {
          this.lastAlertTimes.set(cooldownKey, currentTimestamp);

          let hasRegisteredStudent = false;
          if (faceVerificationMap) {
            for (const [, ver] of faceVerificationMap.entries()) {
              if (ver.status === 'MATCH') {
                hasRegisteredStudent = true;
                break;
              }
            }
          }

          let evidenceSnapshot: string | undefined;
          if (sourceMedia) {
            evidenceSnapshot = this.captureEvidence(
              sourceMedia,
              distinctFaceTracks[1].box,
              `EXTRA PERSON [${distinctFaceTracks[1].trackingId}]`,
              '#EF4444'
            );
          }

          const confirmedFrames = distinctFaceTracks[1].confirmedFramesCount || this.multiFaceConsecutiveCount;

          const eventPayload: ProctoringAIEvent = {
            eventId: `evt-multi-face-${currentTimestamp}`,
            eventType: 'MULTIPLE_FACES_DETECTED',
            sessionId: sessionContext.sessionId,
            learnerId: sessionContext.learnerId,
            learnerName: sessionContext.learnerName,
            tenantId: sessionContext.tenantId,
            trackingId: distinctFaceTracks[1].trackingId,
            confidence: distinctFaceTracks[1].confidence,
            faceCount: distinctFaceTracks.length,
            isRegisteredStudentPresent: hasRegisteredStudent,
            boundingBox: { ...distinctFaceTracks[1].box },
            detectionTimestamp: currentTimestamp,
            detectionCount: this.multiFaceConsecutiveCount,
            confirmedFrames,
            validationStatus: 'TEMPORALLY_VALIDATED',
            evidenceSnapshot,
            status: 'confirmed',
            message: `Multiple distinct persons confirmed (${distinctFaceTracks.length} persons in frame) via ${confirmedFrames} temporal validation frames. Only the registered candidate may be present.`,
          };

          this.emitEvent(eventPayload);
          emittedEvents.push(eventPayload);
        }
      }
    } else {
      // Additional face disappeared or was filtered as duplicate: reset unconfirmed counter cleanly
      this.multiFaceConsecutiveCount = 0;
    }

    // --- C. ArcFace Biometric Identity Verification & Mismatch ---
    if (faceTracks.length > 0 && faceVerificationMap) {
      for (const track of faceTracks) {
        const ver = faceVerificationMap.get(track.trackingId);
        if (!ver) continue;

        // C1. Biometric Match -> FACE_VERIFIED
        if (ver.status === 'MATCH') {
          this.mismatchCounters.delete(track.trackingId);

          if (!this.verifiedTrackingIds.has(track.trackingId)) {
            this.verifiedTrackingIds.add(track.trackingId);

            const eventPayload: ProctoringAIEvent = {
              eventId: `evt-face-verified-${track.trackingId}-${currentTimestamp}`,
              eventType: 'FACE_VERIFIED',
              sessionId: sessionContext.sessionId,
              learnerId: sessionContext.learnerId,
              learnerName: sessionContext.learnerName,
              tenantId: sessionContext.tenantId,
              trackingId: track.trackingId,
              confidence: track.confidence,
              similarityScore: ver.similarity,
              faceCount: faceTracks.length,
              isRegisteredStudentPresent: true,
              boundingBox: { ...track.box },
              detectionTimestamp: currentTimestamp,
              detectionCount: track.hits,
              status: 'info',
              message: `Student identity verified via ArcFace biometrics (${Math.round(ver.similarity * 100)}% match).`,
            };

            this.emitEvent(eventPayload);
            emittedEvents.push(eventPayload);
          }
        }

        // C2. Biometric Mismatch -> FACE_MISMATCH
        // Validate across multiple consecutive quality frames to prevent 1-frame false alarms
        else if (ver.status === 'MISMATCH' && ver.isQualitySufficient) {
          const currentMismatches = (this.mismatchCounters.get(track.trackingId) || 0) + 1;
          this.mismatchCounters.set(track.trackingId, currentMismatches);

          if (currentMismatches >= this.config.mismatchConsecutiveFrames) {
            const cooldownKey = `mismatch-${track.trackingId}`;
            const lastAlert = this.lastAlertTimes.get(cooldownKey);
            const isCooldown = lastAlert !== undefined && (currentTimestamp - lastAlert) < this.config.cooldownPeriodMs;

            if (!isCooldown) {
              this.lastAlertTimes.set(cooldownKey, currentTimestamp);

              let evidenceSnapshot: string | undefined;
              if (sourceMedia) {
                evidenceSnapshot = this.captureEvidence(
                  sourceMedia,
                  track.box,
                  `IDENTITY MISMATCH [${Math.round(ver.similarity * 100)}%]`,
                  '#EF4444'
                );
              }

              const eventPayload: ProctoringAIEvent = {
                eventId: `evt-face-mismatch-${track.trackingId}-${currentTimestamp}`,
                eventType: 'FACE_MISMATCH',
                sessionId: sessionContext.sessionId,
                learnerId: sessionContext.learnerId,
                learnerName: sessionContext.learnerName,
                tenantId: sessionContext.tenantId,
                trackingId: track.trackingId,
                confidence: track.confidence,
                similarityScore: ver.similarity,
                faceCount: faceTracks.length,
                isRegisteredStudentPresent: false,
                boundingBox: { ...track.box },
                detectionTimestamp: currentTimestamp,
                detectionCount: currentMismatches,
                evidenceSnapshot,
                status: 'confirmed',
                message: `Biometric Identity Mismatch detected by ArcFace (${Math.round(ver.similarity * 100)}% similarity). An unauthorized individual appears to be taking the examination.`,
              };

              this.emitEvent(eventPayload);
              emittedEvents.push(eventPayload);
            }
          }
        } else {
          // UNCERTAIN or INCONCLUSIVE or Insufficient Quality:
          // Strictly NEVER increment mismatch counter or trigger strikes
          const uncertainCooldownKey = `uncertain-${track.trackingId}`;
          const lastUncertainAlert = this.lastAlertTimes.get(uncertainCooldownKey);
          const isUncertainCooldown = lastUncertainAlert !== undefined && (currentTimestamp - lastUncertainAlert) < 10000;

          if (!isUncertainCooldown) {
            this.lastAlertTimes.set(uncertainCooldownKey, currentTimestamp);

            const eventPayload: ProctoringAIEvent = {
              eventId: `evt-face-uncertain-${track.trackingId}-${currentTimestamp}`,
              eventType: 'FACE_UNCERTAIN',
              sessionId: sessionContext.sessionId,
              learnerId: sessionContext.learnerId,
              learnerName: sessionContext.learnerName,
              tenantId: sessionContext.tenantId,
              trackingId: track.trackingId,
              confidence: track.confidence,
              similarityScore: ver.similarity,
              faceCount: faceTracks.length,
              isRegisteredStudentPresent: true,
              boundingBox: { ...track.box },
              detectionTimestamp: currentTimestamp,
              detectionCount: 1,
              status: 'info',
              message: `Face verification uncertain (${Math.round(ver.similarity * 100)}% similarity, ${ver.message}). Please face the camera directly in good lighting.`,
            };

            this.emitEvent(eventPayload);
            emittedEvents.push(eventPayload);
          }
        }
      }
    }

    return emittedEvents;
  }
}

export const aiEventEngine = new AIEventEngine();
