import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Code2,
  ListOrdered,
  Award,
  Terminal,
  Clock,
  Layers,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '../../../lib/apiClient';

export interface LessonSummaryData {
  id: string;
  tenantId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  sourceType: string;
  sourceWordCount: number;
  overview: string;
  learningObjectives: string[];
  detailedExplanation: Array<{
    concept: string;
    simpleExplanation: string;
    analogy?: string;
  }>;
  importantConcepts: Array<{
    term: string;
    definition: string;
    formulaOrSyntax?: string;
  }>;
  practicalExamples: Array<{
    title: string;
    description: string;
    code?: string;
    codeLanguage?: string;
    lineByLineExplanation?: string[];
    expectedOutput?: string;
  }>;
  stepByStepProcess: Array<{
    stepNumber: number;
    title: string;
    explanation: string;
  }>;
  keyTakeaways: string[];
  quickRevision?: string | null;
  importantQuestions: Array<{
    question: string;
    hint: string;
    answer: string;
  }>;
  rawMarkdown?: string | null;
  aiModel?: string | null;
  aiProvider?: string | null;
  status: 'completed' | 'unavailable' | 'failed' | 'generating';
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AILessonSummaryPanelProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  lessonType?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export const AILessonSummaryPanel: React.FC<AILessonSummaryPanelProps> = ({
  courseId,
  lessonId,
  lessonTitle,
  lessonType = 'video',
  isOpen,
  onToggle,
}) => {
  const [summary, setSummary] = useState<LessonSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openAnswers, setOpenAnswers] = useState<Record<number, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Fetch summary on lessonId change
  const fetchSummary = useCallback(
    async (force = false) => {
      if (!courseId || !lessonId) return;

      if (force) {
        setRegenerating(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const endpoint = force
          ? `/courses/${courseId}/lessons/${lessonId}/summary/generate`
          : `/courses/${courseId}/lessons/${lessonId}/summary`;

        const res = force
          ? await apiClient.post<any>(endpoint, {})
          : await apiClient.get<any>(endpoint);

        if (res && res.data) {
          setSummary(res.data as LessonSummaryData);
        } else {
          setError('No summary data returned by the server.');
        }
      } catch (err: any) {
        console.error('Failed to load AI summary:', err);
        setError(err.message || 'Unable to generate summary for this lesson. Please check your network or try again.');
      } finally {
        setLoading(false);
        setRegenerating(false);
      }
    },
    [courseId, lessonId]
  );

  useEffect(() => {
    // When lesson changes, reset state and load summary for the new lesson
    setSummary(null);
    setOpenAnswers({});
    if (isOpen) {
      void fetchSummary(false);
    }
  }, [lessonId, courseId, isOpen, fetchSummary]);

  const handleCopySummary = async () => {
    if (!summary) return;
    const textToCopy = summary.rawMarkdown || summary.overview;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const toggleSection = (secKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [secKey]: !prev[secKey],
    }));
  };

  const toggleAnswer = (idx: number) => {
    setOpenAnswers((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <div style={{ marginTop: '14px', width: '100%' }}>
      {/* Toggle Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onToggle}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.82rem',
            fontWeight: 600,
            padding: '8px 16px',
            background: isOpen ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
            borderColor: isOpen ? 'var(--primary)' : 'var(--border-subtle)',
            color: isOpen ? 'var(--primary)' : 'var(--text-main)',
            borderRadius: 'var(--radius-md)',
            transition: 'all 0.18s ease',
          }}
        >
          <Sparkles size={14} color="var(--accent-purple)" />
          <span>{isOpen ? 'Hide AI Lesson Summary' : '✨ View AI Lesson Summary'}</span>
          <ChevronDown
            size={14}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>
      </div>

      {/* Collapsible AI Summary Panel */}
      {isOpen && (
        <div
          style={{
            marginTop: '12px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            borderRadius: 'var(--radius-lg)',
            padding: '22px 24px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {/* Header & Meta Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
              paddingBottom: '14px',
              borderBottom: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 2px 10px rgba(99, 102, 241, 0.35)',
                }}
              >
                <Sparkles size={16} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                  AI Lesson Summary: {lessonTitle}
                </div>
                <div className="text-muted text-xs" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span>Explained in friendly, mentor-guided language</span>
                  {summary?.sourceType && (
                    <span
                      style={{
                        padding: '1px 6px',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        color: 'var(--success)',
                      }}
                    >
                      {summary.sourceType === 'curriculum_topic'
                        ? '📘 Curriculum Topic'
                        : summary.sourceType === 'document_text'
                        ? '📄 Document Notes'
                        : summary.sourceType === 'video_transcript'
                        ? '🎥 Video Transcript'
                        : summary.sourceType === 'quiz'
                        ? '📝 Quiz Review'
                        : '💡 Comprehensive'}
                    </span>
                  )}
                  {summary?.aiModel && (
                    <span
                      style={{
                        padding: '1px 6px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        color: 'var(--primary)',
                      }}
                    >
                      {summary.aiModel.includes('gemini') ? '✨ Gemini AI' : '🧠 Grounded AI Teacher'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions: Copy & Regenerate */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {summary && summary.status === 'completed' && (
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', padding: '6px 12px' }}
                  title="Copy full summary formatted in Markdown"
                >
                  {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void fetchSummary(true)}
                disabled={regenerating || loading}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', padding: '6px 12px' }}
                title="Regenerate summary from latest lesson content"
              >
                <RefreshCw size={13} className={regenerating ? 'spin-anim' : ''} />
                <span>{regenerating ? 'Regenerating...' : 'Regenerate'}</span>
              </button>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <div className="pulse-indicator" style={{ width: 14, height: 14, margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                Analyzing lesson source material...
              </div>
              <p className="text-muted text-xs" style={{ margin: 0 }}>
                Extracting lecture transcripts and synthesizing clear step-by-step mentor explanations.
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: 'var(--danger)', fontSize: '0.86rem', display: 'block', marginBottom: '3px' }}>
                  Unable to Generate Summary
                </strong>
                <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {error}
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void fetchSummary(true)}
                  style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                >
                  Retry Generation
                </button>
              </div>
            </div>
          )}

          {/* Unavailable Content State (No Hallucination Notice) */}
          {!loading && !error && summary?.status === 'unavailable' && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#f59e0b', fontSize: '0.88rem', display: 'block', marginBottom: '4px' }}>
                  Lesson Content Currently Unavailable for AI Summary
                </strong>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {summary.overview ||
                    'This video lecture does not currently have public subtitles or teacher-uploaded notes. An AI summary cannot be generated from audio without captions. Please refer to the instructor reading materials.'}
                </p>
              </div>
            </div>
          )}

          {/* Completed Summary View */}
          {!loading && !error && summary?.status === 'completed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Section A: Lesson Overview */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.88rem',
                  lineHeight: 1.65,
                  color: 'var(--text-secondary)',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Sparkles size={14} color="var(--primary)" />
                  <span>🎯 Lesson Overview:</span>
                </div>
                <p style={{ margin: 0 }}>{summary.overview}</p>
              </div>

              {/* Section B: What You Will Learn */}
              {summary.learningObjectives && summary.learningObjectives.length > 0 && (
                <div style={{ background: 'var(--bg-surface)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={14} color="var(--accent-cyan)" />
                    <span>📚 What You Will Learn:</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                    {summary.learningObjectives.map((obj, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <CheckCircle2 size={13} color="var(--success)" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span>{obj}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section C: Detailed Explanation in Simple Words */}
              {summary.detailedExplanation && summary.detailedExplanation.length > 0 && (
                <div>
                  <div
                    onClick={() => toggleSection('detailed')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      color: 'var(--text-main)',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lightbulb size={14} color="#ffd700" />
                      <span>💡 Detailed Explanation in Simple Words:</span>
                    </div>
                    {collapsedSections['detailed'] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </div>

                  {!collapsedSections['detailed'] && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {summary.detailedExplanation.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--bg-input)',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                            {idx + 1}. {item.concept}
                          </div>
                          <p style={{ margin: '0 0 6px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                            {item.simpleExplanation}
                          </p>
                          {item.analogy && (
                            <div
                              style={{
                                background: 'rgba(99, 102, 241, 0.08)',
                                borderLeft: '3px solid var(--primary)',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                color: 'var(--text-main)',
                              }}
                            >
                              <strong>🌟 Everyday Analogy:</strong> {item.analogy}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Section D: Important Concepts & Definitions */}
              {summary.importantConcepts && summary.importantConcepts.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} color="var(--primary)" />
                    <span>🔑 Important Concepts & Definitions:</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                    {summary.importantConcepts.map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-input)',
                          padding: '10px 14px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent-cyan)', marginBottom: '3px' }}>
                          {c.term}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          {c.definition}
                        </div>
                        {c.formulaOrSyntax && (
                          <div
                            style={{
                              marginTop: '6px',
                              fontFamily: 'monospace',
                              fontSize: '0.74rem',
                              background: 'rgba(0,0,0,0.3)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              color: '#ffd700',
                            }}
                          >
                            {c.formulaOrSyntax}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section E: Practical Examples (with code) */}
              {summary.practicalExamples && summary.practicalExamples.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Code2 size={14} color="var(--accent-purple)" />
                    <span>🛠️ Practical Examples & Code Breakdown:</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {summary.practicalExamples.map((ex, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                          {ex.title}
                        </div>
                        <p style={{ margin: '0 0 10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {ex.description}
                        </p>

                        {/* Code block */}
                        {ex.code && (
                          <div
                            style={{
                              background: '#0d1117',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '6px',
                              padding: '12px 14px',
                              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                              fontSize: '0.78rem',
                              color: '#e6edf3',
                              overflowX: 'auto',
                              marginBottom: '10px',
                              lineHeight: 1.5,
                            }}
                          >
                            <pre style={{ margin: 0 }}>{ex.code}</pre>
                          </div>
                        )}

                        {/* Line by line breakdown */}
                        {ex.lineByLineExplanation && ex.lineByLineExplanation.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Line-by-Line Breakdown:
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {ex.lineByLineExplanation.map((line, lIdx) => (
                                <div key={lIdx} style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                                  • {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Expected Output */}
                        {ex.expectedOutput && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.75rem',
                              background: 'rgba(16, 185, 129, 0.12)',
                              border: '1px solid rgba(16, 185, 129, 0.25)',
                              padding: '3px 10px',
                              borderRadius: '4px',
                              color: 'var(--success)',
                            }}
                          >
                            <Terminal size={12} />
                            <span>Output: {ex.expectedOutput}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section F: Step-by-Step Process */}
              {summary.stepByStepProcess && summary.stepByStepProcess.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ListOrdered size={14} color="var(--primary)" />
                    <span>🪜 Step-by-Step Procedure:</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {summary.stepByStepProcess.map((step) => (
                      <div
                        key={step.stepNumber}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          background: 'var(--bg-input)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <span
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'var(--primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {step.stepNumber}
                        </span>
                        <div>
                          <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{step.title}:</strong>{' '}
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{step.explanation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section G: Key Takeaways */}
              {summary.keyTakeaways && summary.keyTakeaways.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={14} color="var(--success)" />
                    <span>📌 Key Takeaways to Remember:</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {summary.keyTakeaways.map((point, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-input)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <span style={{ color: 'var(--accent-cyan)', fontWeight: 800 }}>{idx + 1}.</span>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section H: Quick Revision */}
              {summary.quickRevision && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.05))',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 18px',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#ffd700', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Clock size={14} color="#ffd700" />
                    <span>⚡ Quick Exam Revision (5-Minute Review):</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#fef3c7', lineHeight: 1.55 }}>
                    {summary.quickRevision}
                  </p>
                </div>
              )}

              {/* Section I: Important Self-Test Questions */}
              {summary.importantQuestions && summary.importantQuestions.length > 0 && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <HelpCircle size={14} color="var(--primary)" />
                    <span>❓ Important Self-Test Questions:</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {summary.importantQuestions.map((q, idx) => {
                      const isRevealed = openAnswers[idx] || false;
                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--bg-surface)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-subtle)',
                            padding: '10px 14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>
                              Q{idx + 1}: {q.question}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleAnswer(idx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary)',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '2px 6px',
                                textDecoration: 'underline',
                                flexShrink: 0,
                              }}
                            >
                              {isRevealed ? 'Hide Answer' : 'Show Answer'}
                            </button>
                          </div>

                          {q.hint && !isRevealed && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                              Hint: {q.hint}
                            </div>
                          )}

                          {isRevealed && (
                            <div
                              style={{
                                marginTop: '8px',
                                padding: '8px 12px',
                                background: 'rgba(16, 185, 129, 0.08)',
                                borderLeft: '3px solid var(--success)',
                                borderRadius: '4px',
                                fontSize: '0.78rem',
                                color: 'var(--text-main)',
                                lineHeight: 1.45,
                              }}
                            >
                              <strong>Mentor Answer:</strong> {q.answer}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

