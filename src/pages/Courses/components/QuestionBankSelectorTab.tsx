import React, { useState, useMemo } from 'react';
import {
  Database, Search, Filter, Check, Plus, Download, Eye,
  CheckCircle2, AlertCircle, Layers, Tag, X, Award, HelpCircle
} from 'lucide-react';
import { QuestionBank, Question, QuizQuestionItem, QuizOption } from '../../../types';
import { mockQuestionBanks, mockQuestions } from '../../../data/mockData';
import { exportQuestionsToCsv } from './csvTemplateUtils';

interface Props {
  existingQuestions: QuizQuestionItem[];
  onAddQuestions: (questionsToAdd: QuizQuestionItem[]) => void;
  courseTitle: string;
}

export const QuestionBankSelectorTab: React.FC<Props> = ({
  existingQuestions,
  onAddQuestions,
  courseTitle
}) => {
  const [banks] = useState<QuestionBank[]>(mockQuestionBanks);
  const [allQuestions] = useState<Question[]>(mockQuestions);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  // Selected for addition
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Question detail preview drawer
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Set of prompts already present in the assessment to check duplicates
  const existingPromptsSet = useMemo(() => {
    return new Set(existingQuestions.map((q) => q.prompt.trim().toLowerCase()));
  }, [existingQuestions]);

  // Filtered Questions
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      // Bank filter
      if (selectedBankId !== 'all' && q.bankId !== selectedBankId) {
        return false;
      }
      // Type filter
      if (selectedType !== 'all' && q.type !== selectedType) {
        return false;
      }
      // Difficulty filter
      if (selectedDifficulty !== 'all' && q.difficulty !== selectedDifficulty) {
        return false;
      }
      // Search text
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const promptMatch = q.prompt.toLowerCase().includes(query);
        const tagMatch = q.tags?.some((t) => t.toLowerCase().includes(query));
        const expMatch = q.explanation?.toLowerCase().includes(query);
        return promptMatch || tagMatch || expMatch;
      }
      return true;
    });
  }, [allQuestions, selectedBankId, selectedType, selectedDifficulty, searchQuery]);

  const handleToggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedQuestionIds);
    filteredQuestions.forEach((q) => {
      if (!existingPromptsSet.has(q.prompt.trim().toLowerCase())) {
        next.add(q.id);
      }
    });
    setSelectedQuestionIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedQuestionIds(new Set());
  };

  const convertToQuizItem = (q: Question): QuizQuestionItem => {
    let mappedOptions: QuizOption[] = [];
    if (q.type === 'true_false') {
      const isTrue = (q.correctAnswer || '').toLowerCase() === 'true';
      mappedOptions = [
        { id: `opt-${q.id}-t`, text: 'True', isCorrect: isTrue },
        { id: `opt-${q.id}-f`, text: 'False', isCorrect: !isTrue }
      ];
    } else if (q.options && q.options.length > 0) {
      mappedOptions = q.options.map((o) => ({
        id: o.id || `opt-${q.id}-${Math.random()}`,
        text: o.text,
        isCorrect: Boolean(o.isCorrect)
      }));
    }

    let mappedType: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_answer' = 'single_choice';
    if (q.type === 'multiple_choice') mappedType = 'multiple_choice';
    else if (q.type === 'true_false') mappedType = 'true_false';
    else if (q.type === 'short_answer' || q.type === 'short_text') mappedType = 'short_answer';

    return {
      id: `qb-ref-${q.id}-${Date.now()}`,
      prompt: q.prompt,
      type: mappedType,
      options: mappedOptions,
      points: q.points || 5,
      difficulty: q.difficulty,
      topic: q.tags?.join(', '),
      explanation: q.explanation,
      correctAnswerText: q.correctAnswer,
      source: 'question_bank'
    };
  };

  const handleAddSelected = () => {
    const toAdd = allQuestions
      .filter((q) => selectedQuestionIds.has(q.id))
      .map(convertToQuizItem);

    if (toAdd.length === 0) return;
    onAddQuestions(toAdd);
    setSelectedQuestionIds(new Set());
  };

  const handleExportFilteredToCsv = () => {
    const quizItems = filteredQuestions.map(convertToQuizItem);
    exportQuestionsToCsv(quizItems, `question_bank_export_${selectedBankId}.csv`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Strip */}
      <div
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(99, 102, 241, 0.06))',
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
              background: 'rgba(168, 85, 247, 0.15)',
              color: 'var(--accent-purple, #a855f7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Database size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
              Reusable Institution Question Bank
            </div>
            <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
              Browse verified questions across academic departments, subjects, and Bloom's taxonomy difficulty levels.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleExportFilteredToCsv}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}
        >
          <Download size={13} /> Export Filtered to CSV
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          background: 'var(--bg-input)',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', gridColumn: 'span 2' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search questions by text or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '0.82rem', padding: '6px 32px' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Bank / Subject Filter */}
        <div>
          <select
            className="form-select"
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
            style={{ fontSize: '0.82rem', padding: '6px 10px' }}
          >
            <option value="all">All Repositories ({banks.length})</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.subject})
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            className="form-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            style={{ fontSize: '0.82rem', padding: '6px 10px' }}
          >
            <option value="all">All Question Types</option>
            <option value="single_choice">Single Choice</option>
            <option value="multiple_choice">Multiple Select</option>
            <option value="true_false">True / False</option>
            <option value="short_answer">Short Answer</option>
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <select
            className="form-select"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            style={{ fontSize: '0.82rem', padding: '6px 10px' }}
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="text-muted">Showing {filteredQuestions.length} questions</span>
          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
            {selectedQuestionIds.size} Selected
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleSelectAllFiltered}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            Select All Available
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDeselectAll}
            disabled={selectedQuestionIds.size === 0}
            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
          >
            Deselect
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '380px',
          overflowY: 'auto'
        }}
      >
        {filteredQuestions.map((q) => {
          const isSelected = selectedQuestionIds.has(q.id);
          const isAlreadyInAssessment = existingPromptsSet.has(q.prompt.trim().toLowerCase());

          return (
            <div
              key={q.id}
              onClick={() => {
                if (!isAlreadyInAssessment) {
                  handleToggleQuestion(q.id);
                }
              }}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: isSelected
                  ? 'var(--primary-light, rgba(99, 102, 241, 0.08))'
                  : 'var(--bg-input)',
                border: isSelected
                  ? '1px solid var(--primary)'
                  : isAlreadyInAssessment
                  ? '1px solid var(--border-subtle)'
                  : '1px solid var(--border-subtle)',
                opacity: isAlreadyInAssessment ? 0.65 : 1,
                cursor: isAlreadyInAssessment ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isAlreadyInAssessment}
                  onChange={() => handleToggleQuestion(q.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ accentColor: 'var(--primary)', marginTop: '3px', cursor: isAlreadyInAssessment ? 'not-allowed' : 'pointer' }}
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

                    {isAlreadyInAssessment && (
                      <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                        <Check size={10} style={{ marginRight: '3px' }} /> Already in Assessment
                      </span>
                    )}

                    {q.tags && q.tags.length > 0 && (
                      <span className="text-muted text-xs">
                        Tags: {q.tags.join(', ')}
                      </span>
                    )}
                  </div>

                  <div style={{ fontWeight: 600, fontSize: '0.86rem', margin: '4px 0' }}>
                    {q.prompt}
                  </div>

                  {/* Options snippet */}
                  {q.options && q.options.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {q.options.map((opt, i) => (
                        <span
                          key={opt.id || i}
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            background: opt.isCorrect ? 'var(--success-bg, rgba(16, 185, 129, 0.12))' : 'var(--bg-surface)',
                            color: opt.isCorrect ? 'var(--success)' : 'var(--text-secondary)',
                            fontWeight: opt.isCorrect ? 600 : 400
                          }}
                        >
                          {opt.text} {opt.isCorrect && '✓'}
                        </span>
                      ))}
                    </div>
                  )}

                  {q.type === 'short_answer' && q.correctAnswer && (
                    <div className="text-muted text-xs" style={{ marginTop: '4px' }}>
                      Answer: <strong>{q.correctAnswer}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setPreviewQuestion(previewQuestion?.id === q.id ? null : q)}
                  className="btn-icon"
                  title="View full question details"
                  style={{ color: previewQuestion?.id === q.id ? 'var(--primary)' : 'var(--text-secondary)' }}
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {filteredQuestions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
            <HelpCircle size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div>No matching questions found in the Question Bank.</div>
            <p className="text-xs" style={{ marginTop: '4px' }}>
              Try adjusting your search terms or clearing the subject/difficulty filters.
            </p>
          </div>
        )}
      </div>

      {/* Selected Preview Drawer / Details Box */}
      {previewQuestion && (
        <div
          style={{
            padding: '14px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.82rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 700 }}>Question Details & Scoring Rationale</span>
            <button
              type="button"
              onClick={() => setPreviewQuestion(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ fontWeight: 600, marginBottom: '6px' }}>{previewQuestion.prompt}</div>

          {previewQuestion.options && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              {previewQuestion.options.map((opt, i) => (
                <div
                  key={i}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: opt.isCorrect ? 'var(--success-bg, rgba(16, 185, 129, 0.12))' : 'var(--bg-input)',
                    color: opt.isCorrect ? 'var(--success)' : 'inherit',
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

          {previewQuestion.explanation && (
            <div className="text-muted text-xs">
              <strong>Explanation:</strong> {previewQuestion.explanation}
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Bar */}
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
          Selected questions will be added to the assessment without duplicating existing questions.
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleAddSelected}
          disabled={selectedQuestionIds.size === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <Plus size={15} /> Add {selectedQuestionIds.size} Questions to Assessment
        </button>
      </div>
    </div>
  );
};
