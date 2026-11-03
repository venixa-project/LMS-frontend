import React, { useState } from 'react';
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
} from 'lucide-react';
import { VideoLessonInfo } from '../../../types';
import { formatVideoDuration, formatVideoFileSize } from '../../../lib/videoService';

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

  const isLocal = videoInfo.sourceType === 'upload';
  const isYouTube = videoInfo.sourceType === 'youtube';
  const isVimeo = videoInfo.sourceType === 'vimeo';

  const badgeColor = isYouTube
    ? { bg: 'rgba(239, 68, 68, 0.1)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.25)' }
    : isVimeo
    ? { bg: 'rgba(6, 182, 212, 0.1)', text: '#0891b2', border: 'rgba(6, 182, 212, 0.25)' }
    : { bg: 'rgba(99, 102, 241, 0.1)', text: '#4f46e5', border: 'rgba(99, 102, 241, 0.25)' };

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
            {isLocal ? <Video size={18} /> : <Globe size={18} />}
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
                {isLocal ? 'Local Upload' : isYouTube ? 'YouTube' : isVimeo ? 'Vimeo' : 'Web Stream'}
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
            marginTop: '8px',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#000000',
            border: '1px solid var(--border-color, #e2e8f0)',
          }}
        >
          {isLocal ? (
            <video
              src={videoInfo.url}
              controls
              style={{ width: '100%', maxHeight: '280px', display: 'block' }}
            />
          ) : (
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={videoInfo.embedUrl || videoInfo.url}
                title="Lesson Video Preview"
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
          )}
        </div>
      )}
    </div>
  );
};

