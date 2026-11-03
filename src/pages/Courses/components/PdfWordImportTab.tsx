import React, { useState, useRef } from 'react';
import {
  FileText, Upload, AlertCircle, CheckCircle2, Trash2, Edit2,
  AlertTriangle, Check, RefreshCw, X, HelpCircle, Layers,
  ChevronDown, ChevronUp, Eye, Sparkles, Filter, Info
} from 'lucide-react';
import { QuizQuestionItem, QuizOption } from '../../../types';
import { extractDocumentContent } from '../../../lib/documentParser';
import { generateAssessmentQuestionsViaGateway } from '../../../lib/aiAssessmentService';
import { ConfirmationModal } from './ConfirmationModal';

interface Props {
  existingQuestions: QuizQuestionItem[];
  onImportQuestions: (importedQuestions: QuizQuestionItem[]) => void;
  courseTitle: string;
  moduleTitle?: string;
  lessonTitle?: string;
}

export const PdfWordImportTab: React.FC<Props> = ({
  existingQuestions,
  onImportQuestions,
  courseTitle,
  moduleTitle,
  lessonTitle
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Extracted questions state
  const [extractedQuestions, setExtractedQuestions] = useState<
    (QuizQuestionItem & { selected: boolean })[]
  >([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterNeedsReviewOnly, setFilterNeedsReviewOnly] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<QuizQuestionItem | null>(null);
  const [processingStatusText, setProcessingStatusText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processingStages = [
    'Reading document binary & font streams...',
    'Detecting headings, sections & paragraphs...',
    'Analyzing document semantics & extracting facts...',
    'Synthesizing curriculum questions via LMS AI Gateway...'
  ];

  const handleProcessDocument = async (uploadedFile: File) => {
    setErrorMessage(null);
    if (!uploadedFile.name.match(/\.(pdf|docx|doc|txt)$/i)) {
      setErrorMessage('Unsupported document type. Please upload a .pdf, .docx, or .txt file.');
      return;
    }

    if (uploadedFile.size > 25 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 25MB limit.');
      return;
    }

    setFile(uploadedFile);
    setIsProcessing(true);
    setProcessingStage(0);
    setProcessingStatusText(`Extracting text from "${uploadedFile.name}"...`);

    try {
      // 1. Real document text extraction (PDF via pdfjs-dist / DOCX via JSZip / TXT)
      const parseResult = await extractDocumentContent(uploadedFile, (progress, stage, msg) => {
        setProcessingStatusText(msg);
        if (progress < 25) setProcessingStage(0);
        else if (progress < 50) setProcessingStage(1);
        else if (progress < 75) setProcessingStage(2);
        else setProcessingStage(3);
      });

      if (!parseResult.success || !parseResult.docInfo?.text) {
        setErrorMessage(parseResult.error || 'Failed to extract text from the document.');
        setIsProcessing(false);
        return;
      }

      setProcessingStage(3);
      setProcessingStatusText(`Synthesizing grounded questions from "${uploadedFile.name}" via LMS AI Gateway...`);
      const cleanTopic = lessonTitle || moduleTitle || courseTitle || uploadedFile.name.replace(/\.[^/.]+$/, '');

      // 2. Pass actual extracted document text to AI Gateway / Grounded Engine
      const genResult = await generateAssessmentQuestionsViaGateway({
        documentName: uploadedFile.name,
        documentText: parseResult.docInfo.text,
        topic: cleanTopic,
        count: 6,
        difficulty: 'medium',
        types: ['single_choice', 'multiple_choice', 'true_false', 'short_answer'],
        pointsPerQuestion: 5,
        allowGroundedFallback: true,
      });

      if (!genResult.success || genResult.questions.length === 0) {
        setErrorMessage(genResult.error || 'No questions could be formulated from this document.');
        setIsProcessing(false);
        return;
      }

      const questionsWithSelection = genResult.questions.map((q) => ({
        ...q,
        source: 'pdf_word' as const,
        selected: true,
      }));

      setExtractedQuestions(questionsWithSelection);
    } catch (err: any) {
      setErrorMessage(err?.message || 'An error occurred while processing the document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleSelectQuestion = (id: string) => {
    setExtractedQuestions(
      extractedQuestions.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setExtractedQuestions(extractedQuestions.map((q) => ({ ...q, selected: select })));
  };

  const handleUpdateQuestion = (id: string, updates: Partial<QuizQuestionItem>) => {
    setExtractedQuestions(
      extractedQuestions.map((q) => (q.id === id ? { ...q, ...updates, needsReview: false } : q))
    );
  };

  const confirmDeleteQuestion = () => {
    if (questionToDelete) {
      setExtractedQuestions((prev) => prev.filter((q) => q.id !== questionToDelete.id));
      setQuestionToDelete(null);
    }
  };

  const selectedCount = extractedQuestions.filter((q) => q.selected).length;
  const needsReviewCount = extractedQuestions.filter((q) => q.needsReview).length;

  const displayedQuestions = filterNeedsReviewOnly
    ? extractedQuestions.filter((q) => q.needsReview)
    : extractedQuestions;

  const triggerImport = () => {
    const toImport = extractedQuestions.filter((q) => q.selected);
    if (toImport.length === 0) {
      alert('Please select at least one question to import.');
      return;
    }

    const cleaned: QuizQuestionItem[] = toImport.map((q) => {
      const { selected, ...rest } = q;
      return rest;
    });

    onImportQuestions(cleaned);
    setFile(null);
    setExtractedQuestions([]);
    setShowConfirmModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Banner */}
      <div
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(99, 102, 241, 0.06))',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: 'var(--accent-cyan, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
              Import Questions from PDF / Word Document
            </div>
            <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
              Extract questions, answer choices, marks, and answer keys directly from exam papers and reading materials.
            </p>
          </div>
        </div>

        <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>
          Supports .pdf, .docx, .doc (Max 25MB)
        </span>
      </div>

      {/* Upload Drop Zone */}
      {!file && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleProcessDocument(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragging ? '2px dashed var(--accent-cyan, #06b6d4)' : '2px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 20px',
            textAlign: 'center',
            background: isDragging ? 'rgba(6, 182, 212, 0.08)' : 'var(--bg-input)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf, .docx, .doc, application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleProcessDocument(e.target.files[0]);
              }
            }}
          />

          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.12)',
              color: 'var(--accent-cyan, #06b6d4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}
          >
            <Upload size={22} />
          </div>

          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
            Click to upload or drag & drop a PDF / Word question paper
          </div>
          <p className="text-secondary text-xs" style={{ margin: 0 }}>
            Ideal for existing question sheets, midterm test documents, and curriculum handouts
          </p>

          <div
            style={{
              marginTop: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}
          >
            <Sparkles size={13} color="var(--accent-cyan, #06b6d4)" />
            <span>Document-Grounded Question Extraction: Questions are parsed from document text into an editable preview before importing.</span>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--danger-bg, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--danger, #ef4444)',
            color: 'var(--danger, #ef4444)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Processing Animation */}
      {isProcessing && (
        <div
          style={{
            padding: '30px 20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}
        >
          <RefreshCw size={26} className="spin" style={{ margin: '0 auto 12px', color: 'var(--accent-cyan, #06b6d4)', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
            Processing "{file?.name}"
          </div>
          <p className="text-secondary text-xs" style={{ margin: '0 auto 16px', maxWidth: '420px' }}>
            {processingStatusText || processingStages[processingStage]}
          </p>

          {/* Stepper Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {processingStages.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === processingStage ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i <= processingStage ? 'var(--accent-cyan, #06b6d4)' : 'var(--border-subtle)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Extracted Questions Preview */}
      {file && !isProcessing && extractedQuestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Summary Strip & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="text-sm font-semibold">{file.name}</span>
              <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>
                {extractedQuestions.length} Extracted
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                {selectedCount} Selected for Import
              </span>
              {needsReviewCount > 0 && (
                <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>
                  <AlertTriangle size={11} style={{ marginRight: '3px' }} /> {needsReviewCount} Needs Review
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setFilterNeedsReviewOnly(!filterNeedsReviewOnly)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  border: '1px solid var(--border-subtle)',
                  background: filterNeedsReviewOnly ? 'var(--warning)' : 'var(--bg-surface)',
                  color: filterNeedsReviewOnly ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Filter size={11} /> {filterNeedsReviewOnly ? 'Showing Needs Review' : 'Filter Needs Review'}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSelectAll(selectedCount !== extractedQuestions.length)}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                {selectedCount === extractedQuestions.length ? 'Deselect All' : 'Select All'}
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setFile(null);
                  setExtractedQuestions([]);
                }}
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              >
                Upload Different File
              </button>
            </div>
          </div>

          {/* Transparent Notice */}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 182, 212, 0.06)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Info size={14} color="var(--accent-cyan, #06b6d4)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Document Review Notice:</strong> Items badged with <strong>Needs Review</strong> had missing or ambiguous answer keys in the document. Verify or set correct answers before importing.
            </span>
          </div>

          {/* Extracted Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
            {displayedQuestions.map((q, idx) => {
              const isEditing = editingId === q.id;

              return (
                <div
                  key={q.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: q.selected ? 'var(--bg-surface)' : 'var(--bg-input)',
                    border: q.needsReview
                      ? '1px solid var(--warning, #f59e0b)'
                      : q.selected
                      ? '1px solid var(--primary)'
                      : '1px solid var(--border-subtle)',
                    opacity: q.selected ? 1 : 0.65,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={q.selected}
                        onChange={() => handleToggleSelectQuestion(q.id)}
                        style={{ accentColor: 'var(--primary)', marginTop: '4px', cursor: 'pointer' }}
                        title="Include in import"
                      />

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                            {q.type.replace('_', ' ')}
                          </span>
                          <span className="badge badge-secondary" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                            {q.difficulty}
                          </span>
                          <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                            {q.points} Marks
                          </span>
                          {q.needsReview && (
                            <span className="badge badge-warning" style={{ fontSize: '0.68rem' }}>
                              <AlertTriangle size={10} style={{ marginRight: '3px' }} /> Needs Review
                            </span>
                          )}
                          {q.topic && (
                            <span className="text-muted text-xs">Topic: {q.topic}</span>
                          )}
                        </div>

                        {/* Question Text (editable if in edit mode) */}
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                            <input
                              type="text"
                              value={q.prompt}
                              onChange={(e) => handleUpdateQuestion(q.id, { prompt: e.target.value })}
                              className="form-input"
                              style={{ fontSize: '0.85rem', fontWeight: 600 }}
                            />

                            <div style={{ display: 'flex', gap: '10px' }}>
                              <div style={{ flex: 1 }}>
                                <label className="text-muted text-xs">Difficulty</label>
                                <select
                                  value={q.difficulty}
                                  onChange={(e) => handleUpdateQuestion(q.id, { difficulty: e.target.value as any })}
                                  className="form-select"
                                  style={{ fontSize: '0.78rem' }}
                                >
                                  <option value="easy">Easy</option>
                                  <option value="medium">Medium</option>
                                  <option value="hard">Hard</option>
                                </select>
                              </div>

                              <div style={{ width: '80px' }}>
                                <label className="text-muted text-xs">Marks</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={q.points}
                                  onChange={(e) => handleUpdateQuestion(q.id, { points: Number(e.target.value) || 5 })}
                                  className="form-input"
                                  style={{ fontSize: '0.78rem' }}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', margin: '4px 0' }}>
                            {q.prompt}
                          </div>
                        )}

                        {/* Options */}
                        {q.type !== 'short_answer' && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '6px', marginTop: '8px' }}>
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={opt.id}
                                onClick={() => {
                                  // Toggle correct state
                                  const updatedOptions = q.options.map((o) =>
                                    q.type === 'single_choice' || q.type === 'true_false'
                                      ? { ...o, isCorrect: o.id === opt.id }
                                      : o.id === opt.id
                                      ? { ...o, isCorrect: !o.isCorrect }
                                      : o
                                  );
                                  handleUpdateQuestion(q.id, { options: updatedOptions });
                                }}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  background: opt.isCorrect ? 'var(--success-bg, rgba(16, 185, 129, 0.12))' : 'var(--bg-input)',
                                  border: opt.isCorrect ? '1px solid var(--success)' : '1px solid var(--border-subtle)',
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer'
                                }}
                              >
                                <span>
                                  <strong>{['A', 'B', 'C', 'D'][oIdx] || oIdx + 1}.</strong> {opt.text}
                                </span>
                                {opt.isCorrect && <Check size={12} color="var(--success)" />}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'short_answer' && (
                          <div style={{ marginTop: '6px', fontSize: '0.78rem', background: 'var(--bg-input)', padding: '6px 10px', borderRadius: '4px' }}>
                            <span className="text-muted">Expected Answer: </span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={q.correctAnswerText || ''}
                                onChange={(e) => handleUpdateQuestion(q.id, { correctAnswerText: e.target.value })}
                                className="form-input"
                                style={{ fontSize: '0.78rem', marginTop: '4px' }}
                              />
                            ) : (
                              <strong>{q.correctAnswerText}</strong>
                            )}
                          </div>
                        )}

                        {q.explanation && (
                          <div className="text-muted text-xs" style={{ marginTop: '6px' }}>
                            <em>Explanation: {q.explanation}</em>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setEditingId(isEditing ? null : q.id)}
                        className="btn-icon"
                        title={isEditing ? 'Done editing' : 'Edit question text & options'}
                        style={{ color: isEditing ? 'var(--primary)' : 'var(--text-secondary)' }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestionToDelete(q)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-sm, 6px)',
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                        }}
                        title="Delete Question"
                        aria-label="Delete Question"
                      >
                        <Trash2 size={13} style={{ strokeWidth: 2.2 }} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Confirmation Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div className="text-xs text-secondary">
              Selected questions will be converted and appended to the current assessment.
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (selectedCount > 15) {
                  setShowConfirmModal(true);
                } else {
                  triggerImport();
                }
              }}
              disabled={selectedCount === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <CheckCircle2 size={15} /> Import {selectedCount} Selected Questions
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px'
          }}
        >
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '24px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 700 }}>Confirm Document Import</h4>
            <p className="text-secondary text-sm" style={{ margin: '0 0 16px' }}>
              Import <strong>{selectedCount} questions</strong> extracted from <strong>{file?.name}</strong> into this assessment?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={triggerImport}
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Delete Confirmation Dialog */}
      <ConfirmationModal
        isOpen={Boolean(questionToDelete)}
        title="Delete Question"
        message={`Are you sure you want to delete this question? "${questionToDelete?.prompt?.slice(0, 90)}..." This action cannot be undone.`}
        confirmLabel="Delete Question"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setQuestionToDelete(null)}
        isDestructive={true}
      />
    </div>
  );
};
