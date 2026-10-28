import React, { useState, useEffect } from 'react';
import { QuestionBank, Question, QuizQuestionItem, QuestionType } from '../../types';
import { exportQuestionsToCsv } from '../Courses/components/csvTemplateUtils';
import {
  HelpCircle, Plus, Search, Edit2, CheckCircle2, Trash2,
  FileQuestion, Check, X, Eye, Tag, AlertCircle, Download, Upload,
  Layers, Filter, Sparkles
} from 'lucide-react';
import { BulkUploadModal } from './components/BulkUploadModal';
import {
  getStoredQuestionBanks,
  saveStoredQuestionBanks,
  getStoredQuestions,
  saveStoredQuestions,
  createNewQuestionBank,
  AddQuestionsResult
} from '../../lib/questionBankStorage';

export const QuestionBanksPage: React.FC = () => {
  // Repositories & Questions from persistent storage
  const [banks, setBanks] = useState<QuestionBank[]>(() => getStoredQuestionBanks());
  const [selectedBank, setSelectedBank] = useState<QuestionBank>(() => {
    const loaded = getStoredQuestionBanks();
    return loaded[0] || {
      id: 'qb-001',
      name: 'JavaScript Basics',
      owner: 'Trainer',
      subject: 'JavaScript',
      tags: ['variables'],
      questionCount: 0,
      version: 1,
      status: 'published',
      scope: 'organization',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
  const [questions, setQuestions] = useState<Question[]>(() => getStoredQuestions());

  // Search & Filter within active bank
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Modals state
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [isNewBankModalOpen, setIsNewBankModalOpen] = useState(false);

  // New Bank form
  const [newBankName, setNewBankName] = useState('');
  const [newBankSubject, setNewBankSubject] = useState('');

  // Question form states (used for Add and Edit)
  const [qPrompt, setQPrompt] = useState('');
  const [qType, setQType] = useState<'single_choice' | 'multiple_choice' | 'true_false' | 'short_text' | 'long_text'>('single_choice');
  const [qPoints, setQPoints] = useState(5);
  const [qDifficulty, setQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [qOptions, setQOptions] = useState<string[]>(['Option A', 'Option B', 'Option C', 'Option D']);
  const [qCorrectAnswer, setQCorrectAnswer] = useState('0');
  const [qExplanation, setQExplanation] = useState('');

  // Keep selectedBank updated with latest counts
  useEffect(() => {
    const updated = banks.find((b) => b.id === selectedBank.id);
    if (updated) {
      setSelectedBank(updated);
    }
  }, [banks]);

  // Questions in currently selected repository
  const bankQuestions = questions.filter((q) => q.bankId === selectedBank.id);

  // Filtered Questions
  const filteredQuestions = bankQuestions.filter((q) => {
    if (searchQuery.trim()) {
      const qLower = searchQuery.toLowerCase();
      const promptMatch = q.prompt.toLowerCase().includes(qLower);
      const tagMatch = q.tags?.some((t) => t.toLowerCase().includes(qLower));
      if (!promptMatch && !tagMatch) return false;
    }
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) {
      return false;
    }
    if (filterType !== 'all') {
      if (filterType === 'single_choice' && q.type !== 'single_choice') return false;
      if (filterType === 'multiple_choice' && q.type !== 'multiple_choice') return false;
      if (filterType === 'true_false' && q.type !== 'true_false') return false;
      if ((filterType === 'short_text' || filterType === 'short_answer') && q.type !== 'short_text' && q.type !== 'short_answer') return false;
      if ((filterType === 'long_text' || filterType === 'essay') && q.type !== 'long_text' && q.type !== 'essay') return false;
    }
    return true;
  });

  // Handle open Add Question modal
  const handleOpenAddQuestion = () => {
    setEditingQuestion(null);
    setQPrompt('');
    setQType('single_choice');
    setQPoints(5);
    setQDifficulty('medium');
    setQOptions(['Option A', 'Option B', 'Option C', 'Option D']);
    setQCorrectAnswer('0');
    setQExplanation('');
    setIsQuestionModalOpen(true);
  };

  // Handle open Edit Question modal
  const handleOpenEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQPrompt(q.prompt);
    const mappedType = q.type === 'short_answer' ? 'short_text' : q.type === 'essay' ? 'long_text' : (q.type as any);
    setQType(mappedType);
    setQPoints(q.points || 5);
    setQDifficulty(q.difficulty || 'medium');

    if (q.options && q.options.length > 0) {
      setQOptions(q.options.map((o) => o.text));
      const correctIdx = q.options.findIndex((o) => o.isCorrect);
      setQCorrectAnswer(correctIdx >= 0 ? `${correctIdx}` : '0');
    } else {
      setQOptions(['Option A', 'Option B', 'Option C', 'Option D']);
      setQCorrectAnswer(q.correctAnswer || '0');
    }

    setQExplanation(q.explanation || '');
    setIsQuestionModalOpen(true);
  };

  // Handle save (create or update) question
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingQuestion) {
      // Update existing
      const updatedList = questions.map((item) => {
        if (item.id !== editingQuestion.id) return item;
        return {
          ...item,
          prompt: qPrompt,
          type: qType as any,
          points: qPoints,
          difficulty: qDifficulty,
          options: qType === 'single_choice' || qType === 'multiple_choice'
            ? qOptions.map((opt, i) => ({ id: `opt-${i}`, text: opt, isCorrect: qCorrectAnswer === `${i}` }))
            : undefined,
          correctAnswer: qType === 'true_false' || qType === 'short_text' ? qCorrectAnswer : undefined,
          explanation: qExplanation,
          updatedAt: new Date().toISOString()
        };
      });

      setQuestions(updatedList);
      saveStoredQuestions(updatedList);
    } else {
      // Create new
      const newQ: Question = {
        id: `q-${Date.now()}`,
        bankId: selectedBank.id,
        prompt: qPrompt,
        type: qType as any,
        points: qPoints,
        difficulty: qDifficulty,
        options: qType === 'single_choice' || qType === 'multiple_choice'
          ? qOptions.map((opt, i) => ({ id: `opt-${i}`, text: opt, isCorrect: qCorrectAnswer === `${i}` }))
          : undefined,
        correctAnswer: qType === 'true_false' || qType === 'short_text' ? qCorrectAnswer : undefined,
        explanation: qExplanation,
        tags: [selectedBank.subject.toLowerCase().replace(/\s+/g, '-'), 'manual'],
        version: 1,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const updatedList = [newQ, ...questions];
      setQuestions(updatedList);
      saveStoredQuestions(updatedList);

      // Update bank count
      const updatedBanks = banks.map((b) =>
        b.id === selectedBank.id ? { ...b, questionCount: (b.questionCount || 0) + 1 } : b
      );
      setBanks(updatedBanks);
      saveStoredQuestionBanks(updatedBanks);
    }

    setIsQuestionModalOpen(false);
  };

  // Handle delete question
  const handleDeleteQuestion = (questionId: string) => {
    if (!confirm('Are you sure you want to remove this question from the repository?')) return;

    const updated = questions.filter((q) => q.id !== questionId);
    setQuestions(updated);
    saveStoredQuestions(updated);

    const updatedBanks = banks.map((b) =>
      b.id === selectedBank.id ? { ...b, questionCount: Math.max(0, (b.questionCount || 1) - 1) } : b
    );
    setBanks(updatedBanks);
    saveStoredQuestionBanks(updatedBanks);
  };

  // Handle CSV Export
  const handleExportBank = () => {
    const quizQuestions: QuizQuestionItem[] = bankQuestions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      type: (q.type === 'multiple_choice' ? 'multiple_choice' : q.type === 'true_false' ? 'true_false' : q.type === 'short_text' ? 'short_answer' : 'single_choice') as any,
      points: q.points || 5,
      difficulty: q.difficulty || 'medium',
      options: (q.options || []).map((opt) => ({
        id: opt.id,
        text: opt.text,
        isCorrect: !!opt.isCorrect
      })),
      correctAnswerText: q.correctAnswer,
      explanation: q.explanation || '',
      topic: selectedBank.subject
    }));
    exportQuestionsToCsv(quizQuestions, `${selectedBank.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_questions.csv`);
  };

  // Handle Bulk Upload completion
  const handleImportComplete = (result: AddQuestionsResult, targetBankId: string) => {
    // Reload fresh data from storage
    const freshBanks = getStoredQuestionBanks();
    const freshQuestions = getStoredQuestions();

    setBanks(freshBanks);
    setQuestions(freshQuestions);

    const targetBank = freshBanks.find((b) => b.id === targetBankId) || result.updatedBank;
    if (targetBank) {
      setSelectedBank(targetBank);
    }
  };

  // Handle Create Repository
  const handleCreateNewBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;

    const created = createNewQuestionBank(newBankName, newBankSubject || 'General');
    const freshBanks = getStoredQuestionBanks();
    setBanks(freshBanks);
    setSelectedBank(created);
    setNewBankName('');
    setNewBankSubject('');
    setIsNewBankModalOpen(false);
  };

  return (
    <div>
      {/* Top Header Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Question Banks & Authoring</h1>
          <p className="text-secondary text-sm">Reusable question pools, Bloom taxonomy difficulties, answer keys, and rubric scoring</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* 1. Bulk Upload Button (Prompt: "Add a clear Bulk Upload button beside them. Recommended header actions: Bulk Upload, Export Bank, Add Question") */}
          <button
            className="btn btn-secondary"
            onClick={() => setIsBulkUploadOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={14} /> Bulk Upload
          </button>

          {/* 2. Export Bank */}
          <button
            className="btn btn-secondary"
            onClick={handleExportBank}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} /> Export Bank (.csv)
          </button>

          {/* 3. Add Question */}
          <button
            className="btn btn-primary"
            onClick={handleOpenAddQuestion}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Question
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left: Question Banks List */}
        <div className="card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Question Repositories</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsNewBankModalOpen(true)}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
            >
              <Plus size={13} /> New Bank
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {banks.map((b) => {
              const isSelected = selectedBank.id === b.id;
              const count = questions.filter((q) => q.bankId === b.id).length;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBank(b)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--primary-light)' : 'var(--bg-input)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? 'var(--primary)' : 'var(--text-main)' }}>
                      {b.name}
                    </span>
                    <span className="badge badge-primary">{count} Qs</span>
                  </div>
                  <div className="text-muted text-xs">
                    Subject: {b.subject} &bull; v{b.version}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Question Pool for Selected Bank */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px', fontWeight: 700 }}>{selectedBank.name}</h2>
              <p className="text-muted text-xs" style={{ margin: 0 }}>
                Subject: <strong>{selectedBank.subject}</strong> &bull; {bankQuestions.length} Questions in repository pool
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-published">Active Pool</span>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '32px' }}
                placeholder="Search questions by prompt or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value as any)}
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <select
              className="form-select"
              style={{ width: 'auto' }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="single_choice">Single Choice (MCQ)</option>
              <option value="multiple_choice">Multiple Select</option>
              <option value="true_false">True / False</option>
              <option value="short_text">Short Response</option>
              <option value="long_text">Essay / Descriptive</option>
            </select>
          </div>

          {/* Question List */}
          {filteredQuestions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
              <FileQuestion size={40} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                {bankQuestions.length === 0 ? 'No questions in this repository yet' : 'No matching questions found'}
              </div>
              <p className="text-xs" style={{ margin: '0 0 16px' }}>
                {bankQuestions.length === 0
                  ? 'Use Bulk Upload to import from Excel/CSV/PDF or click Add Question to create one manually.'
                  : 'Try adjusting your search keywords or difficulty filters.'}
              </p>
              {bankQuestions.length === 0 && (
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsBulkUploadOpen(true)}>
                    <Upload size={13} /> Bulk Upload
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleOpenAddQuestion}>
                    <Plus size={13} /> Add Question
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)' }}>
                        Q{idx + 1}
                      </span>
                      <span className="badge badge-draft" style={{ textTransform: 'capitalize' }}>
                        {q.type.replace('_', ' ')}
                      </span>
                      <span className={`badge badge-${q.difficulty === 'hard' ? 'failed' : q.difficulty === 'medium' ? 'warning' : 'active'}`}>
                        {q.difficulty}
                      </span>
                      <span className="text-muted text-xs font-semibold">{q.points} Points</span>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
                      {q.prompt}
                    </div>

                    {q.options && q.options.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.8rem' }}>
                        {q.options.map((opt, i) => (
                          <div
                            key={opt.id || i}
                            style={{
                              padding: '6px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: opt.isCorrect ? 'var(--success-bg)' : 'var(--bg-card)',
                              border: opt.isCorrect ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)',
                              color: opt.isCorrect ? 'var(--success)' : 'var(--text-secondary)',
                              fontWeight: opt.isCorrect ? 600 : 400
                            }}
                          >
                            {opt.isCorrect && '✓ '}{opt.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'short_answer' && q.correctAnswer && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>
                        Answer Key: {q.correctAnswer}
                      </div>
                    )}

                    {q.explanation && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                        Explanation: {q.explanation}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPreviewQuestion(q)}
                      title="Learner Preview"
                    >
                      <Eye size={13} /> Preview
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenEditQuestion(q)}
                      title="Edit Question"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDeleteQuestion(q.id)}
                      title="Delete Question"
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {isBulkUploadOpen && (
        <BulkUploadModal
          isOpen={isBulkUploadOpen}
          onClose={() => setIsBulkUploadOpen(false)}
          banks={banks}
          currentBankId={selectedBank.id}
          onImportComplete={handleImportComplete}
          existingQuestions={questions}
        />
      )}

      {/* Add / Edit Question Modal */}
      {isQuestionModalOpen && (
        <div className="modal-overlay" onClick={() => setIsQuestionModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                {editingQuestion ? 'Edit Question' : `Add Question to ${selectedBank.name}`}
              </h3>
              <button onClick={() => setIsQuestionModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Question Type</label>
                    <select
                      className="form-select"
                      value={qType}
                      onChange={(e) => setQType(e.target.value as any)}
                    >
                      <option value="single_choice">Single Choice (Radio)</option>
                      <option value="multiple_choice">Multiple Select (Checkbox)</option>
                      <option value="true_false">True / False</option>
                      <option value="short_text">Short Response</option>
                      <option value="long_text">Long Essay / Descriptive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Points</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={qPoints}
                      onChange={(e) => setQPoints(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Difficulty</label>
                    <select
                      className="form-select"
                      value={qDifficulty}
                      onChange={(e) => setQDifficulty(e.target.value as any)}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Question Prompt <span className="required">*</span></label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter the question problem statement or code snippet..."
                    className="form-textarea"
                    value={qPrompt}
                    onChange={(e) => setQPrompt(e.target.value)}
                  />
                </div>

                {(qType === 'single_choice' || qType === 'multiple_choice') && (
                  <div className="form-group">
                    <label className="form-label">Answer Choices (Select radio for correct key)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {qOptions.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="radio"
                            name="correctAnswerKey"
                            checked={qCorrectAnswer === `${idx}`}
                            onChange={() => setQCorrectAnswer(`${idx}`)}
                            style={{ accentColor: 'var(--primary)' }}
                          />
                          <input
                            type="text"
                            className="form-input"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...qOptions];
                              newOpts[idx] = e.target.value;
                              setQOptions(newOpts);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qType === 'true_false' && (
                  <div className="form-group">
                    <label className="form-label">Correct Answer</label>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="tfCorrect"
                          value="true"
                          checked={qCorrectAnswer.toLowerCase() === 'true'}
                          onChange={() => setQCorrectAnswer('true')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>True</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="tfCorrect"
                          value="false"
                          checked={qCorrectAnswer.toLowerCase() === 'false'}
                          onChange={() => setQCorrectAnswer('false')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        <span>False</span>
                      </label>
                    </div>
                  </div>
                )}

                {qType === 'short_text' && (
                  <div className="form-group">
                    <label className="form-label">Expected Answer Key</label>
                    <input
                      type="text"
                      placeholder="Expected string or phrase for automated matching..."
                      className="form-input"
                      value={qCorrectAnswer}
                      onChange={(e) => setQCorrectAnswer(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Feedback / Solution Explanation</label>
                  <input
                    type="text"
                    placeholder="Shown to learners after assessment results release..."
                    className="form-input"
                    value={qExplanation}
                    onChange={(e) => setQExplanation(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsQuestionModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingQuestion ? 'Update Question' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Bank Modal */}
      {isNewBankModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewBankModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Create Question Repository</h3>
              <button onClick={() => setIsNewBankModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewBankSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Repository Name <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Cloud Architecture Question Pool"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Subject / Discipline</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Cloud Computing"
                    value={newBankSubject}
                    onChange={(e) => setNewBankSubject(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewBankModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Learner Preview Modal */}
      {previewQuestion && (
        <div className="modal-overlay" onClick={() => setPreviewQuestion(null)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Learner View Simulation</h3>
              <button onClick={() => setPreviewQuestion(null)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '16px' }}>
                {previewQuestion.prompt}
              </div>
              {previewQuestion.options && previewQuestion.options.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {previewQuestion.options.map((opt, i) => (
                    <label
                      key={opt.id || i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer'
                      }}
                    >
                      <input type="radio" name="previewAnswer" style={{ accentColor: 'var(--primary)' }} />
                      <span style={{ fontSize: '0.85rem' }}>{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}
              {previewQuestion.type === 'short_answer' && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type your response here..."
                  disabled
                />
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPreviewQuestion(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
