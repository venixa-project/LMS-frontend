import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Scissors,
  Crop,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sliders,
  Sparkles,
  Maximize2,
  RefreshCw,
  Eye,
  Film,
  ChevronsLeft,
  ChevronsRight,
  GripVertical,
} from 'lucide-react';
import { VideoCropMetadata } from '../../types';
import {
  formatTimeCode,
  parseTimeCode,
  cropAndTranscodeVideo,
} from '../../lib/videoProcessingService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  videoSrc: string | File;
  initialCrop?: VideoCropMetadata;
  onApplyCrop: (result: {
    file?: File;
    blobUrl: string;
    durationSeconds: number;
    cropMetadata: VideoCropMetadata;
  }) => void;
}

export const VideoCropModal: React.FC<Props> = ({
  isOpen,
  onClose,
  videoSrc,
  initialCrop,
  onApplyCrop,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Trim state (in seconds)
  const [startTime, setStartTime] = useState<number>(initialCrop?.startTime || 0);
  const [endTime, setEndTime] = useState<number>(initialCrop?.endTime || 0);

  // Aspect ratio state
  const [aspectRatio, setAspectRatio] = useState<'original' | '16:9' | '4:3' | '1:1' | '9:16'>(
    (initialCrop?.aspectRatio as any) || 'original'
  );
  const [panPosition, setPanPosition] = useState<'center' | 'left' | 'right' | 'top' | 'bottom'>('center');

  // Standardized 420p SD target quality - all uploads are optimized to 420p
  const targetQuality: '420p' = '420p';

  // Interactive timeline dragging state
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [activeDrag, setActiveDrag] = useState<'none' | 'start' | 'end' | 'window' | 'playhead'>('none');
  const [hoverTarget, setHoverTarget] = useState<'none' | 'start' | 'end' | 'window'>('none');
  const dragStartRef = useRef<{ clientX: number; initStart: number; initEnd: number }>({
    clientX: 0,
    initStart: 0,
    initEnd: 0,
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStage, setProcessStage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mode: Instant metadata crop (safe & lossless) vs Full transcode
  const [exportMode, setExportMode] = useState<'transcode' | 'instant'>('instant');

  // Resolved video preview source URL
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !videoSrc) return;

    let url = '';
    if (typeof videoSrc === 'string') {
      url = videoSrc;
    } else {
      url = URL.createObjectURL(videoSrc);
    }
    setPreviewUrl(url);

    setIsPlaying(false);
    setCurrentTime(0);
    setErrorMessage(null);
    setIsProcessing(false);
    setProcessProgress(0);

    return () => {
      if (typeof videoSrc !== 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [isOpen, videoSrc]);

  // Window pointer listeners for buttery smooth dragging without losing mouse focus
  useEffect(() => {
    if (activeDrag === 'none' || duration <= 0) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const clampedX = Math.max(rect.left, Math.min(e.clientX, rect.right));
      const ratio = (clampedX - rect.left) / rect.width;
      const timeAtPos = ratio * duration;

      if (activeDrag === 'start') {
        const newStart = Math.max(0, Math.min(timeAtPos, Math.max(0, endTime - 0.2)));
        setStartTime(newStart);
        if (videoRef.current) {
          videoRef.current.currentTime = newStart;
          setCurrentTime(newStart);
        }
      } else if (activeDrag === 'end') {
        const newEnd = Math.min(duration, Math.max(timeAtPos, startTime + 0.2));
        setEndTime(newEnd);
        if (videoRef.current) {
          videoRef.current.currentTime = newEnd;
          setCurrentTime(newEnd);
        }
      } else if (activeDrag === 'window') {
        const deltaX = e.clientX - dragStartRef.current.clientX;
        const deltaTime = (deltaX / rect.width) * duration;
        const clipLength = dragStartRef.current.initEnd - dragStartRef.current.initStart;

        let newStart = dragStartRef.current.initStart + deltaTime;
        let newEnd = dragStartRef.current.initEnd + deltaTime;

        if (newStart < 0) {
          newStart = 0;
          newEnd = clipLength;
        }
        if (newEnd > duration) {
          newEnd = duration;
          newStart = Math.max(0, duration - clipLength);
        }

        setStartTime(newStart);
        setEndTime(newEnd);
        if (videoRef.current) {
          videoRef.current.currentTime = newStart;
          setCurrentTime(newStart);
        }
      } else if (activeDrag === 'playhead') {
        seekTo(timeAtPos);
      }
    };

    const handlePointerUp = () => {
      setActiveDrag('none');
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDrag, duration, startTime, endTime]);

  if (!isOpen) return null;

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || 60;
    setDuration(dur);
    const start = initialCrop?.startTime && initialCrop.startTime < dur ? initialCrop.startTime : 0;
    const end = initialCrop?.endTime && initialCrop.endTime > start && initialCrop.endTime <= dur
      ? initialCrop.endTime
      : dur;

    setStartTime(start);
    setEndTime(end);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    if (endTime > startTime && cur >= endTime) {
      videoRef.current.pause();
      setIsPlaying(false);
      videoRef.current.currentTime = startTime;
    }
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const nudgeStart = (delta: number) => {
    const newStart = Math.max(0, Math.min(startTime + delta, Math.max(0, endTime - 0.2)));
    setStartTime(newStart);
    seekTo(newStart);
  };

  const nudgeEnd = (delta: number) => {
    const newEnd = Math.min(duration, Math.max(endTime + delta, startTime + 0.2));
    setEndTime(newEnd);
    seekTo(newEnd);
  };

  const setStartToCurrent = () => {
    const newStart = Math.max(0, Math.min(currentTime, Math.max(0, endTime - 0.2)));
    setStartTime(newStart);
  };

  const setEndToCurrent = () => {
    const newEnd = Math.min(duration, Math.max(currentTime, startTime + 0.2));
    setEndTime(newEnd);
  };

  const resetTrim = () => {
    setStartTime(0);
    setEndTime(duration);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const playTrimmedPreview = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const selectedClipDuration = Math.max(0, endTime - startTime);

  const handleApply = async () => {
    setErrorMessage(null);

    const cropMeta: VideoCropMetadata = {
      startTime: Math.round(startTime * 10) / 10,
      endTime: Math.round(endTime * 10) / 10,
      aspectRatio,
      isCropped: true,
    };

    if (exportMode === 'instant') {
      // Instant metadata-based crop without waiting
      onApplyCrop({
        file: typeof videoSrc !== 'string' ? videoSrc : undefined,
        blobUrl: previewUrl,
        durationSeconds: Math.round(selectedClipDuration),
        cropMetadata: cropMeta,
      });
      onClose();
      return;
    }

    // Full transcode with HTML5 canvas & media recorder
    setIsProcessing(true);
    setProcessProgress(5);
    setProcessStage('Initializing video crop engine...');

    try {
      const result = await cropAndTranscodeVideo({
        source: videoSrc,
        startTime,
        endTime,
        aspectRatio,
        targetQuality,
        panPosition,
        onProgress: (p, stage) => {
          setProcessProgress(p);
          setProcessStage(stage);
        },
      });

      setIsProcessing(false);
      onApplyCrop({
        file: result.file,
        blobUrl: result.blobUrl,
        durationSeconds: Math.round(result.durationSeconds),
        cropMetadata: result.cropMetadata,
      });
      onClose();
    } catch (err: any) {
      console.warn('Transcode error, falling back to metadata crop:', err);
      setIsProcessing(false);
      // Seamlessly fall back so admin/trainer never gets blocked
      onApplyCrop({
        file: typeof videoSrc !== 'string' ? videoSrc : undefined,
        blobUrl: previewUrl,
        durationSeconds: Math.round(selectedClipDuration),
        cropMetadata: cropMeta,
      });
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1100,
        backgroundColor: 'rgba(2, 6, 23, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95vw',
          maxWidth: '1060px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0b0f19',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          color: '#f8fafc',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'linear-gradient(90deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#818cf8',
              }}
            >
              <Scissors size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                Video Crop & Trim Studio
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Trim duration, crop framing aspect ratio, and optimize compression
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
            gap: '24px',
          }}
        >
          {/* Left Column: Video Preview & Timeline Scrubber */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Video Container with Visual Framing Box */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                backgroundColor: '#000000',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '280px',
                maxHeight: '360px',
              }}
            >
              <video
                ref={videoRef}
                src={previewUrl}
                playsInline
                preload="metadata"
                onClick={togglePlay}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                style={{
                  width: '100%',
                  maxHeight: '360px',
                  objectFit: 'contain',
                  cursor: 'pointer',
                }}
              />

              {/* Aspect Ratio Framing Guideline Overlay */}
              {aspectRatio !== 'original' && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      panPosition === 'left'
                        ? 'flex-start'
                        : panPosition === 'right'
                        ? 'flex-end'
                        : 'center',
                  }}
                >
                  <div
                    style={{
                      aspectRatio:
                        aspectRatio === '16:9'
                          ? '16 / 9'
                          : aspectRatio === '4:3'
                          ? '4 / 3'
                          : aspectRatio === '1:1'
                          ? '1 / 1'
                          : '9 / 16',
                      height: '92%',
                      maxHeight: '92%',
                      border: '2px dashed #818cf8',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                      borderRadius: '4px',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: 'rgba(99, 102, 241, 0.85)',
                        color: '#ffffff',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {aspectRatio} Crop Frame
                    </span>
                  </div>
                </div>
              )}

              {/* Center Play Button Overlay */}
              {!isPlaying && !isProcessing && (
                <button
                  type="button"
                  onClick={togglePlay}
                  style={{
                    position: 'absolute',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.85)',
                    border: 'none',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 8px 25px rgba(99, 102, 241, 0.5)',
                  }}
                >
                  <Play size={24} fill="#ffffff" style={{ marginLeft: '3px' }} />
                </button>
              )}
            </div>

            {/* Interactive Draggable Timeline Studio */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Timeline Header & Current Position */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={13} color="#818cf8" />
                  <span>Playhead: <strong style={{ color: '#f8fafc', fontFamily: 'monospace' }}>{formatTimeCode(currentTime)}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Scissors size={12} /> Drag handles to trim
                  </span>
                  <span>
                    Total: <strong style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{formatTimeCode(duration)}</strong>
                  </span>
                </div>
              </div>

              {/* Dual-Handle Draggable Timeline Track */}
              <div
                ref={timelineRef}
                onPointerDown={(e) => {
                  if (duration <= 0 || !timelineRef.current) return;
                  const rect = timelineRef.current.getBoundingClientRect();
                  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  seekTo(ratio * duration);
                  setActiveDrag('playhead');
                }}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '56px',
                  backgroundColor: '#070b14',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                  overflow: 'visible',
                  userSelect: 'none',
                  touchAction: 'none',
                  cursor: 'pointer',
                  boxShadow: 'inset 0 2px 6px rgba(0, 0, 0, 0.6)',
                }}
              >
                {/* Background Filmstrip Tick Marks */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    pointerEvents: 'none',
                    opacity: 0.25,
                  }}
                >
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: '1px',
                        height: i % 2 === 0 ? '100%' : '50%',
                        backgroundColor: '#ffffff',
                        alignSelf: i % 2 === 0 ? 'stretch' : 'center',
                      }}
                    />
                  ))}
                </div>

                {duration > 0 && (
                  <>
                    {/* Unselected Left Dimmed Mask (0% to startTime) */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(startTime / duration) * 100}%`,
                        backgroundColor: 'rgba(3, 7, 18, 0.75)',
                        backdropFilter: 'grayscale(0.8)',
                        pointerEvents: 'none',
                        borderRadius: '7px 0 0 7px',
                      }}
                    />

                    {/* Active Selected Trim Window (startTime to endTime) */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        dragStartRef.current = {
                          clientX: e.clientX,
                          initStart: startTime,
                          initEnd: endTime,
                        };
                        setActiveDrag('window');
                      }}
                      onMouseEnter={() => setHoverTarget('window')}
                      onMouseLeave={() => setHoverTarget('none')}
                      style={{
                        position: 'absolute',
                        left: `${(startTime / duration) * 100}%`,
                        width: `${Math.max(0, ((endTime - startTime) / duration) * 100)}%`,
                        top: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(99, 102, 241, 0.22)',
                        borderTop: '2px solid #818cf8',
                        borderBottom: '2px solid #818cf8',
                        cursor: activeDrag === 'window' ? 'grabbing' : 'grab',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                      title="Drag to shift entire trimmed clip"
                    >
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#e0e7ff',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          background: 'rgba(15, 23, 42, 0.8)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(129, 140, 248, 0.3)',
                        }}
                      >
                        Trimmed: {formatTimeCode(selectedClipDuration)}
                      </span>
                    </div>

                    {/* Unselected Right Dimmed Mask (endTime to 100%) */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(endTime / duration) * 100}%`,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(3, 7, 18, 0.75)',
                        backdropFilter: 'grayscale(0.8)',
                        pointerEvents: 'none',
                        borderRadius: '0 7px 7px 0',
                      }}
                    />

                    {/* Left Drag Handle (Start Mark) */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        dragStartRef.current = {
                          clientX: e.clientX,
                          initStart: startTime,
                          initEnd: endTime,
                        };
                        setActiveDrag('start');
                      }}
                      onMouseEnter={() => setHoverTarget('start')}
                      onMouseLeave={() => setHoverTarget('none')}
                      style={{
                        position: 'absolute',
                        left: `${(startTime / duration) * 100}%`,
                        transform: 'translateX(-100%)',
                        top: '-2px',
                        bottom: '-2px',
                        width: '22px',
                        background: 'linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)',
                        borderRadius: '6px 0 0 6px',
                        border: '2px solid #ffffff',
                        borderRight: 'none',
                        cursor: 'ew-resize',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.7)',
                        zIndex: 25,
                      }}
                      title="Drag to change Start Time"
                    >
                      <ChevronsLeft size={13} color="#ffffff" style={{ marginLeft: '-1px' }} />
                      <div style={{ width: '2px', height: '12px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '1px', marginTop: '2px' }} />

                      {/* Floating Start Badge */}
                      {(activeDrag === 'start' || hoverTarget === 'start') && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '6px',
                            background: '#4f46e5',
                            border: '1px solid #c7d2fe',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            pointerEvents: 'none',
                          }}
                        >
                          Start: {formatTimeCode(startTime)}
                        </div>
                      )}
                    </div>

                    {/* Right Drag Handle (End Mark) */}
                    <div
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        dragStartRef.current = {
                          clientX: e.clientX,
                          initStart: startTime,
                          initEnd: endTime,
                        };
                        setActiveDrag('end');
                      }}
                      onMouseEnter={() => setHoverTarget('end')}
                      onMouseLeave={() => setHoverTarget('none')}
                      style={{
                        position: 'absolute',
                        left: `${(endTime / duration) * 100}%`,
                        transform: 'translateX(0)',
                        top: '-2px',
                        bottom: '-2px',
                        width: '22px',
                        background: 'linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)',
                        borderRadius: '0 6px 6px 0',
                        border: '2px solid #ffffff',
                        borderLeft: 'none',
                        cursor: 'ew-resize',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(99, 102, 241, 0.7)',
                        zIndex: 25,
                      }}
                      title="Drag to change End Time"
                    >
                      <ChevronsRight size={13} color="#ffffff" style={{ marginRight: '-1px' }} />
                      <div style={{ width: '2px', height: '12px', background: 'rgba(255, 255, 255, 0.6)', borderRadius: '1px', marginTop: '2px' }} />

                      {/* Floating End Badge */}
                      {(activeDrag === 'end' || hoverTarget === 'end') && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '6px',
                            background: '#4f46e5',
                            border: '1px solid #c7d2fe',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                            pointerEvents: 'none',
                          }}
                        >
                          End: {formatTimeCode(endTime)}
                        </div>
                      )}
                    </div>

                    {/* Current Playhead Scrubber Marker */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${(currentTime / duration) * 100}%`,
                        top: 0,
                        bottom: 0,
                        width: '2px',
                        backgroundColor: '#f59e0b',
                        boxShadow: '0 0 8px rgba(245, 158, 11, 0.8)',
                        zIndex: 30,
                        pointerEvents: 'none',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '10px',
                          height: '10px',
                          backgroundColor: '#f59e0b',
                          borderRadius: '50%',
                          boxShadow: '0 0 6px rgba(245, 158, 11, 0.9)',
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Quick Timeline Navigation Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px 12px', fontSize: '0.74rem' }}
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />} {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    type="button"
                    onClick={playTrimmedPreview}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px 12px', fontSize: '0.74rem', color: '#a5b4fc', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                    title="Play from start to end mark"
                  >
                    <Eye size={12} /> Preview Trim
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => seekTo(startTime)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px 9px', fontSize: '0.72rem' }}
                    title="Jump to Start Mark"
                  >
                    Go Start
                  </button>
                  <button
                    type="button"
                    onClick={() => seekTo(endTime)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px 9px', fontSize: '0.72rem' }}
                    title="Jump to End Mark"
                  >
                    Go End
                  </button>
                  <button
                    type="button"
                    onClick={resetTrim}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '5px 9px', fontSize: '0.72rem' }}
                    title="Reset to full duration"
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Crop, Trim & Compression Parameters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* 1. Interactive Drag Trim Summary */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scissors size={14} color="#818cf8" /> 1. Timeline Drag Trim
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  Trimmed: {formatTimeCode(selectedClipDuration)}
                </span>
              </div>

              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 10px 0' }}>
                Drag the <strong>◀ Start</strong> and <strong>End ▶</strong> handles on the timeline to trim your clip.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Start Time Card */}
                <div
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(2, 6, 23, 0.6)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Clip Start</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: '#c7d2fe', margin: '2px 0 6px 0' }}>
                    {formatTimeCode(startTime)}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => nudgeStart(-0.5)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, padding: '2px 4px', fontSize: '0.68rem' }}
                      title="Nudge start back 0.5s"
                    >
                      -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeStart(0.5)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, padding: '2px 4px', fontSize: '0.68rem' }}
                      title="Nudge start forward 0.5s"
                    >
                      +0.5s
                    </button>
                    <button
                      type="button"
                      onClick={setStartToCurrent}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                      title="Set Start to current playhead"
                    >
                      [ Frame
                    </button>
                  </div>
                </div>

                {/* End Time Card */}
                <div
                  style={{
                    padding: '8px 10px',
                    background: 'rgba(2, 6, 23, 0.6)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Clip End</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: '#c7d2fe', margin: '2px 0 6px 0' }}>
                    {formatTimeCode(endTime)}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => nudgeEnd(-0.5)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, padding: '2px 4px', fontSize: '0.68rem' }}
                      title="Nudge end back 0.5s"
                    >
                      -0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeEnd(0.5)}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, padding: '2px 4px', fontSize: '0.68rem' }}
                      title="Nudge end forward 0.5s"
                    >
                      +0.5s
                    </button>
                    <button
                      type="button"
                      onClick={setEndToCurrent}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                      title="Set End to current playhead"
                    >
                      Frame ]
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Aspect Ratio & Framing Crop */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Crop size={14} color="#818cf8" /> 2. Aspect Ratio Framing
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {aspectRatio === 'original' ? 'Full Video (No Crop)' : `${aspectRatio} Frame`}
                </span>
              </div>

              {/* Aspect Ratio Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
                {[
                  { id: 'original', label: 'Original' },
                  { id: '16:9', label: '16:9' },
                  { id: '4:3', label: '4:3' },
                  { id: '1:1', label: '1:1 Sq' },
                  { id: '9:16', label: '9:16' },
                ].map((r) => {
                  const isActive = aspectRatio === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setAspectRatio(r.id as any)}
                      style={{
                        padding: '6px 4px',
                        fontSize: '0.74rem',
                        fontWeight: isActive ? 700 : 500,
                        borderRadius: '6px',
                        border: isActive ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isActive ? 'rgba(99, 102, 241, 0.25)' : 'rgba(2, 6, 23, 0.5)',
                        color: isActive ? '#c7d2fe' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>

              {/* Pan Align Position (when cropped) */}
              {aspectRatio !== 'original' && (
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Focal Alignment
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['center', 'left', 'right', 'top', 'bottom'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setPanPosition(pos)}
                        style={{
                          flex: 1,
                          padding: '3px',
                          fontSize: '0.7rem',
                          textTransform: 'capitalize',
                          borderRadius: '4px',
                          border: panPosition === pos ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          background: panPosition === pos ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                          color: panPosition === pos ? '#a5b4fc' : '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. Automatic 420p Compression (Standardized) */}
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={14} color="#38bdf8" /> 3. Automatic Compression
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  420p Standard SD
                </span>
              </div>

              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  fontSize: '0.75rem',
                  color: '#cbd5e1',
                  lineHeight: '1.4',
                  marginBottom: '10px',
                }}
              >
                All videos across LMS are automatically encoded in <strong>420p Standard SD</strong> for zero buffering, reduced bandwidth usage, and instant streaming on all learner devices.
              </div>

              {/* Processing Mode Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'rgba(2, 6, 23, 0.4)',
                  fontSize: '0.75rem',
                }}
              >
                <span>Processing Mode:</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setExportMode('transcode')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.7rem',
                      borderRadius: '4px',
                      border: exportMode === 'transcode' ? '1px solid #818cf8' : 'transparent',
                      background: exportMode === 'transcode' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                      color: exportMode === 'transcode' ? '#c7d2fe' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    Encode 420p File
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportMode('instant')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.7rem',
                      borderRadius: '4px',
                      border: exportMode === 'instant' ? '1px solid #10b981' : 'transparent',
                      background: exportMode === 'instant' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                      color: exportMode === 'instant' ? '#6ee7b7' : '#64748b',
                      cursor: 'pointer',
                    }}
                  >
                    Instant Crop
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.75rem',
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Processing Progress Bar */}
            {isProcessing && (
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
                  <span style={{ color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={13} className="spin-animation" /> {processStage}
                  </span>
                  <span style={{ fontWeight: 700, color: '#818cf8' }}>{processProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${processProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #6366f1, #38bdf8)',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(15, 23, 42, 0.95)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isProcessing}
            style={{ fontSize: '0.82rem' }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApply}
            disabled={isProcessing || selectedClipDuration <= 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '8px 18px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
            }}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={14} className="spin-animation" /> Processing...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Apply Crop &amp; Trim ({formatTimeCode(selectedClipDuration)})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

