import React from 'react';
import { Award, Sparkles, Clock, CheckCircle2, Trash2, Edit2, Plus, Shield } from 'lucide-react';
import { QuizAssessmentConfig } from '../../../types';

interface Props {
  assessment?: QuizAssessmentConfig;
  courseTitle: string;
  onConfigure: () => void;
  onRemove: () => void;
}

export const FinalAssessmentCard: React.FC<Props> = ({
  assessment,
  courseTitle,
  onConfigure,
  onRemove,
}) => {
  return (
    <div
      style={{
        marginTop: '28px',
        padding: '20px 24px',
        borderRadius: 'var(--radius-lg)',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(239, 68, 68, 0.04))',
        border: '1.5px solid var(--border-subtle)',
        borderLeft: '4px solid var(--primary)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--primary-light, rgba(99, 102, 241, 0.15))',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Award size={22} />
          </span>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800 }}>
                Section C: Final Course Assessment
              </h3>
              <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                Course-Wide Capstone
              </span>
              {assessment && (
                <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <CheckCircle2 size={11} /> Configured & Ready
                </span>
              )}
            </div>
            <p className="text-secondary text-xs" style={{ margin: '3px 0 0' }}>
              A comprehensive final examination assessing student mastery across all syllabus modules, lessons, and learning documents.
            </p>
          </div>
        </div>

        <div>
          {assessment ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onConfigure}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
              >
                <Edit2 size={13} /> Edit Final Assessment
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={onRemove}
                title="Remove Final Assessment"
                style={{ color: 'var(--danger)', padding: '6px' }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onConfigure}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                fontSize: '0.82rem',
                padding: '8px 16px',
              }}
            >
              <Sparkles size={14} /> + Configure Final Assessment (AI or Manual)
            </button>
          )}
        </div>
      </div>

      {assessment ? (
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            border: '1px solid var(--border-subtle)',
            marginTop: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{assessment.title}</div>
              {assessment.description && (
                <p className="text-secondary text-xs" style={{ margin: '3px 0 8px' }}>
                  {assessment.description}
                </p>
              )}
            </div>

            <span className="badge badge-secondary" style={{ textTransform: 'capitalize', fontSize: '0.72rem' }}>
              Difficulty: {assessment.difficulty}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              fontSize: '0.82rem',
              marginTop: '6px',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '10px',
            }}
          >
            <div>
              <span className="text-muted text-xs">Questions:</span>
              <div style={{ fontWeight: 700 }}>{assessment.questions.length} Items</div>
            </div>
            <div>
              <span className="text-muted text-xs">Total Marks:</span>
              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{assessment.totalMarks} Points</div>
            </div>
            <div>
              <span className="text-muted text-xs">Passing Requirement:</span>
              <div style={{ fontWeight: 700, color: 'var(--success)' }}>{assessment.passingPercentage}% Minimum</div>
            </div>
            <div>
              <span className="text-muted text-xs">Time Limit:</span>
              <div style={{ fontWeight: 700 }}>{assessment.timeLimitMinutes} Minutes</div>
            </div>
            <div>
              <span className="text-muted text-xs">Max Attempts:</span>
              <div style={{ fontWeight: 700 }}>
                {assessment.allowedAttempts === 0 ? 'Unlimited' : `${assessment.allowedAttempts} Allowed`}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px dashed var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span>
            No final course assessment configured yet. You can attach a course-wide assessment to evaluate students before issuing verified certificates.
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
            Supports AI questions synthesized from all modules
          </span>
        </div>
      )}
    </div>
  );
};
