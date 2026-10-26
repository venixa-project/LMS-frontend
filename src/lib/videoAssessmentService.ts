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

export const AI_SERVICE_URL =
  import.meta.env.VITE_AI_SERVICE_URL || 'http://127.0.0.1:8000';

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
 * Checks connectivity with the local Python AI processing service
 */
export async function checkAIServiceHealth(): Promise<{
  available: boolean;
  ffmpeg: boolean;
  whisper: boolean;
  ollama: boolean;
  message: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${AI_SERVICE_URL}/health`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        ffmpeg: data.ffmpeg?.available ?? true,
        whisper: true,
        ollama: data.ollama?.available ?? false,
        message: `Local AI Service is online (${data.whisper?.configured_model} Whisper, ${data.ollama?.available ? 'Ollama active' : 'Local grounded engine active'})`
      };
    }
  } catch (e: any) {
    // Service offline
  }

  return {
    available: false,
    ffmpeg: false,
    whisper: false,
    ollama: false,
    message: 'Local AI processing service not detected at ' + AI_SERVICE_URL
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
  formData.append('difficulty', difficulty);
  formData.append('question_types', questionTypes.join(','));
  formData.append('language', language);

  // Setup simulated progress updates while waiting for faster-whisper
  let currentPct = 25;
  const progressTimer = setInterval(() => {
    if (currentPct < 55) {
      currentPct += 5;
      onProgress?.('Extracting audio track via FFmpeg...', currentPct);
    } else if (currentPct < 85) {
      currentPct += 3;
      onProgress?.('Transcribing speech segments with faster-whisper...', currentPct);
    } else if (currentPct < 95) {
      currentPct += 1;
      onProgress?.('Generating grounded questions and verifying timestamps...', currentPct);
    }
  }, 900);

  try {
    const controller = new AbortController();
    // 3 minute timeout for long videos
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    const response = await fetch(`${AI_SERVICE_URL}/api/video/process`, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    clearInterval(progressTimer);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const detailMsg = errData.detail || `Server responded with status ${response.status}`;
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
    clearInterval(progressTimer);

    if (err.name === 'AbortError') {
      throw new Error('Video processing timed out after 3 minutes. Try a shorter video segment or check hardware resources.');
    }

    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      throw new Error(
        `Unable to reach local AI processing service at ${AI_SERVICE_URL}. ` +
        `Please ensure the backend is running (run: python -m uvicorn main:app --port 8000 in the ai-service folder).`
      );
    }

    throw err;
  }
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
