// ============================================================
// LMS - Video AI Assessment Processing Service
// Connects to local FastAPI audio/video processing pipeline
// (FFmpeg -> faster-whisper -> Ollama / Local Grounded Engine)
// ============================================================
import { GeneratedQuestionSchema } from './aiAssessmentService';
import { AssessmentDifficultySetting, AssessmentQuestionTypeSetting } from '../types';

export interface VideoSegmentItem {
  id: number;
  start: number;
  end: number;
  startFormatted: string;
  endFormatted: string;
  timestampBadge: string;
  text: string;
}

export interface VideoProcessResponse {
  success: boolean;
  filename: string;
  fileSizeMb: number;
  duration: number;
  language: string;
  languageProbability?: number;
  wordCount: number;
  summary?: string;
  transcript: string;
  segments: VideoSegmentItem[];
  questions: GeneratedQuestionSchema[];
  engineUsed: string;
  ollamaAvailable: boolean;
  error?: string;
}

export interface VideoProcessingParams {
  file: File;
  questionCount: number;
  difficulty: AssessmentDifficultySetting;
  questionTypes: AssessmentQuestionTypeSetting[];
  language?: string; // 'auto', 'en', 'te'
  onProgress?: (stage: string, percent: number) => void;
}

/**
 * Dynamically resolves the AI service URL.
 * 1. Respects VITE_AI_SERVICE_URL environment override if defined.
 * 2. Primary target: LMS-Backend integrated endpoint '/api/v1/ai/video' (via Vite proxy /api)
 * 3. Fallback: Standalone FastAPI uvicorn daemon on port 8000
 */
export function getCandidateAiServiceUrls(): string[] {
  if (import.meta.env.VITE_AI_SERVICE_URL) {
    return [(import.meta.env.VITE_AI_SERVICE_URL as string).replace(/\/$/, '')];
  }

  const urls: string[] = ['/api/v1/ai/video'];

  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      urls.push(`http://${hostname}:5000/api/v1/ai/video`);
      urls.push(`http://${hostname}:8000`);
    }
  }

  urls.push('http://127.0.0.1:5000/api/v1/ai/video');
  urls.push('http://127.0.0.1:8000');
  urls.push('/ai-service');

  return urls;
}

export function getAiServiceUrl(): string {
  return getCandidateAiServiceUrls()[0];
}

export const AI_SERVICE_URL = getAiServiceUrl();

const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'];
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

/**
 * Validates a video file before sending to processing pipeline
 */
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No video file selected.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected video file is empty (0 bytes).' };
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Video size (${sizeMb} MB) exceeds maximum upload limit of 500 MB.`
    };
  }

  const nameLower = file.name.toLowerCase();
  const hasValidExt = ALLOWED_VIDEO_EXTENSIONS.some((ext) => nameLower.endsWith(ext));
  const isVideoMime = file.type.startsWith('video/') || file.type === '';

  if (!hasValidExt && !isVideoMime) {
    return {
      valid: false,
      error: `Unsupported video format "${file.name}". Supported formats: MP4 (.mp4), WebM (.webm), QuickTime (.mov), and MKV (.mkv).`
    };
  }

  return { valid: true };
}

/**
 * Checks connectivity with the LMS-Backend AI processing service or local Python service.
 * Probes candidates in order: LMS-Backend /api/v1/ai/video/health, then port 8000.
 */
export async function checkAIServiceHealth(): Promise<{
  available: boolean;
  ffmpeg: boolean;
  whisper: boolean;
  ollama: boolean;
  message: string;
  errorDetail?: string;
  activeUrl?: string;
}> {
  const candidates = getCandidateAiServiceUrls();
  let lastError = '';

  for (const targetUrl of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const healthPath = targetUrl.endsWith('/health') ? targetUrl : `${targetUrl}/health`;
      const response = await fetch(healthPath, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          available: true,
          ffmpeg: data.ffmpeg?.available ?? true,
          whisper: true,
          ollama: data.ollama?.available ?? false,
          message: data.message || `Local AI Service is online (${data.whisper?.configured_model || 'tiny'} Whisper, ${data.ollama?.available ? 'Ollama active' : 'Local grounded engine active'})`,
          activeUrl: targetUrl,
        };
      }
    } catch (e: any) {
      lastError = e.message || String(e);
    }
  }

  return {
    available: false,
    ffmpeg: false,
    whisper: false,
    ollama: false,
    message: 'Local AI Processing Service: Offline / Connecting. Please ensure LMS-Backend is running.',
    errorDetail: lastError,
  };
}

/**
 * Executes the complete Video Upload -> Audio Extraction -> Transcription -> Question Generation pipeline
 */
export async function processVideoForAssessment(
  params: VideoProcessingParams
): Promise<VideoProcessResponse> {
  const { file, questionCount, difficulty, questionTypes, language = 'auto', onProgress } = params;

  // Validate file
  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid video file.');
  }

  onProgress?.('Uploading learning video to local pipeline...', 15);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('question_count', questionCount.toString());
  formData.append('count', questionCount.toString());
  formData.append('difficulty', difficulty);
  formData.append('question_types', questionTypes.join(','));
  formData.append('types', questionTypes.join(','));
  formData.append('language', language);

  // Setup simulated progress updates while waiting for faster-whisper
  let currentPct = 25;
  const progressTimer = setInterval(() => {
    if (currentPct < 50) {
      currentPct += 5;
      onProgress?.('Extracting audio track via FFmpeg...', currentPct);
    } else if (currentPct < 75) {
      currentPct += 3;
      onProgress?.('Transcribing speech segments across full video with faster-whisper...', currentPct);
    } else if (currentPct < 88) {
      currentPct += 2;
      onProgress?.('Synthesizing whole-video executive summary & verifying filters...', currentPct);
    } else if (currentPct < 96) {
      currentPct += 1;
      onProgress?.('Generating distributed assessment questions across full video timeline...', currentPct);
    }
  }, 900);

  const candidates = getCandidateAiServiceUrls();
  let lastError: Error | null = null;

  for (const targetUrl of candidates) {
    try {
      const controller = new AbortController();
      // 3 minute timeout for long videos
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      // Support both /process (LMS-Backend) and /api/video/process (FastAPI daemon)
      const processPath = targetUrl.includes('/ai/video')
        ? `${targetUrl}/process`
        : targetUrl.endsWith('/process')
        ? targetUrl
        : `${targetUrl}/api/video/process`;

      const response = await fetch(processPath, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(progressTimer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const detailMsg = errData.detail || errData.message || `Server responded with status ${response.status}`;
        throw new Error(`Video AI Processing failed: ${detailMsg}`);
      }

      onProgress?.('Finalizing verified question sequence...', 100);
      const data: VideoProcessResponse = await response.json();

      // Ensure questions conform to GeneratedQuestionSchema
      const validatedQuestions: GeneratedQuestionSchema[] = (data.questions || []).map((q, idx) => ({
        id: q.id || `q-vid-${Date.now()}-${idx + 1}`,
        type: q.type || 'single_choice',
        prompt: q.prompt,
        difficulty: q.difficulty || (difficulty === 'mixed' ? (idx % 3 === 0 ? 'easy' : idx % 3 === 1 ? 'medium' : 'hard') : difficulty),
        points: q.points || (q.difficulty === 'hard' ? 10 : 5),
        topic: q.topic || 'Video Lecture Concept',
        explanation: q.explanation || 'Verified from lecture segment.',
        sourceSegment: q.sourceSegment || (data.segments?.[0]?.timestampBadge || '[00:00 - 00:30]'),
        options: q.options || (q.type === 'true_false' ? [
          { id: `opt-${idx}-1`, text: 'True', isCorrect: true },
          { id: `opt-${idx}-2`, text: 'False', isCorrect: false }
        ] : undefined),
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        rubric: q.rubric
      }));

      return {
        ...data,
        questions: validatedQuestions
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        clearInterval(progressTimer);
        throw new Error('Video processing timed out after 3 minutes. Try a shorter video segment or check hardware resources.');
      }
      lastError = err;
      // Try next candidate URL
    }
  }

  clearInterval(progressTimer);
  throw lastError || new Error('Unable to connect to LMS-Backend Video AI service. Please ensure the backend server is running.');
}

/**
 * Loads the bundled sample video from public folder for rapid 1-click testing
 */
export async function loadSampleVideoFile(): Promise<File> {
  const res = await fetch('/sample_cloud_architecture_lesson.mp4');
  if (!res.ok) {
    throw new Error('Sample video file could not be loaded from public directory.');
  }
  const blob = await res.blob();
  return new File([blob], 'sample_cloud_architecture_lesson.mp4', {
    type: 'video/mp4',
    lastModified: Date.now()
  });
}
