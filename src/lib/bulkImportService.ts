// ============================================================
// LMS - Bulk Question Import Service
// Deterministic parsing for XLSX, CSV, structured DOCX, and PDF.
// Automatic duplicate detection, missing-answer review flagging,
// template generation, and error reporting.
// ============================================================
import * as XLSX from 'xlsx';
import { AssessmentQuestionTypeSetting } from '../types';
import { GeneratedQuestionSchema } from './aiAssessmentService';
import { extractDocumentContent } from './documentParser';

export const MAX_ASSESSMENT_QUESTIONS = 100;

export interface RawImportRow {
  rowNumber: number;
  questionText: string;
  questionType: string;
  difficulty: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  marks?: number | string;
  explanation?: string;
  topic?: string;
}

export type ImportItemStatus = 'valid' | 'needs_review' | 'invalid' | 'duplicate';

export interface ParsedImportQuestion {
  id: string;
  rowNumber: number;
  question: GeneratedQuestionSchema;
  status: ImportItemStatus;
  issues: string[];
  hasMissingAnswer: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  normalizedText: string;
  rawRow?: RawImportRow;
}

export interface BulkImportSummary {
  fileName: string;
  fileSize: number;
  fileType: string;
  totalDetected: number;
  validCount: number;
  needsReviewCount: number;
  duplicateCount: number;
  invalidCount: number;
  items: ParsedImportQuestion[];
}

/**
 * Normalizes question text for robust duplicate comparison
 */
export function normalizeQuestionText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ') // collapse whitespaces
    .trim();
}

/**
 * Normalizes question type identifier from various formats
 */
export function normalizeQuestionType(typeStr: string): AssessmentQuestionTypeSetting {
  const t = (typeStr || '').trim().toLowerCase();
  if (t === 'mcq' || t === 'single' || t === 'single_choice' || t === 'single choice') {
    return 'single_choice';
  }
  if (t === 'multi' || t === 'multiple' || t === 'multiple_choice' || t === 'multiple select' || t === 'multiple_select') {
    return 'multiple_choice';
  }
  if (t === 'true_false' || t === 'true/false' || t === 'true or false' || t === 'tf' || t === 'boolean') {
    return 'true_false';
  }
  if (t === 'short' || t === 'short_answer' || t === 'short answer' || t === 'short_text') {
    return 'short_answer';
  }
  if (t === 'essay' || t === 'descriptive' || t === 'descriptive_answer' || t === 'long_text') {
    return 'essay';
  }
  return 'single_choice';
}

/**
 * Normalizes difficulty level
 */
export function normalizeDifficulty(diffStr: string): 'easy' | 'medium' | 'hard' {
  const d = (diffStr || '').trim().toLowerCase();
  if (d === 'easy') return 'easy';
  if (d === 'hard') return 'hard';
  return 'medium';
}

/**
 * Generates and triggers download of the standard Excel template
 */
export function downloadExcelTemplate(): void {
  const sampleData = [
    {
      question_text: 'What is the primary characteristic of an idempotent consumer pattern?',
      question_type: 'single_choice',
      difficulty: 'medium',
      option_a: 'Duplicate message deliveries do not cause unintended side effects',
      option_b: 'It requires immediate two-phase commit on all database clusters',
      option_c: 'It increases network bandwidth by caching unencrypted payloads',
      option_d: 'It rejects all out-of-order events automatically',
      correct_answer: 'A',
      marks: 10,
      explanation: 'Idempotency ensures that reprocessing the same event produces the same outcome.',
      topic: 'Distributed Systems'
    },
    {
      question_text: 'Which of the following are ACID properties in relational transaction management? (Select all that apply)',
      question_type: 'multiple_choice',
      difficulty: 'easy',
      option_a: 'Atomicity',
      option_b: 'Consistency',
      option_c: 'Isolation',
      option_d: 'Decoupling',
      correct_answer: 'A,B,C',
      marks: 15,
      explanation: 'ACID stands for Atomicity, Consistency, Isolation, and Durability.',
      topic: 'Databases'
    },
    {
      question_text: 'True or False: In a microservices architecture, shared databases across services are considered best practice.',
      question_type: 'true_false',
      difficulty: 'easy',
      option_a: 'True',
      option_b: 'False',
      option_c: '',
      option_d: '',
      correct_answer: 'False',
      marks: 5,
      explanation: 'Shared databases create tight coupling; database-per-service is standard.',
      topic: 'Software Architecture'
    },
    {
      question_text: 'Define the CAP Theorem and identify the two properties chosen in typical cloud-native distributed caches.',
      question_type: 'short_answer',
      difficulty: 'medium',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'Consistency and Partition Tolerance (CP) or Availability and Partition Tolerance (AP)',
      marks: 10,
      explanation: 'CAP theorem bounds Consistency, Availability, and Partition Tolerance.',
      topic: 'Distributed Systems'
    },
    {
      question_text: 'Provide a comprehensive architectural analysis comparing Event Sourcing with traditional CRUD state management. Include performance trade-offs, auditability, and replay capability.',
      question_type: 'essay',
      difficulty: 'hard',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: '',
      marks: 20,
      explanation: 'Instructor evaluated question based on architectural trade-offs.',
      topic: 'Enterprise Architecture'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData, {
    header: [
      'question_text',
      'question_type',
      'difficulty',
      'option_a',
      'option_b',
      'option_c',
      'option_d',
      'correct_answer',
      'marks',
      'explanation',
      'topic'
    ]
  });

  // Auto-fit column widths
  ws['!cols'] = [
    { wch: 50 }, // question_text
    { wch: 16 }, // question_type
    { wch: 12 }, // difficulty
    { wch: 30 }, // option_a
    { wch: 30 }, // option_b
    { wch: 30 }, // option_c
    { wch: 30 }, // option_d
    { wch: 16 }, // correct_answer
    { wch: 8 },  // marks
    { wch: 40 }, // explanation
    { wch: 22 }  // topic
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Questions_Template');

  XLSX.writeFile(wb, 'VeniLearn_Bulk_Question_Import_Template.xlsx');
}

/**
 * Generates and triggers download of the standard CSV template
 */
export function downloadCsvTemplate(): void {
  const headers = [
    'question_text',
    'question_type',
    'difficulty',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_answer',
    'marks',
    'explanation',
    'topic'
  ].join(',');

  const rows = [
    `"What is the primary characteristic of an idempotent consumer pattern?","single_choice","medium","Duplicate deliveries do not cause unintended side effects","Requires 2PC on all clusters","Increases bandwidth","Rejects out-of-order events","A",10,"Idempotency ensures safe re-delivery.","Distributed Systems"`,
    `"Which are valid ACID properties? (Select all that apply)","multiple_choice","easy","Atomicity","Consistency","Isolation","Decoupling","A,B,C",15,"ACID stands for Atomicity, Consistency, Isolation, Durability.","Databases"`,
    `"True or False: Shared databases across services are considered best practice.","true_false","easy","True","False","","","False",5,"Database-per-service ensures service autonomy.","Software Architecture"`,
    `"State the CAP Theorem trade-offs in distributed caches.","short_answer","medium","","","","","AP or CP systems",10,"Consistency, Availability, Partition Tolerance trade-offs.","Distributed Systems"`,
    `"Analyze Event Sourcing versus traditional CRUD state persistence.","essay","hard","","","","","",20,"Comprehensive evaluation of auditability and replay.","Enterprise Architecture"`
  ].join('\n');

  const csvContent = `${headers}\n${rows}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'VeniLearn_Bulk_Question_Import_Template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a CSV error or duplicate report
 */
export function downloadReportCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csvRows = [headers.join(',')];
  rows.forEach((r) => {
    const escaped = r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`);
    csvRows.push(escaped.join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Converts a raw table row into a structured Question and validates status
 */
function processRawRow(
  raw: RawImportRow,
  existingNormalizedTexts: Set<string>,
  seenInFileNormalizedTexts: Set<string>
): ParsedImportQuestion {
  const issues: string[] = [];
  let status: ImportItemStatus = 'valid';
  let hasMissingAnswer = false;
  let isDuplicate = false;
  let duplicateReason: string | undefined;

  const qText = (raw.questionText || '').trim();
  const normalized = normalizeQuestionText(qText);

  // 1. Text presence validation
  if (!qText || qText.length < 5) {
    issues.push('Question text is missing or too short (minimum 5 characters).');
    status = 'invalid';
  }

  // 2. Duplicate detection
  if (normalized) {
    if (seenInFileNormalizedTexts.has(normalized)) {
      isDuplicate = true;
      duplicateReason = 'Duplicate question text already detected earlier in this file.';
      status = 'duplicate';
    } else if (existingNormalizedTexts.has(normalized)) {
      isDuplicate = true;
      duplicateReason = 'Duplicate question text matches an existing question in this assessment.';
      status = 'duplicate';
    } else {
      seenInFileNormalizedTexts.add(normalized);
    }
  }

  const qType = normalizeQuestionType(raw.questionType);
  const difficulty = normalizeDifficulty(raw.difficulty);
  const marks = typeof raw.marks === 'number' && raw.marks > 0
    ? raw.marks
    : parseInt(String(raw.marks || '10')) || (difficulty === 'hard' ? 15 : difficulty === 'medium' ? 10 : 5);

  const rawCorrect = (raw.correctAnswer || '').trim();

  // 3. Construct Options & Evaluate Answer Validity
  let options: { id: string; text: string; isCorrect: boolean }[] | undefined = undefined;
  let finalCorrectAnswer = rawCorrect;

  if (qType === 'single_choice' || qType === 'multiple_choice') {
    const rawOpts = [
      { key: 'A', text: (raw.optionA || '').trim() },
      { key: 'B', text: (raw.optionB || '').trim() },
      { key: 'C', text: (raw.optionC || '').trim() },
      { key: 'D', text: (raw.optionD || '').trim() }
    ].filter((o) => o.text.length > 0);

    if (rawOpts.length < 2) {
      issues.push(`Multiple choice questions require at least 2 non-empty options (found ${rawOpts.length}).`);
      if (status !== 'duplicate') status = 'invalid';
    }

    // Parse correct answers
    const correctKeys = rawCorrect
      .toUpperCase()
      .split(/[,;\s]+/)
      .map((k) => k.trim())
      .filter(Boolean);

    if (correctKeys.length === 0) {
      hasMissingAnswer = true;
      issues.push('Missing correct answer designation. Please review and specify the correct option.');
      if (status === 'valid') status = 'needs_review';
    }

    options = rawOpts.map((opt, idx) => {
      const isMarked =
        correctKeys.includes(opt.key) ||
        correctKeys.includes(`OPTION_${opt.key}`) ||
        rawCorrect.toLowerCase() === opt.text.toLowerCase();

      return {
        id: `opt-${raw.rowNumber}-${idx + 1}`,
        text: opt.text,
        isCorrect: isMarked
      };
    });

    if (qType === 'single_choice' && !hasMissingAnswer) {
      const count = options.filter((o) => o.isCorrect).length;
      if (count !== 1) {
        issues.push(`Single Choice MCQ must designate exactly 1 correct answer (found ${count}).`);
        if (status === 'valid') status = 'needs_review';
      }
    } else if (qType === 'multiple_choice' && !hasMissingAnswer) {
      const count = options.filter((o) => o.isCorrect).length;
      if (count < 1) {
        issues.push('Multiple Select must designate at least 1 correct answer.');
        if (status === 'valid') status = 'needs_review';
      }
    }
  } else if (qType === 'true_false') {
    const isTrue = rawCorrect.toLowerCase() === 'true' || rawCorrect.toLowerCase() === 't' || rawCorrect.toUpperCase() === 'A';
    const isFalse = rawCorrect.toLowerCase() === 'false' || rawCorrect.toLowerCase() === 'f' || rawCorrect.toUpperCase() === 'B';

    if (!isTrue && !isFalse) {
      hasMissingAnswer = true;
      issues.push('True / False question lacks a clear correct choice ("True" or "False").');
      if (status === 'valid') status = 'needs_review';
    }

    options = [
      { id: `opt-${raw.rowNumber}-t`, text: 'True', isCorrect: isTrue },
      { id: `opt-${raw.rowNumber}-f`, text: 'False', isCorrect: isFalse }
    ];
    finalCorrectAnswer = isTrue ? 'True' : isFalse ? 'False' : '';
  } else if (qType === 'short_answer') {
    if (!finalCorrectAnswer) {
      hasMissingAnswer = true;
      issues.push('Short answer question has no expected answer key specified.');
      if (status === 'valid') status = 'needs_review';
    }
  } else if (qType === 'essay') {
    // Descriptive answers can proceed without a pre-baked key if rubric/explanation is provided
    if (!finalCorrectAnswer && !raw.explanation) {
      issues.push('Descriptive question has no grading rubric or rationale provided (can be evaluated manually).');
    }
  }

  const generatedQ: GeneratedQuestionSchema = {
    id: `import-q-${Date.now()}-${raw.rowNumber}`,
    type: qType,
    prompt: qText,
    difficulty,
    points: marks,
    options,
    correctAnswer: finalCorrectAnswer,
    explanation: (raw.explanation || '').trim() || 'Imported via Bulk Assessment Upload.',
    topic: (raw.topic || '').trim() || 'Imported Curriculum',
    rubric: qType === 'essay' ? raw.correctAnswer || raw.explanation : undefined
  };

  return {
    id: generatedQ.id,
    rowNumber: raw.rowNumber,
    question: generatedQ,
    status,
    issues,
    hasMissingAnswer,
    isDuplicate,
    duplicateReason,
    normalizedText: normalized,
    rawRow: raw
  };
}

/**
 * Parses XLSX / Excel file deterministically
 */
export async function parseXlsxQuestions(
  file: File,
  existingNormalizedTexts: Set<string>
): Promise<BulkImportSummary> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error('The uploaded Excel spreadsheet contains no worksheets.');
  }

  const ws = wb.Sheets[sheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  if (jsonData.length === 0) {
    throw new Error('The uploaded Excel spreadsheet is empty (0 rows found).');
  }

  const seenInFile = new Set<string>();
  const parsedItems: ParsedImportQuestion[] = [];

  jsonData.forEach((row, idx) => {
    // Support variations of column headers
    const rawRow: RawImportRow = {
      rowNumber: idx + 2, // 1-indexed, header is row 1
      questionText: String(row.question_text || row.Question || row.prompt || row.question || ''),
      questionType: String(row.question_type || row.type || row.Type || 'single_choice'),
      difficulty: String(row.difficulty || row.Difficulty || 'medium'),
      optionA: String(row.option_a || row.optionA || row['Option A'] || row.a || ''),
      optionB: String(row.option_b || row.optionB || row['Option B'] || row.b || ''),
      optionC: String(row.option_c || row.optionC || row['Option C'] || row.c || ''),
      optionD: String(row.option_d || row.optionD || row['Option D'] || row.d || ''),
      correctAnswer: String(row.correct_answer || row.correct || row.Answer || row.answer || ''),
      marks: row.marks || row.points || row.Marks,
      explanation: String(row.explanation || row.rationale || row.Explanation || ''),
      topic: String(row.topic || row.section || row.Topic || '')
    };

    parsedItems.push(processRawRow(rawRow, existingNormalizedTexts, seenInFile));
  });

  return computeSummary(file.name, file.size, 'XLSX', parsedItems);
}

/**
 * Parses CSV file deterministically with standard line & quote processing
 */
export async function parseCsvQuestions(
  file: File,
  existingNormalizedTexts: Set<string>
): Promise<BulkImportSummary> {
  const text = await file.text();
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = parseCsvLines(clean);

  if (lines.length <= 1) {
    throw new Error('CSV file is empty or only contains a header line.');
  }

  const headers = lines[0].map((h) => h.trim().toLowerCase());
  const seenInFile = new Set<string>();
  const parsedItems: ParsedImportQuestion[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    if (cols.length === 0 || (cols.length === 1 && cols[0].trim() === '')) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = cols[colIdx] || '';
    });

    const rawRow: RawImportRow = {
      rowNumber: i + 1,
      questionText: rowObj.question_text || rowObj.question || rowObj.prompt || cols[0] || '',
      questionType: rowObj.question_type || rowObj.type || 'single_choice',
      difficulty: rowObj.difficulty || 'medium',
      optionA: rowObj.option_a || rowObj.optiona || '',
      optionB: rowObj.option_b || rowObj.optionb || '',
      optionC: rowObj.option_c || rowObj.optionc || '',
      optionD: rowObj.option_d || rowObj.optiond || '',
      correctAnswer: rowObj.correct_answer || rowObj.answer || '',
      marks: rowObj.marks || rowObj.points || '',
      explanation: rowObj.explanation || '',
      topic: rowObj.topic || ''
    };

    parsedItems.push(processRawRow(rawRow, existingNormalizedTexts, seenInFile));
  }

  return computeSummary(file.name, file.size, 'CSV', parsedItems);
}

/**
 * Robust CSV Line Parser handling quotes and internal commas
 */
function parseCsvLines(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuote) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        insideQuote = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parses structured questions from DOCX and PDF documents
 * Extracts numbered items (e.g., "1. What is...", "A) Option A", "Answer: B")
 */
export async function parseStructuredDocumentQuestions(
  file: File,
  existingNormalizedTexts: Set<string>
): Promise<BulkImportSummary> {
  const parseResult = await extractDocumentContent(file);
  if (!parseResult.success || !parseResult.docInfo) {
    throw new Error(parseResult.error || 'Failed to extract text from document.');
  }

  if (parseResult.isScannedOrImageOnly) {
    throw new Error('This PDF appears to be a scanned image. OCR service is not configured. Please upload a digital PDF with selectable text or an Excel/CSV file.');
  }

  const text = parseResult.docInfo.text || '';
  const rawRows = extractQuestionsFromTextStream(text);

  if (rawRows.length === 0) {
    throw new Error(`No structured questions detected in "${file.name}". Questions should be formatted as numbered items (e.g. "1. Question Text", "A) Option A", "Answer: A").`);
  }

  const seenInFile = new Set<string>();
  const parsedItems = rawRows.map((raw) => processRawRow(raw, existingNormalizedTexts, seenInFile));

  const format = file.name.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF';
  return computeSummary(file.name, file.size, format, parsedItems);
}

/**
 * Extracts structured questions from arbitrary text blocks (Word / PDF streams)
 */
function extractQuestionsFromTextStream(text: string): RawImportRow[] {
  const rows: RawImportRow[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentQuestion: Partial<RawImportRow> | null = null;
  let rowCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect question start: "1. Prompt...", "Question 1: Prompt...", "1) Prompt..."
    const qMatch = line.match(/^(?:(?:Question\s*)?(\d+)[\.\)]\s*)(.+)$/i);
    if (qMatch) {
      if (currentQuestion && currentQuestion.questionText) {
        rows.push(finalizeExtractedRow(currentQuestion, rowCounter++));
      }
      currentQuestion = {
        rowNumber: rowCounter,
        questionText: qMatch[2].trim(),
        questionType: 'single_choice',
        difficulty: 'medium',
        marks: 10
      };
      continue;
    }

    if (!currentQuestion) continue;

    // Detect options: "A) ...", "A. ...", "(A) ..."
    const optMatch = line.match(/^[\(\[]?([A-Da-d])[\)\]\.\s]\s*(.+)$/);
    if (optMatch) {
      const letter = optMatch[1].toUpperCase();
      const optText = optMatch[2].trim();
      if (letter === 'A') currentQuestion.optionA = optText;
      else if (letter === 'B') currentQuestion.optionB = optText;
      else if (letter === 'C') currentQuestion.optionC = optText;
      else if (letter === 'D') currentQuestion.optionD = optText;
      continue;
    }

    // Detect answer line: "Answer: A", "Correct: B,C", "Ans - True"
    const ansMatch = line.match(/^(?:Answer|Ans|Correct(?:\s*Answer)?|Key)[\s:=-]+(.+)$/i);
    if (ansMatch) {
      currentQuestion.correctAnswer = ansMatch[1].trim();
      continue;
    }

    // Detect explanation
    const expMatch = line.match(/^(?:Explanation|Rationale)[\s:=-]+(.+)$/i);
    if (expMatch) {
      currentQuestion.explanation = expMatch[1].trim();
      continue;
    }

    // Append to question text if still reading the prompt
    if (!currentQuestion.optionA && !currentQuestion.correctAnswer && line.length > 0) {
      currentQuestion.questionText = `${currentQuestion.questionText} ${line}`.trim();
    }
  }

  if (currentQuestion && currentQuestion.questionText) {
    rows.push(finalizeExtractedRow(currentQuestion, rowCounter));
  }

  return rows;
}

function finalizeExtractedRow(partial: Partial<RawImportRow>, rowNum: number): RawImportRow {
  // Determine if True/False based on options
  let qType = partial.questionType || 'single_choice';
  const aText = (partial.optionA || '').toLowerCase();
  const bText = (partial.optionB || '').toLowerCase();
  if ((aText === 'true' && bText === 'false') || (aText === 'false' && bText === 'true')) {
    qType = 'true_false';
  } else if (!partial.optionA && !partial.optionB) {
    qType = 'short_answer';
  }

  return {
    rowNumber: rowNum,
    questionText: partial.questionText || '',
    questionType: qType,
    difficulty: partial.difficulty || 'medium',
    optionA: partial.optionA,
    optionB: partial.optionB,
    optionC: partial.optionC,
    optionD: partial.optionD,
    correctAnswer: partial.correctAnswer,
    marks: partial.marks || 10,
    explanation: partial.explanation,
    topic: partial.topic || 'Document Section'
  };
}

function computeSummary(
  fileName: string,
  fileSize: number,
  fileType: string,
  items: ParsedImportQuestion[]
): BulkImportSummary {
  let validCount = 0;
  let needsReviewCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  items.forEach((it) => {
    if (it.status === 'valid') validCount++;
    else if (it.status === 'needs_review') needsReviewCount++;
    else if (it.status === 'duplicate') duplicateCount++;
    else if (it.status === 'invalid') invalidCount++;
  });

  return {
    fileName,
    fileSize,
    fileType,
    totalDetected: items.length,
    validCount,
    needsReviewCount,
    duplicateCount,
    invalidCount,
    items
  };
}
