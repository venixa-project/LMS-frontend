import React from 'react';
import {
  Clock, Award, Shield, Shuffle, AlertCircle, CheckCircle2,
  Sliders, Layers, Sparkles
} from 'lucide-react';
import { QuizQuestionItem } from '../../../types';

interface Props {
  title: string;
  setTitle: (val: string) => void;
  instructions: string;
  setInstructions: (val: string) => void;
  difficulty: 'easy' | 'medium' | 'hard';
  setDifficulty: (val: 'easy' | 'medium' | 'hard') => void;
  timeLimitMinutes: number;
  setTimeLimitMinutes: (val: number) => void;
  passingPercentage: number;
  setPassingPercentage: (val: number) => void;
  allowedAttempts: number;
  setAllowedAttempts: (val: number) => void;
  negativeMarkingEnabled: boolean;
  setNegativeMarkingEnabled: (val: boolean) => void;
  negativeMarksPerQuestion: number;
  setNegativeMarksPerQuestion: (val: number) => void;
  randomizeQuestions: boolean;
  setRandomizeQuestions: (val: boolean) => void;
  randomQuestionCount: number;
  setRandomQuestionCount: (val: number) => void;
  questions: QuizQuestionItem[];
  onBatchUpdateMarks?: (newMarks: number) => void;
}

export const AssessmentSettingsTab: React.FC<Props> = ({
  title,
  setTitle,
  instructions,
  setInstructions,
  difficulty,
  setDifficulty,
  timeLimitMinutes,
  setTimeLimitMinutes,
  passingPercentage,
  setPassingPercentage,
  allowedAttempts,
  setAllowedAttempts,
  negativeMarkingEnabled,
  setNegativeMarkingEnabled,
  negativeMarksPerQuestion,
  setNegativeMarksPerQuestion,
  randomizeQuestions,
  setRandomizeQuestions,
  randomQuestionCount,
  setRandomQuestionCount,
  questions,
  onBatchUpdateMarks
}) => {
  const [batchMarksVal, setBatchMarksVal] = React.useState(5);

  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Parameters Header */}
      <div
        style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(59, 130, 246, 0.05))',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sliders size={20} color="var(--primary)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>
              Assessment Evaluation Rules & Scoring Policies
            </div>
            <p className="text-secondary text-xs" style={{ margin: '2px 0 0' }}>
              Configure passing score criteria, attempt policies, timing constraints, and randomization rules.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-primary">
            {questions.length} Questions &bull; {totalCalculatedMarks} Total Marks
          </span>
        </div>
      </div>

      {/* Basic Title & Instructions */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>General Information</h4>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
            Assessment Title <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Module 2: Kafka & Messaging Assessment"
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
            Instructions / Candidate Briefing
          </label>
          <textarea
            className="form-input"
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Instructions for students before beginning this assessment..."
          />
        </div>
      </div>

      {/* Constraints: Timing, Pass %, Attempts */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>Grading Criteria & Constraints</h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
              Target Difficulty Level
            </label>
            <select
              className="form-select"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as any)}
            >
              <option value="easy">Easy (Foundational)</option>
              <option value="medium">Medium (Intermediate)</option>
              <option value="hard">Hard (Advanced / Capstone)</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
              Time Limit (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="360"
              className="form-input"
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(Math.max(1, parseInt(e.target.value) || 15))}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
              Passing Threshold (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              className="form-input"
              value={passingPercentage}
              onChange={(e) => setPassingPercentage(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontWeight: 600, fontSize: '0.82rem' }}>
              Allowed Attempts
            </label>
            <select
              className="form-select"
              value={allowedAttempts}
              onChange={(e) => setAllowedAttempts(parseInt(e.target.value))}
            >
              <option value={1}>1 Attempt Only</option>
              <option value={2}>2 Attempts</option>
              <option value={3}>3 Attempts</option>
              <option value={5}>5 Attempts</option>
              <option value={0}>Unlimited Retakes</option>
            </select>
          </div>
        </div>

        {/* Quick Batch Marks Tool */}
        {onBatchUpdateMarks && questions.length > 0 && (
          <div
            style={{
              padding: '12px 14px',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>Batch Normalize Question Marks</div>
              <div className="text-muted text-xs">Set equal points to all {questions.length} questions in this assessment</div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                min="1"
                max="100"
                value={batchMarksVal}
                onChange={(e) => setBatchMarksVal(Math.max(1, parseInt(e.target.value) || 5))}
                style={{ width: '60px', padding: '4px 6px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onBatchUpdateMarks(batchMarksVal)}
                style={{ fontSize: '0.78rem' }}
              >
                Apply to All ({questions.length * batchMarksVal} Total)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Grading Policies: Negative Marking & Randomization */}
      <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>Advanced Governance & Randomization</h4>

        {/* Negative Marking */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: negativeMarkingEnabled ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-input)',
            border: negativeMarkingEnabled ? '1px solid var(--danger, #ef4444)' : '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={negativeMarkingEnabled}
                onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                style={{ accentColor: 'var(--danger)', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Enable Negative Marking Penalty</span>
            </label>
            <p className="text-muted text-xs" style={{ margin: '2px 0 0 24px' }}>
              Deducts fractional marks for incorrect answers to deter blind guessing.
            </p>
          </div>

          {negativeMarkingEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="text-xs text-muted">Penalty per wrong answer:</span>
              <select
                className="form-select"
                value={negativeMarksPerQuestion}
                onChange={(e) => setNegativeMarksPerQuestion(parseFloat(e.target.value))}
                style={{ fontSize: '0.78rem', padding: '4px 8px', width: '130px' }}
              >
                <option value={0.25}>-0.25 Marks (25%)</option>
                <option value={0.33}>-0.33 Marks (33%)</option>
                <option value={0.5}>-0.50 Marks (50%)</option>
                <option value={1.0}>-1.00 Mark (Full)</option>
              </select>
            </div>
          )}
        </div>

        {/* Question Randomization from Bank / Pool */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: randomizeQuestions ? 'var(--primary-light, rgba(99, 102, 241, 0.08))' : 'var(--bg-input)',
            border: randomizeQuestions ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={randomizeQuestions}
                onChange={(e) => setRandomizeQuestions(e.target.checked)}
                style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Randomize & Shuffle Questions for Each Learner</span>
            </label>
            <p className="text-muted text-xs" style={{ margin: '2px 0 0 24px' }}>
              Serves a randomized subset or shuffled question sequence from the question repository.
            </p>
          </div>

          {randomizeQuestions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="text-xs text-muted">Subset question count:</span>
              <input
                type="number"
                min="1"
                max={Math.max(questions.length, 50)}
                value={randomQuestionCount}
                onChange={(e) => setRandomQuestionCount(Math.max(1, parseInt(e.target.value) || 10))}
                style={{
                  width: '60px',
                  padding: '4px 6px',
                  fontSize: '0.8rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)'
                }}
              />
              <span className="text-xs text-muted">of {questions.length} total</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
