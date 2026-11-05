import React from 'react';
import { Link } from 'react-router-dom';
import { useAssessmentStore } from '../../lib/assessmentStore';

export const InstitutionStudentRiskWidget: React.FC = () => {
  const { assessments } = useAssessmentStore();
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Student Academic Progress & Risk Summary</h3>
          <p className="text-muted text-xs">Curriculum velocity, completion status, and at-risk early detection</p>
        </div>
        <Link to="/students" className="btn btn-secondary btn-sm">
          View Student Directory &rarr;
        </Link>
      </div>

      <div className="dashboard-mini-kpi-grid" style={{ marginBottom: '20px' }}>
        <div style={{ borderLeft: '4px solid var(--success)', background: 'var(--bg-input)', padding: '14px', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--success)' }}>100%</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>On-Track Students</div>
          <div className="text-muted text-xs">All active learners meeting curriculum milestones</div>
        </div>

        <div style={{ borderLeft: '4px solid var(--warning)', background: 'var(--bg-input)', padding: '14px', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--warning)' }}>0%</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>Needs Attention</div>
          <div className="text-muted text-xs">0 learners behind schedule</div>
        </div>

        <div style={{ borderLeft: '4px solid var(--danger)', background: 'var(--bg-input)', padding: '14px', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--danger)' }}>0%</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>Flagged / At-Risk</div>
          <div className="text-muted text-xs">0 learners flagged for early intervention</div>
        </div>
      </div>

      {/* Upcoming Assessments Widget */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
            Upcoming Scheduled Assessments
          </span>
          <Link to="/assessments" className="text-primary text-xs font-semibold">Manage Assessments &rarr;</Link>
        </div>

        <div className="grid-2" style={{ gap: '12px' }}>
          {assessments.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No upcoming scheduled assessments
            </div>
          ) : (
            assessments.slice(0, 2).map((a) => (
              <div key={a.id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.title}</span>
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>{a.mode || 'Online'}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {a.durationMinutes || 60} mins &bull; Passing Score: {a.passingMarks || 70}%
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
