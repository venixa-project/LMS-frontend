import { VideoLessonInfo, VideoCropMetadata, VideoQualityOption } from '../types';
import { generateQualityVariants } from './videoProcessingService';

export const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    // Relative URL automatically routes through Vite dev server proxy on any IP or host
    return '/api/v1';
  }
  return 'http://localhost:5000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();

// Reliable streaming educational lecture video source for local media backup
// Uses locally hosted verified MP4 in public directory first, with external secondary fallback
export const DEFAULT_LECTURE_STREAM_URL = '/sample_cloud_architecture_lesson.mp4';
export const SECONDARY_LECTURE_STREAM_URL = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

// In-memory registry to preserve local video files across component lifecycles in the active session
export const activeVideoFileRegistry = new Map<string, { file: File; objectUrl: string }>();

export function registerVideoFile(id: string, file: File, objectUrl: string) {
  activeVideoFileRegistry.set(id, { file, objectUrl });
  if (file.name) {
    activeVideoFileRegistry.set(file.name, { file, objectUrl });
  }
}

export function getActiveVideoFile(idOrName: string): { file: File; objectUrl: string } | undefined {
  return activeVideoFileRegistry.get(idOrName);
}

// In-memory registry for uploaded course documents
export const activeDocumentFileRegistry = new Map<string, { file: File; objectUrl: string; text?: string; dataUrl?: string }>();

export function registerDocumentFile(id: string, file: File, objectUrl: string, text?: string, dataUrl?: string) {
  activeDocumentFileRegistry.set(id, { file, objectUrl, text, dataUrl });
  if (file.name) {
    activeDocumentFileRegistry.set(file.name, { file, objectUrl, text, dataUrl });
  }
}

export function getActiveDocumentFile(idOrName: string): { file: File; objectUrl: string; text?: string; dataUrl?: string } | undefined {
  return activeDocumentFileRegistry.get(idOrName);
}

export const ALLOWED_VIDEO_EXTENSIONS = [
  '.mp4', '.webm', '.mov', '.mkv', '.m4v',
  '.mp3', '.wav', '.m4a', '.ogg', '.aac'
];
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

export interface NormalizedUrlResult {
  isValid: boolean;
  sourceType: 'youtube' | 'vimeo' | 'external' | 'invalid';
  videoId?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatVideoDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Format bytes into readable string (KB, MB, GB)
 */
export function formatVideoFileSize(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Parse and validate video links (YouTube, Vimeo, external stream)
 */
export function normalizeVideoUrl(rawUrl: string): NormalizedUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, sourceType: 'invalid', errorMessage: 'URL cannot be empty' };
  }

  const trimmed = rawUrl.trim();

  // YouTube match: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/..., shorts/..., live/...
  const ytRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const ytMatch = trimmed.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      isValid: true,
      sourceType: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // Vimeo match: vimeo.com/..., player.vimeo.com/video/...
  const vimeoRegex = /(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|video\/|)(\d+)/i;
  const vimeoMatch = trimmed.match(vimeoRegex);
  if (vimeoMatch && vimeoMatch[2]) {
    const videoId = vimeoMatch[2];
    return {
      isValid: true,
      sourceType: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      thumbnailUrl: `https://vumbnail.com/${videoId}.jpg`,
    };
  }

  // Direct HTTP / HTTPS streamable video link
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      const isVideoFile = ALLOWED_VIDEO_EXTENSIONS.some((ext) =>
        parsed.pathname.toLowerCase().endsWith(ext)
      );
      return {
        isValid: true,
        sourceType: 'external',
        embedUrl: trimmed,
        errorMessage: isVideoFile ? undefined : 'Warning: URL does not end in a standard video extension (.mp4, .webm)',
      };
    }
  } catch {}

  return {
    isValid: false,
    sourceType: 'invalid',
    errorMessage: 'Please enter a valid YouTube, Vimeo, or direct video URL',
  };
}

/**
 * Resiliently infer and normalize video information for lessons across the LMS
 * Ensures YouTube, Vimeo, and local uploads always resolve their proper source type,
 * player embed URL, and thumbnail.
 */
export function inferVideoInfo(
  source: string | Partial<VideoLessonInfo> | undefined,
  fallbackTitle: string = 'Video Lecture',
  fallbackDurationMinutes: number = 10
): VideoLessonInfo | undefined {
  if (!source) return undefined;

  let rawUrl = '';
  let existingTitle = fallbackTitle;
  let existingDuration = fallbackDurationMinutes * 60;
  let existingCrop = undefined;
  let existingSourceType = undefined;
  let existingId = undefined;

  if (typeof source === 'string') {
    rawUrl = source.trim();
  } else {
    rawUrl = (source.url || source.embedUrl || '').trim();
    if (source.title) existingTitle = source.title;
    if (source.durationSeconds) existingDuration = source.durationSeconds;
    if (source.cropMetadata) existingCrop = source.cropMetadata;
    if (source.sourceType) existingSourceType = source.sourceType;
    if (source.id) existingId = source.id;
  }

  if (!rawUrl) return undefined;

  const normalized = normalizeVideoUrl(rawUrl);

  let finalSourceType: 'upload' | 'youtube' | 'vimeo' | 'external' = 'upload';
  let embedUrl = rawUrl;
  let thumbnailUrl = undefined;
  let videoId = undefined;

  if (normalized.isValid && (normalized.sourceType === 'youtube' || /youtu\.?be/i.test(rawUrl))) {
    finalSourceType = 'youtube';
    embedUrl = normalized.embedUrl || rawUrl;
    thumbnailUrl = normalized.thumbnailUrl;
    videoId = normalized.videoId;
  } else if (normalized.isValid && (normalized.sourceType === 'vimeo' || /vimeo\.com/i.test(rawUrl))) {
    finalSourceType = 'vimeo';
    embedUrl = normalized.embedUrl || rawUrl;
    thumbnailUrl = normalized.thumbnailUrl;
    videoId = normalized.videoId;
  } else if (
    existingSourceType === 'upload' &&
    !rawUrl.startsWith('http://') &&
    !rawUrl.startsWith('https://')
  ) {
    finalSourceType = 'upload';
    embedUrl = rawUrl;
  } else if (rawUrl.startsWith('blob:') || rawUrl.startsWith('/uploads/') || rawUrl.startsWith('/storage/')) {
    finalSourceType = 'upload';
    embedUrl = rawUrl;
  } else if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    if (/youtu\.?be/i.test(rawUrl)) {
      finalSourceType = 'youtube';
      embedUrl = normalized.embedUrl || rawUrl;
      thumbnailUrl = normalized.thumbnailUrl;
      videoId = normalized.videoId;
    } else if (/vimeo\.com/i.test(rawUrl)) {
      finalSourceType = 'vimeo';
      embedUrl = normalized.embedUrl || rawUrl;
      thumbnailUrl = normalized.thumbnailUrl;
      videoId = normalized.videoId;
    } else {
      finalSourceType = 'external';
      embedUrl = normalized.embedUrl || rawUrl;
    }
  }

  return {
    id: existingId || `vid-${Date.now()}`,
    sourceType: finalSourceType,
    title: existingTitle,
    url: rawUrl,
    embedUrl: embedUrl,
    videoId: videoId,
    thumbnailUrl: thumbnailUrl,
    durationSeconds: existingDuration,
    durationFormatted: formatVideoDuration(existingDuration),
    cropMetadata: existingCrop,
  };
}

/**
 * Retrieve auth token and active tenant from localStorage session
 */
function getAuthContext(): { token: string; tenantId: string } {
  let token = 'venilearn-token-admin-dev';
  let tenantId = '871abf8a-e563-4d0f-afc7-416d8da3df14';

  try {
    const raw = localStorage.getItem('venilearn_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.token) token = parsed.token;
      if (parsed.tenantId) tenantId = parsed.tenantId;
      else if (parsed.user?.tenantId) tenantId = parsed.user.tenantId;
      else if (parsed.user?.organizationId) tenantId = parsed.user.organizationId;
    }
    const explicitTenant =
      localStorage.getItem('venilearn_active_tenant_id') ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('venilearn_active_org_id') : null);
    if (explicitTenant && explicitTenant !== 'org-001') {
      tenantId = explicitTenant;
    }
  } catch {}

  return { token, tenantId };
}

/**
 * Upload local video file to backend with real-time progress events
 */
export function uploadVideoFile(params: {
  courseId: string;
  file: File;
  title: string;
  description?: string;
  durationSeconds?: number;
  lessonId?: string;
  cropMetadata?: VideoCropMetadata;
  onProgress?: (percent: number) => void;
}): Promise<VideoLessonInfo> {
  return new Promise((resolve, reject) => {
    const { courseId, file, title, description, durationSeconds, lessonId, cropMetadata, onProgress } = params;

    // Validate size
    if (file.size > MAX_VIDEO_SIZE_BYTES) {
      return reject(
        new Error(`Media exceeds maximum allowed size of 500 MB (selected: ${formatVideoFileSize(file.size)})`)
      );
    }

    // Validate format
    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExt) {
      return reject(
        new Error(`Unsupported media format. Allowed formats: ${ALLOWED_VIDEO_EXTENSIONS.join(', ')}`)
      );
    }

    const { token, tenantId } = getAuthContext();
    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
    if (description) formData.append('description', description);
    if (durationSeconds) formData.append('durationSeconds', durationSeconds.toString());
    if (lessonId) formData.append('lessonId', lessonId);
    if (cropMetadata) formData.append('cropMetadata', JSON.stringify(cropMetadata));

    const xhr = new XMLHttpRequest();
    const endpoint = `${API_BASE_URL}/courses/${courseId || 'course-default'}/videos`;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(Math.round((event.loaded / event.total) * 100), 99);
        onProgress(percent);
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        try {
          const res = JSON.parse(xhr.responseText);
          const v = res.data;
          const streamUrl = v.playbackUrl || v.url || `/storage/videos/${v.storageKey || v.fileName}`;
          
          // Generate 360p and 420p compressed stream endpoints
          const qualityData = await generateQualityVariants(file, v.id, file.size);

          const videoInfo: VideoLessonInfo = {
            id: v.id,
            sourceType: 'upload',
            title: v.title,
            description: v.description,
            fileName: v.fileName || file.name,
            originalName: v.originalName || file.name,
            fileSize: v.fileSize || file.size,
            durationSeconds: v.durationSeconds || durationSeconds,
            durationFormatted: formatVideoDuration(v.durationSeconds || durationSeconds),
            mimeType: v.mimeType || file.type || 'video/mp4',
            url: streamUrl,
            embedUrl: streamUrl,
            videoId: v.id,
            uploadedAt: v.createdAt || new Date().toISOString(),
            qualities: qualityData.qualities,
            qualityOptions: qualityData.qualityOptions,
            cropMetadata,
          };
          registerVideoFile(v.id, file, streamUrl);
          resolve(videoInfo);
        } catch (err) {
          fallbackLocalUpload(resolve);
        }
      } else {
        console.warn(`Video upload endpoint returned ${xhr.status}; falling back to local media buffer`);
        fallbackLocalUpload(resolve);
      }
    };

    xhr.onerror = () => {
      console.warn('Network error during video upload; falling back to client-side video buffer');
      fallbackLocalUpload(resolve);
    };

    async function fallbackLocalUpload(resCb: (val: VideoLessonInfo) => void) {
      if (onProgress) onProgress(100);
      const generatedId = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      let localUrl = '';
      try {
        localUrl = URL.createObjectURL(file);
        registerVideoFile(generatedId, file, localUrl);
      } catch (e) {
        localUrl = DEFAULT_LECTURE_STREAM_URL;
      }

      // Generate 360p and 420p compressed stream endpoints
      const qualityData = await generateQualityVariants(file, generatedId, file.size);

      const fallbackInfo: VideoLessonInfo = {
        id: generatedId,
        sourceType: 'upload',
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        description,
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        durationSeconds: durationSeconds || 300,
        durationFormatted: formatVideoDuration(durationSeconds || 300),
        mimeType: file.type || 'video/mp4',
        url: localUrl,
        embedUrl: localUrl,
        uploadedAt: new Date().toISOString(),
        qualities: qualityData.qualities,
        qualityOptions: qualityData.qualityOptions,
        cropMetadata,
      };
      resCb(fallbackInfo);
    }

    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('X-Tenant-ID', tenantId);
    xhr.send(formData);
  });
}

/**
 * Save an external video link (YouTube / Vimeo)
 */
export async function saveExternalVideo(params: {
  courseId: string;
  url: string;
  title: string;
  description?: string;
  durationSeconds?: number;
  lessonId?: string;
}): Promise<VideoLessonInfo> {
  const { courseId, url, title, description, durationSeconds, lessonId } = params;
  const normalized = normalizeVideoUrl(url);

  if (!normalized.isValid) {
    throw new Error(normalized.errorMessage || 'Invalid video link provided');
  }

  const { token, tenantId } = getAuthContext();

  try {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId || 'course-default'}/videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
      },
      body: JSON.stringify({
        courseId,
        lessonId,
        title: title.trim(),
        description: description ? description.trim() : undefined,
        sourceType: normalized.sourceType,
        url: url.trim(),
        durationSeconds,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const v = data.data;
      return {
        id: v.id,
        sourceType: v.sourceType as any,
        title: v.title,
        description: v.description,
        url: url.trim(),
        embedUrl: v.playbackUrl || normalized.embedUrl,
        videoId: normalized.videoId,
        thumbnailUrl: v.thumbnailUrl || normalized.thumbnailUrl,
        durationSeconds: v.durationSeconds || durationSeconds,
        durationFormatted: formatVideoDuration(v.durationSeconds || durationSeconds),
        uploadedAt: v.createdAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Backend saveExternalVideo request failed; utilizing client normalized entity', err);
  }

  // Resilient fallback: return validated client-side normalized video representation
  return {
    id: `vid-ext-${Date.now()}`,
    sourceType: normalized.sourceType as any,
    title: title.trim(),
    description: description ? description.trim() : undefined,
    url: url.trim(),
    embedUrl: normalized.embedUrl,
    videoId: normalized.videoId,
    thumbnailUrl: normalized.thumbnailUrl,
    durationSeconds: durationSeconds || 600,
    durationFormatted: formatVideoDuration(durationSeconds || 600),
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Delete a video from backend
 */
export async function deleteVideo(courseId: string, videoId: string): Promise<boolean> {
  const { token, tenantId } = getAuthContext();
  try {
    const res = await fetch(`${API_BASE_URL}/courses/${courseId}/videos/${videoId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

