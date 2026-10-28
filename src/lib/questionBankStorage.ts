// ============================================================
// LMS - Question Bank Storage & Persistence Service
// Central store for question repositories, questions, and bulk import integration.
// Shares persistent state with assessmentStore and QuestionBankSelectorTab.
// ============================================================
import { QuestionBank, Question } from '../types';
import { mockQuestionBanks, mockQuestions } from '../data/mockData';
import { normalizeQuestionText } from './bulkImportService';

export const STORAGE_KEY_QUESTION_BANKS = 'venilearn_question_banks_store';
export const STORAGE_KEY_QUESTIONS = 'venilearn_questions_store';

export function getStoredQuestionBanks(): QuestionBank[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUESTION_BANKS);
    if (!raw) {
      saveStoredQuestionBanks(mockQuestionBanks);
      return mockQuestionBanks;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return mockQuestionBanks;
  } catch (err) {
    console.error('Failed to load question banks from localStorage:', err);
    return mockQuestionBanks;
  }
}

export function saveStoredQuestionBanks(banks: QuestionBank[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_QUESTION_BANKS, JSON.stringify(banks));
  } catch (err) {
    console.error('Failed to save question banks to localStorage:', err);
  }
}

export function getStoredQuestions(): Question[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUESTIONS);
    if (!raw) {
      saveStoredQuestions(mockQuestions);
      return mockQuestions;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return mockQuestions;
  } catch (err) {
    console.error('Failed to load questions from localStorage:', err);
    return mockQuestions;
  }
}

export function saveStoredQuestions(questions: Question[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(questions));
  } catch (err) {
    console.error('Failed to save questions to localStorage:', err);
  }
}

export function createNewQuestionBank(name: string, subject: string, tags: string[] = ['general']): QuestionBank {
  const banks = getStoredQuestionBanks();
  const newBank: QuestionBank = {
    id: `qb-${Date.now()}`,
    name: name.trim(),
    owner: 'Emily Rodriguez (Trainer)',
    subject: subject.trim(),
    tags: tags.length > 0 ? tags : [subject.toLowerCase().replace(/\s+/g, '-')],
    questionCount: 0,
    version: 1,
    status: 'published',
    scope: 'organization',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const updatedBanks = [newBank, ...banks];
  saveStoredQuestionBanks(updatedBanks);
  return newBank;
}

export interface AddQuestionsResult {
  importedCount: number;
  duplicateCount: number;
  skippedCount: number;
  totalBankQuestions: number;
  updatedBank: QuestionBank;
}

export function addQuestionsToRepository(
  bankId: string,
  newQuestions: Array<Omit<Question, 'bankId'> & { bankId?: string }>,
  skipDuplicates: boolean = true
): AddQuestionsResult {
  const currentQuestions = getStoredQuestions();
  const currentBanks = getStoredQuestionBanks();

  // Find existing normalized prompts in this bank
  const bankQuestions = currentQuestions.filter((q) => q.bankId === bankId);
  const existingNormalizedSet = new Set(
    bankQuestions.map((q) => normalizeQuestionText(q.prompt))
  );

  const seenInBatchSet = new Set<string>();
  const toInsert: Question[] = [];
  let duplicateCount = 0;
  let skippedCount = 0;

  for (const q of newQuestions) {
    const normalized = normalizeQuestionText(q.prompt);
    if (!normalized || normalized.length < 5) {
      skippedCount++;
      continue;
    }

    const isDuplicate = existingNormalizedSet.has(normalized) || seenInBatchSet.has(normalized);

    if (isDuplicate) {
      duplicateCount++;
      if (skipDuplicates) {
        continue;
      }
    }

    seenInBatchSet.add(normalized);

    const questionToSave: Question = {
      ...q,
      id: q.id && !q.id.startsWith('import-temp-') ? q.id : `q-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      bankId,
      status: 'published',
      version: q.version || 1,
      createdAt: q.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    toInsert.push(questionToSave);
  }

  const updatedAllQuestions = [...toInsert, ...currentQuestions];
  saveStoredQuestions(updatedAllQuestions);

  // Update repository questionCount
  const targetBankIndex = currentBanks.findIndex((b) => b.id === bankId);
  const newBankQuestionCount = currentQuestions.filter((q) => q.bankId === bankId).length + toInsert.length;

  let updatedBank: QuestionBank;
  if (targetBankIndex >= 0) {
    updatedBank = {
      ...currentBanks[targetBankIndex],
      questionCount: newBankQuestionCount,
      updatedAt: new Date().toISOString()
    };
    currentBanks[targetBankIndex] = updatedBank;
  } else {
    updatedBank = {
      id: bankId,
      name: 'Custom Repository',
      owner: 'Trainer',
      subject: 'General',
      tags: ['imported'],
      questionCount: newBankQuestionCount,
      version: 1,
      status: 'published',
      scope: 'organization',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    currentBanks.push(updatedBank);
  }

  saveStoredQuestionBanks(currentBanks);

  return {
    importedCount: toInsert.length,
    duplicateCount,
    skippedCount,
    totalBankQuestions: newBankQuestionCount,
    updatedBank
  };
}
