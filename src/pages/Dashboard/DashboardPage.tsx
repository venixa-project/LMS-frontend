import React from 'react';
import { useAuthStore } from '../../lib/store';
import { Link } from 'react-router-dom';
import {
  adminDashboardMetrics, learnerDashboardMetrics, mockCourses,
  mockLiveSessions, mockAssessments, mockGradingTasks, mockGamificationProfile
} from '../../data/mockData';
import {
  TrendingUp, TrendingDown, Users, BookOpen, Video, Award,
  ClipboardCheck, Clock, ArrowRight, Play, CheckCircle2,
  AlertCircle, Sparkles, Flame, Plus, Shield, PenTool
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const role = user?.activeRole || 'learner';

  // -------------------------------------------------------------
  // 1. LEARNER DASHBOARD VIEW
  // -------------------------------------------------------------
  if (role === 'learner') {
    const activeCourse = mockCourses[0];
    const nextSession = mockLiveSessions.find((s) => s.status === 'scheduled');
    const dueAssessment = mockAssessments[0];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Welcome & Gamification Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-primary">Level 4 Scholar</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>
                <Flame size={16} fill="#f59e0b" /> {mockGamificationProfile.streak} Day Streak
              </span>
            </div>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '6px' }}>
              Welcome back, {user?.firstName}!
            </h1>
            <p className="text-secondary text-sm">
              You are making great progress in your Engineering Track. Keep it up!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 18px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                {mockGamificationProfile.totalPoints}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Points
              </div>
            </div>

            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 18px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                {mockGamificationProfile.badges.length}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Badges Earned
              </div>
            </div>
          </div>
        </div>

        {/* Learner Metric Cards */}
        <div className="grid-3">
          {learnerDashboardMetrics.slice(0, 3).map((metric, idx) => (
            <div key={idx} className="stat-card">
              <span className="text-muted text-xs font-semibold">{metric.label}</span>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {metric.value}
              </div>
              <p className="text-muted text-xs">{metric.description}</p>
            </div>
          ))}
        </div>

        {/* Continue Learning Hero + Upcoming Live & Assessment */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px' }}>
          {/* Main Course in Progress */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span className="badge badge-active">In Progress &bull; 68% Completed</span>
                <span className="text-muted text-xs">Estimated: 45 mins left</span>
              </div>

              <h2 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>{activeCourse.title}</h2>
              <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                {activeCourse.description}
              </p>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span>Curriculum Progress</span>
                  <strong>8 of 12 Lessons Completed</strong>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: '68%' }} />
                </div>
              </div>

              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Up Next:</div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Lesson 4: Custom Hooks & Performance Optimization</div>
                </div>
                <Link to="/courses" className="btn btn-primary btn-sm">
                  <Play size={14} /> Resume
                </Link>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-muted text-xs">Instructor: Dr. James Wilson</span>
              <Link to="/courses" style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Browse All My Courses <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Right Column: Next Live Session & Upcoming Assessment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Live Session */}
            {nextSession && (
              <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Video size={16} color="var(--accent-cyan)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                    Next Live Class
                  </span>
                </div>
                <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{nextSession.title}</h3>
                <p className="text-muted text-xs" style={{ marginBottom: '12px' }}>
                  {new Date(nextSession.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date(nextSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({nextSession.durationMinutes} min)
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-primary">Zoom Integration (Demo)</span>
                  <Link to="/live-sessions" className="btn btn-secondary btn-sm">
                    View Roster
                  </Link>
                </div>
              </div>
            )}

            {/* Assessment Due */}
            {dueAssessment && (
              <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ClipboardCheck size={16} color="var(--warning)" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase' }}>
                    Assessment Due Soon
                  </span>
                </div>
                <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{dueAssessment.title}</h3>
                <p className="text-muted text-xs" style={{ marginBottom: '12px' }}>
                  {dueAssessment.durationMinutes} Minutes &bull; {dueAssessment.totalMarks} Points &bull; Passing Score: {dueAssessment.passingMarks}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="text-muted text-xs">Attempts remaining: 1</span>
                  <Link to="/assessments" className="btn btn-primary btn-sm">
                    Start Test
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Achievements & Badges */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Recent Achievements & Points History</h3>
            <span className="text-muted text-xs">Acuity Gamification Engine</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
            {mockGamificationProfile.badges.map((b) => (
              <div
                key={b.id}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>{b.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. INSTRUCTOR DASHBOARD VIEW
  // -------------------------------------------------------------
  if (role === 'instructor') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Instructor Command Center</h1>
            <p className="text-secondary text-sm">Manage live classrooms, track cohort engagement, and review student progress</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/live-sessions" className="btn btn-primary">
              <Plus size={16} /> Schedule Live Class
            </Link>
            <Link to="/courses" className="btn btn-secondary">
              <BookOpen size={16} /> Author Course
            </Link>
          </div>
        </div>

        {/* Instructor Stats */}
        <div className="grid-4">
          <div className="stat-card">
            <span className="text-muted text-xs font-semibold">Active Cohorts</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>3</div>
            <p className="text-muted text-xs">Spring 2026 Engineering</p>
          </div>
          <div className="stat-card">
            <span className="text-muted text-xs font-semibold">Total Students</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>142</div>
            <p className="text-success text-xs">&uarr; 14 new enrollments</p>
          </div>
          <div className="stat-card">
            <span className="text-muted text-xs font-semibold">Upcoming Live Classes</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>2</div>
            <p className="text-muted text-xs">Next: Tomorrow 10:00 AM</p>
          </div>
          <div className="stat-card">
            <span className="text-muted text-xs font-semibold">Pending Submissions</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>6</div>
            <p className="text-muted text-xs">Requires instructor evaluation</p>
          </div>
        </div>

        {/* Live sessions roster quick overview */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>My Scheduled Live Sessions</h3>
            <Link to="/live-sessions" className="text-primary text-xs font-semibold">View All &rarr;</Link>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Session Name</th>
                  <th>Cohort</th>
                  <th>Date & Time</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockLiveSessions.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.title}</td>
                    <td>Spring 2026 Engineering</td>
                    <td>{new Date(s.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>{s.durationMinutes} min</td>
                    <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                    <td>
                      <Link to="/live-sessions" className="btn btn-secondary btn-sm">
                        Instructor Console
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. HUMAN GRADER DASHBOARD VIEW
  // -------------------------------------------------------------
  if (role === 'grader') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Grading & Moderation Queue</h1>
            <p className="text-secondary text-sm">Evaluate subjective submissions, review BOT-assisted preliminary scoring, and resolve appeals</p>
          </div>
          <Link to="/grading" className="btn btn-primary">
            <PenTool size={16} /> Open Full Grading Console
          </Link>
        </div>

        <div className="grid-3">
          <div className="stat-card">
            <span className="text-muted text-xs font-semibold">Submissions Awaiting Grading</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)' }}>18</div>
            <p className="text-muted text-xs">Average SLA: 24 hours</p>
          </div>
          <div className="stat-card">
            <span className="text-muted text-xs font-semibold">AI Preliminary Suggestions</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>12</div>
            <p className="text-muted text-xs">Ready for human verification</p>
          </div>
          <div className="stat-card">
            <span className="text-muted text-xs font-semibold">Moderation / Second Marking</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--accent-purple)' }}>3</div>
            <p className="text-muted text-xs">Discrepancy &gt; 15%</p>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Assigned Evaluation Tasks</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Assessment</th>
                  <th>Submitted</th>
                  <th>AI Suggestion</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {mockGradingTasks.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.learnerName}</td>
                    <td>{t.assessmentTitle}</td>
                    <td>{t.submittedAt ? new Date(t.submittedAt).toLocaleDateString() : 'Recent'}</td>
                    <td>
                      {t.aiPreliminaryScore !== undefined || t.aiSuggestion ? (
                        <span className="badge badge-info">
                          {t.aiPreliminaryScore || t.aiSuggestion?.score} / {t.maxScore || t.totalMarks} (92% Conf.)
                        </span>
                      ) : (
                        <span className="text-muted text-xs">Manual only</span>
                      )}
                    </td>
                    <td><span className={`badge badge-${t.status}`}>{t.status.replace('_', ' ')}</span></td>
                    <td>
                      <Link to="/grading" className="btn btn-primary btn-sm">
                        Grade Now &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. PLATFORM ADMIN / ORG ADMIN / LMS ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header & Quick Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
              {role.replace('_', ' ')} Perspective
            </span>
            <span className="text-muted text-xs">Tenant: Acme Learning Corp (org-001)</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', margin: 0 }}>Executive Learning Dashboard</h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/courses" className="btn btn-primary">
            <Plus size={16} /> Create Course
          </Link>
          <Link to="/people" className="btn btn-secondary">
            <Users size={16} /> Invite People
          </Link>
          <Link to="/reports" className="btn btn-secondary">
            Analytics & Reports
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid-4">
        {adminDashboardMetrics.map((metric, idx) => (
          <div key={idx} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="text-muted text-xs font-semibold">{metric.label}</span>
              {metric.trend === 'up' && (
                <span className="text-success text-xs" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                  <TrendingUp size={14} /> +{metric.change}%
                </span>
              )}
              {metric.trend === 'down' && (
                <span className="text-danger text-xs" style={{ display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 700 }}>
                  <TrendingDown size={14} /> {metric.change}
                </span>
              )}
            </div>

            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
              {metric.value}
            </div>

            <p className="text-muted text-xs">{metric.description}</p>
          </div>
        ))}
      </div>

      {/* Two Column Layout: Charts & Operations */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '24px' }}>
        {/* Synthetic Analytics Chart & Cohorts */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Learner Enrollment & Completion Trends</h3>
              <p className="text-muted text-xs">Simulated 6-Month Rolling Performance</p>
            </div>
            <select className="form-select" style={{ width: 'auto', padding: '4px 8px', fontSize: '0.8rem' }}>
              <option>Last 6 Months</option>
              <option>Year to Date</option>
            </select>
          </div>

          {/* Bar Chart Representation */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            {[
              { month: 'May', enrolled: 180, completed: 110 },
              { month: 'Jun', enrolled: 240, completed: 160 },
              { month: 'Jul', enrolled: 310, completed: 210 },
              { month: 'Aug', enrolled: 290, completed: 230 },
              { month: 'Sep', enrolled: 420, completed: 340 },
              { month: 'Oct', enrolled: 490, completed: 410 },
            ].map((d) => (
              <div key={d.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '140px' }}>
                  <div
                    title={`Enrolled: ${d.enrolled}`}
                    style={{
                      width: '20px',
                      height: `${(d.enrolled / 500) * 120}px`,
                      background: 'var(--primary)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s'
                    }}
                  />
                  <div
                    title={`Completed: ${d.completed}`}
                    style={{
                      width: '20px',
                      height: `${(d.completed / 500) * 120}px`,
                      background: 'var(--success)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s'
                    }}
                  />
                </div>
                <span className="text-muted text-xs font-semibold">{d.month}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: 'var(--primary)', borderRadius: '2px' }} />
              <span>New Enrollments</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: 'var(--success)', borderRadius: '2px' }} />
              <span>Graduated / Completed</span>
            </div>
          </div>
        </div>

        {/* Quick Operations Checklist */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Operational Readiness</h3>
          <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
            Core enterprise governance check
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="var(--success)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Active Multi-Tenant Scopes</span>
              </div>
              <span className="badge badge-active">3 Orgs</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="var(--success)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>RBAC Permission Matrix</span>
              </div>
              <span className="badge badge-active">7 Roles</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="var(--success)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Proctoring Incident Flagging</span>
              </div>
              <span className="badge badge-warning">2 In Review</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="var(--success)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>BOT / AI Assisted Scoring</span>
              </div>
              <span className="badge badge-primary">Active</span>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <Link to="/settings" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              View Platform Settings & Audit Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
