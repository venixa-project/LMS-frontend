import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Video,
  Film,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  RefreshCw,
  Trash2,
  ExternalLink,
  Play,
} from 'lucide-react';
import { VideoLessonInfo } from '../../../types';
import {
  normalizeVideoUrl,
  uploadVideoFile,
  saveExternalVideo,
  formatVideoDuration,
  formatVideoFileSize,
  ALLOWED_VIDEO_EXTENSIONS,
  MAX_VIDEO_SIZE_BYTES,
} from '../../../lib/videoService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoInfo: VideoLessonInfo, updatedTitle?: string) => void;
  courseId: string;
  lessonId: string;
  initialTitle?: string;
  initialVideo?: VideoLessonInfo;
}

export const VideoUploadModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  courseId,
  lessonId,
  initialTitle = '',
  initialVideo,
}) => {
  const [sourceType, setSourceType] = useState<'upload' | 'url'>(
    initialVideo?.sourceType === 'youtube' || initialVideo?.sourceType === 'vimeo' || initialVideo?.sourceType === 'external'
      ? 'url'
      : 'upload'
  );

  const [title, setTitle] = useState(initialTitle || initialVideo?.title || 'Video Lecture');
  const [description, setDescription] = useState(initialVideo?.description || '');
  const [urlInput, setUrlInput] = useState(initialVideo?.url || '');
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialVideo?.durationSeconds ? Math.ceil(initialVideo.durationSeconds / 60) : 10
  );

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(initialVideo?.url || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detectedDurationSecs, setDetectedDurationSecs] = useState<number>(
    initialVideo?.durationSeconds || 0
  );
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // URL normalization state
  const normalizedUrl = normalizeVideoUrl(urlInput);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || initialVideo?.title || 'Video Lecture');
      setDescription(initialVideo?.description || '');
      setUrlInput(initialVideo?.url || '');
      setDurationMinutes(
        initialVideo?.durationSeconds ? Math.ceil(initialVideo.durationSeconds / 60) : 10
      );
      setDetectedDurationSecs(initialVideo?.durationSeconds || 0);
      setSourceType(
        initialVideo?.sourceType === 'youtube' ||
          initialVideo?.sourceType === 'vimeo' ||
          initialVideo?.sourceType === 'external'
          ? 'url'
          : 'upload'
      );
      setPreviewBlobUrl(initialVideo?.url || null);
      setSelectedFile(null);
      setUploadProgress(initialVideo ? 100 : 0);
      setErrorMessage(null);
    }
  }, [isOpen, initialTitle, initialVideo]);

  // Retain blob URLs active across the session so learners and previewers can stream
  const isSavedRef = useRef(false);
  useEffect(() => {
    isSavedRef.current = false;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelection = (file: File) => {
    setErrorMessage(null);

    // Validate size
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      setErrorMessage(
        `File is too large (${formatVideoFileSize(file.size)}). Maximum allowed size is 500 MB.`
      );
      return;
    }

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
      setErrorMessage(
        `Invalid video format. Supported formats are: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`
      );
      return;
    }

    if (previewBlobUrl && previewBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewBlobUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewBlobUrl(objectUrl);
    setUploadProgress(0);

    // Auto-update title if empty or default
    if (!title || title === 'Video Lecture') {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    // Inspect metadata for duration
    const isAudio = file.type.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.aac'].some((ext) => file.name.toLowerCase().endsWith(ext));
    const mediaElem = isAudio ? document.createElement('audio') : document.createElement('video');
    mediaElem.preload = 'metadata';
    mediaElem.src = objectUrl;
    mediaElem.onloadedmetadata = () => {
      if (mediaElem.duration && !isNaN(mediaElem.duration)) {
        const secs = Math.round(mediaElem.duration);
        setDetectedDurationSecs(secs);
        setDurationMinutes(Math.max(1, Math.ceil(secs / 60)));
      }
    };
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please provide a title for this video lesson.');
      return;
    }

    if (sourceType === 'upload') {
      if (!selectedFile && !initialVideo) {
        setErrorMessage('Please choose or upload a video file first.');
        return;
      }

      if (selectedFile) {
        setIsUploading(true);
        setUploadProgress(10);
        try {
          const videoInfo = await uploadVideoFile({
            courseId,
            lessonId,
            file: selectedFile,
            title: title.trim(),
            description: description.trim() || undefined,
            durationSeconds: detectedDurationSecs || durationMinutes * 60,
            onProgress: (p) => setUploadProgress(p),
          });
          setIsUploading(false);
          onSave(videoInfo, title.trim());
          onClose();
        } catch (err: any) {
          setIsUploading(false);
          setErrorMessage(err.message || 'Failed to upload video file.');
        }
      } else if (initialVideo) {
        // Retaining existing uploaded video with updated metadata
        const updated: VideoLessonInfo = {
          ...initialVideo,
          title: title.trim(),
          description: description.trim() || undefined,
          durationSeconds: durationMinutes * 60,
          durationFormatted: formatVideoDuration(durationMinutes * 60),
        };
        onSave(updated, title.trim());
        onClose();
      }
    } else {
      // External URL mode
      if (!urlInput.trim()) {
        setErrorMessage('Please enter a video URL.');
        return;
      }

      if (!normalizedUrl.isValid) {
        setErrorMessage(normalizedUrl.errorMessage || 'Invalid video URL entered.');
        return;
      }

      setIsUploading(true);
      try {
        const videoInfo = await saveExternalVideo({
          courseId,
          lessonId,
          url: urlInput.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          durationSeconds: durationMinutes * 60,
        });
        setIsUploading(false);
        onSave(videoInfo, title.trim());
        onClose();
      } catch (err: any) {
        setIsUploading(false);
        setErrorMessage(err.message || 'Failed to save external video link.');
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-card, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface, #f8fafc)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
              }}
            >
              <Film size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                Configure Video Lesson
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
                Upload an MP4/WebM video file or embed a YouTube / Vimeo stream
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              color: 'var(--text-secondary, #64748b)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#b91c1c',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Lesson Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Video Lesson Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Distributed Messaging"
              style={{ width: '100%', padding: '10px 12px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Description (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
              Lesson Description or Overview <span className="text-muted" style={{ fontWeight: 400 }}>(Optional)</span>
            </label>
            <textarea
              className="form-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of topics covered in this video lecture..."
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', resize: 'vertical' }}
            />
          </div>

          {/* Source Selection Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>
              Video Source
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '4px',
                background: 'var(--bg-surface, #f1f5f9)',
                borderRadius: '10px',
              }}
            >
              <button
                type="button"
                onClick={() => setSourceType('upload')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: sourceType === 'upload' ? 'var(--bg-card, #ffffff)' : 'transparent',
                  color: sourceType === 'upload' ? 'var(--primary, #4f46e5)' : 'var(--text-secondary, #64748b)',
                  fontWeight: sourceType === 'upload' ? 700 : 500,
                  boxShadow: sourceType === 'upload' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <Upload size={16} /> Upload Video File
              </button>
              <button
                type="button"
                onClick={() => setSourceType('url')}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: sourceType === 'url' ? 'var(--bg-card, #ffffff)' : 'transparent',
                  color: sourceType === 'url' ? 'var(--primary, #4f46e5)' : 'var(--text-secondary, #64748b)',
                  fontWeight: sourceType === 'url' ? 700 : 500,
                  boxShadow: sourceType === 'url' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <Globe size={16} /> Video URL (YouTube / Vimeo)
              </button>
            </div>
          </div>

          {/* Option 1: File Upload */}
          {sourceType === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="file"
                ref={fileInputRef}
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.mkv,audio/mpeg,audio/mp3,audio/wav,audio/m4a,audio/aac,audio/ogg,.mp3,.wav,.m4a,.aac,.ogg"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelection(f);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />

              {!selectedFile && !initialVideo && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: dragOver ? '2px dashed var(--primary, #4f46e5)' : '2px dashed var(--border-color, #cbd5e1)',
                    borderRadius: '12px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: dragOver ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg-surface, #f8fafc)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      margin: '0 auto 12px',
                      borderRadius: '50%',
                      background: 'rgba(79, 70, 229, 0.1)',
                      color: 'var(--primary, #4f46e5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Upload size={22} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                    Drag & Drop your video file here, or{' '}
                    <span style={{ color: 'var(--primary, #4f46e5)', textDecoration: 'underline' }}>Browse</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
                    Supported formats: MP4, WebM, MOV &bull; Max file size: 500 MB
                  </p>
                </div>
              )}

              {/* Selected / Uploaded File Card */}
              {(selectedFile || (initialVideo && initialVideo.sourceType === 'upload')) && (
                <div
                  style={{
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '12px',
                    padding: '16px',
                    background: 'var(--bg-surface, #f8fafc)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          background: 'rgba(79, 70, 229, 0.12)',
                          color: 'var(--primary, #4f46e5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Video size={20} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {selectedFile ? selectedFile.name : initialVideo?.fileName || initialVideo?.title}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.78rem',
                            color: 'var(--text-secondary, #64748b)',
                            marginTop: '2px',
                          }}
                        >
                          <span>{formatVideoFileSize(selectedFile?.size || initialVideo?.fileSize)}</span>
                          &bull;
                          <span>
                            <Clock size={12} style={{ display: 'inline', marginRight: '3px', verticalAlign: '-1px' }} />
                            {detectedDurationSecs
                              ? formatVideoDuration(detectedDurationSecs)
                              : `${durationMinutes} mins`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.78rem', padding: '5px 10px' }}
                      >
                        <RefreshCw size={12} style={{ marginRight: '4px' }} /> Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewBlobUrl(null);
                          setDetectedDurationSecs(0);
                        }}
                        disabled={isUploading}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#ef4444', fontSize: '0.78rem', padding: '5px 10px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar during upload */}
                  {isUploading && (
                    <div style={{ marginTop: '4px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          marginBottom: '4px',
                          color: 'var(--primary, #4f46e5)',
                        }}
                      >
                        <span>Uploading video to storage...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: '#e2e8f0',
                          borderRadius: '999px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${uploadProgress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #4f46e5, #06b6d4)',
                            transition: 'width 0.2s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Preview Player */}
                  {previewBlobUrl && (
                    <div style={{ marginTop: '6px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        Playback Preview:
                      </div>
                      <video
                        src={previewBlobUrl}
                        controls
                        style={{
                          width: '100%',
                          maxHeight: '220px',
                          borderRadius: '8px',
                          backgroundColor: '#000000',
                          outline: 'none',
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Option 2: Video URL */}
          {sourceType === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Video URL (YouTube or Vimeo) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    className="form-input"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      fontSize: '0.88rem',
                      borderColor: urlInput
                        ? normalizedUrl.isValid
                          ? '#10b981'
                          : '#ef4444'
                        : undefined,
                    }}
                  />
                  <Globe
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-secondary, #64748b)',
                    }}
                  />
                </div>

                {/* Instant Validation Badge / Helper Text */}
                <div style={{ marginTop: '8px', fontSize: '0.78rem' }}>
                  {urlInput ? (
                    normalizedUrl.isValid ? (
                      <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={13} /> Valid {normalizedUrl.sourceType === 'youtube' ? 'YouTube' : normalizedUrl.sourceType === 'vimeo' ? 'Vimeo' : 'Direct Stream'} video link
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={13} /> {normalizedUrl.errorMessage}
                      </span>
                    )
                  ) : (
                    <div style={{ color: 'var(--text-secondary, #64748b)', lineHeight: 1.5 }}>
                      Supported formats:
                      <br />
                      &bull; YouTube: <code>https://www.youtube.com/watch?v=...</code> or <code>https://youtu.be/...</code>
                      <br />
                      &bull; Vimeo: <code>https://vimeo.com/...</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Duration Setting for URL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={16} color="var(--primary, #4f46e5)" />
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Estimated Video Duration:</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    width: '60px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontSize: '0.85rem',
                  }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>minutes</span>
              </div>

              {/* Live Embed Preview */}
              {normalizedUrl.isValid && normalizedUrl.embedUrl && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Live Player Preview:
                  </div>
                  <div
                    style={{
                      position: 'relative',
                      paddingBottom: '56.25%', // 16:9 aspect ratio
                      height: 0,
                      borderRadius: '10px',
                      overflow: 'hidden',
                      backgroundColor: '#000000',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    }}
                  >
                    <iframe
                      src={normalizedUrl.embedUrl}
                      title="Video Preview"
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--bg-surface, #f8fafc)',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={
              isUploading ||
              (sourceType === 'upload' && !selectedFile && !initialVideo) ||
              (sourceType === 'url' && !normalizedUrl.isValid)
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              minWidth: '130px',
              justifyContent: 'center',
            }}
          >
            {isUploading ? (
              <>
                <RefreshCw size={14} className="spin-animation" /> Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Save Video Lesson
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

