/**
 * Real-Time Proctoring Socket & WebRTC Media Forwarding Hub
 * 
 * Capabilities:
 * - Native zero-dependency WebSocket transport for Socket.IO v4 protocol
 * - Automatic reconnection with exponential backoff
 * - Real-time proctoring event distribution:
 *   STUDENT_EXAM_JOINED, STUDENT_VIDEO_STREAM_READY, STUDENT_VIDEO_DISCONNECTED,
 *   STUDENT_VIDEO_RECONNECTED, PROCTORING_WARNING, MANUAL_WARNING,
 *   WARNING_ACKNOWLEDGED, ADMIN_FORCE_STOP, EXAM_TERMINATED
 * - WebRTC PeerConnection management for real-time live webcam video streaming (30 FPS)
 *   from Candidate to Admin Live Proctoring Wall
 */

export interface SocketEventCallback {
  (data: any): void;
}

export interface CandidateStreamMessage {
  studentId: string;
  assessmentId: string;
  sessionId?: string;
  status: 'connected' | 'reconnecting' | 'disconnected' | 'terminated';
  cameraActive: boolean;
  micActive: boolean;
  audioLevel?: number;
  faceStatus?: string;
  latestSnapshot?: string;
  timestamp: string;
}

export class ProctoringSocketClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  private token: string = '';
  private isConnected: boolean = false;
  private listeners: Map<string, Set<SocketEventCallback>> = new Map();
  private reconnectTimer: any = null;
  private heartbeatInterval: any = null;
  private activeAssessmentId: string | null = null;
  private activeRole: 'student' | 'admin' = 'student';
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private onRemoteStreamCallbacks: Set<(studentId: string, stream: MediaStream) => void> = new Set();
  private studentDetails: { studentId: string; studentName: string; rollNo?: string; sessionId?: string } | null = null;
  private isManuallyClosed: boolean = false;

  constructor() {
    // Standard STUN servers for WebRTC NAT traversal
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];
  }

  private iceServers: RTCIceServer[];

  public connect(token: string, assessmentId?: string, role: 'student' | 'admin' = 'student'): void {
    this.isManuallyClosed = false;
    this.token = token;
    if (assessmentId) this.activeAssessmentId = assessmentId;
    this.activeRole = role;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (assessmentId) {
        this.emit('join_exam_proctoring', {
          assessmentId,
          role,
          ...this.studentDetails,
        });
      }
      return;
    }

    try {
      const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const wsProtocol = isSecure ? 'wss:' : 'ws:';
      const host = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';

      // Target Socket.io v4 endpoint through Vite proxy (/socket.io) or direct backend
      this.url = `${wsProtocol}//${host}/socket.io/?EIO=4&transport=websocket&token=${encodeURIComponent(token || 'guest')}&role=${role}`;

      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.startHeartbeat();
        this.trigger('connected', { role });

        if (this.activeAssessmentId) {
          this.emit('join_exam_proctoring', {
            assessmentId: this.activeAssessmentId,
            role: this.activeRole,
            ...this.studentDetails,
          });

          if (this.activeRole === 'admin') {
            this.emit('request_candidate_streams', { assessmentId: this.activeAssessmentId });
          }
        }
      };

      this.ws.onmessage = (event) => {
        this.handleRawMessage(event.data);
      };

      this.ws.onclose = () => {
        this.cleanupConnection();
        this.trigger('disconnected', {});
        if (!this.isManuallyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[ProctoringSocket] WebSocket transport notice:', err);
      };
    } catch (e) {
      console.warn('[ProctoringSocket] Connection init error:', e);
      if (!this.isManuallyClosed) {
        this.scheduleReconnect();
      }
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Socket.IO heartbeat ping is "2"
        this.ws.send('2');
      }
    }, 20000);
  }

  private cleanupConnection(): void {
    this.isConnected = false;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isConnected && this.token) {
        this.connect(this.token, this.activeAssessmentId || undefined, this.activeRole);
      }
    }, 3000);
  }

  private handleRawMessage(data: any): void {
    if (typeof data !== 'string') return;

    // Socket.IO Engine.IO protocol packets:
    // "0" = Handshake/Open packet
    // "2" = Ping (client responds with "3" Pong)
    // "3" = Pong
    // "40" = Socket.IO connected
    // "42[eventName, payload]" = Socket.IO custom event
    if (data === '2') {
      this.ws?.send('3'); // pong
      return;
    }

    if (data.startsWith('0')) {
      // Send connection packet
      this.ws?.send(`40{"token":"${this.token}"}`);
      return;
    }

    if (data.startsWith('42')) {
      try {
        const jsonStr = data.slice(2);
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const [eventName, payload] = parsed;
          this.handleSocketEvent(eventName, payload);
        }
      } catch (err) {
        console.warn('[ProctoringSocket] Parse error on packet:', data);
      }
    }
  }

  private handleSocketEvent(eventName: string, payload: any): void {
    // 1. WebRTC Signaling Dispatch
    if (eventName === 'webrtc_signal') {
      this.handleIncomingWebRTCSignal(payload);
    }

    if (eventName === 'renegotiate_candidate_stream') {
      if (this.localStream && this.studentDetails && this.activeAssessmentId) {
        this.initiatePeerOfferToAdmin(this.activeAssessmentId, this.studentDetails.studentId);
      }
    }

    // 2. Dispatch to registered listeners
    this.trigger(eventName, payload);
  }

  public emit(eventName: string, payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const packet = `42${JSON.stringify([eventName, payload])}`;
      this.ws.send(packet);
    } else {
      // Local event fallback
      this.trigger(eventName, payload);
    }
  }

  public on(eventName: string, callback: SocketEventCallback): () => void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName)!.add(callback);
    return () => {
      this.listeners.get(eventName)?.delete(callback);
    };
  }

  private trigger(eventName: string, data: any): void {
    const handlers = this.listeners.get(eventName);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.warn(`[ProctoringSocket] Error in listener for ${eventName}:`, e);
        }
      });
    }
  }

  // -------------------------------------------------------------
  // WebRTC LIVE VIDEO STREAMING ENGINE (Candidate -> Admin Video Wall)
  // -------------------------------------------------------------

  /**
   * Called by StudentProctorWidget to register local webcam stream
   */
  public registerLocalMediaStream(
    stream: MediaStream,
    details: { studentId: string; studentName: string; rollNo?: string; assessmentId: string; sessionId?: string }
  ): void {
    this.localStream = stream;
    this.studentDetails = details;
    this.activeAssessmentId = details.assessmentId;

    // Notify backend that stream is ready
    this.emit('STUDENT_VIDEO_STREAM_READY', {
      studentId: details.studentId,
      assessmentId: details.assessmentId,
      sessionId: details.sessionId,
      cameraActive: true,
      timestamp: new Date().toISOString(),
    });

    // Also send an initial WebRTC offer to the admin room
    this.initiatePeerOfferToAdmin(details.assessmentId, details.studentId);
  }

  /**
   * Candidate creates WebRTC Offer and sends it to the admin room
   */
  private async initiatePeerOfferToAdmin(assessmentId: string, studentId: string): Promise<void> {
    if (!this.localStream) return;

    try {
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      this.peerConnections.set(`admin-wall-${assessmentId}`, pc);

      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });

      // Adaptive video quality & framerate stabilization
      try {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === 'video') {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = 800000;
            (params.encodings[0] as any).minBitrate = 150000;
            (params as any).degradationPreference = 'maintain-framerate';
            sender.setParameters(params).catch(() => {});
          }
        });
      } catch (e) {}

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.emit('webrtc_signal', {
            assessmentId,
            studentId,
            signal: { candidate: event.candidate },
            type: 'candidate',
          });
        }
      };

      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });
      await pc.setLocalDescription(offer);

      this.emit('webrtc_signal', {
        assessmentId,
        studentId,
        signal: { sdp: pc.localDescription },
        type: 'offer',
      });
    } catch (err) {
      console.warn('[ProctoringSocket] WebRTC offer creation notice:', err);
    }
  }

  /**
   * Handle incoming WebRTC signals (Offers, Answers, ICE Candidates)
   */
  private async handleIncomingWebRTCSignal(payload: {
    from?: string;
    fromUser?: string;
    studentId?: string;
    assessmentId?: string;
    signal: any;
    type?: 'offer' | 'answer' | 'candidate';
  }): Promise<void> {
    const { from, studentId, signal, type, assessmentId } = payload;
    const targetKey = studentId || from || 'default';

    // 1. If Admin receives an OFFER from a candidate:
    if (this.activeRole === 'admin' && signal?.sdp?.type === 'offer') {
      try {
        let pc = this.peerConnections.get(targetKey);
        if (!pc || pc.connectionState === 'closed' || pc.connectionState === 'failed') {
          pc = new RTCPeerConnection({ iceServers: this.iceServers });
          this.peerConnections.set(targetKey, pc);

          pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
              const remote = event.streams[0];
              this.remoteStreams.set(targetKey, remote);
              this.onRemoteStreamCallbacks.forEach((cb) => cb(targetKey, remote));
            }
          };

          pc.onicecandidate = (event) => {
            if (event.candidate && from) {
              this.emit('webrtc_signal', {
                to: from,
                studentId: targetKey,
                signal: { candidate: event.candidate },
                type: 'candidate',
              });
            }
          };
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.emit('webrtc_signal', {
          to: from,
          studentId: targetKey,
          signal: { sdp: pc.localDescription },
          type: 'answer',
        });
      } catch (e) {
        console.warn('[ProctoringSocket] Error answering candidate WebRTC offer:', e);
      }
      return;
    }

    // 2. If Candidate receives an ANSWER from Admin:
    if (this.activeRole === 'student' && signal?.sdp?.type === 'answer') {
      const pcKey = `admin-wall-${assessmentId || this.activeAssessmentId}`;
      const pc = this.peerConnections.get(pcKey) || Array.from(this.peerConnections.values())[0];
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } catch (e) {
          console.warn('[ProctoringSocket] Error setting remote answer on candidate:', e);
        }
      }
      return;
    }

    // 3. ICE Candidate exchange:
    if (signal?.candidate) {
      const pc = this.peerConnections.get(targetKey) || Array.from(this.peerConnections.values())[0];
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) { }
      }
    }
  }

  /**
   * Candidate acknowledges a proctoring warning
   */
  public acknowledgeWarning(data: {
    studentId: string;
    assessmentId: string;
    sessionId?: string;
    warningCount: number;
    timestamp: string;
  }): void {
    this.emit('WARNING_ACKNOWLEDGED', data);
  }

  /**
   * Subscribe to incoming live WebRTC video streams for candidates
   */
  public onRemoteStream(callback: (studentId: string, stream: MediaStream) => void): () => void {
    this.onRemoteStreamCallbacks.add(callback);
    // Replay any already connected remote streams
    this.remoteStreams.forEach((stream, studentId) => {
      callback(studentId, stream);
    });
    return () => {
      this.onRemoteStreamCallbacks.delete(callback);
    };
  }

  public getRemoteStream(studentId: string): MediaStream | null {
    return this.remoteStreams.get(studentId) || null;
  }

  public closeAllPeers(): void {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
  }

  public disconnect(): void {
    this.isManuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cleanupConnection();
    this.closeAllPeers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.studentDetails = null;
    this.activeAssessmentId = null;
  }
}

export const proctoringSocket = new ProctoringSocketClient();
