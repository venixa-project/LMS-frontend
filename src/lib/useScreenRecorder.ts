import { useState, useRef, useCallback, useEffect } from 'react';
import { apiClient } from './apiClient';

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // in seconds
  activeSessionId: string | null;
  activeSessionTitle: string | null;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
}

export function useScreenRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    activeSessionId: null,
    activeSessionTitle: null,
    isUploading: false,
    uploadProgress: 0,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (combinedStreamRef.current) {
        combinedStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const getSupportedMimeType = (): string => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4',
    ];
    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return '';
  };

  /**
   * Start recording the Google Meet tab / screen and optional microphone audio
   */
  const startRecording = useCallback(
    async (session: { id: string; title: string; withMic?: boolean }) => {
      try {
        setState((prev) => ({ ...prev, error: null }));

        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen recording is not supported in this browser. Please use Chrome, Edge, or Firefox.');
        }

        // 1. Capture Google Meet tab / screen stream
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'browser',
            frameRate: { ideal: 30, max: 60 },
          } as any,
          audio: true, // Captures tab audio (Google Meet voices)
        });

        // 2. Optionally capture microphone to mix instructor voice
        let micStream: MediaStream | null = null;
        try {
          micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (micErr) {
          console.warn('[ScreenRecorder] Mic access skipped or rejected:', micErr);
        }

        // 3. Audio Mixing using Web Audio API
        const audioTracks: MediaStreamTrack[] = [];
        const hasScreenAudio = screenStream.getAudioTracks().length > 0;
        const hasMicAudio = micStream && micStream.getAudioTracks().length > 0;

        if (hasScreenAudio || hasMicAudio) {
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioContextRef.current = audioCtx;
            const destination = audioCtx.createMediaStreamDestination();

            if (hasScreenAudio) {
              const screenSource = audioCtx.createMediaStreamSource(screenStream);
              screenSource.connect(destination);
            }
            if (hasMicAudio && micStream) {
              const micSource = audioCtx.createMediaStreamSource(micStream);
              micSource.connect(destination);
            }

            const mixedTrack = destination.stream.getAudioTracks()[0];
            if (mixedTrack) audioTracks.push(mixedTrack);
          } catch (mixErr) {
            console.warn('[ScreenRecorder] AudioContext mixing fallback to direct tracks:', mixErr);
            if (hasScreenAudio) audioTracks.push(screenStream.getAudioTracks()[0]);
            else if (hasMicAudio && micStream) audioTracks.push(micStream.getAudioTracks()[0]);
          }
        }

        // 4. Combine Video + Mixed Audio
        const videoTrack = screenStream.getVideoTracks()[0];
        const combinedStream = new MediaStream([videoTrack, ...audioTracks]);
        combinedStreamRef.current = combinedStream;

        // 5. Setup MediaRecorder
        const mimeType = getSupportedMimeType();
        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
        const mediaRecorder = new MediaRecorder(combinedStream, options);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        // Handle user clicking "Stop Sharing" on Chrome's floating bar
        videoTrack.onended = () => {
          if (mediaRecorder.state !== 'inactive') {
            stopRecording();
          }
        };

        mediaRecorder.start(1000); // chunk every 1 second

        // Start timer
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = setInterval(() => {
          setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);

        setState({
          isRecording: true,
          isPaused: false,
          duration: 0,
          activeSessionId: session.id,
          activeSessionTitle: session.title,
          isUploading: false,
          uploadProgress: 0,
          error: null,
        });

        return { success: true };
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          console.log('[ScreenRecorder] User cancelled screen selection dialog.');
          return { success: false, cancelled: true };
        }
        console.error('[ScreenRecorder] Failed to start screen recording:', err);
        setState((prev) => ({ ...prev, error: err.message || 'Failed to start screen recording' }));
        return { success: false, error: err.message };
      }
    },
    []
  );

  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setState((prev) => ({ ...prev, isPaused: true }));
    }
  }, []);

  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerIntervalRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
      setState((prev) => ({ ...prev, isPaused: false }));
    }
  }, []);

  /**
   * Stop recording, compile video blob, and upload to the session backend
   */
  const stopRecording = useCallback(async (): Promise<{ success: boolean; recordingUrl?: string; error?: string }> => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const currentSessionId = state.activeSessionId;
    const currentSessionTitle = state.activeSessionTitle || 'Live Session';

    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve({ success: false, error: 'No active recording found' });
        return;
      }

      recorder.onstop = async () => {
        try {
          setState((prev) => ({ ...prev, isUploading: true, uploadProgress: 15 }));

          // Stop all media tracks
          if (combinedStreamRef.current) {
            combinedStreamRef.current.getTracks().forEach((t) => t.stop());
            combinedStreamRef.current = null;
          }
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
          }

          const mimeType = recorder.mimeType || 'video/webm';
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const sanitizedTitle = currentSessionTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${sanitizedTitle}_${Date.now()}.${extension}`;
          const file = new File([blob], fileName, { type: mimeType });

          // Automatically save a local backup copy directly onto the host's device (Downloads)
          try {
            const localUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = localUrl;
            a.download = `Lecture_Recording_${sanitizedTitle}_${new Date().toISOString().slice(0, 10)}.${extension}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
              if (document.body.contains(a)) document.body.removeChild(a);
              URL.revokeObjectURL(localUrl);
            }, 1000);
          } catch (dlErr) {
            console.warn('[ScreenRecorder] Device auto-download fallback:', dlErr);
          }

          if (!currentSessionId) {
            setState((prev) => ({ ...prev, isRecording: false, isUploading: false }));
            resolve({ success: false, error: 'No session linked to recording' });
            return;
          }

          setState((prev) => ({ ...prev, uploadProgress: 45 }));

          // Upload to LMS backend
          const formData = new FormData();
          formData.append('video', file);

          const res = await apiClient.upload<any>(
            `/live-sessions/${currentSessionId}/recording-upload`,
            formData
          );

          setState((prev) => ({
            ...prev,
            isRecording: false,
            isPaused: false,
            isUploading: false,
            uploadProgress: 100,
            activeSessionId: null,
            activeSessionTitle: null,
          }));

          const recordingUrl = res?.data?.recordingUrl || res?.data?.session?.recordingUrl;
          resolve({ success: true, recordingUrl });
        } catch (uploadErr: any) {
          console.error('[ScreenRecorder] Upload failed:', uploadErr);
          setState((prev) => ({
            ...prev,
            isRecording: false,
            isUploading: false,
            error: uploadErr?.message || 'Failed to upload recorded video',
          }));
          resolve({ success: false, error: uploadErr?.message || 'Upload failed' });
        }
      };

      recorder.stop();
    });
  }, [state.activeSessionId, state.activeSessionTitle]);

  const cancelRecording = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((t) => t.stop());
      combinedStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    setState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      activeSessionId: null,
      activeSessionTitle: null,
      isUploading: false,
      uploadProgress: 0,
      error: null,
    });
  }, []);

  return {
    state,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}

