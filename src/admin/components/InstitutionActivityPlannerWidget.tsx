import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, CheckCircle2, Clock, AlertCircle, Plus,
  ArrowUpRight, Check, Sparkles, Filter, ChevronRight,
  Bell, AlertTriangle, Layers, BookOpen, GraduationCap,
  UsersRound, FileText, ExternalLink
} from 'lucide-react';
import {
  PlannerActivity,
  PlannerActivityType,
  PlannerPriority,
  PlannerStatus
} from '../../types/planner';
import {
  getAllPlannerActivities,
  getTopFocusTasks,
  getOverdueReminders,
  getUpcoming7Days,
  toggleTaskCompleted,
  addPlannerActivity,
  updatePlannerActivity,
  deletePlannerActivity,
  formatLocalDate
} from '../../lib/plannerStore';
import { AddEditActivityModal } from './AddEditActivityModal';

export const InstitutionActivityPlannerWidget: React.FC = () => {
  const [activities, setActivities] = useState<PlannerActivity[]>([]);
  const [activeTab, setActiveTab] = useState<'today' | 'pending' | 'upcoming' | 'reminders'>('today');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<PlannerActivity | null>(null);

  const referenceDate = '2026-10-22'; // Thursday, Oct 22, 2026

  const refreshData = () => {
    setActivities(getAllPlannerActivities());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Filtered views
  const todayActivities = activities.filter((a) => a.date === referenceDate);
  const pendingTasks = activities.filter((a) => a.status !== 'completed' && (a.type === 'task' || a.priority === 'high'));
  const overdueReminders = getOverdueReminders(referenceDate);
  const upcomingWeek = getUpcoming7Days(referenceDate).filter((a) => a.date !== referenceDate);
  const topFocus = getTopFocusTasks(referenceDate);

  // Toggle complete
  const handleToggleComplete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleTaskCompleted(id);
    refreshData();
  };

  // Open modal for new
  const handleAddNew = () => {
    setSelectedActivity(null);
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleEdit = (act: PlannerActivity) => {
    setSelectedActivity(act);
    setIsModalOpen(true);
  };

  // Save from modal
  const handleSaveModal = (data: Omit<PlannerActivity, 'id' | 'createdAt' | 'updatedAt' | 'source'>) => {
    if (selectedActivity) {
      updatePlannerActivity(selectedActivity.id, data);
    } else {
      addPlannerActivity(data);
    }
    refreshData();
  };

  // Delete from modal
  const handleDeleteModal = (id: string) => {
    deletePlannerActivity(id);
    refreshData();
  };

  // Render Type Badge
  const renderTypeBadge = (type: PlannerActivityType) => {
    switch (type) {
      case 'meeting':
        return <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>Meeting</span>;
      case 'deadline':
        return <span className="badge badge-error" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>Deadline</span>;
      case 'reminder':
        return <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>Reminder</span>;
      case 'lms_event':
        return <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>LMS Event</span>;
      default:
        return <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>Task</span>;
    }
  };

  // Render Priority Dot
  const renderPriorityDot = (priority: PlannerPriority) => {
    const color = priority === 'high' ? 'var(--danger)' : priority === 'medium' ? 'var(--warning)' : 'var(--success)';
    return (
      <span
        title={`Priority: ${priority}`}
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
          flexShrink: 0
        }}
      />
    );
  };

  // Current tab items to display in the list
  const getTabItems = () => {
    switch (activeTab) {
      case 'pending':
        return pendingTasks;
      case 'upcoming':
        return upcomingWeek;
      case 'reminders':
        return [...overdueReminders, ...activities.filter((a) => a.reminder !== 'none' && a.status !== 'completed')];
      case 'today':
      default:
        return todayActivities;
    }
  };

  const currentTabItems = getTabItems();

  return (
    <div className="card" id="activity-planner" style={{ padding: '20px' }}>
      {/* 1. Header with Title, Badges, and Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <span
              className="badge badge-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#6366f1',
                borderColor: 'rgba(99, 102, 241, 0.3)'
              }}
            >
              <Calendar size={12} /> Today's Activity & Planner
            </span>
            <span className="text-muted text-xs">
              Thursday, Oct 22, 2026 &bull; Local Time
            </span>
          </div>
          <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, wordBreak: 'break-word' }}>
            Today's Activity & Planner
          </h3>
          <p className="text-secondary text-xs" style={{ margin: '2px 0 0 0', wordBreak: 'break-word' }}>
            Daily agenda, time-sensitive reminders, LMS deadlines, and executive admin tasks
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleAddNew}
            className="btn btn-primary btn-sm"
            style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
          >
            <Plus size={13} /> Add Activity
          </button>
          <Link
            to="/calendar"
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
            title="Open Full Calendar & Activity Planner"
          >
            View Calendar <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      {/* 2. Top Metric Counters (Compact Responsive Grid) */}
      <div className="planner-kpi-summary-grid">
        {/* Today's Scheduled */}
        <div
          onClick={() => setActiveTab('today')}
          style={{
            background: activeTab === 'today' ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-input)',
            borderColor: activeTab === 'today' ? 'var(--primary)' : 'var(--border-subtle)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            minWidth: 0
          }}
        >
          <div className="text-muted text-xs font-semibold" style={{ fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>TODAY'S AGENDA</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
            {todayActivities.length}
          </div>
          <span className="text-muted text-xs" style={{ fontSize: '0.65rem' }}>Scheduled items</span>
        </div>

        {/* Pending Tasks */}
        <div
          onClick={() => setActiveTab('pending')}
          style={{
            background: activeTab === 'pending' ? 'rgba(6, 182, 212, 0.1)' : 'var(--bg-input)',
            borderColor: activeTab === 'pending' ? 'var(--accent-cyan)' : 'var(--border-subtle)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            minWidth: 0
          }}
        >
          <div className="text-muted text-xs font-semibold" style={{ fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>PENDING TASKS</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '2px' }}>
            {pendingTasks.length}
          </div>
          <span className="text-muted text-xs" style={{ fontSize: '0.65rem' }}>Awaiting action</span>
        </div>

        {/* Upcoming 7 Days */}
        <div
          onClick={() => setActiveTab('upcoming')}
          style={{
            background: activeTab === 'upcoming' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-input)',
            borderColor: activeTab === 'upcoming' ? 'var(--success)' : 'var(--border-subtle)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            minWidth: 0
          }}
        >
          <div className="text-muted text-xs font-semibold" style={{ fontSize: '0.675rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>UPCOMING (7D)</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
            {upcomingWeek.length}
          </div>
          <span className="text-muted text-xs" style={{ fontSize: '0.65rem' }}>Next 7 days</span>
        </div>

        {/* Overdue Reminders */}
        <div
          onClick={() => setActiveTab('reminders')}
          style={{
            background: overdueReminders.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-input)',
            borderColor: overdueReminders.length > 0 ? 'var(--danger)' : 'var(--border-subtle)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderRadius: 'var(--radius-md)',
            padding: '8px 10px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            minWidth: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
            <span className="text-muted text-xs font-semibold" style={{ fontSize: '0.675rem', whiteSpace: 'nowrap' }}>OVERDUE / ALERTS</span>
            {overdueReminders.length > 0 && <AlertCircle size={11} color="var(--danger)" />}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: overdueReminders.length > 0 ? 'var(--danger)' : 'var(--text-main)', marginTop: '2px' }}>
            {overdueReminders.length}
          </div>
          <span className="text-muted text-xs" style={{ fontSize: '0.65rem' }}>
            {overdueReminders.length > 0 ? 'Attention needed' : 'All clear'}
          </span>
        </div>
      </div>

      {/* 3. Today's Focus: Top 3 High-Priority Tasks */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.08))',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="var(--primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Today's Focus: Top Priorities
            </span>
          </div>
          <span className="text-muted text-xs">Direct actions</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {topFocus.map((task) => {
            const isDone = task.status === 'completed';
            return (
              <div
                key={task.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  border: '1px solid var(--border-subtle)',
                  opacity: isDone ? 0.6 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => handleToggleComplete(e, task.id)}
                    style={{
                      background: isDone ? 'var(--success)' : 'transparent',
                      border: `1px solid ${isDone ? 'var(--success)' : 'var(--text-muted)'}`,
                      color: '#fff',
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title={isDone ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {isDone && <Check size={12} strokeWidth={3} />}
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {renderPriorityDot(task.priority)}
                      <span>{task.startTime || 'All day'}</span>
                      {task.relatedLmsTitle && (
                        <span>&bull; {task.relatedLmsTitle}</span>
                      )}
                    </div>
                  </div>
                </div>

                {task.relatedLmsUrl && (
                  <Link
                    to={task.relatedLmsUrl}
                    className="text-primary text-xs"
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontWeight: 600,
                      textDecoration: 'none'
                    }}
                  >
                    Open &rarr;
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Navigation Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', minWidth: 0 }}>
          {[
            { id: 'today', label: `Today's Agenda (${todayActivities.length})` },
            { id: 'pending', label: `Pending Tasks (${pendingTasks.length})` },
            { id: 'upcoming', label: `Next 7 Days (${upcomingWeek.length})` },
            { id: 'reminders', label: `Reminders (${overdueReminders.length + activities.filter((a) => a.reminder !== 'none').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '0.75rem',
                padding: '6px 8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Link
          to="/calendar"
          className="text-primary text-xs"
          style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 'auto' }}
        >
          Calendar Full View <ChevronRight size={12} />
        </Link>
      </div>

      {/* 5. Activity Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {currentTabItems.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 12px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)'
          }}>
            <Calendar size={24} color="var(--text-muted)" style={{ margin: '0 auto 6px' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>No items in this category</div>
            <p className="text-muted text-xs" style={{ margin: '2px 0 8px' }}>
              Schedule a task, deadline, or meeting to stay ahead of academic operations.
            </p>
            <button
              type="button"
              onClick={handleAddNew}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.725rem' }}
            >
              <Plus size={11} style={{ marginRight: '4px' }} /> Add Activity
            </button>
          </div>
        ) : (
          currentTabItems.slice(0, 6).map((item) => {
            const isDone = item.status === 'completed';
            const isOverdue = item.date < referenceDate && !isDone;

            return (
              <div
                key={item.id}
                onClick={() => handleEdit(item)}
                style={{
                  background: isOverdue ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-input)',
                  border: `1px solid ${isOverdue ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease'
                }}
              >
                {/* Left section: checkbox & details */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => handleToggleComplete(e, item.id)}
                    style={{
                      background: isDone ? 'var(--success)' : 'transparent',
                      border: `1px solid ${isDone ? 'var(--success)' : isOverdue ? 'var(--danger)' : 'var(--text-muted)'}`,
                      color: '#fff',
                      width: '18px',
                      height: '18px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                    title={isDone ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {isDone && <Check size={12} strokeWidth={3} />}
                  </button>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        textDecoration: isDone ? 'line-through' : 'none',
                        wordBreak: 'break-word'
                      }}>
                        {item.title}
                      </span>

                      {/* Source Badge */}
                      {item.source === 'lms_auto' ? (
                        <span className="badge badge-secondary" style={{ fontSize: '0.6rem', padding: '0 4px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', borderColor: 'rgba(6, 182, 212, 0.25)' }}>
                          LMS Auto
                        </span>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '0.6rem', padding: '0 4px' }}>
                          Admin
                        </span>
                      )}

                      {/* Type Badge */}
                      {renderTypeBadge(item.type)}

                      {/* Overdue alert */}
                      {isOverdue && (
                        <span className="badge badge-error" style={{ fontSize: '0.6rem', padding: '0 4px' }}>
                          Overdue
                        </span>
                      )}
                    </div>

                    {/* Metadata line */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', flexWrap: 'wrap' }}>
                      {renderPriorityDot(item.priority)}
                      <span>{item.date}</span>
                      {item.startTime && <span>&bull; {item.startTime}{item.endTime ? ` - ${item.endTime}` : ''}</span>}
                      {item.recurrence && item.recurrence !== 'none' && (
                        <span style={{ color: 'var(--primary)' }}>&bull; Repeats {item.recurrence}</span>
                      )}
                      {item.relatedLmsTitle && (
                        <span style={{ color: 'var(--accent-cyan)' }}>&bull; {item.relatedLmsTitle}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right section: link to LMS record */}
                {item.relatedLmsUrl && (
                  <Link
                    to={item.relatedLmsUrl}
                    onClick={(e) => e.stopPropagation()}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.7rem', padding: '3px 8px', height: '24px', flexShrink: 0 }}
                    title={`Open related page: ${item.relatedLmsTitle || item.relatedLmsUrl}`}
                  >
                    Open &rarr;
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 6. Footer Link */}
      <div style={{
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.725rem',
        color: 'var(--text-muted)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <span>
          Showing {Math.min(6, currentTabItems.length)} of {currentTabItems.length} items
        </span>
        <Link
          to="/calendar"
          style={{
            color: 'var(--primary)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            textDecoration: 'none'
          }}
        >
          Open Academic Calendar Planner <ArrowUpRight size={11} />
        </Link>
      </div>

      {/* Add / Edit Activity Modal */}
      <AddEditActivityModal
        isOpen={isModalOpen}
        activityToEdit={selectedActivity}
        initialDate={referenceDate}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModal}
        onDelete={handleDeleteModal}
      />
    </div>
  );
};
