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
  evidenceSnapshot?: string; // base64 JPEG data URL
  status: 'confirmed' | 'detected' | 'resolved' | 'info';
  message: string;
}

// Backward-compatibility alias
export type MobilePhoneDetectedEvent = ProctoringAIEvent;

export interface AIEventEngineConfig {
  minConsecutiveFrames: number; // default: 2 (for device & mismatch confirmation)
  confidenceThreshold: number; // default: 0.50
  cooldownPeriodMs: number; // default: 15,000ms
  faceAbsenceThresholdMs: number; // default: 5,000ms (5 seconds absence)
  multiFaceConsecutiveFrames: number; // default: 2
  mismatchConsecutiveFrames: number; // default: 2
  enableFaceAbsenceMonitoring?: boolean; // default: false (enabled in exam proctoring)
}

export type EventHandler = (event: ProctoringAIEvent) => void;

export class AIEventEngine {
  private config: AIEventEngineConfig;
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
    this.config = {
      minConsecutiveFrames: config?.minConsecutiveFrames ?? 2,
      confidenceThreshold: config?.confidenceThreshold ?? 0.50,
      cooldownPeriodMs: config?.cooldownPeriodMs ?? 15000,
      faceAbsenceThresholdMs: config?.faceAbsenceThresholdMs ?? 5000,
      multiFaceConsecutiveFrames: config?.multiFaceConsecutiveFrames ?? 2,
      mismatchConsecutiveFrames: config?.mismatchConsecutiveFrames ?? 2,
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
      if (track.consecutiveHits < this.config.minConsecutiveFrames) continue;

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
          `MOBILE PHONE [${track.trackingId}] ${Math.round(track.confidence * 100)}%`,
          '#EF4444'
        );
      }

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
        evidenceSnapshot,
        status: 'confirmed',
        message: `Mobile phone detected by YOLO AI (Confidence: ${Math.round(track.confidence * 100)}%, Tracking ID: ${track.trackingId}). Holding or using mobile devices is strictly prohibited.`,
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

    // --- B. Multiple Faces Detection ---
    if (faceTracks.length >= 2) {
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
              faceTracks[1].box,
              `EXTRA PERSON [${faceTracks[1].trackingId}]`,
              '#EF4444'
            );
          }

          const eventPayload: ProctoringAIEvent = {
            eventId: `evt-multi-face-${currentTimestamp}`,
            eventType: 'MULTIPLE_FACES_DETECTED',
            sessionId: sessionContext.sessionId,
            learnerId: sessionContext.learnerId,
            learnerName: sessionContext.learnerName,
            tenantId: sessionContext.tenantId,
            trackingId: faceTracks[1].trackingId,
            confidence: faceTracks[1].confidence,
            faceCount: faceTracks.length,
            isRegisteredStudentPresent: hasRegisteredStudent,
            boundingBox: { ...faceTracks[1].box },
            detectionTimestamp: currentTimestamp,
            detectionCount: this.multiFaceConsecutiveCount,
            evidenceSnapshot,
            status: 'confirmed',
            message: `Multiple faces detected (${faceTracks.length} persons in frame). Only the registered candidate may be present.`,
          };

          this.emitEvent(eventPayload);
          emittedEvents.push(eventPayload);
        }
      }
    } else {
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
          // Inconclusive: do not increment mismatch counter
        }
      }
    }

    return emittedEvents;
  }
}

export const aiEventEngine = new AIEventEngine();
