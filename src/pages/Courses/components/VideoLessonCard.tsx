import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Play,
  Edit2,
  Trash2,
  Clock,
  Globe,
  Upload,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Scissors,
  Sliders,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { VideoLessonInfo } from '../../../types';
import {
  formatVideoDuration,
  formatVideoFileSize,
  normalizeVideoUrl,
  getActiveVideoFile,
} from '../../../lib/videoService';

interface Props {
  videoInfo?: VideoLessonInfo;
  durationMinutes?: number;
  onEdit: () => void;
  onRemove: () => void;
}

export const VideoLessonCard: React.FC<Props> = ({
  videoInfo,
  durationMinutes = 15,
  onEdit,
  onRemove,
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  // Dynamic source detection to ensure YouTube / Vimeo links are never misidentified as local uploads
  const rawUrl = (videoInfo?.url || videoInfo?.embedUrl || '').trim();
  const normalized = normalizeVideoUrl(rawUrl);

  const isYouTube =
    videoInfo?.sourceType === 'youtube' ||
    normalized.sourceType === 'youtube' ||
    /youtu\.?be/i.test(rawUrl);

  const isVimeo =
    videoInfo?.sourceType === 'vimeo' ||
    normalized.sourceType === 'vimeo' ||
    /vimeo\.com/i.test(rawUrl);

  const isExternalStream =
    videoInfo?.sourceType === 'external' ||
    (normalized.sourceType === 'external' && !isYouTube && !isVimeo);

  const isLocal =
    !isYouTube &&
    !isVimeo &&
    !isExternalStream &&
    (videoInfo?.sourceType === 'upload' ||
      rawUrl.startsWith('blob:') ||
      rawUrl.startsWith('/uploads/') ||
      rawUrl.startsWith('/storage/'));

  // Resolve best local playable stream URL (active blob from memory, or 420p variant, or storage path)
  const resolveLocalSource = (): string => {
    if (!videoInfo) return '';
    if (videoInfo.id) {
      const reg = getActiveVideoFile(videoInfo.id) || (videoInfo.fileName ? getActiveVideoFile(videoInfo.fileName) : undefined);
      if (reg?.objectUrl) return reg.objectUrl;
    }
    if (videoInfo.qualities?.['420p']) {
      return videoInfo.qualities['420p'];
    }
    return videoInfo.url || videoInfo.embedUrl || '';
  };

  const localPlaySource = resolveLocalSource();

  // Reset video error on source changes
  useEffect(() => {
    setVideoError(null);
  }, [localPlaySource, rawUrl, showPreview]);

  // Handle trim boundary cues when metadata is loaded
  const handleLoadedMetadata = () => {
    setVideoError(null);
    if (!videoPlayerRef.current || !videoInfo?.cropMetadata) return;
    const start = videoInfo.cropMetadata.startTime || 0;
    if (start > 0) {
      videoPlayerRef.current.currentTime = start;
    }
  };

  // Handle clip playback bounds (auto pause/loop at endTime)
  const handleTimeUpdate = () => {
    if (!videoPlayerRef.current || !videoInfo?.cropMetadata) return;
    const { startTime = 0, endTime } = videoInfo.cropMetadata;
    if (endTime && endTime > startTime && videoPlayerRef.current.currentTime >= endTime) {
      videoPlayerRef.current.pause();
      videoPlayerRef.current.currentTime = startTime;
    }
  };

  if (!videoInfo || (!videoInfo.url && !videoInfo.embedUrl)) {
    return (
      <div
        style={{
          marginTop: '8px',
          padding: '14px 16px',
          background: 'var(--bg-surface, #f8fafc)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px dashed var(--border-color, #cbd5e1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--primary, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Video size={16} />
          </div>
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
              No Video Configured
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
              Upload an MP4/WebM video or link a YouTube/Vimeo stream for this lesson.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            padding: '6px 12px',
            borderColor: 'var(--primary, #6366f1)',
            color: 'var(--primary, #6366f1)',
          }}
        >
          <Upload size={13} /> Configure Video
        </button>
      </div>
    );
  }

  const resolvedEmbedUrl = isYouTube || isVimeo
    ? (normalized.embedUrl || videoInfo.embedUrl || rawUrl)
    : (videoInfo.embedUrl || videoInfo.url);

  const badgeColor = isYouTube
    ? { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.3)' }
    : isVimeo
    ? { bg: 'rgba(6, 182, 212, 0.12)', text: '#0891b2', border: 'rgba(6, 182, 212, 0.3)' }
    : isExternalStream
    ? { bg: 'rgba(14, 165, 233, 0.12)', text: '#0284c7', border: 'rgba(14, 165, 233, 0.3)' }
    : { bg: 'rgba(99, 102, 241, 0.12)', text: '#4f46e5', border: 'rgba(99, 102, 241, 0.3)' };

  return (
    <div
      style={{
        marginTop: '8px',
        padding: '14px 16px',
        background: 'var(--bg-surface, #f8fafc)',
        borderRadius: 'var(--radius-md, 8px)',
        border: '1px solid var(--border-color, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: badgeColor.bg,
              color: badgeColor.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isYouTube ? (
              <Play size={18} fill="currentColor" />
            ) : isVimeo ? (
              <Play size={18} />
            ) : isLocal ? (
              <Video size={18} />
            ) : (
              <Globe size={18} />
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: badgeColor.bg,
                  color: badgeColor.text,
                  border: `1px solid ${badgeColor.border}`,
                  letterSpacing: '0.03em',
                }}
              >
                {isYouTube ? 'YouTube' : isVimeo ? 'Vimeo' : isExternalStream ? 'Web Stream' : 'Local Upload'}
              </span>

              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-color, #e2e8f0)',
                  color: 'var(--text-secondary, #64748b)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Clock size={11} />
                {videoInfo.durationSeconds
                  ? formatVideoDuration(videoInfo.durationSeconds)
                  : `${durationMinutes}m`}
              </span>

              {videoInfo.fileSize && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-secondary, #64748b)',
                  }}
                >
                  &bull; {formatVideoFileSize(videoInfo.fileSize)}
                </span>
              )}

              {videoInfo.cropMetadata && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.25)',
                    color: '#4f46e5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                  title={`Cropped: ${videoInfo.cropMetadata.startTime || 0}s to ${videoInfo.cropMetadata.endTime || 'end'}s`}
                >
                  <Scissors size={10} /> Cropped ({videoInfo.cropMetadata.aspectRatio || 'Custom'})
                </span>
              )}

              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
                title="Optimized and compressed in 420p Standard SD"
              >
                <Sliders size={10} /> 420p Compressed
              </span>
            </div>

            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-primary, #0f172a)',
                marginTop: '3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {videoInfo.title || videoInfo.fileName || 'Video Lecture'}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.76rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Play size={11} /> {showPreview ? 'Hide Preview' : 'Preview'}
            {showPreview ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.76rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Edit video settings"
          >
            <Edit2 size={11} /> Edit
          </button>

          <button
            type="button"
            onClick={onRemove}
            className="btn btn-secondary btn-sm"
            style={{
              fontSize: '0.76rem',
              padding: '4px 8px',
              color: 'var(--danger, #ef4444)',
              display: 'flex',
              alignItems: 'center',
            }}
            title="Remove video from lesson"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Inline Video Preview Player */}
      {showPreview && (
        <div
          style={{
            marginTop: '10px',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#000000',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          }}
        >
          {videoError ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#f87171',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={24} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Video Preview Unavailable</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', maxWidth: '380px' }}>
                {videoError}
              </div>
              <button
                type="button"
                onClick={onEdit}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Edit2 size={12} /> Re-configure or Re-upload Video
              </button>
            </div>
          ) : isYouTube || isVimeo ? (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, width: '100%' }}>
              <iframe
                src={resolvedEmbedUrl}
                title={videoInfo.title || 'Lesson Video Preview'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : isLocal ? (
            <div style={{ position: 'relative', width: '100%', backgroundColor: '#000000' }}>
              <video
                ref={videoPlayerRef}
                src={localPlaySource}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onError={() => {
                  setVideoError(
                    'The media stream could not be loaded. Please click Edit to re-upload or select your video.'
                  );
                }}
                style={{
                  width: '100%',
                  maxHeight: '360px',
                  display: 'block',
                  margin: '0 auto',
                  objectFit: videoInfo.cropMetadata?.aspectRatio && videoInfo.cropMetadata.aspectRatio !== 'original'
                    ? 'cover'
                    : 'contain',
                }}
              />
              {videoInfo.cropMetadata?.isCropped && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    color: '#a5b4fc',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    pointerEvents: 'none',
                  }}
                >
                  <Scissors size={10} />
                  Trimmed: {Math.round(videoInfo.cropMetadata.startTime || 0)}s - {videoInfo.cropMetadata.endTime ? `${Math.round(videoInfo.cropMetadata.endTime)}s` : 'end'}
                </div>
              )}
            </div>
          ) : (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, width: '100%' }}>
              <iframe
                src={resolvedEmbedUrl}
                title={videoInfo.title || 'Lesson Video Preview'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

