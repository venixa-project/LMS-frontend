import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, Download, FileText, CheckCircle2, AlertTriangle, AlertCircle,
  X, ChevronRight, ChevronLeft, Plus, Trash2, Check, RefreshCw,
  HelpCircle, ArrowRight, Eye, Layers, ShieldAlert
} from 'lucide-react';
import { QuestionBank, Question, QuestionType } from '../../../types';
import {
  downloadExcelTemplate,
  downloadCsvTemplate,
  normalizeQuestionText,
  normalizeQuestionType,
  normalizeDifficulty
} from '../../../lib/bulkImportService';
import { extractDocumentContent } from '../../../lib/documentParser';
import {
  addQuestionsToRepository,
  createNewQuestionBank,
  AddQuestionsResult
} from '../../../lib/questionBankStorage';

export interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  banks: QuestionBank[];
  currentBankId: string;
  onImportComplete: (result: AddQuestionsResult, targetBankId: string) => void;
  existingQuestions: Question[];
}

export type UploadStep = 1 | 2 | 3 | 4;

export interface EditableQuestionItem {
  id: string;
  rowNumber: number;
  prompt: string;
  type: QuestionType;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  options: { id: string; text: string; isCorrect: boolean }[];
  correctAnswerText: string;
  explanation: string;
  topic: string;
  status: 'valid' | 'needs_review' | 'duplicate' | 'invalid';
  issues: string[];
  duplicateReason?: string;
}

export interface ColumnMappingState {
  questionText: string;
  questionType: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  marks: string;
  topic: string;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  banks,
  currentBankId,
  onImportComplete,
  existingQuestions
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<UploadStep>(1);

  // Step 1: File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'excel' | 'csv' | 'pdf' | 'txt' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [isScannedPdf, setIsScannedPdf] = useState(false);
  const [pdfExtractedText, setPdfExtractedText] = useState<string>('');

  // Step 2: Configuration state
  const [targetBankId, setTargetBankId] = useState<string>(currentBankId || banks[0]?.id || '');
  const [isCreatingBank, setIsCreatingBank] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankSubject, setNewBankSubject] = useState('');

  // Raw file parsed data (for Excel / CSV)
  const [rawFileHeaders, setRawFileHeaders] = useState<string[]>([]);
  const [rawFileRows, setRawFileRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingState>({
    questionText: '',
    questionType: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: '',
    explanation: '',
    difficulty: '',
    marks: '',
    topic: ''
  });

  // Step 3: Preview questions
  const [previewItems, setPreviewItems] = useState<EditableQuestionItem[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'attention' | 'duplicate'>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Step 4: Import confirmation & outcome
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importSummary, setImportSummary] = useState<AddQuestionsResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  // --- Reset All on Close ---
  const handleModalClose = () => {
    setSelectedFile(null);
    setFileType(null);
    setUploadProgress(0);
    setFileError(null);
    setIsScannedPdf(false);
    setPdfExtractedText('');
    setRawFileHeaders([]);
    setRawFileRows([]);
    setPreviewItems([]);
    setImportSummary(null);
    setCurrentStep(1);
    onClose();
  };

  // --- Step 1: File Selection & Handling ---
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setFileError(null);
    setIsScannedPdf(false);
    setSelectedFile(file);
    setUploadProgress(10);
    setProgressStage('Validating file integrity...');

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const maxSizeBytes = 25 * 1024 * 1024; // 25 MB

    if (file.size === 0) {
      setFileError('The selected file is empty (0 bytes). Please upload a valid question document.');
      setUploadProgress(0);
      return;
    }

    if (file.size > maxSizeBytes) {
      setFileError(`File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed upload limit of 25 MB.`);
      setUploadProgress(0);
      return;
    }

    const validExtensions = ['.xlsx', '.xls', '.csv', '.pdf', '.txt'];
    if (!validExtensions.includes(ext)) {
      setFileError(`Unsupported format "${ext}". Please upload an Excel (.xlsx, .xls), CSV (.csv), PDF (.pdf), or Plain Text (.txt) file.`);
      setUploadProgress(0);
      return;
    }

    try {
      if (ext === '.xlsx' || ext === '.xls') {
        setFileType('excel');
        setUploadProgress(40);
        setProgressStage('Reading Excel worksheet...');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('Excel workbook contains no sheets.');
        }
        const ws = wb.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) {
          throw new Error('Spreadsheet appears to have no data rows.');
        }

        const headers = Object.keys(rows[0] || {});
        setRawFileHeaders(headers);
        setRawFileRows(rows);
        autoDetectColumnMapping(headers);

        setUploadProgress(100);
        setProgressStage('Excel file processed successfully.');
      } else if (ext === '.csv') {
        setFileType('csv');
        setUploadProgress(40);
        setProgressStage('Parsing CSV lines...');
        const text = await file.text();
        const wb = XLSX.read(text, { type: 'string' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        if (rows.length === 0) {
          throw new Error('CSV file appears to have no data rows.');
        }

        const headers = Object.keys(rows[0] || {});
        setRawFileHeaders(headers);
        setRawFileRows(rows);
        autoDetectColumnMapping(headers);

        setUploadProgress(100);
        setProgressStage('CSV file processed successfully.');
      } else if (ext === '.pdf' || ext === '.txt') {
        setFileType(ext === '.pdf' ? 'pdf' : 'txt');
        setUploadProgress(30);
        setProgressStage('Extracting document text stream...');

        const result = await extractDocumentContent(file, (p, _stage, msg) => {
          setUploadProgress(p);
          setProgressStage(msg);
        });

        if (!result.success || !result.docInfo) {
          if (result.isScannedOrImageOnly) {
            setIsScannedPdf(true);
            setFileError('OCR Limitation: This PDF appears to be a scanned image or lacks selectable text. OCR service is currently not configured on this client. Please upload a digital PDF with selectable text or an Excel/CSV file.');
          } else {
            setFileError(result.error || 'Failed to extract text from document.');
          }
          setUploadProgress(0);
          return;
        }

        setPdfExtractedText(result.docInfo.text || '');
        setUploadProgress(100);
        setProgressStage('Document text extracted successfully.');
      }
    } catch (err: any) {
      setFileError(err?.message || 'Error processing file.');
      setUploadProgress(0);
    }
  };

  // --- Auto-detect column mappings for Excel / CSV ---
  const autoDetectColumnMapping = (headers: string[]) => {
    const findHeader = (patterns: RegExp[]): string => {
      for (const pattern of patterns) {
        const found = headers.find((h) => pattern.test(h.trim().toLowerCase()));
        if (found) return found;
      }
      return '';
    };

    const mapping: ColumnMappingState = {
      questionText: findHeader([/^question_text$/i, /^question$/i, /^prompt$/i, /question/i]),
      questionType: findHeader([/^question_type$/i, /^type$/i, /^format$/i]),
      optionA: findHeader([/^option_a$/i, /^optiona$/i, /^opt_a$/i, /^choice_a$/i, /^a$/i]),
      optionB: findHeader([/^option_b$/i, /^optionb$/i, /^opt_b$/i, /^choice_b$/i, /^b$/i]),
      optionC: findHeader([/^option_c$/i, /^optionc$/i, /^opt_c$/i, /^choice_c$/i, /^c$/i]),
      optionD: findHeader([/^option_d$/i, /^optiond$/i, /^opt_d$/i, /^choice_d$/i, /^d$/i]),
      correctAnswer: findHeader([/^correct_answer$/i, /^correct$/i, /^answer$/i, /^key$/i, /^ans$/i]),
      explanation: findHeader([/^explanation$/i, /^rationale$/i, /^feedback$/i, /^solution$/i]),
      difficulty: findHeader([/^difficulty$/i, /^level$/i]),
      marks: findHeader([/^marks$/i, /^points$/i, /^score$/i]),
      topic: findHeader([/^topic$/i, /^subject$/i, /^category$/i, /^tag$/i])
    };

    setColumnMapping(mapping);
  };

  // --- Step 2 to Step 3: Transition & Parsing into Preview ---
  const handleProceedToPreview = () => {
    // If trainer created a new bank
    let activeBankId = targetBankId;
    if (isCreatingBank) {
      if (!newBankName.trim()) {
        alert('Please specify a name for the new Question Repository.');
        return;
      }
      const created = createNewQuestionBank(newBankName, newBankSubject || 'General');
      activeBankId = created.id;
      setTargetBankId(created.id);
      setIsCreatingBank(false);
    }

    if (!activeBankId) {
      alert('Please select or create a destination Question Repository.');
      return;
    }

    // Existing questions in selected bank for duplicate checks
    const targetBankExistingQuestions = existingQuestions.filter((q) => q.bankId === activeBankId);
    const existingNormSet = new Set(
      targetBankExistingQuestions.map((q) => normalizeQuestionText(q.prompt))
    );

    let parsed: EditableQuestionItem[] = [];

    if (fileType === 'excel' || fileType === 'csv') {
      parsed = buildItemsFromRows(rawFileRows, columnMapping, existingNormSet);
    } else if (fileType === 'pdf' || fileType === 'txt') {
      parsed = buildItemsFromText(pdfExtractedText, existingNormSet);
    }

    if (parsed.length === 0) {
      alert('No questions could be parsed from the uploaded file. Please check column mappings or question structure.');
      return;
    }

    setPreviewItems(parsed);
    setCurrentStep(3);
  };

  // Transform Excel/CSV rows into Question Items
  const buildItemsFromRows = (
    rows: Record<string, any>[],
    mapping: ColumnMappingState,
    existingNormSet: Set<string>
  ): EditableQuestionItem[] => {
    const seenInFileSet = new Set<string>();
    const items: EditableQuestionItem[] = [];

    rows.forEach((row, idx) => {
      const qText = String(row[mapping.questionText] || row.question_text || row.question || row.prompt || '').trim();
      const norm = normalizeQuestionText(qText);
      const rowNum = idx + 2;

      const rawType = String(row[mapping.questionType] || row.type || 'single_choice');
      const qType = normalizeQuestionType(rawType);
      const difficulty = normalizeDifficulty(String(row[mapping.difficulty] || 'medium'));
      const points = parseInt(String(row[mapping.marks] || '5')) || 5;
      const explanation = String(row[mapping.explanation] || '').trim();
      const topic = String(row[mapping.topic] || '').trim();

      const rawCorrect = String(row[mapping.correctAnswer] || row.correct || row.answer || '').trim();

      const optA = String(row[mapping.optionA] || row.option_a || '').trim();
      const optB = String(row[mapping.optionB] || row.option_b || '').trim();
      const optC = String(row[mapping.optionC] || row.option_c || '').trim();
      const optD = String(row[mapping.optionD] || row.option_d || '').trim();

      const rawOpts = [
        { key: 'A', text: optA },
        { key: 'B', text: optB },
        { key: 'C', text: optC },
        { key: 'D', text: optD }
      ].filter((o) => o.text.length > 0);

      const issues: string[] = [];
      let status: 'valid' | 'needs_review' | 'duplicate' | 'invalid' = 'valid';
      let duplicateReason: string | undefined;

      // Prompt validation
      if (!qText || qText.length < 5) {
        issues.push('Question prompt is missing or too short (min 5 characters).');
        status = 'invalid';
      }

      // Duplicate detection
      if (norm) {
        if (seenInFileSet.has(norm)) {
          issues.push('Duplicate prompt: already appeared earlier in this file.');
          status = 'duplicate';
          duplicateReason = 'Duplicate in uploaded file';
        } else if (existingNormSet.has(norm)) {
          issues.push('Duplicate prompt: already exists in this Question Repository.');
          status = 'duplicate';
          duplicateReason = 'Already in repository';
        } else {
          seenInFileSet.add(norm);
        }
      }

      // Options & Correct Answer validation
      let options: { id: string; text: string; isCorrect: boolean }[] = [];
      if (qType === 'single_choice' || qType === 'multiple_choice') {
        if (rawOpts.length < 2) {
          issues.push(`Multiple choice requires at least 2 options (found ${rawOpts.length}).`);
          if (status !== 'duplicate') status = 'invalid';
        }

        const correctKeys = rawCorrect.toUpperCase().split(/[,;\s]+/).filter(Boolean);
        if (correctKeys.length === 0) {
          issues.push('Missing answer key designation.');
          if (status === 'valid') status = 'needs_review';
        }

        options = rawOpts.map((opt, i) => {
          const isMarked =
            correctKeys.includes(opt.key) ||
            rawCorrect.toLowerCase() === opt.text.toLowerCase() ||
            (rawCorrect === `${i}` || rawCorrect === `${i + 1}`);
          return {
            id: `opt-${rowNum}-${i + 1}`,
            text: opt.text,
            isCorrect: isMarked
          };
        });

        if (!options.some((o) => o.isCorrect) && status === 'valid') {
          issues.push('No option matched the specified correct answer.');
          status = 'needs_review';
        }
      } else if (qType === 'true_false') {
        const isTrue = /^(true|t|a|1)$/i.test(rawCorrect);
        const isFalse = /^(false|f|b|0)$/i.test(rawCorrect);

        if (!isTrue && !isFalse) {
          issues.push('True/False requires a valid key (True or False).');
          if (status === 'valid') status = 'needs_review';
        }

        options = [
          { id: `opt-${rowNum}-t`, text: 'True', isCorrect: isTrue },
          { id: `opt-${rowNum}-f`, text: 'False', isCorrect: isFalse }
        ];
      } else if (qType === 'short_answer') {
        if (!rawCorrect) {
          issues.push('Missing expected answer key for short response.');
          if (status === 'valid') status = 'needs_review';
        }
      }

      items.push({
        id: `import-temp-${rowNum}-${Date.now()}`,
        rowNumber: rowNum,
        prompt: qText,
        type: qType,
        difficulty,
        points,
        options,
        correctAnswerText: rawCorrect,
        explanation,
        topic: topic || 'General',
        status,
        issues,
        duplicateReason
      });
    });

    return items;
  };

  // Transform PDF / TXT text stream into Question Items
  const buildItemsFromText = (
    text: string,
    existingNormSet: Set<string>
  ): EditableQuestionItem[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rawItems: {
      prompt: string;
      options: { key: string; text: string }[];
      answer: string;
      explanation: string;
    }[] = [];

    let current: {
      prompt: string;
      options: { key: string; text: string }[];
      answer: string;
      explanation: string;
    } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Question header: e.g. "1. What is...", "Q1: What is...", "1) What is..."
      const qMatch = line.match(/^(?:(?:Question|Q)\s*)?(\d+)[\.\):\-]\s*(.+)$/i);
      if (qMatch) {
        if (current && current.prompt) {
          rawItems.push(current);
        }
        current = {
          prompt: qMatch[2].trim(),
          options: [],
          answer: '',
          explanation: ''
        };
        continue;
      }

      if (!current) continue;

      // Option: e.g. "A) text", "A. text", "(A) text", "a. text"
      const optMatch = line.match(/^[\(\[]?([A-Da-d])[\)\]\.\s]\s*(.+)$/);
      if (optMatch) {
        current.options.push({
          key: optMatch[1].toUpperCase(),
          text: optMatch[2].trim()
        });
        continue;
      }

      // Answer: e.g. "Answer: A", "Ans - B", "Correct: True"
      const ansMatch = line.match(/^(?:Answer|Ans|Correct(?:\s*Answer)?|Key)[\s:=-]+(.+)$/i);
      if (ansMatch) {
        current.answer = ansMatch[1].trim();
        continue;
      }

      // Explanation: e.g. "Explanation: ...", "Rationale: ..."
      const expMatch = line.match(/^(?:Explanation|Rationale)[\s:=-]+(.+)$/i);
      if (expMatch) {
        current.explanation = expMatch[1].trim();
        continue;
      }

      // If still reading prompt before any options or answers
      if (current.options.length === 0 && !current.answer) {
        current.prompt = `${current.prompt} ${line}`.trim();
      }
    }

    if (current && current.prompt) {
      rawItems.push(current);
    }

    // Convert rawItems to EditableQuestionItem
    const seenInDoc = new Set<string>();
    return rawItems.map((raw, idx) => {
      const rowNum = idx + 1;
      const norm = normalizeQuestionText(raw.prompt);
      const issues: string[] = [];
      let status: 'valid' | 'needs_review' | 'duplicate' | 'invalid' = 'valid';
      let duplicateReason: string | undefined;

      if (!raw.prompt || raw.prompt.length < 5) {
        issues.push('Prompt is missing or too short.');
        status = 'invalid';
      }

      if (norm) {
        if (seenInDoc.has(norm)) {
          issues.push('Duplicate prompt in document.');
          status = 'duplicate';
          duplicateReason = 'Duplicate in document';
        } else if (existingNormSet.has(norm)) {
          issues.push('Already in repository.');
          status = 'duplicate';
          duplicateReason = 'Already in repository';
        } else {
          seenInDoc.add(norm);
        }
      }

      let qType: QuestionType = 'single_choice';
      const aLower = (raw.options.find((o) => o.key === 'A')?.text || '').toLowerCase();
      const bLower = (raw.options.find((o) => o.key === 'B')?.text || '').toLowerCase();

      if ((aLower === 'true' && bLower === 'false') || (aLower === 'false' && bLower === 'true')) {
        qType = 'true_false';
      } else if (raw.options.length === 0) {
        qType = 'short_answer';
      }

      const correctKey = raw.answer.trim().toUpperCase();
      let options: { id: string; text: string; isCorrect: boolean }[] = [];

      if (qType === 'single_choice') {
        if (raw.options.length < 2) {
          issues.push(`MCQ requires at least 2 options (found ${raw.options.length}).`);
          if (status !== 'duplicate') status = 'invalid';
        }

        if (!correctKey) {
          issues.push('Missing answer key.');
          if (status === 'valid') status = 'needs_review';
        }

        options = raw.options.map((opt, i) => ({
          id: `opt-${rowNum}-${i + 1}`,
          text: opt.text,
          isCorrect: correctKey === opt.key || raw.answer.toLowerCase() === opt.text.toLowerCase()
        }));

        if (!options.some((o) => o.isCorrect) && status === 'valid') {
          issues.push('No option matched answer key.');
          status = 'needs_review';
        }
      } else if (qType === 'true_false') {
        const isTrue = /^(true|t|a|1)$/i.test(raw.answer);
        const isFalse = /^(false|f|b|0)$/i.test(raw.answer);
        if (!isTrue && !isFalse) {
          issues.push('Missing True/False answer key.');
          if (status === 'valid') status = 'needs_review';
        }
        options = [
          { id: `opt-${rowNum}-t`, text: 'True', isCorrect: isTrue },
          { id: `opt-${rowNum}-f`, text: 'False', isCorrect: isFalse }
        ];
      }

      return {
        id: `import-temp-${rowNum}-${Date.now()}`,
        rowNumber: rowNum,
        prompt: raw.prompt,
        type: qType,
        difficulty: 'medium',
        points: 5,
        options,
        correctAnswerText: raw.answer,
        explanation: raw.explanation,
        topic: 'Document Section',
        status,
        issues,
        duplicateReason
      };
    });
  };

  // --- Step 3 Actions: Inline Edit, Remove, Skip ---
  const handleItemFieldChange = (id: string, field: keyof EditableQuestionItem, value: any) => {
    setPreviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        return revalidateItem(updated);
      })
    );
  };

  const handleOptionToggleCorrect = (itemId: string, optIndex: number) => {
    setPreviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newOpts = item.options.map((opt, idx) => ({
          ...opt,
          isCorrect: item.type === 'single_choice' || item.type === 'true_false' ? idx === optIndex : idx === optIndex ? !opt.isCorrect : opt.isCorrect
        }));
        const updated = { ...item, options: newOpts };
        return revalidateItem(updated);
      })
    );
  };

  const handleOptionTextChange = (itemId: string, optIndex: number, text: string) => {
    setPreviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newOpts = [...item.options];
        newOpts[optIndex] = { ...newOpts[optIndex], text };
        const updated = { ...item, options: newOpts };
        return revalidateItem(updated);
      })
    );
  };

  const handleRemoveItem = (id: string) => {
    setPreviewItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleRemoveAllInvalid = () => {
    setPreviewItems((prev) => prev.filter((item) => item.status === 'valid'));
  };

  // Revalidate item after inline edits
  const revalidateItem = (item: EditableQuestionItem): EditableQuestionItem => {
    const issues: string[] = [];
    let status: 'valid' | 'needs_review' | 'duplicate' | 'invalid' = 'valid';

    if (!item.prompt.trim() || item.prompt.trim().length < 5) {
      issues.push('Prompt is too short (min 5 chars).');
      status = 'invalid';
    }

    if (item.type === 'single_choice' || item.type === 'multiple_choice') {
      const validOpts = item.options.filter((o) => o.text.trim().length > 0);
      if (validOpts.length < 2) {
        issues.push('At least 2 options are required.');
        status = 'invalid';
      }
      const hasCorrect = validOpts.some((o) => o.isCorrect);
      if (!hasCorrect) {
        issues.push('Please mark at least one option as the correct answer.');
        if (status === 'valid') status = 'needs_review';
      }
    } else if (item.type === 'true_false') {
      const hasCorrect = item.options.some((o) => o.isCorrect);
      if (!hasCorrect) {
        issues.push('Please select True or False as the answer.');
        if (status === 'valid') status = 'needs_review';
      }
    } else if (item.type === 'short_answer') {
      if (!item.correctAnswerText.trim()) {
        issues.push('Missing answer key.');
        if (status === 'valid') status = 'needs_review';
      }
    }

    return {
      ...item,
      status,
      issues
    };
  };

  // --- Step 4: Final Import Execution ---
  const handleExecuteImport = () => {
    const validQuestions = previewItems.filter((i) => i.status === 'valid');
    if (validQuestions.length === 0) {
      alert('There are no valid questions to import. Please review and correct flagged items.');
      return;
    }

    setIsImporting(true);

    setTimeout(() => {
      // Map to Question schema
      const questionsToSave: Question[] = validQuestions.map((v) => ({
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        bankId: targetBankId,
        type: v.type,
        prompt: v.prompt,
        points: v.points,
        difficulty: v.difficulty,
        options: v.options.length > 0 ? v.options : undefined,
        correctAnswer: v.type === 'true_false' || v.type === 'short_answer' ? v.options.find((o) => o.isCorrect)?.text || v.correctAnswerText : undefined,
        explanation: v.explanation || undefined,
        tags: [v.topic.toLowerCase().replace(/\s+/g, '-'), 'bulk-import'],
        version: 1,
        status: 'published'
      }));

      const result = addQuestionsToRepository(targetBankId, questionsToSave, skipDuplicates);
      setImportSummary(result);
      setIsImporting(false);
      onImportComplete(result, targetBankId);
    }, 400);
  };

  // Stats for preview
  const totalCount = previewItems.length;
  const validCount = previewItems.filter((i) => i.status === 'valid').length;
  const needsAttentionCount = previewItems.filter((i) => i.status === 'needs_review' || i.status === 'invalid').length;
  const duplicateCount = previewItems.filter((i) => i.status === 'duplicate').length;

  const filteredItems = previewItems.filter((item) => {
    if (filterTab === 'valid') return item.status === 'valid';
    if (filterTab === 'attention') return item.status === 'needs_review' || item.status === 'invalid';
    if (filterTab === 'duplicate') return item.status === 'duplicate';
    return true;
  });

  const selectedBankObj = banks.find((b) => b.id === targetBankId) || banks[0];

  return (
    <div className="modal-overlay" onClick={handleModalClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: '920px',
          width: '95%',
          maxHeight: '92vh',
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
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-input)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--primary) 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
              }}
            >
              <Upload size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Bulk Question Import</h2>
              <p className="text-muted text-xs" style={{ margin: 0 }}>
                Upload question pools from Excel, CSV, PDF, or TXT documents directly into Question Repositories
              </p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Multi-step progress indicator */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            background: 'var(--bg-card)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '12px 24px',
            gap: '8px'
          }}
        >
          {[
            { step: 1, label: 'Upload File' },
            { step: 2, label: 'Configure Import' },
            { step: 3, label: 'Preview & Validate' },
            { step: 4, label: 'Import Summary' }
          ].map((s) => {
            const isActive = currentStep === s.step;
            const isCompleted = currentStep > s.step;
            return (
              <div
                key={s.step}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--primary-light)' : 'transparent',
                  color: isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--text-muted)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.85rem'
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: isActive ? 'var(--primary)' : isCompleted ? 'var(--success)' : 'var(--border-subtle)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  {isCompleted ? <Check size={13} /> : s.step}
                </div>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* ================= STEP 1: UPLOAD FILE ================= */}
          {currentStep === 1 && (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: selectedFile ? '2px solid var(--primary)' : '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: selectedFile ? 'var(--primary-light)' : 'var(--bg-input)',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  marginBottom: '20px'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".xlsx,.xls,.csv,.pdf,.txt"
                  style={{ display: 'none' }}
                />

                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}
                >
                  <Upload size={28} />
                </div>

                <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', fontWeight: 600 }}>
                  {selectedFile ? selectedFile.name : 'Drag & drop question bank file, or browse'}
                </h3>
                <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
                  Supported formats: <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV (.csv)</strong>, <strong>PDF (.pdf)</strong>, <strong>Plain Text (.txt)</strong> &bull; Max size: 25 MB
                </p>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Files
                </button>
              </div>

              {/* Upload Progress & Details */}
              {selectedFile && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FileText size={20} color="var(--primary)" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedFile.name}</div>
                        <div className="text-muted text-xs">
                          {(selectedFile.size / 1024).toFixed(1)} KB &bull; Type: {fileType ? fileType.toUpperCase() : 'Detecting...'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileType(null);
                        setFileError(null);
                        setIsScannedPdf(false);
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div>
                      <div
                        style={{
                          height: '6px',
                          borderRadius: '3px',
                          background: 'var(--border-subtle)',
                          overflow: 'hidden',
                          marginBottom: '6px'
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${uploadProgress}%`,
                            background: 'var(--primary)',
                            transition: 'width 0.3s ease'
                          }}
                        />
                      </div>
                      <div className="text-muted text-xs">{progressStage}</div>
                    </div>
                  )}

                  {uploadProgress === 100 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>
                      <CheckCircle2 size={16} /> File validated and loaded successfully.
                    </div>
                  )}
                </div>
              )}

              {/* Error / Scanned Warning */}
              {fileError && (
                <div
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: isScannedPdf ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: isScannedPdf ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    color: isScannedPdf ? '#d97706' : '#ef4444',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '20px'
                  }}
                >
                  <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>{isScannedPdf ? 'OCR Limitation' : 'File Validation Error'}:</strong> {fileError}
                  </div>
                </div>
              )}

              {/* Sample Templates Download Box */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <h4 style={{ fontSize: '0.9rem', margin: '0 0 4px', fontWeight: 600 }}>Need a sample format?</h4>
                  <p className="text-muted text-xs" style={{ margin: 0 }}>
                    Download our structured templates with pre-configured headers for multiple choice, True/False, and short response.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={downloadExcelTemplate}>
                    <Download size={13} /> Excel (.xlsx)
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={downloadCsvTemplate}>
                    <Download size={13} /> CSV (.csv)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: CONFIGURE IMPORT ================= */}
          {currentStep === 2 && (
            <div>
              {/* Destination Repository Selector */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '24px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700 }}>
                    Destination Question Repository <span className="required">*</span>
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsCreatingBank(!isCreatingBank)}
                  >
                    {isCreatingBank ? 'Select Existing Bank' : '+ Create New Repository'}
                  </button>
                </div>

                {isCreatingBank ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label text-xs">Repository Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Advanced TypeScript Patterns"
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label text-xs">Subject / Discipline</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Software Engineering"
                        value={newBankSubject}
                        onChange={(e) => setNewBankSubject(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <select
                      className="form-select"
                      value={targetBankId}
                      onChange={(e) => setTargetBankId(e.target.value)}
                    >
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.subject}) &bull; {b.questionCount || 0} existing questions
                        </option>
                      ))}
                    </select>
                    <p className="text-muted text-xs" style={{ marginTop: '6px', marginBottom: 0 }}>
                      Target: <strong>{selectedBankObj?.name}</strong> &bull; Subject: {selectedBankObj?.subject}
                    </p>
                  </div>
                )}
              </div>

              {/* Column Mapping for Excel / CSV */}
              {(fileType === 'excel' || fileType === 'csv') && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', margin: '0 0 2px', fontWeight: 600 }}>Spreadsheet Column Mapping</h3>
                      <p className="text-muted text-xs" style={{ margin: 0 }}>
                        Verify or map columns from <strong>{selectedFile?.name}</strong> to Question Bank fields.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => autoDetectColumnMapping(rawFileHeaders)}
                    >
                      <RefreshCw size={13} /> Auto-Detect
                    </button>
                  </div>

                  <div
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden'
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px' }}>Question Bank Field</th>
                          <th style={{ padding: '10px 14px' }}>Mapped Column in File</th>
                          <th style={{ padding: '10px 14px' }}>Sample Data (Row 1)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { key: 'questionText' as const, label: 'Question Prompt', required: true },
                          { key: 'questionType' as const, label: 'Question Type', required: false },
                          { key: 'optionA' as const, label: 'Option A', required: false },
                          { key: 'optionB' as const, label: 'Option B', required: false },
                          { key: 'optionC' as const, label: 'Option C', required: false },
                          { key: 'optionD' as const, label: 'Option D', required: false },
                          { key: 'correctAnswer' as const, label: 'Correct Answer Key', required: true },
                          { key: 'explanation' as const, label: 'Explanation / Rationale', required: false },
                          { key: 'difficulty' as const, label: 'Difficulty (Easy/Medium/Hard)', required: false },
                          { key: 'marks' as const, label: 'Marks / Points', required: false },
                          { key: 'topic' as const, label: 'Topic / Tag', required: false }
                        ].map((field, idx) => {
                          const mappedCol = columnMapping[field.key];
                          const sampleVal = mappedCol && rawFileRows[0] ? String(rawFileRows[0][mappedCol] || '') : '';

                          return (
                            <tr
                              key={field.key}
                              style={{
                                borderBottom: idx < 10 ? '1px solid var(--border-subtle)' : 'none',
                                background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-input)'
                              }}
                            >
                              <td style={{ padding: '8px 14px', fontWeight: 600 }}>
                                {field.label} {field.required && <span className="required">*</span>}
                              </td>
                              <td style={{ padding: '8px 14px' }}>
                                <select
                                  className="form-select"
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto' }}
                                  value={mappedCol}
                                  onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                                >
                                  <option value="">-- Not Mapped (Use Default) --</option>
                                  {rawFileHeaders.map((h) => (
                                    <option key={h} value={h}>
                                      {h}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: '8px 14px', color: 'var(--text-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {sampleVal || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Empty</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Extraction summary for PDF / TXT */}
              {(fileType === 'pdf' || fileType === 'txt') && (
                <div>
                  <div
                    style={{
                      padding: '18px 20px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <CheckCircle2 size={20} color="var(--success)" />
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Document Parsing Summary</h4>
                    </div>
                    <p style={{ fontSize: '0.85rem', margin: '0 0 10px', color: 'var(--text-secondary)' }}>
                      VeniLearn successfully extracted text content from <strong>{selectedFile?.name}</strong>.
                      The parser identified numbered questions, multiple choice options (A-D), and answer keys.
                    </p>
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        maxHeight: '140px',
                        overflowY: 'auto',
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {pdfExtractedText.substring(0, 500)}...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 3: PREVIEW & VALIDATE ================= */}
          {currentStep === 3 && (
            <div>
              {/* Stats Bar */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '12px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                  <div className="text-muted text-xs">Total Detected</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{totalCount}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}>Valid (Ready to Import)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>{validCount}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ color: '#d97706', fontSize: '0.75rem', fontWeight: 600 }}>Requires Attention</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#d97706' }}>{needsAttentionCount}</div>
                </div>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>Duplicates Detected</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444' }}>{duplicateCount}</div>
                </div>
              </div>

              {/* Action and Filter Toolbar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${filterTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilterTab('all')}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${filterTab === 'valid' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilterTab('valid')}
                  >
                    Valid Only ({validCount})
                  </button>
                  {needsAttentionCount > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${filterTab === 'attention' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFilterTab('attention')}
                      style={{ color: '#d97706' }}
                    >
                      Needs Review ({needsAttentionCount})
                    </button>
                  )}
                  {duplicateCount > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${filterTab === 'duplicate' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFilterTab('duplicate')}
                      style={{ color: '#ef4444' }}
                    >
                      Duplicates ({duplicateCount})
                    </button>
                  )}
                </div>

                {(needsAttentionCount > 0 || duplicateCount > 0) && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleRemoveAllInvalid}
                    title="Remove questions that have unresolved errors or duplicates"
                  >
                    <Trash2 size={13} /> Remove All Invalid / Duplicates
                  </button>
                )}
              </div>

              {/* Questions Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredItems.map((item, idx) => {
                  const isEditing = editingItemId === item.id;
                  const isInvalid = item.status === 'invalid';
                  const isNeedsReview = item.status === 'needs_review';
                  const isDup = item.status === 'duplicate';

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-input)',
                        border: isInvalid || isDup
                          ? '1px solid rgba(239, 68, 68, 0.4)'
                          : isNeedsReview
                          ? '1px solid rgba(245, 158, 11, 0.4)'
                          : '1px solid var(--border-subtle)',
                        transition: 'var(--transition)'
                      }}
                    >
                      {/* Item Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>
                            Row #{item.rowNumber}
                          </span>
                          <span className="badge badge-draft" style={{ textTransform: 'capitalize' }}>
                            {item.type.replace('_', ' ')}
                          </span>
                          <span className={`badge badge-${item.difficulty === 'hard' ? 'failed' : item.difficulty === 'medium' ? 'warning' : 'active'}`}>
                            {item.difficulty}
                          </span>
                          <span className="text-muted text-xs font-semibold">{item.points} Points</span>

                          {/* Status Badge */}
                          {item.status === 'valid' && (
                            <span className="badge badge-published" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={11} /> Valid
                            </span>
                          )}
                          {item.status === 'needs_review' && (
                            <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={11} /> Missing Answer
                            </span>
                          )}
                          {item.status === 'duplicate' && (
                            <span className="badge badge-failed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={11} /> Duplicate
                            </span>
                          )}
                          {item.status === 'invalid' && (
                            <span className="badge badge-failed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={11} /> Malformed
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingItemId(isEditing ? null : item.id)}
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          >
                            {isEditing ? 'Collapse' : 'Edit Question'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRemoveItem(item.id)}
                            style={{ padding: '4px 8px', color: 'var(--danger)' }}
                            title="Remove row"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Issues banner */}
                      {item.issues.length > 0 && (
                        <div
                          style={{
                            padding: '6px 10px',
                            borderRadius: 'var(--radius-sm)',
                            background: isDup || isInvalid ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: isDup || isInvalid ? '#ef4444' : '#d97706',
                            fontSize: '0.75rem',
                            marginBottom: '10px'
                          }}
                        >
                          <strong>Correction needed:</strong> {item.issues.join(' &bull; ')}
                        </div>
                      )}

                      {/* Prompt Display or Editor */}
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                          <div>
                            <label className="form-label text-xs">Question Prompt</label>
                            <textarea
                              className="form-textarea"
                              rows={2}
                              value={item.prompt}
                              onChange={(e) => handleItemFieldChange(item.id, 'prompt', e.target.value)}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            <div>
                              <label className="form-label text-xs">Type</label>
                              <select
                                className="form-select"
                                value={item.type}
                                onChange={(e) => handleItemFieldChange(item.id, 'type', e.target.value as any)}
                              >
                                <option value="single_choice">Single Choice</option>
                                <option value="multiple_choice">Multiple Select</option>
                                <option value="true_false">True / False</option>
                                <option value="short_answer">Short Answer</option>
                              </select>
                            </div>
                            <div>
                              <label className="form-label text-xs">Difficulty</label>
                              <select
                                className="form-select"
                                value={item.difficulty}
                                onChange={(e) => handleItemFieldChange(item.id, 'difficulty', e.target.value as any)}
                              >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                              </select>
                            </div>
                            <div>
                              <label className="form-label text-xs">Points</label>
                              <input
                                type="number"
                                className="form-input"
                                value={item.points}
                                onChange={(e) => handleItemFieldChange(item.id, 'points', parseInt(e.target.value) || 1)}
                              />
                            </div>
                          </div>

                          {/* Options Inline Edit */}
                          {item.options.length > 0 && (
                            <div>
                              <label className="form-label text-xs">Options & Correct Answer (Click radio/checkbox to set correct key)</label>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {item.options.map((opt, optIdx) => (
                                  <div key={opt.id || optIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                      type={item.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                      name={`correct-${item.id}`}
                                      checked={opt.isCorrect}
                                      onChange={() => handleOptionToggleCorrect(item.id, optIdx)}
                                      style={{ accentColor: 'var(--primary)' }}
                                    />
                                    <input
                                      type="text"
                                      className="form-input"
                                      style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem' }}
                                      value={opt.text}
                                      onChange={(e) => handleOptionTextChange(item.id, optIdx, e.target.value)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="form-label text-xs">Explanation</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Explanation shown after grading..."
                              value={item.explanation}
                              onChange={(e) => handleItemFieldChange(item.id, 'explanation', e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
                            {item.prompt}
                          </div>

                          {item.options.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', fontSize: '0.8rem' }}>
                              {item.options.map((opt, i) => (
                                <div
                                  key={i}
                                  onClick={() => handleOptionToggleCorrect(item.id, i)}
                                  style={{
                                    padding: '6px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: opt.isCorrect ? 'var(--success-bg)' : 'var(--bg-card)',
                                    border: opt.isCorrect ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)',
                                    color: opt.isCorrect ? 'var(--success)' : 'var(--text-secondary)',
                                    fontWeight: opt.isCorrect ? 600 : 400,
                                    cursor: 'pointer'
                                  }}
                                  title="Click to toggle as correct answer"
                                >
                                  {opt.isCorrect && '✓ '}{opt.text || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Empty option</span>}
                                </div>
                              ))}
                            </div>
                          )}

                          {item.explanation && (
                            <div className="text-muted text-xs" style={{ marginTop: '8px', fontStyle: 'italic' }}>
                              Explanation: {item.explanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STEP 4: IMPORT SUMMARY ================= */}
          {currentStep === 4 && (
            <div>
              {!importSummary ? (
                <div>
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      marginBottom: '20px'
                    }}
                  >
                    <h3 style={{ fontSize: '1.1rem', margin: '0 0 12px', fontWeight: 700 }}>
                      Ready to Import into {selectedBankObj?.name}
                    </h3>
                    <p className="text-muted text-xs" style={{ marginBottom: '16px' }}>
                      Review the confirmation details below before committing validated questions to the selected repository.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                        <div className="text-muted text-xs">Valid Questions</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success)' }}>{validCount}</div>
                      </div>
                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                        <div className="text-muted text-xs">Skipped / Invalid</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#d97706' }}>{needsAttentionCount}</div>
                      </div>
                      <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
                        <div className="text-muted text-xs">Duplicates</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>{duplicateCount}</div>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>Prevent accidental duplicate imports (ignore questions already present in repository)</span>
                    </label>
                  </div>

                  {validCount === 0 && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        fontSize: '0.85rem',
                        marginBottom: '16px'
                      }}
                    >
                      No valid questions are available to import. Please go back to Step 3 and correct or specify answers for flagged questions.
                    </div>
                  )}
                </div>
              ) : (
                /* Post-Import Complete Screen */
                <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: 'var(--success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px'
                    }}
                  >
                    <CheckCircle2 size={36} />
                  </div>

                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px' }}>
                    Bulk Import Completed Successfully!
                  </h3>
                  <p className="text-muted text-sm" style={{ marginBottom: '24px' }}>
                    Imported questions have been stored and added to <strong>{importSummary.updatedBank.name}</strong>.
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '12px',
                      maxWidth: '640px',
                      margin: '0 auto 24px'
                    }}
                  >
                    <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)' }}>
                      <div className="text-muted text-xs">Imported</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>
                        {importSummary.importedCount}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)' }}>
                      <div className="text-muted text-xs">Duplicates Skipped</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444' }}>
                        {importSummary.duplicateCount}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)' }}>
                      <div className="text-muted text-xs">Invalid Skipped</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#d97706' }}>
                        {importSummary.skippedCount}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-input)' }}>
                      <div className="text-muted text-xs">Total in Bank</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {importSummary.totalBankQuestions}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '12px 18px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--primary-light)',
                      color: 'var(--primary)',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '24px'
                    }}
                  >
                    <Layers size={16} /> These questions can now be selected during Assessment Creation.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-input)'
          }}
        >
          {importSummary ? (
            <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleModalClose}
              >
                Done & View in Repository
              </button>
            </div>
          ) : (
            <>
              <div>
                {currentStep > 1 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentStep((prev) => (prev - 1) as UploadStep)}
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={handleModalClose}>
                  Cancel
                </button>

                {currentStep === 1 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!selectedFile || !!fileError || uploadProgress < 100}
                    onClick={() => setCurrentStep(2)}
                  >
                    Proceed to Configuration <ChevronRight size={16} />
                  </button>
                )}

                {currentStep === 2 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleProceedToPreview}
                  >
                    Preview & Validate <ChevronRight size={16} />
                  </button>
                )}

                {currentStep === 3 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setCurrentStep(4)}
                  >
                    Proceed to Confirmation ({validCount} Valid) <ChevronRight size={16} />
                  </button>
                )}

                {currentStep === 4 && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={validCount === 0 || isImporting}
                    onClick={handleExecuteImport}
                  >
                    {isImporting ? 'Importing Questions...' : `Confirm & Import ${validCount} Questions`}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
