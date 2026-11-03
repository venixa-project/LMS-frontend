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
  Upload,
} from 'lucide-react';
import { VideoLessonInfo } from '../../../types';
import {
  normalizeVideoUrl,
  formatVideoDuration,
  formatVideoFileSize,
  DEFAULT_LECTURE_STREAM_URL,
  SECONDARY_LECTURE_STREAM_URL,
  getActiveVideoFile,
  registerVideoFile,
} from '../../../lib/videoService';

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Local/Direct streaming video URL with guaranteed playable fallback
  const resolvePlayableSource = (): string => {
    if (isExternalEmbed && embedUrl) return embedUrl;
    if (videoInfo?.id) {
      const reg = getActiveVideoFile(videoInfo.id) || (videoInfo.fileName ? getActiveVideoFile(videoInfo.fileName) : undefined);
      if (reg) return reg.objectUrl;
    }
    if (videoInfo?.url && videoInfo.url.trim() && !videoInfo.url.startsWith('blob:')) {
      return videoInfo.url;
    }
    if (contentUrl && contentUrl.trim() && !contentUrl.startsWith('blob:')) {
      return contentUrl;
    }
    return DEFAULT_LECTURE_STREAM_URL;
  };

  const [streamSource, setStreamSource] = useState<string>(resolvePlayableSource);
  const [usingFallbackStream, setUsingFallbackStream] = useState(() => !videoInfo?.url && !contentUrl);

  // Reset player state on lesson/source change
  useEffect(() => {
    const resolved = resolvePlayableSource();
    setStreamSource(resolved);
    setUsingFallbackStream(!videoInfo?.url && !contentUrl);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setHasError(false);
    setIsCompletedFired(false);
  }, [rawUrl, videoInfo?.id, videoInfo?.fileName, videoInfo?.url, contentUrl, lessonTitle]);

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objUrl = URL.createObjectURL(file);
      registerVideoFile(videoInfo?.id || lessonTitle, file, objUrl);
      setStreamSource(objUrl);
      setUsingFallbackStream(false);
      setHasError(false);
      setIsLoading(true);
      if (videoRef.current) {
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      }
    }
  };

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
      {/* Hidden local video file selector */}
      <input
        type="file"
        ref={fileInputRef}
        accept="video/*"
        onChange={handleCustomFileUpload}
        style={{ display: 'none' }}
      />

      {/* Top Video Header Bar with Status & Custom Upload Trigger */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'rgba(15, 23, 42, 0.96)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.82rem',
          zIndex: 10,
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.7)',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <Film size={14} color="#818cf8" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontWeight: 600,
                color: '#f8fafc',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
              title={videoInfo?.fileName || lessonTitle}
            >
              {videoInfo?.fileName || lessonTitle}
            </span>
            <span style={{ color: '#94a3b8', fontSize: '0.74rem', flexShrink: 0 }}>
              &bull; {duration > 0 ? formatVideoDuration(duration) : 'Interactive Lecture Stream'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            fontWeight: 600,
            padding: '5px 11px',
            borderRadius: '6px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            color: '#a5b4fc',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          title="Upload or select an MP4 / WebM video file from your computer"
        >
          <Upload size={12} /> Choose Video File
        </button>
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        src={streamSource}
        playsInline
        preload="auto"
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => {
          setIsLoading(false);
          setHasError(false);
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration);
            setIsLoading(false);
            setHasError(false);
          }
        }}
        onTimeUpdate={handleTimeUpdate}
        onError={() => {
          setIsLoading(false);
          if (streamSource !== DEFAULT_LECTURE_STREAM_URL) {
            console.warn('Switching to verified local lecture stream:', DEFAULT_LECTURE_STREAM_URL);
            setStreamSource(DEFAULT_LECTURE_STREAM_URL);
            setUsingFallbackStream(true);
            setHasError(false);
            setIsLoading(true);
            if (videoRef.current) {
              videoRef.current.load();
            }
          } else if (streamSource === DEFAULT_LECTURE_STREAM_URL) {
            console.warn('Switching to secondary verified lecture stream:', SECONDARY_LECTURE_STREAM_URL);
            setStreamSource(SECONDARY_LECTURE_STREAM_URL);
            setUsingFallbackStream(true);
            setHasError(false);
            setIsLoading(true);
            if (videoRef.current) {
              videoRef.current.load();
            }
          } else {
            setHasError(true);
          }
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

      {/* Error / Standby State with Multiple Recovery Paths */}
      {hasError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
            padding: '24px',
            textAlign: 'center',
            color: '#ffffff',
            zIndex: 20,
          }}
        >
          <AlertCircle size={38} color="#f59e0b" style={{ marginBottom: '10px' }} />
          <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px' }}>
            Lecture Playback Standby
          </div>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', maxWidth: '400px', margin: '0 0 8px', lineHeight: 1.5 }}>
            {videoInfo?.fileName ? `Target Video: "${videoInfo.fileName}"` : 'Uploaded video lecture stream'}
          </p>
          <p style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '380px', margin: '0 0 18px', lineHeight: 1.4 }}>
            Direct network stream is currently unavailable. Choose a local video file from your computer or load the verified course lecture stream.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setStreamSource(DEFAULT_LECTURE_STREAM_URL);
                setUsingFallbackStream(true);
                setHasError(false);
                setIsLoading(true);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <Play size={13} /> Load Curriculum Lecture
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <Upload size={13} /> Choose Video from Device
            </button>
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
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
            >
              <RotateCcw size={13} /> Retry
            </button>
          </div>
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

