// ============================================================
// LMS - Create Quiz & Examination Builder Modal
// Supports:
// 1. Bulk Question Import (XLSX, CSV, structured DOCX, PDF)
// 2. AI Question Generation (Grounded from learning documents)
// 3. Manual Question Entry (Pedagogical custom authoring)
// Enforces 100-question assessment limit, duplicate skipping,
// missing-answer review flagging, and template downloads.
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Sparkles, PenTool, Upload, FileText, CheckCircle2, AlertTriangle,
  ArrowRight, ArrowLeft, RefreshCw, Trash2, Copy, MoveUp, MoveDown,
  Eye, Check, Shield, Award, Clock, HelpCircle, ChevronRight, Layers, FileCheck,
  FileSpreadsheet, UploadCloud, Download, CheckSquare, Square, Search, Filter,
  AlertCircle, Edit3, Video, FileVideo, Play, Languages, Film, Volume2,
  Users, Mic, Camera, Monitor, Radio, Lock, Calendar
} from 'lucide-react';
import {
  Assessment,
  Question,
  UploadedDocumentInfo,
  AssessmentDifficultySetting,
  AssessmentQuestionTypeSetting,
  ProctoringMode,
  ProctoringSettings,
  ProctoringPolicyLevel
} from '../../../types';
import { mockCourses } from '../../../data/mockData';
import { extractDocumentContent } from '../../../lib/documentParser';
import {
  generateAssessmentQuestions,
  regenerateSingleQuestion,
  getActiveAIProviderInfo,
  GeneratedQuestionSchema,
  validateQuestionSchema,
  convertSchemaToQuestion
} from '../../../lib/aiAssessmentService';
import {
  processVideoForAssessment,
  validateVideoFile,
  checkAIServiceHealth,
  loadSampleVideoFile,
  VideoSegmentItem,
  VideoProcessResponse,
  AI_SERVICE_URL
} from '../../../lib/videoAssessmentService';
import {
  downloadExcelTemplate,
  downloadCsvTemplate,
  downloadReportCsv,
  parseXlsxQuestions,
  parseCsvQuestions,
  parseStructuredDocumentQuestions,
  BulkImportSummary,
  ParsedImportQuestion,
  ImportItemStatus,
  MAX_ASSESSMENT_QUESTIONS,
  normalizeQuestionText
} from '../../../lib/bulkImportService';
import { useAuthStore } from '../../../lib/store';
import { useSignatureStore } from '../../../lib/signatureStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAssessmentSaved: (assessment: Assessment, status: 'published' | 'draft') => void;
  initialDraft?: Assessment | null;
  defaultCourseId?: string;
}

type CreationMode = 'bulk' | 'ai' | 'manual';
type WizardStep = 'mode_select' | 'ai_config' | 'manual_builder' | 'bulk_import' | 'review_edit' | 'summary_publish';

export const CreateAssessmentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAssessmentSaved,
  initialDraft,
  defaultCourseId
}) => {
  const { user } = useAuthStore();
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Wizard Navigation
  const [step, setStep] = useState<WizardStep>('mode_select');
  const [selectedMode, setSelectedMode] = useState<CreationMode>('bulk');

  // AI Source Selection: Document vs Video
  const [aiSourceType, setAiSourceType] = useState<'document' | 'video'>('document');

  // Assessment Settings
  const [title, setTitle] = useState(initialDraft?.title || '');
  const [courseId, setCourseId] = useState(initialDraft?.courseId || defaultCourseId || mockCourses[0]?.id || 'crs-001');

  // Numeric Form States (Number + Raw String to support uninhibited typing, select-all, backspace, and cursor preservation)
  const initialTargetCount = initialDraft?.questionsData?.length || 10;
  const [targetQuestionCount, setTargetQuestionCount] = useState<number>(initialTargetCount);
  const [rawTargetQuestions, setRawTargetQuestions] = useState<string>(String(initialTargetCount));

  const initialDuration = initialDraft?.durationMinutes || initialDraft?.duration || 45;
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDuration);
  const [rawDuration, setRawDuration] = useState<string>(String(initialDuration));

  const initialTotal = initialDraft?.totalMarks || 100;
  const [totalMarks, setTotalMarks] = useState<number>(initialTotal);
  const [rawTotalMarks, setRawTotalMarks] = useState<string>(String(initialTotal));

  const initialPass = initialDraft?.passingMarks || initialDraft?.passmark || 70;
  const [passingMarks, setPassingMarks] = useState<number>(initialPass);
  const [rawPassMarks, setRawPassMarks] = useState<string>(String(initialPass));

  const initialAttempts = initialDraft?.maxAttempts || 2;
  const [maxAttempts, setMaxAttempts] = useState<number>(initialAttempts);
  const [rawMaxAttempts, setRawMaxAttempts] = useState<string>(String(initialAttempts));

  const [numericErrors, setNumericErrors] = useState<{
    duration?: string;
    totalMarks?: string;
    passMarks?: string;
    maxAttempts?: string;
    targetQuestions?: string;
  }>({});

  const [instructions, setInstructions] = useState(initialDraft?.instructions || 'Read every question carefully. Ensure stable connectivity during the session.');

  // Availability, Completion & Rewards Configuration
  const { getDefaultSignatoryForUser, getApprovedSignatories, hasConfiguredSignature } = useSignatureStore();
  const creatorDefaultSig = getDefaultSignatoryForUser(user);
  const userHasSignature = hasConfiguredSignature(user);
  const approvedSignatories = getApprovedSignatories();

  const [availabilityStart, setAvailabilityStart] = useState<string>(
    initialDraft?.availabilityStart ? initialDraft.availabilityStart.slice(0, 16) : ''
  );
  const [availabilityEnd, setAvailabilityEnd] = useState<string>(
    initialDraft?.availabilityEnd ? initialDraft.availabilityEnd.slice(0, 16) : ''
  );
  const [completionPercentageRequired, setCompletionPercentageRequired] = useState<number>(
    initialDraft?.completionPercentageRequired ?? (initialDraft?.certificateConfig?.requiredCompletionPercentage ?? 100)
  );
  const [certificateEnabled, setCertificateEnabled] = useState<boolean>(
    initialDraft?.certificateConfig?.enabled ?? true
  );
  const [completionPoints, setCompletionPoints] = useState<number>(
    initialDraft?.completionPoints ?? (initialDraft?.certificateConfig?.completionPoints ?? 50)
  );
  const [certTemplateId, setCertTemplateId] = useState<'standard' | 'executive' | 'distinction' | 'technical'>(
    initialDraft?.certificateConfig?.templateId || 'distinction'
  );
  const [selectedSignatoryOption, setSelectedSignatoryOption] = useState<string>(
    initialDraft?.certificateConfig?.authorizedSignerName ? 'custom' : 'creator'
  );
  const [certSignerName, setCertSignerName] = useState<string>(
    initialDraft?.certificateConfig?.authorizedSignerName || creatorDefaultSig.name || 'Authorized Signatory'
  );
  const [certSignerTitle, setCertSignerTitle] = useState<string>(
    initialDraft?.certificateConfig?.authorizedSignerTitle || creatorDefaultSig.designation || 'Lead Evaluator & Department Chair'
  );
  const [certSignerImage, setCertSignerImage] = useState<string>(
    initialDraft?.certificateConfig?.authorizedSignatureImage || creatorDefaultSig.signatureImage || ''
  );
  // Hybrid Proctoring Protocol Configuration
  const [proctoringMode, setProctoringMode] = useState<ProctoringMode>(
    initialDraft?.proctoringMode || (initialDraft?.proctoringRequired === false ? 'none' : 'combined')
  );
  const [proctoringRequired, setProctoringRequired] = useState<boolean>(
    initialDraft?.proctoringRequired ?? (initialDraft?.proctoringMode ? initialDraft.proctoringMode !== 'none' : true)
  );
  const [jitsiRoomId, setJitsiRoomId] = useState<string>(
    initialDraft?.jitsiRoomId || `vl-exam-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`
  );
  const [proctoringSettings, setProctoringSettings] = useState<ProctoringSettings>(
    initialDraft?.proctoringSettings || {
      camera: true,
      mic: true,
      screenShare: false,
      faceDetection: true,
      noiseDetection: true,
      tabSwitchDetection: true,
    }
  );
  const [proctoringPolicyLevel, setProctoringPolicyLevel] = useState<ProctoringPolicyLevel>(
    initialDraft?.proctoringPolicyLevel || 'monitored'
  );
  const [aiGradingEnabled, setAiGradingEnabled] = useState(initialDraft?.aiGradingEnabled ?? true);

  // AI Document Upload & AI State
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocumentInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStageText, setUploadStageText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Video AI Upload & Processing State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoLanguage, setVideoLanguage] = useState<'auto' | 'en' | 'te'>('auto');
  const [videoTranscript, setVideoTranscript] = useState<string>('');
  const [videoSegments, setVideoSegments] = useState<VideoSegmentItem[]>([]);
  const [isVideoProcessing, setIsVideoProcessing] = useState<boolean>(false);
  const [videoStageText, setVideoStageText] = useState<string>('');
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoTranscriptModalOpen, setIsVideoTranscriptModalOpen] = useState<boolean>(false);
  const [aiBackendStatus, setAiBackendStatus] = useState<{
    available: boolean;
    ffmpeg: boolean;
    whisper: boolean;
    ollama: boolean;
    message: string;
  } | null>(null);
  const [transcriptSearch, setTranscriptSearch] = useState<string>('');

  // AI Configuration State
  const [aiDifficulty, setAiDifficulty] = useState<AssessmentDifficultySetting>('mixed');
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(10);
  const [customCountInput, setCustomCountInput] = useState<string>('');
  const [isCustomCount, setIsCustomCount] = useState(false);
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<AssessmentQuestionTypeSetting[]>([
    'single_choice',
    'multiple_choice',
    'true_false',
    'short_answer'
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [aiProviderInfo, setAiProviderInfo] = useState(getActiveAIProviderInfo());

  // Bulk Import State
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isBulkParsing, setIsBulkParsing] = useState(false);
  const [bulkProgressText, setBulkProgressText] = useState('');
  const [bulkSummary, setBulkSummary] = useState<BulkImportSummary | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusFilter, setBulkStatusFilter] = useState<'all' | 'valid' | 'needs_review' | 'duplicate' | 'invalid'>('all');
  const [bulkTypeFilter, setBulkTypeFilter] = useState<string>('all');
  const [bulkDiffFilter, setBulkDiffFilter] = useState<string>('all');
  const [bulkSearchQuery, setBulkSearchQuery] = useState<string>('');
  const [bulkCustomSelectCount, setBulkCustomSelectCount] = useState<string>('');
  const [bulkEditingItem, setBulkEditingItem] = useState<ParsedImportQuestion | null>(null);

  // Assessment Questions List
  const [questions, setQuestions] = useState<GeneratedQuestionSchema[]>([]);
  const [editingQId, setEditingQId] = useState<string | null>(null);
  const [regeneratingQId, setRegeneratingQId] = useState<string | null>(null);

  // Manual Question Authoring State
  const [mType, setMType] = useState<AssessmentQuestionTypeSetting>('single_choice');
  const [mPrompt, setMPrompt] = useState('');
  const [mDifficulty, setMDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [mPoints, setMPoints] = useState(10);
  const [mTopic, setMTopic] = useState('');
  const [mExplanation, setMExplanation] = useState('');
  const [mRubric, setMRubric] = useState('');
  const [mCorrectAnswer, setMCorrectAnswer] = useState('');
  const [mOptions, setMOptions] = useState<{ id: string; text: string; isCorrect: boolean }[]>([
    { id: 'opt-1', text: '', isCorrect: true },
    { id: 'opt-2', text: '', isCorrect: false },
    { id: 'opt-3', text: '', isCorrect: false },
    { id: 'opt-4', text: '', isCorrect: false }
  ]);
  const [manualFormError, setManualFormError] = useState<string | null>(null);

  // Learner Assessment Simulation Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Initial load when editing a draft
  useEffect(() => {
    if (initialDraft) {
      setTitle(initialDraft.title);
      setCourseId(initialDraft.courseId || defaultCourseId || mockCourses[0]?.id || 'crs-001');
      const dur = initialDraft.durationMinutes || initialDraft.duration || 45;
      setDurationMinutes(dur);
      setRawDuration(String(dur));
      const tot = initialDraft.totalMarks || 100;
      setTotalMarks(tot);
      setRawTotalMarks(String(tot));
      const pass = initialDraft.passingMarks || initialDraft.passmark || 70;
      setPassingMarks(pass);
      setRawPassMarks(String(pass));
      const att = initialDraft.maxAttempts || 2;
      setMaxAttempts(att);
      setRawMaxAttempts(String(att));
      setProctoringRequired(initialDraft.proctoringRequired ?? true);
      setProctoringMode(initialDraft.proctoringMode || (initialDraft.proctoringRequired === false ? 'none' : 'combined'));
      setJitsiRoomId(initialDraft.jitsiRoomId || `vl-exam-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`);
      if (initialDraft.proctoringSettings) setProctoringSettings(initialDraft.proctoringSettings);
      setProctoringPolicyLevel(initialDraft.proctoringPolicyLevel || 'monitored');
      setAiGradingEnabled(initialDraft.aiGradingEnabled ?? true);
      if (initialDraft.instructions) setInstructions(initialDraft.instructions);

      if (initialDraft.questionsData && initialDraft.questionsData.length > 0) {
        const converted: GeneratedQuestionSchema[] = initialDraft.questionsData.map((q) => ({
          id: q.id,
          type: (['single_choice', 'multiple_choice', 'true_false', 'short_answer', 'essay'].includes(q.type)
            ? q.type
            : 'single_choice') as AssessmentQuestionTypeSetting,
          prompt: q.prompt,
          options: q.options?.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          rubric: q.rubric,
          points: q.points || 5,
          difficulty: q.difficulty || 'medium',
          topic: q.topic || q.tags?.[0]
        }));
        setQuestions(converted);
        setTargetQuestionCount(converted.length);
        setRawTargetQuestions(String(converted.length));
        setStep('review_edit');
      }
    }
  }, [initialDraft]);

  // Check Local Python AI backend health on mount
  useEffect(() => {
    checkAIServiceHealth().then((status) => {
      setAiBackendStatus(status);
    }).catch(() => {
      setAiBackendStatus({
        available: false,
        ffmpeg: false,
        whisper: false,
        ollama: false,
        message: 'Could not connect to local AI service.'
      });
    });
  }, []);

  // Cleanup video object URL on unmount or URL replacement
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  if (!isOpen) return null;

  // Remaining capacity calculation
  const remainingCapacity = Math.max(0, MAX_ASSESSMENT_QUESTIONS - questions.length);

  // Calculate sum of question marks
  const sumOfQuestionMarks = questions.reduce((acc, q) => acc + (q.points || 0), 0);
  const marksMismatch = questions.length > 0 && sumOfQuestionMarks !== totalMarks;

  // Toggle question types for AI generation
  const toggleQuestionType = (type: AssessmentQuestionTypeSetting) => {
    if (selectedQuestionTypes.includes(type)) {
      if (selectedQuestionTypes.length === 1) return;
      setSelectedQuestionTypes(selectedQuestionTypes.filter((t) => t !== type));
    } else {
      setSelectedQuestionTypes([...selectedQuestionTypes, type]);
    }
  };

  // ==============================================================
  // BULK IMPORT FILE PROCESSING
  // ==============================================================
  const handleBulkFileSelected = async (file?: File) => {
    if (!file) return;
    setBulkError(null);
    setBulkFile(file);
    setIsBulkParsing(true);
    setBulkProgressText(`Analyzing ${file.name} (${(file.size / 1024).toFixed(1)} KB)...`);

    try {
      const fileNameLower = file.name.toLowerCase();
      // Set of existing normalized question texts in current assessment to detect duplicates
      const existingNormalized = new Set<string>(questions.map((q) => normalizeQuestionText(q.prompt)));

      let summary: BulkImportSummary;

      if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
        setBulkProgressText('Reading Excel spreadsheet worksheets...');
        summary = await parseXlsxQuestions(file, existingNormalized);
      } else if (fileNameLower.endsWith('.csv')) {
        setBulkProgressText('Parsing CSV records and validating columns...');
        summary = await parseCsvQuestions(file, existingNormalized);
      } else if (fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.pdf')) {
        setBulkProgressText(`Extracting structured questions from ${fileNameLower.endsWith('.docx') ? 'Word DOCX' : 'PDF'}...`);
        summary = await parseStructuredDocumentQuestions(file, existingNormalized);
      } else {
        throw new Error(`Unsupported format "${file.name}". Supported formats: XLSX, CSV, DOCX, and PDF.`);
      }

      setBulkSummary(summary);
      setIsBulkParsing(false);

      // Default selection: select all valid items up to remaining capacity
      const validIds = new Set<string>();
      for (const item of summary.items) {
        if ((item.status === 'valid' || item.status === 'needs_review') && validIds.size < remainingCapacity) {
          validIds.add(item.id);
        }
      }
      setBulkSelectedIds(validIds);

      // Auto-suggest title if blank
      if (!title.trim()) {
        const base = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(`${base.charAt(0).toUpperCase() + base.slice(1)} Assessment`);
      }
    } catch (err: any) {
      setBulkError(err?.message || 'Failed to process file.');
      setIsBulkParsing(false);
    }
  };

  // Select / Deselect All Valid Bulk Questions
  const handleSelectAllValidBulk = () => {
    if (!bulkSummary) return;
    const newSelected = new Set<string>();
    for (const item of bulkSummary.items) {
      if ((item.status === 'valid' || item.status === 'needs_review') && newSelected.size < remainingCapacity) {
        newSelected.add(item.id);
      }
    }
    setBulkSelectedIds(newSelected);
  };

  const handleDeselectAllBulk = () => {
    setBulkSelectedIds(new Set());
  };

  // Select first N questions
  const handleApplyCustomBulkCount = () => {
    if (!bulkSummary) return;
    const count = parseInt(bulkCustomSelectCount);
    if (isNaN(count) || count < 1) return;

    const limit = Math.min(count, remainingCapacity);
    const newSelected = new Set<string>();
    for (const item of bulkSummary.items) {
      if ((item.status === 'valid' || item.status === 'needs_review') && newSelected.size < limit) {
        newSelected.add(item.id);
      }
    }
    setBulkSelectedIds(newSelected);
  };

  // Toggle single item selection
  const handleToggleBulkItem = (id: string) => {
    const updated = new Set(bulkSelectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      if (updated.size >= remainingCapacity) {
        alert(`Cannot select more questions. The assessment limit is ${MAX_ASSESSMENT_QUESTIONS} questions. Current assessment has ${questions.length} questions.`);
        return;
      }
      updated.add(id);
    }
    setBulkSelectedIds(updated);
  };

  // Finalize Import of Selected Questions into Assessment
  const handleImportSelectedQuestions = () => {
    if (!bulkSummary) return;
    if (bulkSelectedIds.size === 0) {
      alert('Please select at least one question to import.');
      return;
    }

    if (questions.length + bulkSelectedIds.size > MAX_ASSESSMENT_QUESTIONS) {
      alert(`Cannot import ${bulkSelectedIds.size} questions. Maximum limit is ${MAX_ASSESSMENT_QUESTIONS} questions.`);
      return;
    }

    const selectedQuestions: GeneratedQuestionSchema[] = [];
    bulkSummary.items.forEach((item) => {
      if (bulkSelectedIds.has(item.id)) {
        selectedQuestions.push(item.question);
      }
    });

    const newQuestionsList = [...questions, ...selectedQuestions];
    setQuestions(newQuestionsList);

    // Auto-update total marks
    const newTotalMarks = newQuestionsList.reduce((sum, q) => sum + (q.points || 0), 0);
    if (newTotalMarks > 0) {
      setTotalMarks(newTotalMarks);
      setPassingMarks(Math.round(newTotalMarks * 0.7));
    }

    setStep('review_edit');
  };

  // Download Reports
  const handleDownloadDuplicateReport = () => {
    if (!bulkSummary) return;
    const duplicates = bulkSummary.items.filter((it) => it.isDuplicate);
    const rows = duplicates.map((d) => [
      d.rowNumber,
      d.question.prompt,
      d.question.type,
      d.duplicateReason || 'Duplicate question text detected.'
    ]);
    downloadReportCsv(
      `${bulkSummary.fileName.replace(/\.[^/.]+$/, '')}_Duplicate_Report.csv`,
      ['Row_Number', 'Question_Text', 'Question_Type', 'Skip_Reason'],
      rows
    );
  };

  const handleDownloadErrorReport = () => {
    if (!bulkSummary) return;
    const invalidItems = bulkSummary.items.filter((it) => it.status === 'invalid' || it.status === 'needs_review');
    const rows = invalidItems.map((it) => [
      it.rowNumber,
      it.question.prompt,
      it.question.type,
      it.status,
      it.issues.join('; ')
    ]);
    downloadReportCsv(
      `${bulkSummary.fileName.replace(/\.[^/.]+$/, '')}_Error_Report.csv`,
      ['Row_Number', 'Question_Text', 'Question_Type', 'Status', 'Issues'],
      rows
    );
  };

  // Save changes from inline bulk item editor
  const handleSaveBulkEditingItem = () => {
    if (!bulkEditingItem || !bulkSummary) return;

    // Check if missing answer resolved
    let hasMissing = false;
    const q = bulkEditingItem.question;
    if (q.type === 'single_choice' || q.type === 'true_false') {
      const correctCount = q.options?.filter((o) => o.isCorrect).length || 0;
      if (correctCount !== 1) hasMissing = true;
    } else if (q.type === 'multiple_choice') {
      const correctCount = q.options?.filter((o) => o.isCorrect).length || 0;
      if (correctCount < 1) hasMissing = true;
    } else if (q.type === 'short_answer') {
      if (!q.correctAnswer?.trim()) hasMissing = true;
    }

    const updatedStatus: ImportItemStatus = hasMissing ? 'needs_review' : 'valid';
    const updatedIssues = hasMissing
      ? ['Missing correct answer designation. Please designate the correct option.']
      : [];

    const updatedItems = bulkSummary.items.map((it) =>
      it.id === bulkEditingItem.id
        ? {
            ...it,
            question: q,
            status: updatedStatus,
            hasMissingAnswer: hasMissing,
            issues: updatedIssues
          }
        : it
    );

    // Recompute counts
    let vCount = 0;
    let nrCount = 0;
    let dCount = 0;
    let iCount = 0;
    updatedItems.forEach((it) => {
      if (it.status === 'valid') vCount++;
      else if (it.status === 'needs_review') nrCount++;
      else if (it.status === 'duplicate') dCount++;
      else if (it.status === 'invalid') iCount++;
    });

    setBulkSummary({
      ...bulkSummary,
      validCount: vCount,
      needsReviewCount: nrCount,
      duplicateCount: dCount,
      invalidCount: iCount,
      items: updatedItems
    });

    setBulkEditingItem(null);
  };

  // ==============================================================
  // AI DOCUMENT UPLOAD & GENERATION
  // ==============================================================
  const handleAiFileChange = async (file?: File) => {
    if (!file) return;
    setUploadError(null);
    setIsUploading(true);
    setUploadProgress(5);
    setUploadStageText('Validating document format and security...');

    try {
      const result = await extractDocumentContent(file, (progress, stage, msg) => {
        setUploadProgress(progress);
        setUploadStageText(msg);
      });

      if (!result.success || !result.docInfo) {
        setUploadError(result.error || 'Failed to extract text from document.');
        setIsUploading(false);
        return;
      }

      setUploadedDoc(result.docInfo);
      setIsUploading(false);
      setUploadProgress(100);

      if (!title.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        setTitle(`${capitalized} Assessment`);
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error parsing document.');
      setIsUploading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!uploadedDoc) {
      setGenerationError('Please upload a valid document first.');
      return;
    }

    const count = isCustomCount ? parseInt(customCountInput) || 10 : aiQuestionCount;
    if (count < 1 || count > MAX_ASSESSMENT_QUESTIONS) {
      setGenerationError(`Question count must be between 1 and ${MAX_ASSESSMENT_QUESTIONS}.`);
      return;
    }

    if (questions.length + count > MAX_ASSESSMENT_QUESTIONS) {
      setGenerationError(`Cannot generate ${count} questions. Current assessment has ${questions.length} questions, and maximum capacity is ${MAX_ASSESSMENT_QUESTIONS}.`);
      return;
    }

    if (selectedQuestionTypes.length === 0) {
      setGenerationError('Select at least one question type.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStage('Connecting to AI service and grounding curriculum context...');

    try {
      const res = await generateAssessmentQuestions({
        documentName: uploadedDoc.name,
        documentText: uploadedDoc.text || '',
        difficulty: aiDifficulty,
        questionCount: count,
        questionTypes: selectedQuestionTypes,
        title,
        courseId
      });

      if (!res.success || !res.questions || res.questions.length === 0) {
        setGenerationError(res.error || 'AI generation failed. Please try again.');
        setIsGenerating(false);
        return;
      }

      const merged = [...questions, ...res.questions];
      setQuestions(merged);

      const totalPoints = merged.reduce((sum, q) => sum + (q.points || 0), 0);
      if (totalPoints > 0) {
        setTotalMarks(totalPoints);
        setPassingMarks(Math.round(totalPoints * 0.7));
      }

      setIsGenerating(false);
      setStep('review_edit');
    } catch (err: any) {
      setGenerationError(err?.message || 'Failed to generate questions with AI.');
      setIsGenerating(false);
    }
  };

  const handleRegenerateQuestion = async (q: GeneratedQuestionSchema) => {
    if (!uploadedDoc) return;
    setRegeneratingQId(q.id);
    try {
      const updated = await regenerateSingleQuestion({
        documentText: uploadedDoc.text || '',
        existingQuestion: q,
        type: q.type,
        difficulty: q.difficulty,
        points: q.points
      });
      setQuestions((prev) => prev.map((item) => (item.id === q.id ? updated : item)));
    } catch (err) {
      console.error('Failed to regenerate single question:', err);
    } finally {
      setRegeneratingQId(null);
    }
  };

  // ==============================================================
  // VIDEO AI PROCESSING PIPELINE HANDLERS
  // ==============================================================
  const handleVideoFileChange = (file?: File) => {
    if (!file) return;
    setVideoError(null);
    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setVideoError(validation.error || 'Invalid video file.');
      return;
    }

    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    setVideoFile(file);
    setVideoTranscript('');
    setVideoSegments([]);

    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      setTitle(`${capitalized} Video Assessment`);
    }
  };

  const handleLoadSampleVideo = async () => {
    try {
      setVideoError(null);
      setIsVideoProcessing(true);
      setVideoStageText('Loading sample learning video...');
      setVideoProgress(15);
      const file = await loadSampleVideoFile();
      setIsVideoProcessing(false);
      handleVideoFileChange(file);
    } catch (err: any) {
      setIsVideoProcessing(false);
      setVideoError(err?.message || 'Failed to load sample video.');
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setVideoDuration(0);
    setVideoTranscript('');
    setVideoSegments([]);
    setVideoError(null);
    if (videoFileInputRef.current) {
      videoFileInputRef.current.value = '';
    }
  };

  const handleGenerateFromVideo = async () => {
    if (!videoFile) {
      setVideoError('Please upload or select a learning video first.');
      return;
    }

    const count = isCustomCount ? parseInt(customCountInput) || 10 : aiQuestionCount;
    if (count < 1 || count > MAX_ASSESSMENT_QUESTIONS) {
      setVideoError(`Question count must be between 1 and ${MAX_ASSESSMENT_QUESTIONS}.`);
      return;
    }

    if (questions.length + count > MAX_ASSESSMENT_QUESTIONS) {
      setVideoError(`Cannot generate ${count} questions. Current assessment has ${questions.length} questions, and maximum capacity is ${MAX_ASSESSMENT_QUESTIONS}.`);
      return;
    }

    if (selectedQuestionTypes.length === 0) {
      setVideoError('Select at least one question type.');
      return;
    }

    setIsVideoProcessing(true);
    setVideoError(null);
    setVideoProgress(5);
    setVideoStageText('Uploading video to local AI transcription pipeline...');

    try {
      const res = await processVideoForAssessment({
        file: videoFile,
        questionCount: count,
        difficulty: aiDifficulty,
        questionTypes: selectedQuestionTypes,
        language: videoLanguage,
        onProgress: (stage, percent) => {
          setVideoStageText(stage);
          setVideoProgress(percent);
        }
      });

      if (!res.success || !res.questions || res.questions.length === 0) {
        setVideoError(res.error || 'Video AI question generation failed.');
        setIsVideoProcessing(false);
        return;
      }

      setVideoTranscript(res.transcript);
      setVideoSegments(res.segments || []);

      const merged = [...questions, ...res.questions];
      setQuestions(merged);

      const totalPoints = merged.reduce((sum, q) => sum + (q.points || 0), 0);
      if (totalPoints > 0) {
        setTotalMarks(totalPoints);
        setPassingMarks(Math.round(totalPoints * 0.7));
      }

      setIsVideoProcessing(false);
      setStep('review_edit');
    } catch (err: any) {
      setVideoError(err?.message || 'Error processing video.');
      setIsVideoProcessing(false);
    }
  };

  // ==============================================================
  // QUESTION LIST ACTIONS
  // ==============================================================
  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleDuplicateQuestion = (q: GeneratedQuestionSchema) => {
    if (questions.length >= MAX_ASSESSMENT_QUESTIONS) {
      alert(`Cannot duplicate question. Assessment limit of ${MAX_ASSESSMENT_QUESTIONS} questions reached.`);
      return;
    }

    const duplicated: GeneratedQuestionSchema = {
      ...q,
      id: `q-dup-${Date.now()}`,
      prompt: `${q.prompt} (Copy)`,
      options: q.options?.map((o) => ({ ...o, id: `opt-dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` }))
    };
    const index = questions.findIndex((item) => item.id === q.id);
    const updated = [...questions];
    updated.splice(index + 1, 0, duplicated);
    setQuestions(updated);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...questions];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setQuestions(updated);
  };

  // Add Manually Authored Question
  const handleAddManualQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormError(null);

    if (questions.length >= MAX_ASSESSMENT_QUESTIONS) {
      setManualFormError(`Assessment has reached the maximum allowed limit of ${MAX_ASSESSMENT_QUESTIONS} questions.`);
      return;
    }

    if (!mPrompt.trim()) {
      setManualFormError('Question prompt cannot be empty.');
      return;
    }

    if (mPoints <= 0) {
      setManualFormError('Marks must be greater than zero.');
      return;
    }

    let finalOptions: { id: string; text: string; isCorrect: boolean }[] | undefined = undefined;

    if (mType === 'single_choice') {
      const validOpts = mOptions.filter((o) => o.text.trim().length > 0);
      if (validOpts.length < 2) {
        setManualFormError('Single Choice (MCQ) requires at least 2 non-empty options.');
        return;
      }
      const correctOpts = validOpts.filter((o) => o.isCorrect);
      if (correctOpts.length !== 1) {
        setManualFormError('Select exactly one correct option for Multiple Choice.');
        return;
      }
      finalOptions = validOpts;
    } else if (mType === 'multiple_choice') {
      const validOpts = mOptions.filter((o) => o.text.trim().length > 0);
      if (validOpts.length < 3) {
        setManualFormError('Multiple Select requires at least 3 options.');
        return;
      }
      const correctOpts = validOpts.filter((o) => o.isCorrect);
      if (correctOpts.length < 1) {
        setManualFormError('Select at least one correct option.');
        return;
      }
      finalOptions = validOpts;
    } else if (mType === 'true_false') {
      finalOptions = [
        { id: 'opt-t', text: 'True', isCorrect: mCorrectAnswer === 'True' },
        { id: 'opt-f', text: 'False', isCorrect: mCorrectAnswer === 'False' }
      ];
    } else if (mType === 'short_answer') {
      if (!mCorrectAnswer.trim() && !mRubric.trim()) {
        setManualFormError('Provide expected answer or evaluation criteria for short answer.');
        return;
      }
    } else if (mType === 'essay') {
      if (!mRubric.trim()) {
        setManualFormError('Provide scoring rubric or sample answer for descriptive evaluation.');
        return;
      }
    }

    const newQ: GeneratedQuestionSchema = {
      id: `manual-q-${Date.now()}`,
      type: mType,
      prompt: mPrompt.trim(),
      difficulty: mDifficulty,
      points: mPoints,
      topic: mTopic.trim() || 'General Knowledge',
      explanation: mExplanation.trim() || 'Instructor authored rationale.',
      options: finalOptions,
      correctAnswer: mCorrectAnswer,
      rubric: mRubric
    };

    setQuestions([...questions, newQ]);

    // Reset manual form fields
    setMPrompt('');
    setMExplanation('');
    setMRubric('');
    setMCorrectAnswer('');
    setMOptions([
      { id: 'opt-1', text: '', isCorrect: true },
      { id: 'opt-2', text: '', isCorrect: false },
      { id: 'opt-3', text: '', isCorrect: false },
      { id: 'opt-4', text: '', isCorrect: false }
    ]);

    setStep('review_edit');
  };

  const handleSyncMarks = () => {
    setTotalMarks(sumOfQuestionMarks);
    setRawTotalMarks(String(sumOfQuestionMarks));
    const newPass = Math.round(sumOfQuestionMarks * 0.7);
    setPassingMarks(newPass);
    setRawPassMarks(String(newPass));
    setNumericErrors((prev) => ({ ...prev, totalMarks: undefined, passMarks: undefined }));
  };

  // Final Publish or Save Draft Validation
  const handleFinalizeAssessment = (publish: boolean) => {
    if (!title.trim()) {
      alert('Assessment title is required.');
      return;
    }

    // Validate numeric fields before saving/publishing
    const durVal = parseInt(rawDuration, 10);
    const totVal = parseInt(rawTotalMarks, 10);
    const passVal = parseInt(rawPassMarks, 10);
    const attVal = parseInt(rawMaxAttempts, 10);
    const qCountVal = parseInt(rawTargetQuestions, 10);

    if (isNaN(durVal) || durVal < 1) {
      alert('Duration must be a positive integer (at least 1 minute).');
      return;
    }
    if (isNaN(totVal) || totVal < 1) {
      alert('Total Marks must be a positive integer (at least 1 mark).');
      return;
    }
    if (isNaN(passVal) || passVal < 1) {
      alert('Pass Marks must be at least 1.');
      return;
    }
    if (passVal > totVal) {
      alert(`Pass Marks (${passVal}) cannot exceed Total Marks (${totVal}).`);
      return;
    }
    if (isNaN(attVal) || attVal < 1) {
      alert('Max Attempts must be at least 1.');
      return;
    }
    if (isNaN(qCountVal) || qCountVal < 1 || qCountVal > MAX_ASSESSMENT_QUESTIONS) {
      alert(`Target Questions Limit must be between 1 and ${MAX_ASSESSMENT_QUESTIONS}.`);
      return;
    }

    if (questions.length === 0) {
      alert('Assessment must contain at least one question.');
      return;
    }

    if (questions.length > MAX_ASSESSMENT_QUESTIONS) {
      alert(`Cannot save assessment: Total questions (${questions.length}) exceeds the maximum limit of ${MAX_ASSESSMENT_QUESTIONS}.`);
      return;
    }

    // Validate availability start/end dates
    if (availabilityStart && availabilityEnd) {
      if (new Date(availabilityEnd) <= new Date(availabilityStart)) {
        alert('Assessment End Date & Time must be later than Start Date & Time.');
        return;
      }
    }

    if (completionPercentageRequired < 1 || completionPercentageRequired > 100) {
      alert('Required completion percentage must be between 1% and 100%.');
      return;
    }

    if (isNaN(completionPoints) || completionPoints < 0) {
      alert('Reward points must be a non-negative whole number (e.g. 0 or 50).');
      return;
    }

    if (certificateEnabled && publish) {
      if (!certSignerName.trim()) {
        alert('Please specify an authorized signatory name for the certificate.');
        return;
      }
      if (!certSignerImage && !userHasSignature && selectedSignatoryOption === 'creator') {
        if (!confirm('Warning: You have not configured an authorized signature in your profile. Do you want to publish the assessment certificate with formal typographic signature, or configure your signature in Profile first? Click OK to publish or Cancel to configure.')) {
          return;
        }
      }
    }

    // Check for missing answers on objective questions when publishing
    if (publish) {
      const invalidObjective = questions.find((q) => {
        if (q.type === 'single_choice' || q.type === 'true_false') {
          return !q.options || !q.options.some((o) => o.isCorrect);
        }
        if (q.type === 'multiple_choice') {
          return !q.options || !q.options.some((o) => o.isCorrect);
        }
        if (q.type === 'short_answer') {
          return !q.correctAnswer?.trim();
        }
        return false;
      });

      if (invalidObjective) {
        alert(`Cannot publish assessment: Question "${invalidObjective.prompt.slice(0, 50)}..." lacks a designated correct answer. Please edit this question and supply the correct answer, or save the assessment as a draft.`);
        return;
      }
    }

    const assessmentId = initialDraft?.id || `asm-${Date.now()}`;
    const convertedQuestions: Question[] = questions.map((q) =>
      convertSchemaToQuestion(q, assessmentId, 'qb-assessment-builder')
    );

    const difficultyBreakdown = {
      easy: questions.filter((q) => q.difficulty === 'easy').length,
      medium: questions.filter((q) => q.difficulty === 'medium').length,
      hard: questions.filter((q) => q.difficulty === 'hard').length
    };

    const typeBreakdown: Record<string, number> = {};
    questions.forEach((q) => {
      typeBreakdown[q.type] = (typeBreakdown[q.type] || 0) + 1;
    });

    const newAssessment: Assessment = {
      id: assessmentId,
      title: title.trim(),
      instructions,
      courseId,
      cohortId: 'coh-001',
      durationMinutes: durVal,
      duration: durVal,
      totalMarks: totVal,
      passingMarks: passVal,
      passmark: Math.round((passVal / totVal) * 100),
      maxAttempts: attVal,
      proctoringRequired: proctoringRequired || proctoringMode !== 'none',
      proctoringMode,
      jitsiRoomId: proctoringMode === 'manual' || proctoringMode === 'combined' ? jitsiRoomId : undefined,
      proctoringSettings,
      proctoringPolicyLevel: proctoringRequired ? proctoringPolicyLevel : 'basic',
      aiGradingEnabled,
      questionIds: convertedQuestions.map((q) => q.id),
      questions: convertedQuestions.map((q) => q.id),
      questionsData: convertedQuestions,
      creationMode: selectedMode === 'ai' ? 'ai_generated' : 'manual',
      sourceDocument: uploadedDoc
        ? {
            name: uploadedDoc.name,
            size: uploadedDoc.size,
            type: uploadedDoc.type,
            extractedWordCount: uploadedDoc.wordCount || 0
          }
        : videoFile
        ? {
            name: videoFile.name,
            size: videoFile.size,
            type: 'video/mp4',
            extractedWordCount: videoTranscript ? videoTranscript.split(/\s+/).length : 0
          }
        : undefined,
      difficultyDistribution: difficultyBreakdown,
      questionTypeDistribution: typeBreakdown,
      availabilityStart: availabilityStart ? new Date(availabilityStart).toISOString() : undefined,
      availabilityEnd: availabilityEnd ? new Date(availabilityEnd).toISOString() : undefined,
      completionPercentageRequired,
      completionPoints: Math.max(0, completionPoints),
      certificateConfig: {
        enabled: certificateEnabled,
        title: `${title.trim()} Certificate of Achievement`,
        templateId: certTemplateId,
        minimumScore: passVal,
        requiredCompletionPercentage: completionPercentageRequired,
        completionPoints: Math.max(0, completionPoints),
        authorizedSignerName: certSignerName.trim(),
        authorizedSignerTitle: certSignerTitle.trim(),
        authorizedSignatureImage: certSignerImage || undefined,
      },
      status: publish ? 'published' : 'draft',
      createdAt: initialDraft?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAssessmentSaved(newAssessment, publish ? 'published' : 'draft');
    onClose();
  };

  // Filter items in Bulk Import preview
  const filteredBulkItems = (bulkSummary?.items || []).filter((item) => {
    // Status filter
    if (bulkStatusFilter !== 'all' && item.status !== bulkStatusFilter) return false;
    // Type filter
    if (bulkTypeFilter !== 'all' && item.question.type !== bulkTypeFilter) return false;
    // Difficulty filter
    if (bulkDiffFilter !== 'all' && item.question.difficulty !== bulkDiffFilter) return false;
    // Search query
    if (bulkSearchQuery.trim()) {
      const q = bulkSearchQuery.toLowerCase();
      const matchText = item.question.prompt.toLowerCase().includes(q);
      const matchTopic = (item.question.topic || '').toLowerCase().includes(q);
      if (!matchText && !matchTopic) return false;
    }
    return true;
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: step === 'summary_publish' || step === 'review_edit' || step === 'bulk_import' ? '960px' : '820px',
          width: '95vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background:
                  selectedMode === 'bulk'
                    ? 'rgba(6, 182, 212, 0.15)'
                    : selectedMode === 'ai'
                    ? 'rgba(99, 102, 241, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                color:
                  selectedMode === 'bulk'
                    ? 'var(--accent-cyan)'
                    : selectedMode === 'ai'
                    ? 'var(--primary)'
                    : 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {selectedMode === 'bulk' ? (
                <UploadCloud size={22} />
              ) : selectedMode === 'ai' ? (
                <Sparkles size={22} />
              ) : (
                <PenTool size={22} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>
                  {step === 'mode_select'
                    ? 'Configure Quiz / Examination'
                    : step === 'bulk_import'
                    ? 'Bulk Question Import (XLSX, CSV, Word, PDF)'
                    : step === 'ai_config'
                    ? 'AI Assessment Generation'
                    : step === 'manual_builder'
                    ? 'Manual Question Builder'
                    : step === 'review_edit'
                    ? `Assessment Questions (${questions.length}/${MAX_ASSESSMENT_QUESTIONS})`
                    : 'Assessment Summary & Final Publishing'}
                </h2>
                <span className="badge badge-primary">
                  {selectedMode === 'bulk'
                    ? 'Method 1: Bulk Import'
                    : selectedMode === 'ai'
                    ? 'Method 2: AI Generation'
                    : 'Method 3: Manual Entry'}
                </span>
              </div>
              <p className="text-muted text-xs" style={{ margin: '2px 0 0 0' }}>
                Max Capacity: {MAX_ASSESSMENT_QUESTIONS} Questions &bull; Current: {questions.length} Items &bull; Available Slots: {remainingCapacity}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px'
              }}
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Stepper Wizard Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '10px 24px',
            fontSize: '0.8rem',
            gap: '8px',
            overflowX: 'auto',
            flexShrink: 0
          }}
        >
          <div
            onClick={() => setStep('mode_select')}
            style={{
              cursor: 'pointer',
              fontWeight: step === 'mode_select' ? 700 : 500,
              color: step === 'mode_select' ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>1. Method & Settings</span>
          </div>
          <ChevronRight size={14} color="var(--border-light)" />

          <div
            onClick={() => {
              if (selectedMode === 'bulk') setStep('bulk_import');
              else if (selectedMode === 'ai') setStep('ai_config');
              else setStep('manual_builder');
            }}
            style={{
              cursor: 'pointer',
              fontWeight: step === 'bulk_import' || step === 'ai_config' || step === 'manual_builder' ? 700 : 500,
              color: step === 'bulk_import' || step === 'ai_config' || step === 'manual_builder' ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>
              {selectedMode === 'bulk'
                ? '2. Bulk Upload & Review'
                : selectedMode === 'ai'
                ? '2. Document & AI Settings'
                : '2. Question Authoring'}
            </span>
          </div>
          <ChevronRight size={14} color="var(--border-light)" />

          <div
            onClick={() => {
              if (questions.length > 0) setStep('review_edit');
            }}
            style={{
              cursor: questions.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: step === 'review_edit' ? 700 : 500,
              color: step === 'review_edit' ? 'var(--primary)' : questions.length > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>3. Review Questions ({questions.length})</span>
          </div>
          <ChevronRight size={14} color="var(--border-light)" />

          <div
            onClick={() => {
              if (questions.length > 0) setStep('summary_publish');
            }}
            style={{
              cursor: questions.length > 0 ? 'pointer' : 'not-allowed',
              fontWeight: step === 'summary_publish' ? 700 : 500,
              color: step === 'summary_publish' ? 'var(--primary)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>4. Summary & Publish</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* ============================================================== */}
          {/* STEP 1: METHOD SELECTION & CORE ASSESSMENT SETTINGS            */}
          {/* ============================================================== */}
          {step === 'mode_select' && (
            <div>
              {/* Three Method Selection Cards */}
              <div style={{ marginBottom: '24px' }}>
                <label className="form-label" style={{ marginBottom: '10px' }}>
                  Choose Assessment Creation Method <span className="required">*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  {/* Option 1: Bulk Question Import */}
                  <div
                    onClick={() => setSelectedMode('bulk')}
                    style={{
                      border: selectedMode === 'bulk' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      background: selectedMode === 'bulk' ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {selectedMode === 'bulk' && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--accent-cyan)',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <UploadCloud size={20} color="var(--accent-cyan)" />
                      <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>1. Bulk Question Import</h3>
                    </div>
                    <p className="text-muted text-xs" style={{ lineHeight: '1.5', margin: 0 }}>
                      Upload formatted XLSX, CSV, Word, or PDF files. Automatic duplicate skipping, missing answer review flagging, and downloadable template generator.
                    </p>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="badge text-xs" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                        XLSX / CSV / DOCX / PDF
                      </span>
                      <span className="badge badge-draft text-xs">Auto-Duplicate Skip</span>
                      <span className="badge badge-active text-xs">Template Included</span>
                    </div>
                  </div>

                  {/* Option 2: AI Question Generation */}
                  <div
                    onClick={() => setSelectedMode('ai')}
                    style={{
                      border: selectedMode === 'ai' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      background: selectedMode === 'ai' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {selectedMode === 'ai' && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--primary)',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <Sparkles size={20} color="var(--primary)" />
                      <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>2. Generate with AI</h3>
                    </div>
                    <p className="text-muted text-xs" style={{ lineHeight: '1.5', margin: 0 }}>
                      Upload curriculum documents (PDF, DOCX, TXT) or learning videos (MP4, WebM, MOV). Audio is transcribed via Whisper and questions are generated strictly from the content.
                    </p>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="badge badge-primary text-xs">Documents & Videos</span>
                      <span className="badge badge-draft text-xs">Whisper Speech-to-Text</span>
                      <span className="badge badge-active text-xs">Local Pipeline / Ollama</span>
                    </div>
                  </div>

                  {/* Option 3: Manual Question Entry */}
                  <div
                    onClick={() => setSelectedMode('manual')}
                    style={{
                      border: selectedMode === 'manual' ? '2px solid var(--success)' : '1px solid var(--border-subtle)',
                      background: selectedMode === 'manual' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-card)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '18px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {selectedMode === 'manual' && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          background: 'var(--success)',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <PenTool size={20} color="var(--success)" />
                      <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>3. Manual Question Entry</h3>
                    </div>
                    <p className="text-muted text-xs" style={{ lineHeight: '1.5', margin: 0 }}>
                      Author questions one-by-one with full pedagogical control. Specify options, answer keys, explanations, and marks with immediate learner preview.
                    </p>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="badge badge-active text-xs">Zero AI Required</span>
                      <span className="badge badge-draft text-xs">Custom Rubrics</span>
                      <span className="badge badge-primary text-xs">Instant Preview</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Assessment Settings Card */}
              <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} color="var(--primary)" />
                  Assessment Identity & Administration Limits
                </h4>

                <div className="form-group">
                  <label className="form-label">
                    Assessment Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed Systems Architecture Midterm Examination"
                    className="form-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Linked Course</label>
                    <select className="form-select" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                      {mockCourses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} ({c.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Target Questions Limit (1 – {MAX_ASSESSMENT_QUESTIONS}) <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`form-input ${numericErrors.targetQuestions ? 'input-error' : ''}`}
                      value={rawTargetQuestions}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setRawTargetQuestions(val);
                          if (val !== '') {
                            const num = parseInt(val, 10);
                            if (num >= 1 && num <= MAX_ASSESSMENT_QUESTIONS) {
                              setTargetQuestionCount(num);
                              setNumericErrors((prev) => ({ ...prev, targetQuestions: undefined }));
                            } else if (num < 1) {
                              setNumericErrors((prev) => ({ ...prev, targetQuestions: 'Must be at least 1.' }));
                            } else {
                              setNumericErrors((prev) => ({ ...prev, targetQuestions: `Max limit is ${MAX_ASSESSMENT_QUESTIONS}.` }));
                            }
                          } else {
                            setNumericErrors((prev) => ({ ...prev, targetQuestions: 'Question limit is required.' }));
                          }
                        }
                      }}
                      onBlur={() => {
                        if (rawTargetQuestions === '' || parseInt(rawTargetQuestions, 10) < 1) {
                          setRawTargetQuestions('10');
                          setTargetQuestionCount(10);
                          setNumericErrors((prev) => ({ ...prev, targetQuestions: undefined }));
                        } else {
                          const num = Math.min(MAX_ASSESSMENT_QUESTIONS, Math.max(1, parseInt(rawTargetQuestions, 10)));
                          setTargetQuestionCount(num);
                          setRawTargetQuestions(String(num));
                          setNumericErrors((prev) => ({ ...prev, targetQuestions: undefined }));
                        }
                      }}
                    />
                    {numericErrors.targetQuestions ? (
                      <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>
                        {numericErrors.targetQuestions}
                      </div>
                    ) : (
                      <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                        Maximum limit of {MAX_ASSESSMENT_QUESTIONS} questions per assessment.
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                  {/* Duration (Mins) */}
                  <div className="form-group">
                    <label className="form-label">Duration (Mins) <span className="required">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`form-input ${numericErrors.duration ? 'input-error' : ''}`}
                      value={rawDuration}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setRawDuration(val);
                          if (val !== '') {
                            const num = parseInt(val, 10);
                            if (num >= 1 && num <= 720) {
                              setDurationMinutes(num);
                              setNumericErrors((prev) => ({ ...prev, duration: undefined }));
                            } else if (num < 1) {
                              setNumericErrors((prev) => ({ ...prev, duration: 'Min 1 minute.' }));
                            } else {
                              setNumericErrors((prev) => ({ ...prev, duration: 'Max 720 minutes.' }));
                            }
                          } else {
                            setNumericErrors((prev) => ({ ...prev, duration: 'Duration is required.' }));
                          }
                        }
                      }}
                      onBlur={() => {
                        if (rawDuration === '' || parseInt(rawDuration, 10) < 1) {
                          setRawDuration('45');
                          setDurationMinutes(45);
                          setNumericErrors((prev) => ({ ...prev, duration: undefined }));
                        } else {
                          const num = Math.min(720, Math.max(1, parseInt(rawDuration, 10)));
                          setDurationMinutes(num);
                          setRawDuration(String(num));
                          setNumericErrors((prev) => ({ ...prev, duration: undefined }));
                        }
                      }}
                    />
                    {numericErrors.duration && (
                      <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>
                        {numericErrors.duration}
                      </div>
                    )}
                  </div>

                  {/* Total Marks */}
                  <div className="form-group">
                    <label className="form-label">Total Marks <span className="required">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`form-input ${numericErrors.totalMarks ? 'input-error' : ''}`}
                      value={rawTotalMarks}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setRawTotalMarks(val);
                          if (val !== '') {
                            const num = parseInt(val, 10);
                            if (num >= 1) {
                              setTotalMarks(num);
                              const curPass = parseInt(rawPassMarks, 10);
                              if (!isNaN(curPass) && curPass > num) {
                                setNumericErrors((prev) => ({
                                  ...prev,
                                  totalMarks: undefined,
                                  passMarks: `Pass marks (${curPass}) cannot exceed total marks (${num}).`
                                }));
                              } else {
                                setNumericErrors((prev) => ({ ...prev, totalMarks: undefined, passMarks: undefined }));
                              }
                            } else {
                              setNumericErrors((prev) => ({ ...prev, totalMarks: 'Must be at least 1.' }));
                            }
                          } else {
                            setNumericErrors((prev) => ({ ...prev, totalMarks: 'Total marks is required.' }));
                          }
                        }
                      }}
                      onBlur={() => {
                        if (rawTotalMarks === '' || parseInt(rawTotalMarks, 10) < 1) {
                          setRawTotalMarks('100');
                          setTotalMarks(100);
                          setNumericErrors((prev) => ({ ...prev, totalMarks: undefined }));
                        } else {
                          const num = parseInt(rawTotalMarks, 10);
                          setTotalMarks(num);
                          setRawTotalMarks(String(num));
                          setNumericErrors((prev) => ({ ...prev, totalMarks: undefined }));
                        }
                      }}
                    />
                    {numericErrors.totalMarks && (
                      <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>
                        {numericErrors.totalMarks}
                      </div>
                    )}
                  </div>

                  {/* Pass Marks */}
                  <div className="form-group">
                    <label className="form-label">Pass Marks <span className="required">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`form-input ${numericErrors.passMarks ? 'input-error' : ''}`}
                      value={rawPassMarks}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setRawPassMarks(val);
                          if (val !== '') {
                            const num = parseInt(val, 10);
                            const curTotal = parseInt(rawTotalMarks, 10) || totalMarks;
                            if (num > curTotal) {
                              setNumericErrors((prev) => ({
                                ...prev,
                                passMarks: `Pass marks (${num}) cannot exceed total marks (${curTotal}).`
                              }));
                            } else if (num < 1) {
                              setNumericErrors((prev) => ({ ...prev, passMarks: 'Must be at least 1.' }));
                            } else {
                              setPassingMarks(num);
                              setNumericErrors((prev) => ({ ...prev, passMarks: undefined }));
                            }
                          } else {
                            setNumericErrors((prev) => ({ ...prev, passMarks: 'Pass marks is required.' }));
                          }
                        }
                      }}
                      onBlur={() => {
                        const curTotal = parseInt(rawTotalMarks, 10) || totalMarks;
                        if (rawPassMarks === '' || parseInt(rawPassMarks, 10) < 1) {
                          const defPass = Math.min(curTotal, Math.max(1, Math.round(curTotal * 0.7)));
                          setRawPassMarks(String(defPass));
                          setPassingMarks(defPass);
                          setNumericErrors((prev) => ({ ...prev, passMarks: undefined }));
                        } else {
                          const num = parseInt(rawPassMarks, 10);
                          if (num > curTotal) {
                            setRawPassMarks(String(curTotal));
                            setPassingMarks(curTotal);
                            setNumericErrors((prev) => ({ ...prev, passMarks: undefined }));
                          } else {
                            setPassingMarks(num);
                            setRawPassMarks(String(num));
                            setNumericErrors((prev) => ({ ...prev, passMarks: undefined }));
                          }
                        }
                      }}
                    />
                    {numericErrors.passMarks && (
                      <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>
                        {numericErrors.passMarks}
                      </div>
                    )}
                  </div>

                  {/* Max Attempts */}
                  <div className="form-group">
                    <label className="form-label">Max Attempts <span className="required">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={`form-input ${numericErrors.maxAttempts ? 'input-error' : ''}`}
                      value={rawMaxAttempts}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          setRawMaxAttempts(val);
                          if (val !== '') {
                            const num = parseInt(val, 10);
                            if (num >= 1 && num <= 20) {
                              setMaxAttempts(num);
                              setNumericErrors((prev) => ({ ...prev, maxAttempts: undefined }));
                            } else if (num < 1) {
                              setNumericErrors((prev) => ({ ...prev, maxAttempts: 'Must be at least 1.' }));
                            } else {
                              setNumericErrors((prev) => ({ ...prev, maxAttempts: 'Max 20 attempts.' }));
                            }
                          } else {
                            setNumericErrors((prev) => ({ ...prev, maxAttempts: 'Attempts is required.' }));
                          }
                        }
                      }}
                      onBlur={() => {
                        if (rawMaxAttempts === '' || parseInt(rawMaxAttempts, 10) < 1) {
                          setRawMaxAttempts('1');
                          setMaxAttempts(1);
                          setNumericErrors((prev) => ({ ...prev, maxAttempts: undefined }));
                        } else {
                          const num = Math.min(20, Math.max(1, parseInt(rawMaxAttempts, 10)));
                          setMaxAttempts(num);
                          setRawMaxAttempts(String(num));
                          setNumericErrors((prev) => ({ ...prev, maxAttempts: undefined }));
                        }
                      }}
                    />
                    {numericErrors.maxAttempts && (
                      <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', fontWeight: 500 }}>
                        {numericErrors.maxAttempts}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Learner Instructions</label>
                  <textarea
                    rows={2}
                    className="form-input"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>
              </div>

              {/* Hybrid Proctoring Protocol Configuration */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  marginBottom: '24px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={18} color="var(--primary)" />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                      Proctoring & Academic Integrity Protocol
                    </h4>
                  </div>
                  <span className="badge badge-primary text-xs">
                    {proctoringMode === 'combined'
                      ? 'Automated + Manual Jitsi'
                      : proctoringMode === 'automated'
                      ? 'Automated Signals Only'
                      : proctoringMode === 'manual'
                      ? 'Manual Jitsi Proctoring'
                      : 'No Proctoring'}
                  </span>
                </div>

                {/* 4 Proctoring Configuration Choices */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                  {/* 1. Combined (Automated + Manual) */}
                  <div
                    onClick={() => {
                      setProctoringMode('combined');
                      setProctoringRequired(true);
                    }}
                    style={{
                      background: proctoringMode === 'combined' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                      border: proctoringMode === 'combined' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Shield size={14} color="var(--primary)" /> Automated + Manual
                      </div>
                      <span className="badge badge-completed text-xs" style={{ fontSize: '0.65rem' }}>Recommended</span>
                    </div>
                    <p className="text-muted text-xs" style={{ margin: 0, lineHeight: 1.4 }}>
                      AI webcam presence, audio noise & tab focus checks combined with live Jitsi invigilator monitoring room.
                    </p>
                  </div>

                  {/* 2. Automated Proctoring */}
                  <div
                    onClick={() => {
                      setProctoringMode('automated');
                      setProctoringRequired(true);
                    }}
                    style={{
                      background: proctoringMode === 'automated' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                      border: proctoringMode === 'automated' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                      <Camera size={14} color="var(--primary)" /> Automated Only
                    </div>
                    <p className="text-muted text-xs" style={{ margin: 0, lineHeight: 1.4 }}>
                      Background browser telemetry, webcam validation, audio activity, and tab focus monitoring without live human meeting.
                    </p>
                  </div>

                  {/* 3. Manual Proctoring (Jitsi Meet) */}
                  <div
                    onClick={() => {
                      setProctoringMode('manual');
                      setProctoringRequired(true);
                    }}
                    style={{
                      background: proctoringMode === 'manual' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                      border: proctoringMode === 'manual' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                      <Video size={14} color="var(--primary)" /> Manual (Jitsi Meet)
                    </div>
                    <p className="text-muted text-xs" style={{ margin: 0, lineHeight: 1.4 }}>
                      Live Jitsi video monitoring session where authorized proctors monitor participants and dispatch real-time warnings.
                    </p>
                  </div>

                  {/* 4. No Proctoring */}
                  <div
                    onClick={() => {
                      setProctoringMode('none');
                      setProctoringRequired(false);
                    }}
                    style={{
                      background: proctoringMode === 'none' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                      border: proctoringMode === 'none' ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                      <Lock size={14} color="var(--text-muted)" /> No Proctoring
                    </div>
                    <p className="text-muted text-xs" style={{ margin: 0, lineHeight: 1.4 }}>
                      Standard unmonitored evaluation. Permitted for formative low-stakes practice quizzes and homework.
                    </p>
                  </div>
                </div>

                {/* Granular Telemetry Settings (When Automated or Combined is selected) */}
                {(proctoringMode === 'automated' || proctoringMode === 'combined') && (
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      marginBottom: '14px'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Automated Signals Telemetry:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '0.825rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.camera}
                          onChange={(e) => setProctoringSettings({ ...proctoringSettings, camera: e.target.checked })}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>Webcam Presence & Video Validation</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.mic}
                          onChange={(e) => setProctoringSettings({ ...proctoringSettings, mic: e.target.checked })}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>Mic Audio & Unusual Noise Activity</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.tabSwitchDetection}
                          onChange={(e) => setProctoringSettings({ ...proctoringSettings, tabSwitchDetection: e.target.checked })}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>Browser Focus & Tab Switch Detection</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={proctoringSettings.screenShare}
                          onChange={(e) => setProctoringSettings({ ...proctoringSettings, screenShare: e.target.checked })}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>Screen Sharing Requirement</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Jitsi Room Assignment (When Manual or Combined is selected) */}
                {(proctoringMode === 'manual' || proctoringMode === 'combined') && (
                  <div
                    style={{
                      background: 'rgba(6, 182, 212, 0.05)',
                      border: '1px solid rgba(6, 182, 212, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '14px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Associated Jitsi Monitoring Room
                      </div>
                      <div className="text-muted text-xs">
                        Unique session room: <code style={{ color: 'var(--primary)', fontWeight: 600 }}>{jitsiRoomId}</code> &bull; Authorized invigilators access via Proctoring Console.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      onClick={() => setJitsiRoomId(`vl-exam-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`)}
                      title="Generate new unique room identifier"
                    >
                      <RefreshCw size={12} /> Regenerate Room ID
                    </button>
                  </div>
                )}

                {/* AI Evaluation Assistance Toggle */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    checked={aiGradingEnabled}
                    onChange={(e) => setAiGradingEnabled(e.target.checked)}
                    style={{ accentColor: 'var(--primary)', marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Enable BOT / AI Evaluation Assistance</div>
                    <div className="text-muted text-xs">
                      Generates preliminary rubric score recommendations for human faculty review and final grade sign-off.
                    </div>
                  </div>
                </label>
              </div>

              {/* Proceed Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    const durVal = parseInt(rawDuration, 10);
                    const totVal = parseInt(rawTotalMarks, 10);
                    const passVal = parseInt(rawPassMarks, 10);
                    const attVal = parseInt(rawMaxAttempts, 10);
                    const qCountVal = parseInt(rawTargetQuestions, 10);

                    if (isNaN(durVal) || durVal < 1) {
                      alert('Duration must be a positive integer (at least 1 minute).');
                      return;
                    }
                    if (isNaN(totVal) || totVal < 1) {
                      alert('Total Marks must be a positive integer.');
                      return;
                    }
                    if (isNaN(passVal) || passVal < 1) {
                      alert('Pass Marks must be at least 1.');
                      return;
                    }
                    if (passVal > totVal) {
                      alert(`Pass Marks (${passVal}) cannot exceed Total Marks (${totVal}).`);
                      return;
                    }
                    if (isNaN(attVal) || attVal < 1) {
                      alert('Max Attempts must be at least 1.');
                      return;
                    }
                    if (isNaN(qCountVal) || qCountVal < 1 || qCountVal > MAX_ASSESSMENT_QUESTIONS) {
                      alert(`Target Questions Limit must be between 1 and ${MAX_ASSESSMENT_QUESTIONS}.`);
                      return;
                    }

                    if (selectedMode === 'bulk') setStep('bulk_import');
                    else if (selectedMode === 'ai') setStep('ai_config');
                    else setStep('manual_builder');
                  }}
                >
                  Continue to Question Creation <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2A: BULK QUESTION IMPORT WORKFLOW                         */}
          {/* ============================================================== */}
          {step === 'bulk_import' && (
            <div>
              {/* Template Download Bar */}
              <div
                style={{
                  background: 'rgba(6, 182, 212, 0.08)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileSpreadsheet size={24} color="var(--accent-cyan)" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      Standard Question Import Templates
                    </div>
                    <div className="text-muted text-xs">
                      Required columns: question_text, question_type, difficulty, option_a..d, correct_answer, marks, explanation, topic.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={downloadExcelTemplate}
                    style={{ gap: '6px' }}
                  >
                    <Download size={14} /> Download Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={downloadCsvTemplate}
                    style={{ gap: '6px' }}
                  >
                    <Download size={14} /> Download CSV (.csv)
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UploadCloud size={18} color="var(--accent-cyan)" />
                    Upload Questions File (XLSX, CSV, DOCX, or PDF)
                  </h4>
                  {bulkSummary && (
                    <span className="badge text-xs" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}>
                      {bulkSummary.totalDetected} Questions Detected
                    </span>
                  )}
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleBulkFileSelected(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => bulkFileInputRef.current?.click()}
                  style={{
                    border: isDragOver
                      ? '2px dashed var(--accent-cyan)'
                      : bulkSummary
                      ? '2px solid rgba(6, 182, 212, 0.4)'
                      : '2px dashed var(--border-light)',
                    background: isDragOver
                      ? 'rgba(6, 182, 212, 0.08)'
                      : 'var(--bg-input)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    ref={bulkFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,.docx,.pdf"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleBulkFileSelected(e.target.files[0]);
                      }
                    }}
                  />

                  {isBulkParsing ? (
                    <div>
                      <RefreshCw size={28} className="spin" color="var(--accent-cyan)" style={{ margin: '0 auto 10px auto' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{bulkProgressText}</div>
                      <div className="text-muted text-xs">Parsing question records, validating answers, and detecting duplicates...</div>
                    </div>
                  ) : bulkSummary ? (
                    <div>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'rgba(6, 182, 212, 0.15)',
                          color: 'var(--accent-cyan)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px auto'
                        }}
                      >
                        <FileCheck size={22} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                        {bulkSummary.fileName}
                      </div>
                      <div className="text-muted text-xs" style={{ marginBottom: '10px' }}>
                        {(bulkSummary.fileSize / 1024).toFixed(1)} KB &bull; {bulkSummary.fileType} Format &bull; {bulkSummary.totalDetected} Questions Read
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          bulkFileInputRef.current?.click();
                        }}
                      >
                        Choose Different File
                      </button>
                    </div>
                  ) : (
                    <div>
                      <UploadCloud size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '4px' }}>
                        Drag & drop your question spreadsheet, or <span style={{ color: 'var(--accent-cyan)' }}>browse</span>
                      </div>
                      <div className="text-muted text-xs">
                        Supports Excel (.xlsx), CSV (.csv), Word (.docx), and PDF (.pdf) up to 25 MB
                      </div>
                    </div>
                  )}
                </div>

                {bulkError && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '10px 14px',
                      background: 'var(--danger-bg)',
                      border: '1px solid var(--danger-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--danger)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{bulkError}</span>
                  </div>
                )}
              </div>

              {/* Summary Stats & Downloadable Reports */}
              {bulkSummary && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div className="text-muted text-xs font-semibold">Total Detected</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{bulkSummary.totalDetected}</div>
                    </div>

                    <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div className="text-muted text-xs font-semibold" style={{ color: 'var(--success)' }}>Valid Questions</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--success)' }}>{bulkSummary.validCount}</div>
                    </div>

                    <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div className="text-muted text-xs font-semibold" style={{ color: 'var(--warning)' }}>Needs Review</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--warning)' }}>{bulkSummary.needsReviewCount}</div>
                    </div>

                    <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div className="text-muted text-xs font-semibold" style={{ color: 'var(--accent-purple)' }}>Duplicates Skipped</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-purple)' }}>{bulkSummary.duplicateCount}</div>
                    </div>

                    <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                      <div className="text-muted text-xs font-semibold" style={{ color: 'var(--danger)' }}>Invalid Rows</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--danger)' }}>{bulkSummary.invalidCount}</div>
                    </div>
                  </div>

                  {/* Report Download Buttons */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    {bulkSummary.duplicateCount > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        onClick={handleDownloadDuplicateReport}
                        style={{ gap: '6px' }}
                      >
                        <Download size={13} /> Download Skipped Duplicates Report ({bulkSummary.duplicateCount})
                      </button>
                    )}
                    {(bulkSummary.invalidCount > 0 || bulkSummary.needsReviewCount > 0) && (
                      <button
                        type="button"
                        className="btn btn-secondary text-xs"
                        onClick={handleDownloadErrorReport}
                        style={{ gap: '6px' }}
                      >
                        <Download size={13} /> Download Validation Issues Report ({bulkSummary.invalidCount + bulkSummary.needsReviewCount})
                      </button>
                    )}
                  </div>

                  {/* Filter & Selection Bar */}
                  <div className="card" style={{ padding: '14px', background: 'var(--bg-card)', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                      {/* Status Tabs */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className={`btn btn-sm ${bulkStatusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setBulkStatusFilter('all')}
                        >
                          All ({bulkSummary.items.length})
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${bulkStatusFilter === 'valid' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setBulkStatusFilter('valid')}
                        >
                          Valid ({bulkSummary.validCount})
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${bulkStatusFilter === 'needs_review' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setBulkStatusFilter('needs_review')}
                        >
                          Needs Review ({bulkSummary.needsReviewCount})
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${bulkStatusFilter === 'duplicate' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setBulkStatusFilter('duplicate')}
                        >
                          Duplicates ({bulkSummary.duplicateCount})
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${bulkStatusFilter === 'invalid' ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setBulkStatusFilter('invalid')}
                        >
                          Invalid ({bulkSummary.invalidCount})
                        </button>
                      </div>

                      {/* Search box */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
                        <Search size={14} color="var(--text-muted)" />
                        <input
                          type="text"
                          placeholder="Search questions or topic..."
                          className="form-input text-xs"
                          style={{ padding: '6px 10px' }}
                          value={bulkSearchQuery}
                          onChange={(e) => setBulkSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Secondary Filters & Selection Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary text-xs"
                          onClick={handleSelectAllValidBulk}
                        >
                          Select All Valid
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary text-xs"
                          onClick={handleDeselectAllBulk}
                        >
                          Deselect All
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="text-muted text-xs">Select First:</span>
                          <input
                            type="number"
                            min="1"
                            max={remainingCapacity}
                            placeholder="e.g. 17"
                            className="form-input text-xs"
                            style={{ width: '70px', padding: '4px 8px' }}
                            value={bulkCustomSelectCount}
                            onChange={(e) => setBulkCustomSelectCount(e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn btn-secondary text-xs"
                            onClick={handleApplyCustomBulkCount}
                          >
                            Apply
                          </button>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.85rem' }}>
                        Selected:{' '}
                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {bulkSelectedIds.size}
                        </span>{' '}
                        questions &bull; Available assessment capacity:{' '}
                        <strong>{remainingCapacity}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Questions Preview List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto', marginBottom: '20px' }}>
                    {filteredBulkItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No questions match the current filter selection.
                      </div>
                    ) : (
                      filteredBulkItems.map((item) => {
                        const isSelected = bulkSelectedIds.has(item.id);
                        const isSelectable = item.status === 'valid' || item.status === 'needs_review';

                        return (
                          <div
                            key={item.id}
                            style={{
                              padding: '14px',
                              borderRadius: 'var(--radius-md)',
                              background: isSelected ? 'rgba(6, 182, 212, 0.05)' : 'var(--bg-card)',
                              border: isSelected
                                ? '1px solid rgba(6, 182, 212, 0.5)'
                                : '1px solid var(--border-subtle)',
                              display: 'flex',
                              gap: '12px',
                              alignItems: 'flex-start',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isSelectable}
                              onChange={() => handleToggleBulkItem(item.id)}
                              style={{
                                accentColor: 'var(--accent-cyan)',
                                width: '18px',
                                height: '18px',
                                cursor: isSelectable ? 'pointer' : 'not-allowed',
                                marginTop: '3px'
                              }}
                            />

                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="badge badge-draft text-xs">Row #{item.rowNumber}</span>
                                  <span className="badge badge-primary text-xs" style={{ textTransform: 'capitalize' }}>
                                    {item.question.type.replace('_', ' ')}
                                  </span>
                                  <span className="badge text-xs" style={{ textTransform: 'capitalize' }}>
                                    {item.question.difficulty}
                                  </span>
                                  <span className="badge badge-draft text-xs">{item.question.points} Marks</span>
                                  {item.question.topic && (
                                    <span className="text-muted text-xs">&bull; {item.question.topic}</span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {item.status === 'valid' && (
                                    <span className="badge badge-success text-xs">
                                      <CheckCircle2 size={12} /> Valid
                                    </span>
                                  )}
                                  {item.status === 'needs_review' && (
                                    <span className="badge badge-warning text-xs">
                                      <AlertTriangle size={12} /> Needs Review (Missing Answer)
                                    </span>
                                  )}
                                  {item.status === 'duplicate' && (
                                    <span className="badge badge-draft text-xs" style={{ color: 'var(--accent-purple)' }}>
                                      Skipped (Duplicate)
                                    </span>
                                  )}
                                  {item.status === 'invalid' && (
                                    <span className="badge badge-error text-xs">
                                      <AlertTriangle size={12} /> Invalid Row
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setBulkEditingItem(item)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--primary)',
                                      cursor: 'pointer',
                                      padding: '2px 4px'
                                    }}
                                    title="Edit Question"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                </div>
                              </div>

                              <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', lineHeight: '1.4' }}>
                                {item.question.prompt}
                              </p>

                              {/* Options */}
                              {item.question.options && item.question.options.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px', marginBottom: '8px' }}>
                                  {item.question.options.map((opt, optIdx) => (
                                    <div
                                      key={opt.id}
                                      style={{
                                        fontSize: '0.8rem',
                                        padding: '4px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        background: opt.isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                                        color: opt.isCorrect ? 'var(--success)' : 'var(--text-main)',
                                        border: opt.isCorrect ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                      }}
                                    >
                                      <strong>{String.fromCharCode(65 + optIdx)}.</strong>
                                      <span>{opt.text}</span>
                                      {opt.isCorrect && <Check size={12} />}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {item.question.correctAnswer && !item.question.options && (
                                <div style={{ fontSize: '0.82rem', color: 'var(--success)', marginBottom: '4px' }}>
                                  <strong>Expected Answer:</strong> {item.question.correctAnswer}
                                </div>
                              )}

                              {/* Issues / Duplicate Alert */}
                              {item.issues.length > 0 && (
                                <div
                                  style={{
                                    fontSize: '0.78rem',
                                    color: item.status === 'invalid' ? 'var(--danger)' : 'var(--warning)',
                                    background: item.status === 'invalid' ? 'var(--danger-bg)' : 'var(--warning-bg)',
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    marginTop: '4px'
                                  }}
                                >
                                  {item.issues.join(' | ')}
                                </div>
                              )}
                              {item.duplicateReason && (
                                <div
                                  style={{
                                    fontSize: '0.78rem',
                                    color: 'var(--accent-purple)',
                                    background: 'rgba(139, 92, 246, 0.12)',
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    marginTop: '4px'
                                  }}
                                >
                                  {item.duplicateReason}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('mode_select')}
                >
                  <ArrowLeft size={16} /> Back to Method Select
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {questions.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setStep('review_edit')}
                    >
                      View Current Questions ({questions.length})
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!bulkSummary || bulkSelectedIds.size === 0}
                    onClick={handleImportSelectedQuestions}
                  >
                    Import Selected ({bulkSelectedIds.size}) Questions <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Inline Edit Modal for Bulk Import Item */}
          {bulkEditingItem && (
            <div
              className="modal-overlay"
              style={{ zIndex: 1400 }}
              onClick={() => setBulkEditingItem(null)}
            >
              <div
                className="modal-card"
                style={{ maxWidth: '640px' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                    Edit Row #{bulkEditingItem.rowNumber} Question
                  </h3>
                  <button onClick={() => setBulkEditingItem(null)} style={{ color: 'var(--text-muted)' }}>
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label text-xs">Question Text</label>
                    <textarea
                      rows={3}
                      className="form-input text-sm"
                      value={bulkEditingItem.question.prompt}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBulkEditingItem({
                          ...bulkEditingItem,
                          question: { ...bulkEditingItem.question, prompt: val }
                        });
                      }}
                    />
                  </div>

                  <div className="grid-2" style={{ gap: '10px', marginBottom: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label text-xs">Marks</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input text-sm"
                        value={bulkEditingItem.question.points}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 5;
                          setBulkEditingItem({
                            ...bulkEditingItem,
                            question: { ...bulkEditingItem.question, points: val }
                          });
                        }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label text-xs">Difficulty</label>
                      <select
                        className="form-select text-sm"
                        value={bulkEditingItem.question.difficulty}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setBulkEditingItem({
                            ...bulkEditingItem,
                            question: { ...bulkEditingItem.question, difficulty: val }
                          });
                        }}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>

                  {/* Options */}
                  {bulkEditingItem.question.options && bulkEditingItem.question.options.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <label className="form-label text-xs">
                        Options & Designated Correct Answer (Click radio/checkbox to set correct answer)
                      </label>
                      {bulkEditingItem.question.options.map((opt, optIdx) => (
                        <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <input
                            type={bulkEditingItem.question.type === 'single_choice' || bulkEditingItem.question.type === 'true_false' ? 'radio' : 'checkbox'}
                            name={`edit-bulk-opt-${bulkEditingItem.id}`}
                            checked={opt.isCorrect}
                            onChange={() => {
                              const updated = bulkEditingItem.question.options!.map((o) =>
                                bulkEditingItem.question.type === 'single_choice' || bulkEditingItem.question.type === 'true_false'
                                  ? { ...o, isCorrect: o.id === opt.id }
                                  : o.id === opt.id
                                  ? { ...o, isCorrect: !o.isCorrect }
                                  : o
                              );
                              setBulkEditingItem({
                                ...bulkEditingItem,
                                question: { ...bulkEditingItem.question, options: updated }
                              });
                            }}
                            style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <input
                            type="text"
                            className="form-input text-xs"
                            value={opt.text}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = bulkEditingItem.question.options!.map((o) => (o.id === opt.id ? { ...o, text: val } : o));
                              setBulkEditingItem({
                                ...bulkEditingItem,
                                question: { ...bulkEditingItem.question, options: updated }
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {bulkEditingItem.question.type === 'short_answer' && (
                    <div className="form-group">
                      <label className="form-label text-xs">Expected Correct Answer</label>
                      <input
                        type="text"
                        className="form-input text-xs"
                        value={bulkEditingItem.question.correctAnswer || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBulkEditingItem({
                            ...bulkEditingItem,
                            question: { ...bulkEditingItem.question, correctAnswer: val }
                          });
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setBulkEditingItem(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveBulkEditingItem}
                  >
                    Save Changes & Resolve Review
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2B: OPTION 2 - AI QUESTION GENERATION                     */}
          {/* ============================================================== */}
          {step === 'ai_config' && (
            <div>
              {/* AI Source Selector Tabs: Document vs Video */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  background: 'var(--bg-input)',
                  padding: '6px',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: '20px',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setAiSourceType('document')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    background: aiSourceType === 'document' ? 'var(--primary)' : 'transparent',
                    color: aiSourceType === 'document' ? '#ffffff' : 'var(--text-muted)',
                    boxShadow: aiSourceType === 'document' ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <FileText size={16} /> Learning Document (PDF, DOCX, TXT)
                  {uploadedDoc && <CheckCircle2 size={14} color="#ffffff" />}
                </button>

                <button
                  type="button"
                  onClick={() => setAiSourceType('video')}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    background: aiSourceType === 'video' ? 'var(--primary)' : 'transparent',
                    color: aiSourceType === 'video' ? '#ffffff' : 'var(--text-muted)',
                    boxShadow: aiSourceType === 'video' ? '0 2px 8px rgba(99, 102, 241, 0.3)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Video size={16} /> Learning Video (MP4, WebM, MOV)
                  <span
                    style={{
                      background: aiSourceType === 'video' ? 'rgba(255,255,255,0.25)' : 'rgba(99, 102, 241, 0.15)',
                      color: aiSourceType === 'video' ? '#ffffff' : 'var(--primary)',
                      fontSize: '0.7rem',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      fontWeight: 700
                    }}
                  >
                    Local AI
                  </span>
                  {videoFile && <CheckCircle2 size={14} color="#ffffff" />}
                </button>
              </div>

              {/* 1. DOCUMENT UPLOAD CARD (Active when aiSourceType === 'document') */}
              {aiSourceType === 'document' && (
                <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={18} color="var(--primary)" />
                      Upload Learning Document (PDF, DOCX, TXT)
                    </h4>
                    {uploadedDoc && (
                      <span className="badge badge-active text-xs">
                        <CheckCircle2 size={12} /> {(uploadedDoc.wordCount || 0).toLocaleString()} Words Extracted
                      </span>
                    )}
                  </div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleAiFileChange(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => aiFileInputRef.current?.click()}
                    style={{
                      border: isDragOver
                        ? '2px dashed var(--primary)'
                        : uploadedDoc
                        ? '2px solid var(--success-border)'
                        : '2px dashed var(--border-light)',
                      background: isDragOver
                        ? 'rgba(99, 102, 241, 0.08)'
                        : uploadedDoc
                        ? 'rgba(16, 185, 129, 0.05)'
                        : 'var(--bg-input)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '28px 20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      ref={aiFileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleAiFileChange(e.target.files[0]);
                        }
                      }}
                    />

                    {isUploading ? (
                      <div>
                        <RefreshCw size={32} className="spin" color="var(--primary)" style={{ margin: '0 auto 12px auto' }} />
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '6px' }}>{uploadStageText}</div>
                        <div
                          style={{
                            width: '260px',
                            height: '8px',
                            background: 'var(--border-subtle)',
                            borderRadius: '4px',
                            margin: '8px auto',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${uploadProgress}%`,
                              height: '100%',
                              background: 'var(--primary)',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        <span className="text-muted text-xs">{uploadProgress}% complete</span>
                      </div>
                    ) : uploadedDoc ? (
                      <div>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 10px auto'
                          }}
                        >
                          <FileCheck size={24} />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                          {uploadedDoc.name}
                        </div>
                        <div className="text-muted text-xs" style={{ marginBottom: '12px' }}>
                          {(uploadedDoc.size / 1024).toFixed(1)} KB &bull; {uploadedDoc.type} &bull; {(uploadedDoc.wordCount || 0).toLocaleString()} words &bull; {uploadedDoc.pageCount ? `${uploadedDoc.pageCount} pages` : 'Plain text stream'}
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            aiFileInputRef.current?.click();
                          }}
                        >
                          Change Document
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload size={36} color="var(--text-muted)" style={{ margin: '0 auto 10px auto' }} />
                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                          Drag & drop curriculum document, or <span style={{ color: 'var(--primary)' }}>browse</span>
                        </div>
                        <div className="text-muted text-xs">
                          Supports PDF (.pdf), Microsoft Word (.docx), and Plain Text (.txt) up to 25 MB
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadError && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        background: 'var(--danger-bg)',
                        border: '1px solid var(--danger-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--danger)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <AlertTriangle size={16} />
                      <span>{uploadError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 2. VIDEO UPLOAD & PROCESSING CARD (Active when aiSourceType === 'video') */}
              {aiSourceType === 'video' && (
                <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', marginBottom: '20px' }}>
                  {/* Service Connectivity Banner */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: aiBackendStatus?.available ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: aiBackendStatus?.available ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '16px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          background: aiBackendStatus?.available ? 'var(--success)' : 'var(--danger)',
                          boxShadow: aiBackendStatus?.available ? '0 0 8px rgba(16, 185, 129, 0.8)' : 'none'
                        }}
                      />
                      <span style={{ fontWeight: 600 }}>
                        {aiBackendStatus?.available
                          ? 'Local AI Processing Engine: Online & Ready'
                          : 'Local AI Processing Service: Offline / Connecting'}
                      </span>
                      <span className="text-muted text-xs">
                        ({AI_SERVICE_URL} &bull; FFmpeg &bull; faster-whisper &bull; Ollama)
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      onClick={() => checkAIServiceHealth().then(setAiBackendStatus)}
                    >
                      <RefreshCw size={12} /> Test Ping
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h4 style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video size={18} color="var(--primary)" />
                      Upload Learning Video (MP4, WebM, MOV)
                    </h4>
                    {videoFile && (
                      <span className="badge badge-active text-xs">
                        <CheckCircle2 size={12} /> {(videoFile.size / (1024 * 1024)).toFixed(1)} MB Video Ready
                      </span>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={videoFileInputRef}
                    type="file"
                    accept=".mp4,.webm,.mov,.mkv,video/mp4,video/webm,video/quicktime,video/x-matroska"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleVideoFileChange(e.target.files[0]);
                      }
                    }}
                  />

                  {/* Video Drag & Drop or Video Player Preview */}
                  {videoFile && videoPreviewUrl ? (
                    <div
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--bg-input)',
                        padding: '16px',
                        marginBottom: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {/* Video Player */}
                        <div
                          style={{
                            width: '280px',
                            maxHeight: '170px',
                            borderRadius: 'var(--radius-md)',
                            overflow: 'hidden',
                            background: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <video
                            ref={videoPlayerRef}
                            src={videoPreviewUrl}
                            controls
                            style={{ width: '100%', maxHeight: '170px', objectFit: 'contain' }}
                            onLoadedMetadata={(e) => {
                              const el = e.currentTarget;
                              setVideoDuration(el.duration);
                            }}
                          />
                        </div>

                        {/* Video Info & Controls */}
                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <Film size={18} color="var(--primary)" />
                            <h5 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, wordBreak: 'break-all' }}>
                              {videoFile.name}
                            </h5>
                          </div>

                          <div className="text-muted text-xs" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                            <span>Size: <strong>{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</strong></span>
                            <span>Format: <strong>{videoFile.type || 'video/mp4'}</strong></span>
                            {videoDuration > 0 && (
                              <span>Duration: <strong>{Math.floor(videoDuration / 60)}m {Math.floor(videoDuration % 60)}s</strong></span>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-secondary text-xs"
                              disabled={isVideoProcessing}
                              onClick={() => videoFileInputRef.current?.click()}
                            >
                              Replace Video
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary text-xs"
                              disabled={isVideoProcessing}
                              onClick={handleRemoveVideo}
                              style={{ color: 'var(--danger)' }}
                            >
                              Remove Video
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleVideoFileChange(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => videoFileInputRef.current?.click()}
                      style={{
                        border: isDragOver
                          ? '2px dashed var(--primary)'
                          : '2px dashed var(--border-light)',
                        background: isDragOver
                          ? 'rgba(99, 102, 241, 0.08)'
                          : 'var(--bg-input)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '28px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginBottom: '16px'
                      }}
                    >
                      <Video size={40} color="var(--primary)" style={{ margin: '0 auto 10px auto' }} />
                      <div style={{ fontWeight: 600, fontSize: '0.98rem', marginBottom: '4px' }}>
                        Drag & drop your lecture video here, or <span style={{ color: 'var(--primary)' }}>browse</span>
                      </div>
                      <div className="text-muted text-xs" style={{ marginBottom: '14px' }}>
                        Supported formats: MP4 (.mp4), WebM (.webm), QuickTime (.mov) &bull; Maximum file size 500 MB
                      </div>

                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadSampleVideo();
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: 'var(--primary)',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        <Play size={13} /> Quick Test: Load Sample Learning Video (Cloud Architecture)
                      </div>
                    </div>
                  )}

                  {/* Language Configuration for Speech Transcription */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '12px',
                      padding: '14px',
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '14px'
                    }}
                  >
                    <div>
                      <label className="form-label text-xs" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Languages size={14} color="var(--primary)" />
                        Lecture Spoken Language
                      </label>
                      <select
                        className="form-select text-xs"
                        value={videoLanguage}
                        onChange={(e) => setVideoLanguage(e.target.value as any)}
                        disabled={isVideoProcessing}
                      >
                        <option value="auto">Auto-Detect Spoken Language (Default)</option>
                        <option value="en">English (en)</option>
                        <option value="te">Telugu (te)</option>
                      </select>
                      <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                        faster-whisper transcribes audio with precise sentence timestamps.
                      </div>
                    </div>

                    <div>
                      <label className="form-label text-xs">Audio Processing Pipeline</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="badge badge-active text-xs" style={{ width: 'fit-content' }}>
                          FFmpeg 16kHz PCM WAV Extraction
                        </span>
                        <span className="badge badge-primary text-xs" style={{ width: 'fit-content' }}>
                          faster-whisper Small Model
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Video Processing Pipeline Progress */}
                  {isVideoProcessing && (
                    <div
                      style={{
                        padding: '16px',
                        background: 'rgba(99, 102, 241, 0.08)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <RefreshCw size={16} className="spin" color="var(--primary)" />
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                            {videoStageText || 'Processing video pipeline...'}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)' }}>
                          {videoProgress}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          background: 'var(--border-subtle)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginBottom: '12px'
                        }}
                      >
                        <div
                          style={{
                            width: `${videoProgress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--primary), var(--accent-cyan))',
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>

                      {/* Visual 4-Step Architecture Steps */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', textAlign: 'center' }}>
                        {[
                          { num: 1, label: 'Video Upload', active: videoProgress >= 10 },
                          { num: 2, label: 'Audio Extract', active: videoProgress >= 30 },
                          { num: 3, label: 'Whisper STT', active: videoProgress >= 60 },
                          { num: 4, label: 'Question Gen', active: videoProgress >= 85 }
                        ].map((s) => (
                          <div
                            key={s.num}
                            style={{
                              padding: '6px 4px',
                              borderRadius: 'var(--radius-sm)',
                              background: s.active ? 'rgba(99, 102, 241, 0.18)' : 'var(--bg-input)',
                              color: s.active ? 'var(--primary)' : 'var(--text-muted)',
                              fontWeight: s.active ? 700 : 500,
                              fontSize: '0.72rem'
                            }}
                          >
                            {s.num}. {s.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {videoError && (
                    <div
                      style={{
                        padding: '12px 14px',
                        background: 'var(--danger-bg)',
                        border: '1px solid var(--danger-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--danger)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <AlertTriangle size={18} />
                      <div style={{ flex: 1 }}>{videoError}</div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Generation Settings Card */}
              <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="var(--primary)" />
                    AI Question Generation Settings
                  </h4>
                  <span className="badge badge-draft text-xs" title={aiProviderInfo.name}>
                    Provider: {aiProviderInfo.type === 'gemini' ? 'Gemini 1.5' : aiProviderInfo.type === 'openai' ? 'GPT-4o-mini' : 'Grounded Engine'}
                  </span>
                </div>

                {/* Difficulty Selector */}
                <div className="form-group">
                  <label className="form-label">
                    Target Difficulty Level <span className="required">*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {(['easy', 'medium', 'hard', 'mixed'] as AssessmentDifficultySetting[]).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setAiDifficulty(diff)}
                        style={{
                          padding: '10px',
                          borderRadius: 'var(--radius-md)',
                          border: aiDifficulty === diff ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                          background: aiDifficulty === diff ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                          color: aiDifficulty === diff ? 'var(--primary)' : 'var(--text-main)',
                          fontWeight: aiDifficulty === diff ? 700 : 500,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Questions */}
                <div className="form-group">
                  <label className="form-label">
                    Number of Questions to Generate (Max available: {remainingCapacity}) <span className="required">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {[5, 10, 15, 20, 30].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          setAiQuestionCount(Math.min(count, remainingCapacity));
                          setIsCustomCount(false);
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 'var(--radius-md)',
                          border: !isCustomCount && aiQuestionCount === count ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                          background: !isCustomCount && aiQuestionCount === count ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                          color: !isCustomCount && aiQuestionCount === count ? 'var(--primary)' : 'var(--text-main)',
                          fontWeight: !isCustomCount && aiQuestionCount === count ? 700 : 500,
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        {count} Questions
                      </button>
                    ))}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setIsCustomCount(true)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          border: isCustomCount ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                          background: isCustomCount ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                          color: isCustomCount ? 'var(--primary)' : 'var(--text-main)',
                          fontSize: '0.85rem',
                          cursor: 'pointer'
                        }}
                      >
                        Custom:
                      </button>
                      {isCustomCount && (
                        <input
                          type="number"
                          min="1"
                          max={remainingCapacity}
                          placeholder="e.g. 12"
                          className="form-input"
                          style={{ width: '90px', padding: '6px 10px' }}
                          value={customCountInput}
                          onChange={(e) => setCustomCountInput(e.target.value)}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Question Types */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Question Types to Include <span className="required">*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                    {[
                      { key: 'single_choice', label: 'Multiple Choice (MCQ)', desc: '1 single correct answer' },
                      { key: 'multiple_choice', label: 'Multiple Select', desc: 'Multiple correct answers' },
                      { key: 'true_false', label: 'True / False', desc: 'Binary fact validation' },
                      { key: 'short_answer', label: 'Short Answer', desc: 'Concise term or key phrase' },
                      { key: 'essay', label: 'Descriptive Answer', desc: 'Critical rubric evaluation' }
                    ].map((item) => {
                      const isSelected = selectedQuestionTypes.includes(item.key as AssessmentQuestionTypeSetting);
                      return (
                        <div
                          key={item.key}
                          onClick={() => toggleQuestionType(item.key as AssessmentQuestionTypeSetting)}
                          style={{
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-input)',
                            borderRadius: 'var(--radius-md)',
                            padding: '10px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            style={{ accentColor: 'var(--primary)', marginTop: '2px' }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.label}</div>
                            <div className="text-muted text-xs">{item.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {generationError && (
                <div
                  style={{
                    marginBottom: '16px',
                    padding: '12px 16px',
                    background: 'var(--danger-bg)',
                    border: '1px solid var(--danger-border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--danger)',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  <AlertTriangle size={18} />
                  <span>{generationError}</span>
                </div>
              )}

              {/* Generate Action Trigger */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('mode_select')}
                >
                  <ArrowLeft size={16} /> Back to Method Select
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  {questions.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setStep('review_edit')}
                    >
                      View Current Questions ({questions.length})
                    </button>
                  )}
                  {aiSourceType === 'document' ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!uploadedDoc || isUploading || isGenerating || remainingCapacity === 0}
                      onClick={handleGenerateQuestions}
                      style={{ minWidth: '190px' }}
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw size={16} className="spin" /> Generating Questions...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Generate Questions with AI
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!videoFile || isVideoProcessing || remainingCapacity === 0}
                      onClick={handleGenerateFromVideo}
                      style={{ minWidth: '220px' }}
                    >
                      {isVideoProcessing ? (
                        <>
                          <RefreshCw size={16} className="spin" /> Transcribing & Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} /> Generate Questions from Video
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 2C: OPTION 3 - MANUAL QUESTION BUILDER                    */}
          {/* ============================================================== */}
          {step === 'manual_builder' && (
            <div>
              <form onSubmit={handleAddManualQuestion}>
                <div className="card" style={{ padding: '20px', background: 'var(--bg-card)', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PenTool size={18} color="var(--success)" />
                      Author Question #{questions.length + 1} of max {MAX_ASSESSMENT_QUESTIONS}
                    </h4>
                    <span className="badge badge-active text-xs">Zero AI Required</span>
                  </div>

                  <div className="grid-2" style={{ gap: '16px', marginBottom: '14px' }}>
                    <div className="form-group">
                      <label className="form-label">Question Type</label>
                      <select
                        className="form-select"
                        value={mType}
                        onChange={(e) => setMType(e.target.value as AssessmentQuestionTypeSetting)}
                      >
                        <option value="single_choice">Multiple Choice (Single Answer)</option>
                        <option value="multiple_choice">Multiple Select (Multiple Answers)</option>
                        <option value="true_false">True / False</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="essay">Descriptive Answer / Essay</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="form-label">Difficulty</label>
                        <select
                          className="form-select"
                          value={mDifficulty}
                          onChange={(e) => setMDifficulty(e.target.value as any)}
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Marks</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          className="form-input"
                          value={mPoints}
                          onChange={(e) => setMPoints(parseInt(e.target.value) || 5)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Question Prompt / Statement <span className="required">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g. Which architectural pattern guarantees exactly-once processing semantics in distributed event streaming?"
                      className="form-input"
                      value={mPrompt}
                      onChange={(e) => setMPrompt(e.target.value)}
                    />
                  </div>

                  {/* Options Builder for Single & Multiple Choice */}
                  {(mType === 'single_choice' || mType === 'multiple_choice') && (
                    <div className="form-group">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label className="form-label" style={{ margin: 0 }}>
                          Answer Options & Correct Answer Designation <span className="required">*</span>
                        </label>
                        <button
                          type="button"
                          className="btn btn-secondary text-xs"
                          onClick={() => {
                            if (mOptions.length < 6) {
                              setMOptions([...mOptions, { id: `opt-${Date.now()}`, text: '', isCorrect: false }]);
                            }
                          }}
                        >
                          + Add Option
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {mOptions.map((opt, idx) => (
                          <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type={mType === 'single_choice' ? 'radio' : 'checkbox'}
                              name="manual-correct-choice"
                              checked={opt.isCorrect}
                              onChange={() => {
                                if (mType === 'single_choice') {
                                  setMOptions(mOptions.map((o) => ({ ...o, isCorrect: o.id === opt.id })));
                                } else {
                                  setMOptions(mOptions.map((o) => (o.id === opt.id ? { ...o, isCorrect: !o.isCorrect } : o)));
                                }
                              }}
                              style={{ accentColor: 'var(--primary)', width: '18px', height: '18px', cursor: 'pointer' }}
                              title="Mark as correct answer"
                            />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '24px' }}>
                              {String.fromCharCode(65 + idx)}.
                            </span>
                            <input
                              type="text"
                              required
                              placeholder={`Option ${idx + 1} text`}
                              className="form-input"
                              style={{ flex: 1 }}
                              value={opt.text}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMOptions(mOptions.map((o) => (o.id === opt.id ? { ...o, text: val } : o)));
                              }}
                            />
                            {mOptions.length > 2 && (
                              <button
                                type="button"
                                onClick={() => setMOptions(mOptions.filter((o) => o.id !== opt.id))}
                                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                title="Remove option"
                              >
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* True / False Selector */}
                  {mType === 'true_false' && (
                    <div className="form-group">
                      <label className="form-label">
                        Designated Correct Answer <span className="required">*</span>
                      </label>
                      <div style={{ display: 'flex', gap: '16px' }}>
                        {['True', 'False'].map((val) => (
                          <label
                            key={val}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 18px',
                              borderRadius: 'var(--radius-md)',
                              background: mCorrectAnswer === val ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                              border: mCorrectAnswer === val ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                              cursor: 'pointer',
                              fontWeight: 600
                            }}
                          >
                            <input
                              type="radio"
                              name="tf-correct"
                              checked={mCorrectAnswer === val}
                              onChange={() => setMCorrectAnswer(val)}
                              style={{ accentColor: 'var(--primary)' }}
                            />
                            {val}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Short Answer Expected Response */}
                  {mType === 'short_answer' && (
                    <div className="form-group">
                      <label className="form-label">Expected Answer / Key Phrase</label>
                      <input
                        type="text"
                        placeholder="e.g. Idempotent Consumer Pattern"
                        className="form-input"
                        value={mCorrectAnswer}
                        onChange={(e) => setMCorrectAnswer(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Descriptive / Essay Rubric */}
                  {mType === 'essay' && (
                    <div className="form-group">
                      <label className="form-label">Evaluation Rubric & Scoring Criteria</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. 5 Marks for architectural diagram; 5 Marks for error recovery semantics; 5 Marks for trade-off analysis."
                        className="form-input"
                        value={mRubric}
                        onChange={(e) => setMRubric(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="grid-2" style={{ gap: '16px', marginBottom: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Answer Explanation / Rationale</label>
                      <input
                        type="text"
                        placeholder="Explain why this is correct (shown to learner after grading)"
                        className="form-input"
                        value={mExplanation}
                        onChange={(e) => setMExplanation(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Topic / Section Tag</label>
                      <input
                        type="text"
                        placeholder="e.g. Distributed Consensus"
                        className="form-input"
                        value={mTopic}
                        onChange={(e) => setMTopic(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {manualFormError && (
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '10px 14px',
                      background: 'var(--danger-bg)',
                      border: '1px solid var(--danger-border)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--danger)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{manualFormError}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (questions.length > 0) setStep('review_edit');
                      else setStep('mode_select');
                    }}
                  >
                    <ArrowLeft size={16} /> {questions.length > 0 ? 'Back to Questions' : 'Back to Method Select'}
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={remainingCapacity === 0}>
                      + Add Question to Assessment
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: QUESTION EDITOR & REVIEW LIST                          */}
          {/* ============================================================== */}
          {step === 'review_edit' && (
            <div>
              {/* Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                    Assessment Questions ({questions.length} / {MAX_ASSESSMENT_QUESTIONS} max)
                  </h3>
                  <div className="text-muted text-xs">
                    Total Marks: <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{sumOfQuestionMarks}</span>{' '}
                    (Target Configured: {totalMarks}) &bull; Remaining Capacity: {remainingCapacity} slots
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    disabled={remainingCapacity === 0}
                    onClick={() => setStep('manual_builder')}
                  >
                    + Add Question Manually
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    disabled={remainingCapacity === 0}
                    onClick={() => setStep('bulk_import')}
                  >
                    <UploadCloud size={14} color="var(--accent-cyan)" /> Import More (Bulk)
                  </button>

                  {(uploadedDoc || videoFile) && (
                    <button
                      type="button"
                      className="btn btn-secondary text-xs"
                      disabled={remainingCapacity === 0}
                      onClick={() => setStep('ai_config')}
                    >
                      <Sparkles size={14} /> AI Settings & Add More
                    </button>
                  )}

                  {videoSegments.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary text-xs"
                      onClick={() => setIsVideoTranscriptModalOpen(true)}
                      style={{ gap: '6px' }}
                    >
                      <FileText size={14} color="var(--primary)" /> View Video Transcript ({videoSegments.length} Segments)
                    </button>
                  )}
                </div>
              </div>

              {/* Marks Mismatch Alert Banner */}
              {marksMismatch && (
                <div
                  style={{
                    background: 'var(--warning-bg)',
                    border: '1px solid var(--warning-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangle size={18} color="var(--warning)" />
                    <span style={{ fontSize: '0.85rem' }}>
                      Mark Discrepancy: Question marks sum to <strong>{sumOfQuestionMarks}</strong>, but configured assessment total is <strong>{totalMarks}</strong>.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={handleSyncMarks}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Sync Total to {sumOfQuestionMarks} Marks
                  </button>
                </div>
              )}

              {/* Questions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                {questions.map((q, idx) => {
                  const isEditing = editingQId === q.id;
                  const isRegenerating = regeneratingQId === q.id;

                  // Missing answer check for objective questions
                  const hasMissingCorrect =
                    (q.type === 'single_choice' || q.type === 'true_false' || q.type === 'multiple_choice') &&
                    (!q.options || !q.options.some((o) => o.isCorrect));

                  return (
                    <div
                      key={q.id}
                      className="card"
                      style={{
                        padding: '16px',
                        background: 'var(--bg-card)',
                        border: hasMissingCorrect ? '1px solid var(--warning-border)' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      {/* Question Card Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                            Q{idx + 1}.
                          </span>
                          <span className="badge badge-primary text-xs" style={{ textTransform: 'capitalize' }}>
                            {q.type.replace('_', ' ')}
                          </span>
                          <span
                            className="badge text-xs"
                            style={{
                              background:
                                q.difficulty === 'hard'
                                  ? 'var(--danger-bg)'
                                  : q.difficulty === 'medium'
                                  ? 'var(--warning-bg)'
                                  : 'var(--success-bg)',
                              color:
                                q.difficulty === 'hard'
                                  ? 'var(--danger)'
                                  : q.difficulty === 'medium'
                                  ? 'var(--warning)'
                                  : 'var(--success)',
                              textTransform: 'capitalize'
                            }}
                          >
                            {q.difficulty}
                          </span>
                          <span className="badge badge-draft text-xs">{q.points} Marks</span>
                          {q.topic && <span className="text-muted text-xs">&bull; {q.topic}</span>}
                          {q.sourceSegment && (
                            <span
                              className="badge text-xs"
                              style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: 'var(--primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                border: '1px solid rgba(99, 102, 241, 0.3)'
                              }}
                              title="Verified source timestamp in video lecture"
                            >
                              <Clock size={11} /> {q.sourceSegment}
                            </span>
                          )}
                          {hasMissingCorrect && (
                            <span className="badge badge-warning text-xs">
                              <AlertTriangle size={11} /> Missing Correct Answer
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: idx === 0 ? 'var(--border-subtle)' : 'var(--text-muted)',
                              cursor: idx === 0 ? 'default' : 'pointer',
                              padding: '4px'
                            }}
                            title="Move Up"
                          >
                            <MoveUp size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === questions.length - 1}
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: idx === questions.length - 1 ? 'var(--border-subtle)' : 'var(--text-muted)',
                              cursor: idx === questions.length - 1 ? 'default' : 'pointer',
                              padding: '4px'
                            }}
                            title="Move Down"
                          >
                            <MoveDown size={15} />
                          </button>

                          {uploadedDoc && (
                            <button
                              type="button"
                              disabled={isRegenerating}
                              onClick={() => handleRegenerateQuestion(q)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary)',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                              title="Regenerate this question with AI"
                            >
                              <RefreshCw size={15} className={isRegenerating ? 'spin' : ''} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(q)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Duplicate question"
                          >
                            <Copy size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingQId(isEditing ? null : q.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: isEditing ? 'var(--primary)' : 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Edit question"
                          >
                            <PenTool size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                            title="Delete question"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Content View / Edit Mode */}
                      {isEditing ? (
                        <div
                          style={{
                            background: 'var(--bg-input)',
                            padding: '14px',
                            borderRadius: 'var(--radius-md)',
                            marginTop: '8px'
                          }}
                        >
                          <div className="form-group">
                            <label className="form-label text-xs">Prompt</label>
                            <textarea
                              rows={2}
                              className="form-input text-sm"
                              value={q.prompt}
                              onChange={(e) => {
                                const val = e.target.value;
                                setQuestions(questions.map((item) => (item.id === q.id ? { ...item, prompt: val } : item)));
                              }}
                            />
                          </div>

                          <div className="grid-2" style={{ gap: '10px', marginBottom: '10px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label text-xs">Marks (Points)</label>
                              <input
                                type="number"
                                min="1"
                                className="form-input text-sm"
                                value={q.points}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setQuestions(questions.map((item) => (item.id === q.id ? { ...item, points: val } : item)));
                                }}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label text-xs">Difficulty</label>
                              <select
                                className="form-select text-sm"
                                value={q.difficulty}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  setQuestions(questions.map((item) => (item.id === q.id ? { ...item, difficulty: val } : item)));
                                }}
                              >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>
                            </div>
                          </div>

                          {/* Options editor */}
                          {q.options && q.options.length > 0 && (
                            <div style={{ marginBottom: '10px' }}>
                              <label className="form-label text-xs">Options & Correct Answer (Select to designate correct choice)</label>
                              {q.options.map((opt) => (
                                <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <input
                                    type={q.type === 'single_choice' || q.type === 'true_false' ? 'radio' : 'checkbox'}
                                    name={`edit-opt-${q.id}`}
                                    checked={opt.isCorrect}
                                    onChange={() => {
                                      const updatedOpts = q.options!.map((o) =>
                                        q.type === 'single_choice' || q.type === 'true_false'
                                          ? { ...o, isCorrect: o.id === opt.id }
                                          : o.id === opt.id
                                          ? { ...o, isCorrect: !o.isCorrect }
                                          : o
                                      );
                                      setQuestions(questions.map((item) => (item.id === q.id ? { ...item, options: updatedOpts } : item)));
                                    }}
                                    style={{ accentColor: 'var(--primary)' }}
                                  />
                                  <input
                                    type="text"
                                    className="form-input text-xs"
                                    value={opt.text}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const updatedOpts = q.options!.map((o) => (o.id === opt.id ? { ...o, text: val } : o));
                                      setQuestions(questions.map((item) => (item.id === q.id ? { ...item, options: updatedOpts } : item)));
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {q.type === 'short_answer' && (
                            <div className="form-group" style={{ marginBottom: '8px' }}>
                              <label className="form-label text-xs">Expected Correct Answer</label>
                              <input
                                type="text"
                                className="form-input text-xs"
                                value={q.correctAnswer || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuestions(questions.map((item) => (item.id === q.id ? { ...item, correctAnswer: val } : item)));
                                }}
                              />
                            </div>
                          )}

                          <div className="grid-2" style={{ gap: '10px', marginBottom: '8px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label text-xs">Explanation / Rationale</label>
                              <input
                                type="text"
                                className="form-input text-xs"
                                value={q.explanation}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuestions(questions.map((item) => (item.id === q.id ? { ...item, explanation: val } : item)));
                                }}
                              />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label className="form-label text-xs">Source Video Segment / Citation</label>
                              <input
                                type="text"
                                className="form-input text-xs"
                                placeholder="e.g. [00:15 - 00:30]"
                                value={q.sourceSegment || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuestions(questions.map((item) => (item.id === q.id ? { ...item, sourceSegment: val } : item)));
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary text-xs"
                              onClick={() => setEditingQId(null)}
                            >
                              Done Editing
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p style={{ margin: '0 0 10px 0', fontSize: '0.92rem', lineHeight: '1.5' }}>
                            {q.prompt}
                          </p>

                          {/* Options View */}
                          {q.options && q.options.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                              {q.options.map((opt, optIdx) => (
                                <div
                                  key={opt.id}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: opt.isCorrect ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                                    border: opt.isCorrect ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)',
                                    fontSize: '0.82rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    color: opt.isCorrect ? 'var(--success)' : 'var(--text-main)'
                                  }}
                                >
                                  <span style={{ fontWeight: 700, width: '18px' }}>
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <span style={{ flex: 1 }}>{opt.text}</span>
                                  {opt.isCorrect && <Check size={14} />}
                                </div>
                              ))}
                            </div>
                          )}

                          {q.correctAnswer && !q.options && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--success)', marginBottom: '8px' }}>
                              <strong>Expected Answer:</strong> {q.correctAnswer}
                            </div>
                          )}

                          {(q.explanation || q.sourceSegment) && (
                            <div className="text-muted text-xs" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                              {q.explanation && <span><strong>Rationale:</strong> {q.explanation}</span>}
                              {q.sourceSegment && (
                                <span
                                  className="badge text-xs"
                                  style={{
                                    background: 'rgba(99, 102, 241, 0.12)',
                                    color: 'var(--primary)',
                                    border: '1px solid rgba(99, 102, 241, 0.25)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Clock size={11} /> Video Segment: {q.sourceSegment}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Navigation Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (selectedMode === 'bulk') setStep('bulk_import');
                    else if (selectedMode === 'ai') setStep('ai_config');
                    else setStep('manual_builder');
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleFinalizeAssessment(false)}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setStep('summary_publish')}
                  >
                    Proceed to Summary & Publish <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 4: ASSESSMENT SUMMARY & FINAL PUBLISHING                  */}
          {/* ============================================================== */}
          {step === 'summary_publish' && (
            <div>
              <div className="card" style={{ padding: '24px', background: 'var(--bg-card)', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
                    {title || 'Untitled Assessment'}
                  </h3>
                  <span className="badge badge-primary">
                    Course: {mockCourses.find((c) => c.id === courseId)?.title || courseId}
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div className="text-muted text-xs">Total Questions</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {questions.length} / {MAX_ASSESSMENT_QUESTIONS}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div className="text-muted text-xs">Question Marks Sum</div>
                    <div
                      style={{
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        color: marksMismatch ? 'var(--warning)' : 'var(--success)'
                      }}
                    >
                      {sumOfQuestionMarks}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div className="text-muted text-xs">Configured Total</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {totalMarks}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div className="text-muted text-xs">Pass Marks</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {passingMarks} ({Math.round((passingMarks / totalMarks) * 100)}%)
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div className="text-muted text-xs">Duration</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {durationMinutes}m
                    </div>
                  </div>
                </div>

                {/* Breakdowns */}
                <div className="grid-2" style={{ gap: '16px', marginBottom: '20px' }}>
                  <div style={{ padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '10px' }}>
                      Questions by Difficulty Level
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--success)' }}>&bull; Easy</span>
                        <span style={{ fontWeight: 600 }}>
                          {questions.filter((q) => q.difficulty === 'easy').length} questions
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--warning)' }}>&bull; Medium</span>
                        <span style={{ fontWeight: 600 }}>
                          {questions.filter((q) => q.difficulty === 'medium').length} questions
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--danger)' }}>&bull; Hard</span>
                        <span style={{ fontWeight: 600 }}>
                          {questions.filter((q) => q.difficulty === 'hard').length} questions
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '10px' }}>
                      Question Type Distribution
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Multiple Choice (MCQ):</span>
                        <span style={{ fontWeight: 600 }}>
                          {questions.filter((q) => q.type === 'single_choice').length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Multiple Select:</span>
                        <span style={{ fontWeight: 600 }}>
                          {questions.filter((q) => q.type === 'multiple_choice').length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>True / False:</span>
                        <span style={{ fontWeight: 600 }}>
                          {questions.filter((q) => q.type === 'true_false').length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Short / Descriptive:</span>
                        <span style={{ fontWeight: 600 }}>
                          {questions.filter((q) => q.type === 'short_answer' || q.type === 'essay').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {marksMismatch && (
                  <div
                    style={{
                      background: 'var(--warning-bg)',
                      border: '1px solid var(--warning-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertTriangle size={18} color="var(--warning)" />
                      <span style={{ fontSize: '0.85rem' }}>
                        Warning: Question marks sum to <strong>{sumOfQuestionMarks}</strong>, while assessment total mark is set to <strong>{totalMarks}</strong>.
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary text-xs"
                      onClick={handleSyncMarks}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      Sync Total to {sumOfQuestionMarks} Marks
                    </button>
                  </div>
                )}

                <div style={{ textAlign: 'center', margin: '14px 0' }}>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    <Eye size={14} /> Preview Full Assessment as Learner
                  </button>
                </div>
              </div>

              {/* AVAILABILITY, COMPLETION & REWARDS SECTION */}
              <div
                className="card"
                style={{
                  padding: '24px',
                  background: 'var(--bg-card)',
                  marginBottom: '20px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: certificateEnabled ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: certificateEnabled ? 'var(--primary)' : 'var(--text-muted)'
                    }}>
                      <Award size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                        Availability, Completion & Rewards
                      </h3>
                      <p className="text-secondary text-xs" style={{ margin: 0 }}>
                        Configure assessment availability window, passing & completion criteria, reward points, and authorized certificate signatory.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={certificateEnabled}
                        onChange={(e) => setCertificateEnabled(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                      />
                      Issue Assessment Certificate: {certificateEnabled ? 'Yes' : 'No'}
                    </label>
                  </div>
                </div>

                {/* 1. Availability Window */}
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="var(--primary)" /> Assessment Availability Window
                    <span className="text-muted text-xs font-normal">
                      (Institution Timezone: {user?.timezone || 'America/New_York'})
                    </span>
                  </div>
                  <div className="grid-2" style={{ gap: '14px' }}>
                    <div>
                      <label className="form-label text-xs">Start Date & Time (Scheduled Opening)</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={availabilityStart}
                        onChange={(e) => setAvailabilityStart(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                      <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                        Before this time, students cannot begin and see a scheduled opening notice. Creators & admins retain preview access.
                      </span>
                    </div>

                    <div>
                      <label className="form-label text-xs">End Date & Time (Strict Deadline)</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={availabilityEnd}
                        onChange={(e) => setAvailabilityEnd(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                      <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                        After this time, the assessment becomes strictly read-only. Submissions and new attempts are locked.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Completion Percentage, Passing Score & Reward Points */}
                <div className="grid-3" style={{ gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label className="form-label text-xs">Required Completion Rate (%)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="form-control"
                        value={completionPercentageRequired}
                        onChange={(e) => setCompletionPercentageRequired(Math.min(100, Math.max(1, parseInt(e.target.value) || 100)))}
                        style={{ fontSize: '0.9rem', fontWeight: 600 }}
                      />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>%</span>
                    </div>
                    <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                      Distinct from pass marks. Learner must answer at least this % of questions to qualify.
                    </span>
                  </div>

                  <div>
                    <label className="form-label text-xs">Minimum Passing Score</label>
                    <div style={{
                      padding: '10px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: 'var(--success)'
                    }}>
                      {passingMarks} / {totalMarks} Marks ({Math.round((passingMarks / totalMarks) * 100)}%)
                    </div>
                    <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                      Configured in assessment parameters. Satisfies passing criteria.
                    </span>
                  </div>

                  <div>
                    <label className="form-label text-xs">Reward Points on Pass</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        min="0"
                        className="form-control"
                        value={completionPoints}
                        onChange={(e) => setCompletionPoints(Math.max(0, parseInt(e.target.value) || 0))}
                        style={{ fontSize: '0.9rem', fontWeight: 600 }}
                      />
                      <span className="text-muted text-xs font-semibold">pts</span>
                    </div>
                    <span className="text-muted text-xs" style={{ display: 'block', marginTop: '4px' }}>
                      Awarded strictly once upon meeting passing & completion requirements.
                    </span>
                  </div>
                </div>

                {/* 3. Certificate Signatory & Template (Shown when Certificate is Enabled) */}
                {certificateEnabled && (
                  <div style={{
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    background: 'rgba(37, 99, 235, 0.03)'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <PenTool size={15} color="var(--primary)" /> Certificate Template & Authorized Signatory
                    </div>

                    <div className="grid-2" style={{ gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="form-label text-xs">Certificate Template</label>
                        <select
                          className="form-control"
                          value={certTemplateId}
                          onChange={(e) => setCertTemplateId(e.target.value as any)}
                          style={{ fontSize: '0.85rem' }}
                        >
                          <option value="distinction">Distinction Honors (VeniLearn Blue & Gold)</option>
                          <option value="technical">Technical Achievement (Modern Slate & Teal)</option>
                          <option value="executive">Executive Minimal (Classic Navy)</option>
                          <option value="standard">Standard Academic (Institutional)</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label text-xs">Authorized Signatory Authority</label>
                        <select
                          className="form-control"
                          value={selectedSignatoryOption}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedSignatoryOption(val);
                            if (val === 'creator') {
                              setCertSignerName(creatorDefaultSig.name);
                              setCertSignerTitle(creatorDefaultSig.designation);
                              setCertSignerImage(creatorDefaultSig.signatureImage || '');
                            } else if (val === 'custom') {
                              // keep custom
                            } else {
                              const found = approvedSignatories.find((s) => s.id === val);
                              if (found) {
                                setCertSignerName(found.name);
                                setCertSignerTitle(found.designation);
                                setCertSignerImage(found.signatureImage || '');
                              }
                            }
                          }}
                          style={{ fontSize: '0.85rem' }}
                        >
                          <option value="creator">
                            My Profile Signature ({creatorDefaultSig.name || user?.displayName || 'Creator'})
                          </option>
                          {approvedSignatories.map((sig) => (
                            <option key={sig.id} value={sig.id}>
                              {sig.name} &mdash; {sig.designation}
                            </option>
                          ))}
                          <option value="custom">Custom Signatory Details...</option>
                        </select>
                      </div>
                    </div>

                    {/* Signatory Name & Designation Inputs */}
                    <div className="grid-2" style={{ gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label className="form-label text-xs">Signatory Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={certSignerName}
                          onChange={(e) => setCertSignerName(e.target.value)}
                          placeholder="e.g. Dr. James Wilson"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label className="form-label text-xs">Signatory Designation / Title</label>
                        <input
                          type="text"
                          className="form-control"
                          value={certSignerTitle}
                          onChange={(e) => setCertSignerTitle(e.target.value)}
                          placeholder="e.g. Principal Faculty & Evaluator"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* Signature Status & Warning */}
                    {!userHasSignature && selectedSignatoryOption === 'creator' && !certSignerImage && (
                      <div style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        marginBottom: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={16} color="var(--warning)" />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                            No digital signature image is saved in your profile. You can configure your authorized signature in your Profile tab.
                          </span>
                        </div>
                        <a
                          href="/profile"
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary text-xs"
                          style={{ whiteSpace: 'nowrap', padding: '4px 10px' }}
                        >
                          Configure Signature
                        </a>
                      </div>
                    )}

                    {/* Live Certificate Signatory Snapshot Preview */}
                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}>
                      <div>
                        <div className="text-muted text-xs font-semibold" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Certificate Signatory Snapshot Preview
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '2px' }}>
                          {certSignerName || 'Signatory Name'}
                        </div>
                        <div className="text-secondary text-xs">
                          {certSignerTitle || 'Authorized Signatory Title'}
                        </div>
                      </div>

                      <div style={{
                        width: '150px',
                        height: '50px',
                        borderBottom: '1.5px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        paddingBottom: '4px'
                      }}>
                        {certSignerImage ? (
                          <img
                            src={certSignerImage}
                            alt="Signatory Signature"
                            style={{ maxHeight: '42px', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {certSignerName || 'Signature'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Publish Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep('review_edit')}
                >
                  <ArrowLeft size={16} /> Back to Question Review
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleFinalizeAssessment(false)}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleFinalizeAssessment(true)}
                  >
                    <CheckCircle2 size={16} /> Publish Assessment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Learner Preview Modal */}
        {isPreviewOpen && (
          <div
            className="modal-overlay"
            style={{ zIndex: 1300 }}
            onClick={() => setIsPreviewOpen(false)}
          >
            <div
              className="modal-card"
              style={{ maxWidth: '720px', maxHeight: '85vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Learner Assessment Simulation Preview</h3>
                  <div className="text-muted text-xs">{title} &bull; {durationMinutes} Minutes &bull; {sumOfQuestionMarks} Marks</div>
                </div>
                <button onClick={() => setIsPreviewOpen(false)} style={{ color: 'var(--text-muted)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      style={{
                        padding: '16px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Question {idx + 1}</span>
                        <span className="badge badge-draft text-xs">{q.points} Points</span>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: '0.92rem' }}>{q.prompt}</p>

                      {q.options && q.options.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {q.options.map((opt) => (
                            <label
                              key={opt.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                              }}
                            >
                              <input
                                type={q.type === 'single_choice' || q.type === 'true_false' ? 'radio' : 'checkbox'}
                                name={`preview-q-${q.id}`}
                                disabled
                              />
                              <span>{opt.text}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {q.type === 'short_answer' && (
                        <input
                          type="text"
                          disabled
                          placeholder="Type answer here..."
                          className="form-input text-xs"
                          style={{ opacity: 0.8 }}
                        />
                      )}

                      {q.type === 'essay' && (
                        <textarea
                          rows={3}
                          disabled
                          placeholder="Type descriptive analysis response here..."
                          className="form-input text-xs"
                          style={{ opacity: 0.8 }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsPreviewOpen(false)}
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Full Video Transcript & Timestamps Review */}
        {isVideoTranscriptModalOpen && (
          <div
            className="modal-overlay"
            style={{ zIndex: 1500 }}
            onClick={() => setIsVideoTranscriptModalOpen(false)}
          >
            <div
              className="modal-card"
              style={{ maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={20} color="var(--primary)" />
                  <div>
                    <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700 }}>
                      Video Lecture Transcript & Timestamps
                    </h3>
                    <div className="text-muted text-xs">
                      {videoFile?.name || 'Uploaded Video'} &bull; Transcribed via faster-whisper &bull; {videoSegments.length} segments
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsVideoTranscriptModalOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search
                      size={15}
                      style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="text"
                      className="form-input text-xs"
                      style={{ paddingLeft: '32px' }}
                      placeholder="Search lecture words or concepts in transcript..."
                      value={transcriptSearch}
                      onChange={(e) => setTranscriptSearch(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() => {
                      if (videoTranscript) {
                        navigator.clipboard.writeText(videoTranscript);
                        alert('Full transcript copied to clipboard!');
                      }
                    }}
                  >
                    Copy Transcript
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {videoSegments
                    .filter((seg) => !transcriptSearch.trim() || seg.text.toLowerCase().includes(transcriptSearch.toLowerCase()))
                    .map((seg) => (
                      <div
                        key={seg.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.85rem'
                        }}
                      >
                        <span
                          className="badge text-xs"
                          style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--primary)',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {seg.timestampBadge}
                        </span>
                        <div style={{ flex: 1, lineHeight: '1.5' }}>
                          {seg.text}
                        </div>
                      </div>
                    ))}
                  {videoSegments.length === 0 && (
                    <div className="text-muted text-xs" style={{ textAlign: 'center', padding: '30px' }}>
                      No segment data available.
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-muted text-xs">
                  Generated questions are strictly grounded in these transcript segments.
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsVideoTranscriptModalOpen(false)}
                >
                  Close Transcript
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
