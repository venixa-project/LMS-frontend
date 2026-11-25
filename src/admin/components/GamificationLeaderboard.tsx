import React, { useState, useMemo, useEffect } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Building2,
  BookOpen,
  Calendar,
  Sparkles,
  Users,
  Eye,
  SlidersHorizontal,
  GraduationCap,
} from 'lucide-react';
import { useDashboardFilters } from '../context/DashboardFilterContext';
import { apiClient } from '../../lib/apiClient';
import { useThemeStore } from '../../lib/themeStore';

export type RankingMetricType =
  | 'overall'
  | 'completions'
  | 'certifications'
  | 'assessments'
  | 'activity';

interface StudentLeaderboardRow {
  id: string;
  name: string;
  email: string;
  studentId: string;
  avatar?: string;
  departmentId: string;
  departmentName: string;
  enrolledCourseIds: string[];
  completedCourses: number;
  certifications: number;
  assessmentScore: number;
  activityDays: number;
  points: number;
  compositeScore: number;
}

export const GamificationLeaderboard: React.FC = () => {
  const { resolvedTheme } = useThemeStore();
  const isLight = resolvedTheme === 'light';
  const {
    departmentId,
    courseId,
  } = useDashboardFilters();

  const [rankingMetric, setRankingMetric] = useState<RankingMetricType>('overall');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewAll, setViewAll] = useState<boolean>(false);
  const itemsPerPage = 8;

  const [leaderboardRows, setLeaderboardRows] = useState<StudentLeaderboardRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    apiClient
      .get<any[]>('/gamification/leaderboard?limit=100')
      .then((res) => {
        if (!active) return;
        const rawList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        const mapped: StudentLeaderboardRow[] = rawList.map((item: any) => ({
          id: item.userId || item.id,
          name: item.name || 'Scholar',
          email: item.email || '',
          studentId: item.rollNo || 'STU-000',
          avatar: item.avatar || undefined,
          departmentId: item.departmentId || 'dep-001',
          departmentName: item.department || 'General Engineering',
          enrolledCourseIds: Array.isArray(item.enrolledCourseIds) ? item.enrolledCourseIds : [],
          completedCourses: Number(item.completedCourses || 0),
          certifications: Number(item.certifications || 0),
          assessmentScore: Number(item.assessmentScore || 0),
          activityDays: Number(item.streakDays || 0),
          points: Number(item.totalPoints || 0),
          compositeScore: Number(item.totalPoints || 0),
        }));
        setLeaderboardRows(mapped);
      })
      .catch((err) => {
        console.warn('Failed to fetch backend leaderboard:', err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Reset pagination when department or course changes
  useEffect(() => {
    setCurrentPage(1);
  }, [departmentId, courseId]);

  const masterStudentRows = leaderboardRows;

  // -------------------------------------------------------------
  // Filter & Sort Logic
  // -------------------------------------------------------------
  const filteredAndSortedLearners = useMemo(() => {
    let list = masterStudentRows.filter((item) => {
      // 1. Department filter
      if (departmentId !== 'all' && item.departmentId !== departmentId) {
        return false;
      }

      // 2. Course filter
      if (courseId !== 'all' && !item.enrolledCourseIds.includes(courseId)) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesId = item.studentId.toLowerCase().includes(q);
        const matchesEmail = item.email.toLowerCase().includes(q);
        return matchesName || matchesId || matchesEmail;
      }

      return true;
    });

    // Sort according to selected Ranking Metric
    list.sort((a, b) => {
      switch (rankingMetric) {
        case 'overall':
          return b.compositeScore - a.compositeScore || b.points - a.points;
        case 'completions':
          return b.completedCourses - a.completedCourses || b.compositeScore - a.compositeScore;
        case 'certifications':
          return b.certifications - a.certifications || b.points - a.points;
        case 'assessments':
          return b.assessmentScore - a.assessmentScore || b.compositeScore - a.compositeScore;
        case 'activity':
          return b.activityDays - a.activityDays || b.points - a.points;
        default:
          return b.compositeScore - a.compositeScore;
      }
    });

    return list;
  }, [masterStudentRows, departmentId, courseId, searchQuery, rankingMetric]);

  // Pagination calculation
  const totalItems = filteredAndSortedLearners.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedList = useMemo(() => {
    if (viewAll) return filteredAndSortedLearners;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLearners.slice(start, start + itemsPerPage);
  }, [filteredAndSortedLearners, currentPage, itemsPerPage, viewAll]);

  const handleResetFilters = () => {
    setRankingMetric('overall');
    setSearchQuery('');
    setCurrentPage(1);
    setViewAll(false);
  };

  const getMetricDisplayValue = (learner: StudentLeaderboardRow) => {
    switch (rankingMetric) {
      case 'overall':
        return `${learner.compositeScore.toLocaleString()} pts`;
      case 'completions':
        return `${learner.completedCourses} Courses`;
      case 'certifications':
        return `${learner.certifications} Certs`;
      case 'assessments':
        return `${learner.assessmentScore}% Avg`;
      case 'activity':
        return `${learner.activityDays} Active Days`;
    }
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-card)',
        padding: '20px 22px',
      }}
    >
      {/* 1. SECTION HEADER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '14px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: 'var(--text-main)',
            }}
          >
            <span
              className="trophy-float"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)',
                flexShrink: 0,
              }}
            >
              <Trophy size={16} color="#FFFFFF" />
            </span>
            <span>Gamification & Leaderboard</span>
          </h2>
        </div>

        {/* View All & Learner Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="text-muted text-xs">
            {totalItems} Ranked {totalItems === 1 ? 'Learner' : 'Learners'}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setViewAll(!viewAll)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem' }}
          >
            <Eye size={12} /> {viewAll ? 'Show Pages' : 'View All'}
          </button>
        </div>
      </div>

      {/* 2. COMPACT TOOLBAR (Metric Selector & Search) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'var(--bg-input)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Metric Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Rank By:
          </label>
          <select
            className="form-select"
            value={rankingMetric}
            onChange={(e) => {
              setRankingMetric(e.target.value as RankingMetricType);
              setCurrentPage(1);
            }}
            style={{ fontSize: '0.8rem', padding: '5px 8px', fontWeight: 600, color: 'var(--primary)', minWidth: '180px' }}
          >
            <option value="overall">Overall Performance</option>
            <option value="completions">Course Completions</option>
            <option value="certifications">Certifications Earned</option>
            <option value="assessments">Assessment Scores</option>
            <option value="activity">Learning Activity</option>
          </select>
        </div>

        {/* Search Input and Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', maxWidth: '380px', minWidth: '220px', justifyContent: 'flex-end' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={13}
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search learner..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{ paddingLeft: '26px', fontSize: '0.8rem', padding: '5px 8px 5px 26px', width: '100%' }}
            />
          </div>

          {(rankingMetric !== 'overall' || searchQuery) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetFilters}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              title="Reset ranking filter"
            >
              <RotateCcw size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* 3. CLEAN & PROFESSIONAL LEADERBOARD TABLE */}
      {isLoading ? (
        <div
          style={{
            padding: '28px 16px',
            textAlign: 'center',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontSize: '0.84rem',
          }}
        >
          Loading leaderboard rankings...
        </div>
      ) : filteredAndSortedLearners.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '36px 16px',
            textAlign: 'center',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          <Users size={32} color="var(--text-muted)" style={{ opacity: 0.5, marginBottom: '8px' }} />
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
            No Learners Found
          </div>
          <p className="text-secondary text-xs" style={{ margin: '0 0 12px', maxWidth: '380px' }}>
            No students match your selected department, course, or search filters.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleResetFilters}
            style={{ fontSize: '0.75rem' }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.825rem',
            }}
          >
            <thead style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)' }}>
              <tr>
                <th style={{ padding: '10px 14px', width: '85px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Rank
                </th>
                <th style={{ padding: '10px 14px', minWidth: '220px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Learner
                </th>
                <th style={{ padding: '10px 14px', width: '130px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Student ID
                </th>
                <th style={{ padding: '10px 14px', minWidth: '160px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Department
                </th>
                <th style={{ padding: '10px 14px', width: '140px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Completed Courses
                </th>
                <th style={{ padding: '10px 14px', width: '120px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Certifications
                </th>
                <th style={{ padding: '10px 14px', width: '120px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.map((learner, idx) => {
                const globalIndex = viewAll ? idx : (currentPage - 1) * itemsPerPage + idx;
                const rankNumber = globalIndex + 1;

                // Subtle gold, silver, bronze rank indicators with WCAG 2.2 AA contrast
                let rankBadge = null;
                if (rankNumber === 1) {
                  rankBadge = (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isLight ? '#FEF3C7' : 'rgba(245, 158, 11, 0.14)',
                        border: isLight ? '1px solid #FDE68A' : '1px solid rgba(245, 158, 11, 0.4)',
                        color: isLight ? '#92400E' : '#f59e0b',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                      }}
                      title="1st Place • Gold"
                    >
                      🥇 #1
                    </span>
                  );
                } else if (rankNumber === 2) {
                  rankBadge = (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isLight ? '#F1F5F9' : 'rgba(148, 163, 184, 0.14)',
                        border: isLight ? '1px solid #CBD5E1' : '1px solid rgba(148, 163, 184, 0.4)',
                        color: isLight ? '#334155' : '#e2e8f0',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                      }}
                      title="2nd Place • Silver"
                    >
                      🥈 #2
                    </span>
                  );
                } else if (rankNumber === 3) {
                  rankBadge = (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: isLight ? '#FFEDD5' : 'rgba(217, 119, 6, 0.14)',
                        border: isLight ? '1px solid #FED7AA' : '1px solid rgba(217, 119, 6, 0.4)',
                        color: isLight ? '#9A3412' : '#fdba74',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                      }}
                      title="3rd Place • Bronze"
                    >
                      🥉 #3
                    </span>
                  );
                } else {
                  rankBadge = (
                    <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.8rem', paddingLeft: '4px' }}>
                      #{rankNumber}
                    </span>
                  );
                }

                const deptPalette = [
                  { bg: 'rgba(37, 99, 235, 0.12)', border: 'rgba(37, 99, 235, 0.3)', text: '#2563EB' },
                  { bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)', text: '#7C3AED' },
                  { bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', text: '#059669' },
                  { bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)', text: '#DB2777' },
                  { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', text: '#D97706' },
                ];
                const deptStyle = deptPalette[
                  learner.departmentName.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % deptPalette.length
                ];
                const avatarGradients = [
                  'linear-gradient(135deg, #2563EB, #5447FF)',
                  'linear-gradient(135deg, #EC4899, #8B5CF6)',
                  'linear-gradient(135deg, #10B981, #06B6D4)',
                ];

                return (
                  <tr
                    key={learner.id}
                    className="leaderboard-row-animated"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      borderLeft:
                        rankNumber === 1
                          ? '3px solid #F59E0B'
                          : rankNumber === 2
                          ? '3px solid #94A3B8'
                          : rankNumber === 3
                          ? '3px solid #D97706'
                          : '3px solid transparent',
                      background:
                        rankNumber === 1
                          ? 'rgba(245, 158, 11, 0.045)'
                          : rankNumber === 2
                          ? 'rgba(148, 163, 184, 0.04)'
                          : rankNumber === 3
                          ? 'rgba(217, 119, 6, 0.035)'
                          : 'transparent',
                      transition: 'background 0.18s ease, transform 0.18s ease',
                      animationDelay: `${idx * 55}ms`,
                    }}
                  >
                    {/* 1. Rank */}
                    <td style={{ padding: '10px 14px' }}>{rankBadge}</td>

                    {/* 2. Learner Name & Avatar */}
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          className={rankNumber === 1 ? 'trophy-float' : undefined}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background:
                              rankNumber === 1
                                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                : rankNumber === 2
                                ? 'linear-gradient(135deg, #94a3b8, #64748b)'
                                : rankNumber === 3
                                ? 'linear-gradient(135deg, #d97706, #b45309)'
                                : avatarGradients[idx % avatarGradients.length],
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            boxShadow: rankNumber <= 3 ? '0 3px 10px rgba(245, 158, 11, 0.28)' : '0 2px 6px rgba(84, 71, 255, 0.2)',
                          }}
                        >
                          {learner.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.85rem' }}>
                            {learner.name}
                          </div>
                          <div className="text-muted text-xs" style={{ fontSize: '0.7rem' }}>
                            {learner.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Student ID */}
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {learner.studentId}
                    </td>

                    {/* 4. Department */}
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '9999px',
                          background: deptStyle.bg,
                          border: `1px solid ${deptStyle.border}`,
                          color: deptStyle.text,
                        }}
                      >
                        {learner.departmentName}
                      </span>
                    </td>

                    {/* 5. Completed Courses */}
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontWeight: 700, color: '#2563EB' }}>
                        {learner.completedCourses}
                      </span>{' '}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        {learner.completedCourses === 1 ? 'Course' : 'Courses'}
                      </span>
                    </td>

                    {/* 6. Certifications */}
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: learner.certifications > 0 ? '#10B981' : 'var(--text-muted)',
                        }}
                      >
                        <Award size={13} color={learner.certifications > 0 ? '#10B981' : '#94A3B8'} /> {learner.certifications}
                      </span>
                    </td>

                    {/* 7. Score */}
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '9999px',
                          background: rankNumber === 1 ? 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(236,72,153,0.14))' : 'rgba(84, 71, 255, 0.1)',
                          color: rankNumber === 1 ? '#D97706' : 'var(--primary)',
                          fontWeight: 800,
                          fontSize: '0.84rem',
                        }}
                      >
                        {getMetricDisplayValue(learner)}
                      </span>
                      <div className="text-muted text-xs" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                        {rankingMetric === 'overall' ? `${learner.assessmentScore}% Avg Score` : `${learner.compositeScore.toLocaleString()} pts`}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. PAGINATION FOOTER */}
      {!viewAll && totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} learners
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
            >
              <ChevronLeft size={13} /> Prev
            </button>

            {Array.from({ length: totalPages }).map((_, pIdx) => {
              const pNum = pIdx + 1;
              return (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setCurrentPage(pNum)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    background: currentPage === pNum ? 'var(--primary)' : 'var(--bg-input)',
                    color: currentPage === pNum ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {pNum}
                </button>
              );
            })}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '3px 8px', fontSize: '0.75rem' }}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
