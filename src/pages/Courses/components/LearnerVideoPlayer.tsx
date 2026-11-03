import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  RotateCcw,
  Clock,
  Film,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { VideoLessonInfo } from '../../../types';
import { normalizeVideoUrl, formatVideoDuration } from '../../../lib/videoService';

interface Props {
  videoInfo?: VideoLessonInfo;
  contentUrl?: string;
  lessonTitle: string;
  courseId: string;
  onComplete?: () => void;
  onProgressUpdate?: (secondsWatched: number, totalDuration: number) => void;
}

export const LearnerVideoPlayer: React.FC<Props> = ({
  videoInfo,
  contentUrl,
  lessonTitle,
  courseId,
  onComplete,
  onProgressUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCompletedFired, setIsCompletedFired] = useState(false);

  // Resolve video source
  const rawUrl = videoInfo?.url || videoInfo?.embedUrl || contentUrl || '';
  const normalized = normalizeVideoUrl(rawUrl);

  const isYouTube = videoInfo?.sourceType === 'youtube' || normalized.sourceType === 'youtube';
  const isVimeo = videoInfo?.sourceType === 'vimeo' || normalized.sourceType === 'vimeo';
  const isExternalEmbed = isYouTube || isVimeo;
  const embedUrl = videoInfo?.embedUrl || normalized.embedUrl;

  // Local/Direct streaming video URL
  const videoSrc = videoInfo?.url || (normalized.sourceType === 'external' ? rawUrl : '');

  // Reset player state on lesson/source change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setHasError(false);
    setIsCompletedFired(false);
  }, [rawUrl, lessonTitle]);

  // Video HTML5 event handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || duration || 0;
    setCurrentTime(cur);

    if (onProgressUpdate && dur > 0) {
      onProgressUpdate(cur, dur);
    }

    // Trigger complete if watched 90% or finished
    if (dur > 0 && cur / dur >= 0.9 && !isCompletedFired) {
      setIsCompletedFired(true);
      if (onComplete) onComplete();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTo = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // If YouTube / Vimeo embed
  if (isExternalEmbed && embedUrl) {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          position: 'relative',
          paddingBottom: '56.25%', // 16:9
          height: 0,
          borderRadius: 'var(--radius-xl, 12px)',
          overflow: 'hidden',
          backgroundColor: '#040711',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
          border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
        }}
      >
        <iframe
          src={embedUrl}
          title={lessonTitle}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // If no video attached
  if (!videoSrc) {
    return (
      <div
        style={{
          height: '430px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at center, #1e1b4b 0%, #060913 75%)',
          borderRadius: 'var(--radius-xl, 12px)',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8',
            marginBottom: '16px',
          }}
        >
          <Film size={28} />
        </div>
        <h3 style={{ color: '#ffffff', margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 600 }}>
          {lessonTitle}
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
          The video lecture for this lesson is being prepared. In the meantime, you can review any supplementary reading materials and quizzes below.
        </p>
      </div>
    );
  }

  // HTML5 Video Player
  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        backgroundColor: '#040711',
        borderRadius: 'var(--radius-xl, 12px)',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
        position: 'relative',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.45)',
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsLoading(false);
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          if (onComplete) onComplete();
        }}
        style={{
          width: '100%',
          maxHeight: '520px',
          display: 'block',
          backgroundColor: '#000000',
          cursor: 'pointer',
        }}
      />

      {/* Loading Overlay */}
      {isLoading && !hasError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            pointerEvents: 'none',
          }}
        >
          <RefreshCw size={36} color="#818cf8" className="spin-animation" />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            padding: '20px',
            textAlign: 'center',
            color: '#ffffff',
          }}
        >
          <AlertCircle size={36} color="#ef4444" style={{ marginBottom: '10px' }} />
          <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
            Unable to stream video
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', maxWidth: '360px', margin: '0 0 16px' }}>
            The video stream could not be loaded. Please ensure the backend server is running and try again.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              if (videoRef.current) {
                videoRef.current.load();
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCcw size={13} /> Retry Playback
          </button>
        </div>
      )}

      {/* Center Play/Pause button overlay (when paused or ended) */}
      {!isPlaying && !isLoading && !hasError && (
        <button
          type="button"
          onClick={togglePlay}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(79, 70, 229, 0.5)',
            transition: 'transform 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)')}
        >
          <Play size={26} fill="#ffffff" style={{ marginLeft: '3px' }} />
        </button>
      )}

      {/* Control Bar */}
      <div
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
          padding: '12px 18px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Scrubber Range */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: 'var(--primary, #6366f1)',
            height: '4px',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left Controls: Play/Pause, Volume, Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={togglePlay}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {isPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={toggleMute}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: '60px',
                  height: '4px',
                  accentColor: '#cbd5e1',
                  cursor: 'pointer',
                }}
              />
            </div>

            <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
              {formatVideoDuration(currentTime)} / {formatVideoDuration(duration)}
            </span>
          </div>

          {/* Right Controls: Speed, Quality badge, Fullscreen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Speed Selector */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 1.25, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => changeSpeed(spd)}
                  style={{
                    border: 'none',
                    background: playbackSpeed === spd ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                    color: playbackSpeed === spd ? '#a5b4fc' : '#94a3b8',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <span
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
              }}
            >
              HD Stream
            </span>

            <button
              type="button"
              onClick={toggleFullscreen}
              style={{
                background: 'none',
                border: 'none',
                color: '#cbd5e1',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

