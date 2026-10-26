import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, PenTool, CheckCircle2, AlertCircle, Plus, Trash2, X,
  Clock, Award, HelpCircle, Layers, FileText, Check, ChevronDown,
  ChevronUp, Edit2, Shield, RefreshCw, FileSpreadsheet, Database,
  Sliders, Download, ArrowUp, ArrowDown, Shuffle, Eye, ExternalLink
} from 'lucide-react';
import {
  QuizAssessmentConfig,
  QuizQuestionItem,
  QuizOption,
  UploadedDocumentInfo
} from '../../../types';
import { generateContextualQuestions } from './aiQuestionGenerator';
import { ExcelCsvImportTab } from './ExcelCsvImportTab';
import { PdfWordImportTab } from './PdfWordImportTab';
import { QuestionBankSelectorTab } from './QuestionBankSelectorTab';
import { AssessmentSettingsTab } from './AssessmentSettingsTab';
import { exportQuestionsToCsv } from './csvTemplateUtils';

interface Props {
  isOpen: boolean;
  scope: 'lesson_quiz' | 'module_assessment' | 'final_assessment';
  initialConfig?: QuizAssessmentConfig;
  courseTitle: string;
  moduleTitle?: string;
  lessonTitle?: string;
  category?: string;
  availableDocuments?: UploadedDocumentInfo[];
  onSave: (config: QuizAssessmentConfig) => void;
  onClose: () => void;
}

type TabType = 'excel_csv' | 'pdf_word' | 'ai' | 'manual' | 'question_bank' | 'settings';

export const AssessmentConfigModal: React.FC<Props> = ({
  isOpen,
  scope,
  initialConfig,
  courseTitle,
  moduleTitle = '',
  lessonTitle = '',
  category = '',
  availableDocuments = [],
  onSave,
  onClose,
}) => {
  if (!isOpen) return null;

  // Active view tab
  const [activeTab, setActiveTab] = useState<TabType>(
    (initialConfig?.creationMode as TabType) || 'excel_csv'
  );

  // General assessment parameters
  const defaultTitle =
    scope === 'lesson_quiz'
      ? `${lessonTitle || 'Lesson'} Knowledge Check Quiz`
      : scope === 'module_assessment'
      ? `${moduleTitle || 'Module'} Assessment Checkpoint`
      : `${courseTitle} Comprehensive Final Assessment`;

  const [title, setTitle] = useState(initialConfig?.title || defaultTitle);
  const [instructions, setInstructions] = useState(
    initialConfig?.description ||
      (scope === 'final_assessment'
        ? 'Comprehensive exam assessing all course modules, lessons, and case studies.'
        : scope === 'module_assessment'
        ? 'Assess your understanding of the core concepts covered in this module.'
        : 'Quick review quiz to verify your comprehension of the lesson material.')
  );
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(
    initialConfig?.difficulty || (scope === 'final_assessment' ? 'hard' : scope === 'module_assessment' ? 'medium' : 'easy')
  );
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(
    initialConfig?.timeLimitMinutes || (scope === 'final_assessment' ? 60 : scope === 'module_assessment' ? 30 : 15)
  );
  const [passingPercentage, setPassingPercentage] = useState(
    initialConfig?.passingPercentage || (scope === 'final_assessment' ? 75 : 70)
  );
  const [allowedAttempts, setAllowedAttempts] = useState(
    initialConfig?.allowedAttempts ?? (scope === 'final_assessment' ? 2 : 3)
  );

  // Advanced settings: negative marking & randomization
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(
    Boolean(initialConfig?.negativeMarkingEnabled)
  );
  const [negativeMarksPerQuestion, setNegativeMarksPerQuestion] = useState(
    initialConfig?.negativeMarksPerQuestion || 0.25
  );
  const [randomizeQuestions, setRandomizeQuestions] = useState(
    Boolean(initialConfig?.randomizeQuestions)
  );
  const [randomQuestionCount, setRandomQuestionCount] = useState(
    initialConfig?.randomQuestionCount || 10
  );

  // Questions state (current assessment questions pool)
  const [questions, setQuestions] = useState<QuizQuestionItem[]>(
    initialConfig?.questions && initialConfig.questions.length > 0
      ? initialConfig.questions
      : []
  );

  // Collapsible view of current assessment questions
  const [isQuestionsExpanded, setIsQuestionsExpanded] = useState(true);
  const [editingAssessmentQuestionId, setEditingAssessmentQuestionId] = useState<string | null>(null);

  // AI Generator state
  const [aiSource, setAiSource] = useState<'lessons' | 'modules' | 'documents' | 'question_bank'>('documents');
  const [selectedDocs, setSelectedDocs] = useState<string[]>(
    initialConfig?.sourceDocumentNames ||
      (availableDocuments.length > 0 ? [availableDocuments[0].name] : [])
  );
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(
    scope === 'final_assessment' ? 6 : scope === 'module_assessment' ? 4 : 3
  );
  const [aiQuestionTypes, setAiQuestionTypes] = useState<
    ('single_choice' | 'multiple_choice' | 'true_false' | 'short_answer')[]
  >(['single_choice', 'multiple_choice', 'true_false']);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>(difficulty);
  const [aiPointsPerQuestion, setAiPointsPerQuestion] = useState(5);
  const [aiIncludeExplanations, setAiIncludeExplanations] = useState(true);
  const [customFocusPrompt, setCustomFocusPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [generatedPreviewQuestions, setGeneratedPreviewQuestions] = useState<
    (QuizQuestionItem & { selected: boolean })[]
  >([]);

  // Manual Question Editor State
  const [newQuestionPrompt, setNewQuestionPrompt] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<
    'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer'
  >('single_choice');
  const [newQuestionPoints, setNewQuestionPoints] = useState(5);
  const [newQuestionDifficulty, setNewQuestionDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [newQuestionTopic, setNewQuestionTopic] = useState('');
  const [newQuestionExplanation, setNewQuestionExplanation] = useState('');
  const [newQuestionCorrectText, setNewQuestionCorrectText] = useState('');
  const [newQuestionOptions, setNewQuestionOptions] = useState<QuizOption[]>([
    { id: 'opt-1', text: 'Option A', isCorrect: true },
    { id: 'opt-2', text: 'Option B', isCorrect: false },
    { id: 'opt-3', text: 'Option C', isCorrect: false },
    { id: 'opt-4', text: 'Option D', isCorrect: false },
  ]);

  // Validation Error state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Total calculated marks
  const totalMarks = useMemo(() => {
    return questions.reduce((sum, q) => sum + (q.points || 0), 0);
  }, [questions]);

  // Sync title when scope or lessonTitle changes if initialConfig not set
  useEffect(() => {
    if (!initialConfig) {
      setTitle(defaultTitle);
    }
  }, [scope, lessonTitle, moduleTitle, courseTitle]);

  // Toggle selected source document
  const toggleDocument = (docName: string) => {
    if (selectedDocs.includes(docName)) {
      setSelectedDocs(selectedDocs.filter((d) => d !== docName));
    } else {
      setSelectedDocs([...selectedDocs, docName]);
    }
  };

  // Toggle AI question types
  const toggleQuestionType = (
    type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer'
  ) => {
    if (aiQuestionTypes.includes(type)) {
      if (aiQuestionTypes.length > 1) {
        setAiQuestionTypes(aiQuestionTypes.filter((t) => t !== type));
      }
    } else {
      setAiQuestionTypes([...aiQuestionTypes, type]);
    }
  };

  // Import questions handler from any source tab
  const handleImportQuestions = (imported: QuizQuestionItem[]) => {
    // Avoid exact duplicate prompts
    const existingPrompts = new Set(questions.map((q) => q.prompt.trim().toLowerCase()));
    const freshQuestions: QuizQuestionItem[] = [];

    imported.forEach((q) => {
      if (!existingPrompts.has(q.prompt.trim().toLowerCase())) {
        freshQuestions.push(q);
        existingPrompts.add(q.prompt.trim().toLowerCase());
      }
    });

    if (freshQuestions.length === 0) {
      alert('All imported questions are already present in this assessment.');
      return;
    }

    setQuestions((prev) => [...prev, ...freshQuestions]);
    setIsQuestionsExpanded(true);
    setValidationError(null);
  };

  // AI Question Generation Handler
  const handleGenerateAiQuestions = () => {
    setIsGenerating(true);
    setGeneratingStep(1);

    setTimeout(() => {
      setGeneratingStep(2);
      setTimeout(() => {
        setGeneratingStep(3);
        setTimeout(() => {
          const generated = generateContextualQuestions({
            scope,
            courseTitle,
            moduleTitle,
            lessonTitle,
            category,
            sourceDocuments: selectedDocs,
            difficulty: aiDifficulty,
            questionTypes: aiQuestionTypes,
            count: aiQuestionCount,
            customPrompt: customFocusPrompt,
            pointsPerQuestion: aiPointsPerQuestion
          });

          // If explanations turned off
          const processed = generated.map((q) => ({
            ...q,
            explanation: aiIncludeExplanations ? q.explanation : undefined,
            selected: true
          }));

          setGeneratedPreviewQuestions(processed);
          setIsGenerating(false);
          setGeneratingStep(0);
        }, 400);
      }, 400);
    }, 450);
  };

  // Add generated questions to assessment
  const handleAddGeneratedToAssessment = () => {
    const selected = generatedPreviewQuestions.filter((q) => q.selected);
    if (selected.length === 0) {
      alert('Please select at least one question to add.');
      return;
    }
    const cleaned = selected.map(({ selected, ...rest }) => rest);
    handleImportQuestions(cleaned);
    setGeneratedPreviewQuestions([]);
  };

  // Manual Question Addition
  const handleAddManualQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!newQuestionPrompt.trim()) {
      setValidationError('Please enter a question prompt.');
      return;
    }

    let optionsToSave: QuizOption[] = [];

    if (newQuestionType === 'short_answer') {
      if (!newQuestionCorrectText.trim()) {
        setValidationError('Please enter the expected correct answer for this short answer question.');
        return;
      }
    } else {
      const validOptions = newQuestionOptions.filter((opt) => opt.text.trim().length > 0);
      if (validOptions.length < 2) {
        setValidationError('At least 2 non-empty answer options are required.');
        return;
      }

      if (!validOptions.some((opt) => opt.isCorrect)) {
        setValidationError('Please mark at least one option as the correct answer.');
        return;
      }

      optionsToSave = validOptions;
    }

    const newQuestion: QuizQuestionItem = {
      id: `q-man-${Date.now()}`,
      prompt: newQuestionPrompt.trim(),
      type: newQuestionType,
      options: optionsToSave,
      points: newQuestionPoints,
      difficulty: newQuestionDifficulty,
      topic: newQuestionTopic.trim() || undefined,
      correctAnswerText: newQuestionType === 'short_answer' ? newQuestionCorrectText.trim() : undefined,
      explanation: newQuestionExplanation.trim() || undefined,
      source: 'manual'
    };

    setQuestions([...questions, newQuestion]);

    // Reset manual form
    setNewQuestionPrompt('');
    setNewQuestionExplanation('');
    setNewQuestionTopic('');
    setNewQuestionCorrectText('');
    setNewQuestionOptions([
      { id: 'opt-1', text: 'Option A', isCorrect: true },
      { id: 'opt-2', text: 'Option B', isCorrect: false },
      { id: 'opt-3', text: 'Option C', isCorrect: false },
      { id: 'opt-4', text: 'Option D', isCorrect: false },
    ]);
  };

  // Reorder question in current assessment
  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const updated = [...questions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setQuestions(updated);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const handleBatchUpdateMarks = (newMarks: number) => {
    setQuestions(questions.map((q) => ({ ...q, points: newMarks })));
  };

  // Save assessment validation
  const handleSave = () => {
    setValidationError(null);

    if (!title.trim()) {
      setValidationError('Assessment Title is required.');
      return;
    }

    if (questions.length === 0) {
      setValidationError(
        'An assessment must have at least one question. Import questions using Excel, PDF, AI, Manual mode, or Question Bank.'
      );
      return;
    }

    // Validate each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        setValidationError(`Question #${i + 1} has empty text.`);
        return;
      }
      if (q.type !== 'short_answer') {
        if (!q.options || q.options.length < 2) {
          setValidationError(`Question #${i + 1} must have at least 2 answer options.`);
          return;
        }
        if (!q.options.some((o) => o.isCorrect)) {
          setValidationError(`Question #${i + 1} must have at least one correct answer selected.`);
          return;
        }
      } else {
        if (!q.correctAnswerText?.trim()) {
          setValidationError(`Short answer question #${i + 1} must specify an expected answer.`);
          return;
        }
      }
      if ((q.points || 0) <= 0) {
        setValidationError(`Question #${i + 1} must have positive marks (> 0).`);
        return;
      }
    }

    if (passingPercentage < 0 || passingPercentage > 100) {
      setValidationError('Passing score must be between 0% and 100%.');
      return;
    }

    if (timeLimitMinutes <= 0) {
      setValidationError('Time limit must be at least 1 minute.');
      return;
    }

    const updatedConfig: QuizAssessmentConfig = {
      id: initialConfig?.id || `asm-${Date.now()}`,
      title: title.trim(),
      description: instructions.trim(),
      scope,
      difficulty,
      timeLimitMinutes,
      passingPercentage,
      allowedAttempts,
      totalMarks,
      questions,
      sourceDocumentNames: selectedDocs,
      creationMode: activeTab as any,
      status: 'ready',
      negativeMarkingEnabled,
      negativeMarksPerQuestion,
      randomizeQuestions,
      randomQuestionCount,
      updatedAt: new Date().toISOString()
    };

    onSave(updatedConfig);
    onClose();
  };

  const scopeBadge =
    scope === 'lesson_quiz' ? (
      <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
        Lesson Quiz
      </span>
    ) : scope === 'module_assessment' ? (
      <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
        Module Assessment
      </span>
    ) : (
      <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
        Final Course Assessment
      </span>
    );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '1060px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)',
          animation: 'modalSlideUp 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Award size={22} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                  {scope === 'final_assessment'
                    ? 'Configure Final Course Assessment'
                    : scope === 'module_assessment'
                    ? 'Configure Module Assessment'
                    : 'Configure Lesson Quiz'}
                </h3>
                {scopeBadge}
              </div>
              <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
                {scope === 'final_assessment'
                  ? `Comprehensive evaluation blueprint for ${courseTitle}`
                  : scope === 'module_assessment'
                  ? `Module evaluation for ${moduleTitle || 'active module'}`
                  : `Lesson quiz for ${lessonTitle || 'active lesson'}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            style={{ color: 'var(--text-muted)', padding: '6px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 6 Tabs Switcher: 4 Creation Methods + Question Bank + Settings */}
        <div
          style={{
            display: 'flex',
            padding: '0 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-input)',
            gap: '4px',
            overflowX: 'auto',
            flexShrink: 0
          }}
        >
          {/* Option 1: Import Excel / CSV */}
          <button
            type="button"
            onClick={() => setActiveTab('excel_csv')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'excel_csv' ? 700 : 500,
              color: activeTab === 'excel_csv' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'excel_csv' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <FileSpreadsheet size={15} /> 1. Import Excel / CSV
          </button>

          {/* Option 2: Import PDF / Word */}
          <button
            type="button"
            onClick={() => setActiveTab('pdf_word')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'pdf_word' ? 700 : 500,
              color: activeTab === 'pdf_word' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'pdf_word' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <FileText size={15} /> 2. Import PDF / Word
          </button>

          {/* Option 3: AI Question Generator */}
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'ai' ? 700 : 500,
              color: activeTab === 'ai' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'ai' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <Sparkles size={15} /> 3. AI Generator
          </button>

          {/* Option 4: Create Manually */}
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'manual' ? 700 : 500,
              color: activeTab === 'manual' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'manual' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <PenTool size={15} /> 4. Create Manually
          </button>

          {/* Question Bank */}
          <button
            type="button"
            onClick={() => setActiveTab('question_bank')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'question_bank' ? 700 : 500,
              color: activeTab === 'question_bank' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'question_bank' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <Database size={15} /> Question Bank
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '10px 14px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.82rem',
              fontWeight: activeTab === 'settings' ? 700 : 500,
              color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'settings' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <Sliders size={15} /> Assessment Settings
          </button>

          {/* Real-time stats chip */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', paddingRight: '4px' }}>
            <span className="badge badge-secondary" style={{ fontWeight: 600 }}>
              {questions.length} Questions &bull; {totalMarks} Marks
            </span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Validation Alert */}
          {validationError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--danger-bg, rgba(239, 68, 68, 0.1))',
                border: '1px solid var(--danger, #ef4444)',
                color: 'var(--danger, #ef4444)',
                fontSize: '0.82rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
          )}

          {/* METHOD 1: IMPORT EXCEL / CSV */}
          {activeTab === 'excel_csv' && (
            <ExcelCsvImportTab
              existingQuestions={questions}
              onImportQuestions={handleImportQuestions}
              courseTitle={courseTitle}
            />
          )}

          {/* METHOD 2: IMPORT PDF / WORD */}
          {activeTab === 'pdf_word' && (
            <PdfWordImportTab
              existingQuestions={questions}
              onImportQuestions={handleImportQuestions}
              courseTitle={courseTitle}
              moduleTitle={moduleTitle}
              lessonTitle={lessonTitle}
            />
          )}

          {/* METHOD 3: AI QUESTION GENERATOR */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* AI Banner */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(6, 182, 212, 0.08))',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <Sparkles size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    AI Curriculum & Document-Aware Question Generator
                  </div>
                  <p className="text-secondary text-xs" style={{ margin: '2px 0 0', lineHeight: 1.4 }}>
                    Synthesizes questions based on lessons, learning materials, and bloom taxonomy difficulties. Review, edit, or regenerate before saving.
                  </p>
                  <span className="badge badge-secondary" style={{ fontSize: '0.68rem', marginTop: '6px' }}>
                    Frontend Prototype Demo: Actual AI question generation in production connects via the LMS AI gateway API.
                  </span>
                </div>
              </div>

              {/* Source Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Content Generation Source
                  </label>
                  <select
                    className="form-select"
                    value={aiSource}
                    onChange={(e) => setAiSource(e.target.value as any)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value="documents">Uploaded Learning Documents</option>
                    <option value="lessons">Course Lessons & Units</option>
                    <option value="modules">Selected Module Syllabi</option>
                    <option value="question_bank">Question Bank Repository Pool</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Target Difficulty
                  </label>
                  <select
                    className="form-select"
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value as any)}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value="easy">Easy (Foundational & Definitions)</option>
                    <option value="medium">Medium (Application & Analysis)</option>
                    <option value="hard">Hard (Architecture & Synthesis)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Number of Questions
                  </label>
                  <select
                    className="form-select"
                    value={aiQuestionCount}
                    onChange={(e) => setAiQuestionCount(Number(e.target.value))}
                    style={{ fontSize: '0.82rem' }}
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={8}>8 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Marks per Question
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={aiPointsPerQuestion}
                    onChange={(e) => setAiPointsPerQuestion(Number(e.target.value) || 5)}
                    className="form-input"
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              {/* Source Document Selection if documents source */}
              {aiSource === 'documents' && (
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Select Learning Documents to Reference:
                  </label>
                  {availableDocuments.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                      {availableDocuments.map((doc) => {
                        const isSelected = selectedDocs.includes(doc.name);
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => toggleDocument(doc.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-md)',
                              background: isSelected ? 'var(--primary-light, rgba(99, 102, 241, 0.12))' : 'var(--bg-input)',
                              border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                              color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                              fontSize: '0.78rem',
                              fontWeight: isSelected ? 600 : 500,
                              cursor: 'pointer',
                            }}
                          >
                            <FileText size={13} />
                            <span>{doc.name}</span>
                            {isSelected && <Check size={12} />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted text-xs" style={{ margin: '4px 0 0' }}>
                      No documents uploaded yet in this unit. The AI will synthesize questions from syllabus topics.
                    </p>
                  )}
                </div>
              )}

              {/* Question Types & Explanation Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '6px' }}>
                    Included Question Types:
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(['single_choice', 'multiple_choice', 'true_false', 'short_answer'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleQuestionType(type)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          background: aiQuestionTypes.includes(type) ? 'var(--primary)' : 'var(--bg-input)',
                          color: aiQuestionTypes.includes(type) ? '#fff' : 'var(--text-secondary)',
                          fontWeight: aiQuestionTypes.includes(type) ? 600 : 400
                        }}
                      >
                        {type === 'single_choice' ? 'Single Choice' : type === 'multiple_choice' ? 'Multiple Select' : type === 'true_false' ? 'True / False' : 'Short Answer'}
                      </button>
                    ))}
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', marginTop: '16px' }}>
                  <input
                    type="checkbox"
                    checked={aiIncludeExplanations}
                    onChange={(e) => setAiIncludeExplanations(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Include answer explanations for candidates</span>
                </label>
              </div>

              {/* Custom Prompt & Trigger */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    Optional Custom Topic Focus Prompt
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Focus on partition rebalancing and outbox idempotence failure cases"
                    value={customFocusPrompt}
                    onChange={(e) => setCustomFocusPrompt(e.target.value)}
                    style={{ fontSize: '0.82rem' }}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateAiQuestions}
                  disabled={isGenerating}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                      {generatingStep === 1
                        ? 'Reading context...'
                        : generatingStep === 2
                        ? 'Formulating items...'
                        : 'Generating distractors...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Generate Questions
                    </>
                  )}
                </button>
              </div>

              {/* Generated Questions Preview Drawer */}
              {generatedPreviewQuestions.length > 0 && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        Generated Questions Preview ({generatedPreviewQuestions.length})
                      </span>
                      <p className="text-muted text-xs" style={{ margin: '2px 0 0' }}>
                        Review, edit, or deselect items before adding to the assessment.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleAddGeneratedToAssessment}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={13} /> Add Selected to Assessment
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                    {generatedPreviewQuestions.map((q, idx) => (
                      <div
                        key={q.id}
                        style={{
                          padding: '12px 14px',
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-md)',
                          border: q.selected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={q.selected}
                          onChange={() => {
                            setGeneratedPreviewQuestions(
                              generatedPreviewQuestions.map((item) =>
                                item.id === q.id ? { ...item, selected: !item.selected } : item
                              )
                            );
                          }}
                          style={{ accentColor: 'var(--primary)', marginTop: '3px' }}
                        />

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <span className="badge badge-secondary" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                              {q.type.replace('_', ' ')}
                            </span>
                            <span className="badge badge-secondary" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                              {q.difficulty}
                            </span>
                            <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                              {q.points} Marks
                            </span>
                          </div>

                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{q.prompt}</div>

                          {q.options.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '4px', marginTop: '6px' }}>
                              {q.options.map((opt) => (
                                <div
                                  key={opt.id}
                                  style={{
                                    padding: '4px 6px',
                                    borderRadius: '3px',
                                    background: opt.isCorrect ? 'var(--success-bg, rgba(16, 185, 129, 0.12))' : 'var(--bg-input)',
                                    color: opt.isCorrect ? 'var(--success)' : 'inherit',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                  }}
                                >
                                  <span>{opt.text}</span>
                                  {opt.isCorrect && <Check size={12} color="var(--success)" />}
                                </div>
                              ))}
                            </div>
                          )}

                          {q.explanation && (
                            <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                              <em>{q.explanation}</em>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setGeneratedPreviewQuestions(generatedPreviewQuestions.filter((item) => item.id !== q.id));
                          }}
                          className="btn-icon"
                          style={{ color: 'var(--danger, #ef4444)' }}
                          title="Remove from generated preview"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* METHOD 4: CREATE MANUALLY */}
          {activeTab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 12px' }}>
                  Compose Question Manually
                </h4>

                <form onSubmit={handleAddManualQuestion}>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      Question Prompt <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <textarea
                      rows={2}
                      className="form-textarea"
                      placeholder="Enter the question text or problem statement..."
                      value={newQuestionPrompt}
                      onChange={(e) => setNewQuestionPrompt(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Question Type
                      </label>
                      <select
                        className="form-select"
                        value={newQuestionType}
                        onChange={(e) => {
                          const nextType = e.target.value as any;
                          setNewQuestionType(nextType);
                          if (nextType === 'true_false') {
                            setNewQuestionOptions([
                              { id: 'opt-tf-1', text: 'True', isCorrect: true },
                              { id: 'opt-tf-2', text: 'False', isCorrect: false },
                            ]);
                          } else if (newQuestionOptions.length < 2) {
                            setNewQuestionOptions([
                              { id: 'opt-1', text: 'Option A', isCorrect: true },
                              { id: 'opt-2', text: 'Option B', isCorrect: false },
                            ]);
                          }
                        }}
                        style={{ fontSize: '0.82rem' }}
                      >
                        <option value="single_choice">Single Choice (1 Correct)</option>
                        <option value="multiple_choice">Multiple Select (Many Correct)</option>
                        <option value="true_false">True / False</option>
                        <option value="short_answer">Short Answer</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Difficulty
                      </label>
                      <select
                        className="form-select"
                        value={newQuestionDifficulty}
                        onChange={(e) => setNewQuestionDifficulty(e.target.value as any)}
                        style={{ fontSize: '0.82rem' }}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Points / Marks
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        className="form-input"
                        value={newQuestionPoints}
                        onChange={(e) => setNewQuestionPoints(Number(e.target.value) || 5)}
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Topic / Tag (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Distributed Tracing"
                        className="form-input"
                        value={newQuestionTopic}
                        onChange={(e) => setNewQuestionTopic(e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>

                  {/* Short answer input */}
                  {newQuestionType === 'short_answer' && (
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                        Expected Correct Answer <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Saga Pattern"
                        value={newQuestionCorrectText}
                        onChange={(e) => setNewQuestionCorrectText(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                  )}

                  {/* Multiple / Single Choice options */}
                  {newQuestionType !== 'short_answer' && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem', margin: 0 }}>
                          Answer Options & Correctness:
                        </label>
                        {newQuestionType !== 'true_false' && (
                          <button
                            type="button"
                            onClick={() =>
                              setNewQuestionOptions([
                                ...newQuestionOptions,
                                { id: `opt-${Date.now()}`, text: '', isCorrect: false },
                              ])
                            }
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                          >
                            + Add Option
                          </button>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {newQuestionOptions.map((opt, oIdx) => (
                          <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type={newQuestionType === 'multiple_choice' ? 'checkbox' : 'radio'}
                              name="correctOptionChoice"
                              checked={opt.isCorrect}
                              onChange={(e) => {
                                if (newQuestionType === 'multiple_choice') {
                                  const updated = [...newQuestionOptions];
                                  updated[oIdx].isCorrect = e.target.checked;
                                  setNewQuestionOptions(updated);
                                } else {
                                  const updated = newQuestionOptions.map((o, idx) => ({
                                    ...o,
                                    isCorrect: idx === oIdx,
                                  }));
                                  setNewQuestionOptions(updated);
                                }
                              }}
                              style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                              title="Mark as correct answer"
                            />
                            <input
                              type="text"
                              className="form-input"
                              placeholder={`Option ${oIdx + 1} text...`}
                              value={opt.text}
                              onChange={(e) => {
                                const updated = [...newQuestionOptions];
                                updated[oIdx].text = e.target.value;
                                setNewQuestionOptions(updated);
                              }}
                              style={{ fontSize: '0.82rem' }}
                            />
                            {newQuestionOptions.length > 2 && newQuestionType !== 'true_false' && (
                              <button
                                type="button"
                                onClick={() =>
                                  setNewQuestionOptions(newQuestionOptions.filter((_, idx) => idx !== oIdx))
                                }
                                className="btn-icon"
                                style={{ color: 'var(--text-muted)' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '14px' }}>
                    <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      Answer Explanation / Rationale
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Explanation displayed to student during post-exam review..."
                      value={newQuestionExplanation}
                      onChange={(e) => setNewQuestionExplanation(e.target.value)}
                      style={{ fontSize: '0.82rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Plus size={14} /> Add Question to Assessment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* METHOD 5: QUESTION BANK SELECTOR */}
          {activeTab === 'question_bank' && (
            <QuestionBankSelectorTab
              existingQuestions={questions}
              onAddQuestions={handleImportQuestions}
              courseTitle={courseTitle}
            />
          )}

          {/* METHOD 6: SETTINGS & PARAMETERS */}
          {activeTab === 'settings' && (
            <AssessmentSettingsTab
              title={title}
              setTitle={setTitle}
              instructions={instructions}
              setInstructions={setInstructions}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              timeLimitMinutes={timeLimitMinutes}
              setTimeLimitMinutes={setTimeLimitMinutes}
              passingPercentage={passingPercentage}
              setPassingPercentage={setPassingPercentage}
              allowedAttempts={allowedAttempts}
              setAllowedAttempts={setAllowedAttempts}
              negativeMarkingEnabled={negativeMarkingEnabled}
              setNegativeMarkingEnabled={setNegativeMarkingEnabled}
              negativeMarksPerQuestion={negativeMarksPerQuestion}
              setNegativeMarksPerQuestion={setNegativeMarksPerQuestion}
              randomizeQuestions={randomizeQuestions}
              setRandomizeQuestions={setRandomizeQuestions}
              randomQuestionCount={randomQuestionCount}
              setRandomQuestionCount={setRandomQuestionCount}
              questions={questions}
              onBatchUpdateMarks={handleBatchUpdateMarks}
            />
          )}

          {/* ALWAYS ACCESSIBLE CONFIGURED QUESTIONS PANEL */}
          <div
            style={{
              marginTop: '10px',
              borderTop: '2px solid var(--border-subtle)',
              paddingTop: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                userSelect: 'none',
                marginBottom: '10px'
              }}
              onClick={() => setIsQuestionsExpanded(!isQuestionsExpanded)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isQuestionsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>
                  Current Assessment Questions ({questions.length})
                </h4>
                <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                  {totalMarks} Total Marks
                </span>
                <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
                  Pass: {passingPercentage}%
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                {questions.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => exportQuestionsToCsv(questions, `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_questions.csv`)}
                    style={{ fontSize: '0.75rem', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Download size={12} /> Export CSV
                  </button>
                )}
                <span className="text-muted text-xs" style={{ alignSelf: 'center' }}>
                  {isQuestionsExpanded ? 'Click to collapse' : 'Click to expand'}
                </span>
              </div>
            </div>

            {isQuestionsExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {questions.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '24px',
                      background: 'var(--bg-input)',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <HelpCircle size={22} style={{ margin: '0 auto 6px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600 }}>No questions added to this assessment yet.</div>
                    <p className="text-xs" style={{ marginTop: '4px' }}>
                      Import questions via Excel/CSV, PDF/Word, AI generation, Manual mode, or the Question Bank above.
                    </p>
                  </div>
                ) : (
                  questions.map((q, idx) => {
                    const isEditing = editingAssessmentQuestionId === q.id;

                    return (
                      <div
                        key={q.id}
                        style={{
                          padding: '10px 14px',
                          background: 'var(--bg-input)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)', width: '24px' }}>
                              #{idx + 1}
                            </span>

                            <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                              <button
                                type="button"
                                onClick={() => handleMoveQuestion(idx, 'up')}
                                disabled={idx === 0}
                                className="btn-icon"
                                style={{ padding: 0, opacity: idx === 0 ? 0.3 : 1 }}
                                title="Move up"
                              >
                                <ArrowUp size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveQuestion(idx, 'down')}
                                disabled={idx === questions.length - 1}
                                className="btn-icon"
                                style={{ padding: 0, opacity: idx === questions.length - 1 ? 0.3 : 1 }}
                                title="Move down"
                              >
                                <ArrowDown size={11} />
                              </button>
                            </div>

                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  className="form-input"
                                  value={q.prompt}
                                  onChange={(e) => {
                                    const updated = [...questions];
                                    updated[idx].prompt = e.target.value;
                                    setQuestions(updated);
                                  }}
                                  style={{ fontSize: '0.82rem', fontWeight: 600, padding: '4px 6px' }}
                                />
                              ) : (
                                <div style={{ fontWeight: 600, fontSize: '0.84rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {q.prompt}
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                                <span className="badge badge-secondary" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                                  {q.type.replace('_', ' ')}
                                </span>
                                <span className="badge badge-secondary" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                                  {q.difficulty}
                                </span>
                                {q.source && (
                                  <span className="badge badge-secondary" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                                    {q.source}
                                  </span>
                                )}
                                {q.topic && (
                                  <span className="text-muted text-xs">Topic: {q.topic}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={q.points}
                                onChange={(e) => {
                                  const updated = [...questions];
                                  updated[idx].points = Math.max(1, parseInt(e.target.value) || 5);
                                  setQuestions(updated);
                                }}
                                style={{
                                  width: '45px',
                                  padding: '2px 4px',
                                  fontSize: '0.78rem',
                                  textAlign: 'center',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-subtle)',
                                  background: 'var(--bg-surface)'
                                }}
                              />
                              <span className="text-xs text-muted">pts</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditingAssessmentQuestionId(isEditing ? null : q.id)}
                              className="btn-icon"
                              title={isEditing ? 'Done' : 'Edit question prompt'}
                              style={{ color: isEditing ? 'var(--primary)' : 'var(--text-muted)' }}
                            >
                              <Edit2 size={13} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="btn-icon"
                              style={{ color: 'var(--danger, #ef4444)' }}
                              title="Delete question"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Options preview */}
                        {q.type !== 'short_answer' && q.options && q.options.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', paddingLeft: '34px' }}>
                            {q.options.map((opt, oI) => (
                              <span
                                key={opt.id || oI}
                                style={{
                                  fontSize: '0.72rem',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  background: opt.isCorrect ? 'var(--success-bg, rgba(16, 185, 129, 0.12))' : 'var(--bg-surface)',
                                  color: opt.isCorrect ? 'var(--success)' : 'var(--text-secondary)',
                                  border: opt.isCorrect ? '1px solid var(--success)' : '1px solid var(--border-subtle)'
                                }}
                              >
                                {opt.text} {opt.isCorrect && '✓'}
                              </span>
                            ))}
                          </div>
                        )}

                        {q.type === 'short_answer' && q.correctAnswerText && (
                          <div style={{ paddingLeft: '34px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Expected Answer: <strong style={{ color: 'var(--success)' }}>{q.correctAnswerText}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="text-sm font-semibold">{title}</span>
            <span className="badge badge-primary">
              {questions.length} Questions &bull; {totalMarks} Total Marks
            </span>
            <span className="badge badge-secondary">
              Pass: {passingPercentage}% &bull; Time: {timeLimitMinutes}m
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={questions.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
              <CheckCircle2 size={16} /> Save Assessment ({questions.length} Questions, {totalMarks} Marks)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
