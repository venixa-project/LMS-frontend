import React, { useState } from 'react';
import { mockQuestionBanks, mockQuestions } from '../../data/mockData';
import { QuestionBank, Question, QuizQuestionItem } from '../../types';
import { exportQuestionsToCsv } from '../Courses/components/csvTemplateUtils';
import {
  HelpCircle, Plus, Search, Edit2, CheckCircle2, Trash2,
  FileQuestion, Check, X, Eye, Tag, AlertCircle, Download, Upload
} from 'lucide-react';

export const QuestionBanksPage: React.FC = () => {
  const [banks, setBanks] = useState<QuestionBank[]>(mockQuestionBanks);
  const [selectedBank, setSelectedBank] = useState<QuestionBank>(mockQuestionBanks[0]);
  const [questions, setQuestions] = useState<Question[]>(mockQuestions);

  // Modals
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Question form states
  const [qPrompt, setQPrompt] = useState('');
  const [qType, setQType] = useState<'single_choice' | 'multiple_choice' | 'true_false' | 'short_text' | 'long_text'>('single_choice');
  const [qPoints, setQPoints] = useState(5);
  const [qDifficulty, setQDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [qOptions, setQOptions] = useState<string[]>(['Option A', 'Option B', 'Option C', 'Option D']);
  const [qCorrectAnswer, setQCorrectAnswer] = useState('0');
  const [qExplanation, setQExplanation] = useState('');

  const currentQuestions = questions.filter((q) => q.bankId === selectedBank.id);

  const handleCreateQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    const newQ: Question = {
      id: `q-${Date.now()}`,
      bankId: selectedBank.id,
      prompt: qPrompt,
      type: qType,
      points: qPoints,
      difficulty: qDifficulty,
      options: qType === 'single_choice' || qType === 'multiple_choice' ? qOptions.map((opt, i) => ({ id: `opt-${i}`, text: opt, isCorrect: qCorrectAnswer === `${i}` })) : undefined,
      correctAnswer: qType === 'true_false' || qType === 'short_text' ? qCorrectAnswer : undefined,
      explanation: qExplanation,
      tags: ['demo', selectedBank.subject.toLowerCase()]
    };
    setQuestions([newQ, ...questions]);
    setIsQuestionModalOpen(false);
    setQPrompt('');
    setQExplanation('');
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Question Banks & Authoring</h1>
          <p className="text-secondary text-sm">Reusable question pools, Bloom taxonomy difficulties, answer keys, and rubric scoring</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => {
              const quizQuestions: QuizQuestionItem[] = currentQuestions.map((q) => ({
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
            }}
          >
            <Download size={14} /> Export Bank (.csv)
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setIsQuestionModalOpen(true)}
          >
            <Plus size={16} /> Add Question
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left: Question Banks List */}
        <div className="card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Question Repositories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {banks.map((b) => {
              const isSelected = selectedBank.id === b.id;
              const count = questions.filter((q) => q.bankId === b.id).length;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBank(b)}
                  style={{
                    padding: '12px',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{selectedBank.name}</h2>
              <p className="text-muted text-xs">Subject: {selectedBank.subject} &bull; {currentQuestions.length} Questions in pool</p>
            </div>
            <span className="badge badge-published">Active Pool</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestions.map((q, idx) => (
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

                  {q.options && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '0.8rem' }}>
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
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

                  {q.explanation && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                      Explanation: {q.explanation}
                    </div>
                  )}
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPreviewQuestion(q)}
                  title="Learner Preview"
                >
                  <Eye size={13} /> Preview
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Question Modal */}
      {isQuestionModalOpen && (
        <div className="modal-overlay" onClick={() => setIsQuestionModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Add Question to {selectedBank.name}</h3>
              <button onClick={() => setIsQuestionModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateQuestion}>
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
                      <option value="long_text">Long Essay / File</option>
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
                  Save Question
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {previewQuestion.options?.map((opt, i) => (
                  <label
                    key={i}
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
