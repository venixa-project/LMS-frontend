import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { useAnnouncementStore } from '../../lib/announcementStore';
import { useCourseStore } from '../../lib/courseStore';
import { useCohortStore } from '../../lib/cohortStore';
import {
  mockNotificationTemplates,
  mockDepartments,
  mockAssessments,
  mockLiveSessions,
} from '../../data/mockData';
import {
  NotificationTemplate,
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementScope,
} from '../../types';
import {
  Bell,
  Mail,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  Plus,
  ShieldCheck,
  X,
  Megaphone,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Calendar,
  Filter,
  Search,
  CheckCheck,
  BookOpen,
  Video,
  Award,
  ClipboardCheck,
  ArrowRight,
  UserCheck,
  Layers,
  ExternalLink,
  Archive,
  RefreshCw,
  Check,
  ChevronDown,
} from 'lucide-react';

export const NotificationsCenterPage: React.FC = () => {
  const { user, notifications, markNotificationRead, markAllNotificationsRead } = useAuthStore();
  const {
    announcements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    archiveAnnouncement,
    unarchiveAnnouncement,
    publishDraft,
    markAnnouncementRead,
    markAllAnnouncementsRead,
    getAnnouncementsForUser,
  } = useAnnouncementStore();

  const { courses } = useCourseStore();
  const { cohorts } = useCohortStore();

  // Role resolution
  const isPlatformAdmin = user?.activeRole === 'platform_admin';
  const isOrgAdmin = user?.activeRole === 'org_admin' || user?.activeRole === 'lms_admin' || isPlatformAdmin;
  const isFaculty =
    user?.activeRole === 'trainer' ||
    user?.activeRole === 'instructor' ||
    user?.activeRole === 'assessment_author';
  const isLearner =
    user?.activeRole === 'student' ||
    user?.activeRole === 'learner' ||
    user?.activeRole === 'guest';

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'all' | 'announcements' | 'alerts' | 'templates' | 'logs' | 'channels'>(
    isLearner ? 'all' : 'announcements'
  );

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | 'all'>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Success Feedback Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Custom Delete Announcement Confirmation Modal State
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const cancelDeleteBtnRef = useRef<HTMLButtonElement>(null);

  // Focus management & Escape key handling for delete confirmation dialog
  useEffect(() => {
    if (announcementToDelete) {
      // Focus cancel button for safe keyboard accessibility
      const timer = setTimeout(() => {
        cancelDeleteBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [announcementToDelete]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && announcementToDelete && !isDeleting) {
        setAnnouncementToDelete(null);
        setDeleteError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [announcementToDelete, isDeleting]);

  // Execute delete operation
  const handleConfirmDelete = async () => {
    if (!announcementToDelete || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Micro-async pause to show loading state and prevent duplicate clicks
      await new Promise((resolve) => setTimeout(resolve, 350));
      const res = deleteAnnouncement(announcementToDelete.id);
      if (res && res.success === false) {
        setDeleteError(res.message || 'Failed to delete announcement.');
        setIsDeleting(false);
        return;
      }
      showToast('Announcement deleted.');
      setAnnouncementToDelete(null);
      setIsDeleting(false);
    } catch (err: any) {
      setDeleteError(err?.message || 'An unexpected error occurred while deleting the announcement.');
      setIsDeleting(false);
    }
  };

  // Student Enrolled IDs for filtering
  const studentEnrolledCourseIds = useMemo(() => {
    return ['crs-001', 'crs-002'];
  }, []);

  const studentEnrolledCohortIds = useMemo(() => {
    return ['coh-001'];
  }, []);

  // Trainer Authorized Resources (strictly scoped)
  const trainerAssignedCourses = useMemo(() => {
    return courses.filter(
      (c) =>
        isPlatformAdmin ||
        c.createdBy === user?.id ||
        c.instructors?.includes(user?.id || '') ||
        c.id === 'crs-001' ||
        c.id === 'crs-002' ||
        c.id === 'crs-004'
    );
  }, [courses, user, isPlatformAdmin]);

  const trainerAssignedCohorts = useMemo(() => {
    return cohorts.filter(
      (coh) =>
        isPlatformAdmin ||
        coh.instructors?.includes(user?.id || '') ||
        coh.id === 'coh-001' ||
        coh.id === 'coh-002'
    );
  }, [cohorts, user, isPlatformAdmin]);

  // Scoped Announcements for current user
  const userAnnouncements = useMemo(() => {
    return getAnnouncementsForUser(user, studentEnrolledCourseIds, studentEnrolledCohortIds);
  }, [user, announcements, studentEnrolledCourseIds, studentEnrolledCohortIds, getAnnouncementsForUser]);

  // Filtered Announcements
  const filteredAnnouncements = useMemo(() => {
    return userAnnouncements.filter((ann) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          ann.title.toLowerCase().includes(q) ||
          ann.content.toLowerCase().includes(q) ||
          ann.authorName.toLowerCase().includes(q) ||
          ann.targetAudience.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && ann.category !== selectedCategory) {
        return false;
      }

      // 3. Priority filter
      if (selectedPriority !== 'all' && ann.priority !== selectedPriority) {
        return false;
      }

      // 4. Course filter
      if (selectedCourseFilter !== 'all' && ann.targetCourseId !== selectedCourseFilter) {
        return false;
      }

      // 5. Admin / Trainer Status filter
      if (!isLearner && statusFilter !== 'all' && ann.status !== statusFilter) {
        return false;
      }

      // 6. Read status filter
      if (user && readFilter !== 'all') {
        const isRead = ann.readByUserIds.includes(user.id);
        if (readFilter === 'unread' && isRead) return false;
        if (readFilter === 'read' && !isRead) return false;
      }

      return true;
    });
  }, [userAnnouncements, searchQuery, selectedCategory, selectedPriority, selectedCourseFilter, statusFilter, readFilter, user, isLearner]);

  // Student Academic Reminders (from notifications store)
  const studentReminders = useMemo(() => {
    return notifications.filter((n) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (readFilter === 'unread' && n.isRead) return false;
      if (readFilter === 'read' && !n.isRead) return false;
      return true;
    });
  }, [notifications, searchQuery, readFilter]);

  // Unread counters
  const unreadAnnouncementsCount = useMemo(() => {
    if (!user) return 0;
    return userAnnouncements.filter((a) => !a.readByUserIds.includes(user.id)).length;
  }, [userAnnouncements, user]);

  const unreadRemindersCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const totalUnreadCount = unreadAnnouncementsCount + unreadRemindersCount;

  // Modals & Forms State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [isPreviewActive, setIsPreviewActive] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState<AnnouncementCategory>(
    isFaculty ? 'Course Updates' : 'General'
  );
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('normal');
  const [formAudienceType, setFormAudienceType] = useState<'all' | 'students' | 'faculty' | 'course' | 'cohort' | 'department'>(
    isFaculty ? 'course' : 'all'
  );
  const [formTargetDepartmentId, setFormTargetDepartmentId] = useState<string>('dep-001');
  const [formTargetCourseId, setFormTargetCourseId] = useState<string>(
    trainerAssignedCourses[0]?.id || 'crs-001'
  );
  const [formTargetCohortId, setFormTargetCohortId] = useState<string>(
    trainerAssignedCohorts[0]?.id || 'coh-001'
  );
  const [formTimingType, setFormTimingType] = useState<'now' | 'scheduled'>('now');
  const [formScheduledDate, setFormScheduledDate] = useState<string>('');
  const [formExpiryDate, setFormExpiryDate] = useState<string>('');
  const [formInApp, setFormInApp] = useState(true);
  const [formEmail, setFormEmail] = useState(true);
  const [formAssociatedAssessmentId, setFormAssociatedAssessmentId] = useState<string>('');
  const [formAssociatedSessionId, setFormAssociatedSessionId] = useState<string>('');

  // Notification Templates (Admin)
  const [templates] = useState<NotificationTemplate[]>(mockNotificationTemplates);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAnnouncementId(null);
    setIsPreviewActive(false);
    setFormTitle('');
    setFormContent('');
    setFormCategory(isFaculty ? 'Course Updates' : 'General');
    setFormPriority('normal');
    setFormAudienceType(isFaculty ? 'course' : 'all');
    setFormTargetDepartmentId('dep-001');
    setFormTargetCourseId(trainerAssignedCourses[0]?.id || 'crs-001');
    setFormTargetCohortId(trainerAssignedCohorts[0]?.id || 'coh-001');
    setFormTimingType('now');
    setFormScheduledDate('');
    setFormExpiryDate('');
    setFormInApp(true);
    setFormEmail(true);
    setFormAssociatedAssessmentId('');
    setFormAssociatedSessionId('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (ann: Announcement) => {
    setEditingAnnouncementId(ann.id);
    setIsPreviewActive(false);
    setFormTitle(ann.title);
    setFormContent(ann.content);
    setFormCategory(ann.category);
    setFormPriority(ann.priority);
    setFormAudienceType(ann.audienceType);
    setFormTargetDepartmentId(ann.targetDepartmentId || 'dep-001');
    setFormTargetCourseId(ann.targetCourseId || trainerAssignedCourses[0]?.id || 'crs-001');
    setFormTargetCohortId(ann.targetCohortId || trainerAssignedCohorts[0]?.id || 'coh-001');
    setFormTimingType(ann.status === 'scheduled' ? 'scheduled' : 'now');
    setFormScheduledDate(ann.scheduledAt ? ann.scheduledAt.substring(0, 16) : '');
    setFormExpiryDate(ann.expiresAt ? ann.expiresAt.substring(0, 10) : '');
    setFormInApp(ann.channels.includes('in_app'));
    setFormEmail(ann.channels.includes('email'));
    setFormAssociatedAssessmentId(ann.associatedAssessmentId || '');
    setFormAssociatedSessionId(ann.associatedSessionId || '');
    setIsFormModalOpen(true);
  };

  // Handle Assessment Association autofill (Trainer convenience)
  const handleSelectAssociatedAssessment = (assessmentId: string) => {
    setFormAssociatedAssessmentId(assessmentId);
    if (!assessmentId) return;
    const asm = mockAssessments.find((a) => a.id === assessmentId);
    if (asm) {
      if (!formTitle.trim()) {
        setFormTitle(`Assessment Notice: ${asm.title}`);
      }
      if (!formContent.trim()) {
        setFormContent(
          `Please prepare for ${asm.title}. Time limit is ${asm.duration || 45} minutes with passing score of ${asm.passmark || 70}%. Verify your proctoring requirements in advance.`
        );
      }
      setFormCategory('Quiz & Assessment Notices');
      setFormPriority(asm.proctoringRequired ? 'urgent' : 'important');
    }
  };

  // Handle Timetable Session Association autofill
  const handleSelectAssociatedSession = (sessionId: string) => {
    setFormAssociatedSessionId(sessionId);
    if (!sessionId) return;
    const sess = mockLiveSessions.find((s) => s.id === sessionId);
    if (sess) {
      if (!formTitle.trim()) {
        setFormTitle(`Live Lecture Reminder: ${sess.title}`);
      }
      if (!formContent.trim()) {
        setFormContent(
          `Scheduled live webinar for ${sess.title} is coming up. Please review lesson prerequisites and join via the timetable link.`
        );
      }
      setFormCategory('Live Class Reminders');
      setFormPriority('normal');
    }
  };

  // Save Announcement (Draft or Published/Scheduled)
  const handleSaveAnnouncement = (targetStatus: 'published' | 'draft') => {
    if (!formTitle.trim() || !formContent.trim()) {
      alert('Please enter both an Announcement Title and Message Content.');
      return;
    }

    const channels: ('in_app' | 'email')[] = [];
    if (formInApp) channels.push('in_app');
    if (formEmail) channels.push('email');
    const finalChannels: ('in_app' | 'email')[] = channels.length > 0 ? channels : ['in_app'];

    // Calculate readable target audience label
    let audienceLabel = 'All Students & Faculty';
    let scope: AnnouncementScope = 'institution';

    if (formAudienceType === 'all') {
      audienceLabel = 'All Students & Faculty';
      scope = 'institution';
    } else if (formAudienceType === 'students') {
      audienceLabel = 'All Enrolled Students';
      scope = 'institution';
    } else if (formAudienceType === 'faculty') {
      audienceLabel = 'All Faculty & Staff';
      scope = 'institution';
    } else if (formAudienceType === 'department') {
      const dept = mockDepartments.find((d) => d.id === formTargetDepartmentId);
      audienceLabel = `${dept?.name || 'Department'} Department`;
      scope = 'department';
    } else if (formAudienceType === 'course') {
      const crs = courses.find((c) => c.id === formTargetCourseId);
      audienceLabel = `Course: ${crs?.title || formTargetCourseId}`;
      scope = 'course';
    } else if (formAudienceType === 'cohort') {
      const coh = cohorts.find((c) => c.id === formTargetCohortId);
      audienceLabel = `Class: ${coh?.name || formTargetCohortId}`;
      scope = 'cohort';
    }

    const finalStatus: AnnouncementStatus =
      targetStatus === 'draft'
        ? 'draft'
        : formTimingType === 'scheduled' && formScheduledDate
          ? 'scheduled'
          : 'published';

    const payload = {
      organizationId: user?.organizationId || 'org-001',
      title: formTitle.trim(),
      content: formContent.trim(),
      category: formCategory,
      priority: formPriority,
      status: finalStatus,
      scope,
      targetAudience: audienceLabel,
      audienceType: formAudienceType,
      targetDepartmentId: formAudienceType === 'department' ? formTargetDepartmentId : undefined,
      targetCourseId: formAudienceType === 'course' ? formTargetCourseId : undefined,
      targetCohortId: formAudienceType === 'cohort' ? formTargetCohortId : undefined,
      authorId: user?.id || 'u-001',
      authorName: user?.displayName || 'Academic Administration',
      authorRole: user?.activeRole || 'org_admin',
      scheduledAt: formTimingType === 'scheduled' && formScheduledDate ? new Date(formScheduledDate).toISOString() : undefined,
      expiresAt: formExpiryDate ? new Date(`${formExpiryDate}T23:59:59Z`).toISOString() : undefined,
      channels: finalChannels,
      deliveryStatus: {
        inAppDelivered: finalStatus === 'published',
        emailSent: false, // SendGrid provider is not configured
        emailDeliveredCount: 0,
        totalTargetRecipients: formAudienceType === 'cohort' ? 12 : formAudienceType === 'course' ? 42 : 350,
      },
      associatedAssessmentId: formAssociatedAssessmentId || undefined,
      associatedSessionId: formAssociatedSessionId || undefined,
    };

    if (editingAnnouncementId) {
      updateAnnouncement(editingAnnouncementId, payload);
      showToast('Announcement updated successfully.');
    } else {
      createAnnouncement(payload);
      showToast(
        finalStatus === 'published'
          ? 'Announcement published to target audience!'
          : finalStatus === 'scheduled'
            ? 'Announcement scheduled for future publication.'
            : 'Announcement saved as draft.'
      );
    }

    setIsFormModalOpen(false);
  };

  // Mark all read for current view
  const handleMarkAllRead = () => {
    if (!user) return;
    markAllAnnouncementsRead(user.id);
    markAllNotificationsRead();
    showToast('All notifications and announcements marked as read.');
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-primary">Campus Communications</span>
            {isOrgAdmin && <span className="badge badge-draft">Admin Operations</span>}
            {isFaculty && <span className="badge badge-success">Faculty Operations</span>}
            {isLearner && <span className="badge badge-active">{user?.displayName || 'Student'}</span>}
            {totalUnreadCount > 0 && (
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: '#fff',
                  background: 'var(--danger)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {totalUnreadCount} Unread
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
            {isFaculty
              ? 'Course Announcements & Teaching Alerts'
              : isLearner
                ? 'Campus Announcements & Reminders'
                : 'Institution Announcements & Notifications'}
          </h1>
          <p className="text-secondary text-sm" style={{ margin: 0 }}>
            {isFaculty
              ? 'Publish course updates, assessment notices, and class reminders to your assigned learners.'
              : isLearner
                ? 'Campus bulletins from administration, instructor announcements, and academic deadlines.'
                : 'Institution-wide broadcast bulletins, department targeting, automated delivery logs, and templates.'}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isLearner && totalUnreadCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleMarkAllRead}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <CheckCheck size={16} /> Mark All as Read
            </button>
          )}

          {!isLearner && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Megaphone size={16} />
              {isFaculty ? 'Create Course Announcement' : 'Create Announcement'}
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="tabs-nav" style={{ marginBottom: '20px' }}>
        {isLearner ? (
          <>
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <Layers size={16} />
              All Notifications ({userAnnouncements.length + notifications.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
              onClick={() => setActiveTab('announcements')}
            >
              <Megaphone size={16} />
              Announcements ({userAnnouncements.length})
              {unreadAnnouncementsCount > 0 && (
                <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                  {unreadAnnouncementsCount}
                </span>
              )}
            </button>
            <button
              className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              <Bell size={16} />
              Academic Reminders ({notifications.length})
              {unreadRemindersCount > 0 && (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                  {unreadRemindersCount}
                </span>
              )}
            </button>
          </>
        ) : isFaculty ? (
          <>
            <button
              className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
              onClick={() => setActiveTab('announcements')}
            >
              <Megaphone size={16} />
              Course & Campus Announcements ({userAnnouncements.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              <Bell size={16} />
              Class & Teaching Alerts (4)
            </button>
          </>
        ) : (
          <>
            <button
              className={`tab-btn ${activeTab === 'announcements' ? 'active' : ''}`}
              onClick={() => setActiveTab('announcements')}
            >
              <Megaphone size={16} />
              Announcements ({userAnnouncements.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
              onClick={() => setActiveTab('logs')}
            >
              <Send size={16} />
              Delivery & Channel Logs
            </button>
            <button
              className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <Mail size={16} />
              Notification Templates ({templates.length})
            </button>
            <button
              className={`tab-btn ${activeTab === 'channels' ? 'active' : ''}`}
              onClick={() => setActiveTab('channels')}
            >
              <Bell size={16} />
              Channel Providers
            </button>
          </>
        )}
      </div>

      {/* FILTER CONTROLS BAR (Shown on announcements & student all feed) */}
      {(activeTab === 'announcements' || activeTab === 'all') && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Sub-status filter pills for Admin / Trainer */}
          {!isLearner && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              {[
                { id: 'all' as const, label: `All (${userAnnouncements.length})` },
                { id: 'published' as const, label: `Published (${userAnnouncements.filter((a) => a.status === 'published').length})` },
                { id: 'scheduled' as const, label: `Scheduled (${userAnnouncements.filter((a) => a.status === 'scheduled').length})` },
                { id: 'draft' as const, label: `Drafts (${userAnnouncements.filter((a) => a.status === 'draft').length})` },
                { id: 'archived' as const, label: `Archived (${userAnnouncements.filter((a) => a.status === 'archived').length})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: statusFilter === pill.id ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: statusFilter === pill.id ? 'var(--primary-light)' : 'transparent',
                    color: statusFilter === pill.id ? 'var(--primary)' : 'var(--text-secondary)',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          )}

          {/* Search & Secondary Filter Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search announcements, topics, or authors..."
                className="form-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.875rem' }}
              />
            </div>

            {/* Read Status Filter */}
            <select
              className="form-input"
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value as any)}
              style={{ width: 'auto', minWidth: '130px', height: '38px', fontSize: '0.875rem' }}
            >
              <option value="all">All Read Status</option>
              <option value="unread">Unread Only</option>
              <option value="read">Read Only</option>
            </select>

            {/* Category Filter */}
            <select
              className="form-input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: 'auto', minWidth: '160px', height: '38px', fontSize: '0.875rem' }}
            >
              <option value="all">All Categories</option>
              <option value="General">General</option>
              <option value="Academic">Academic</option>
              <option value="Examination">Examination</option>
              <option value="Course Updates">Course Updates</option>
              <option value="Quiz & Assessment Notices">Quiz & Assessment Notices</option>
              <option value="Live Class Reminders">Live Class Reminders</option>
              <option value="Assignment Deadlines">Assignment Deadlines</option>
              <option value="Holiday">Holiday</option>
              <option value="Maintenance">Maintenance</option>
            </select>

            {/* Course Filter (for student & faculty) */}
            {(isLearner || isFaculty) && (
              <select
                className="form-input"
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '170px', height: '38px', fontSize: '0.875rem' }}
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            )}

            {/* Priority Filter */}
            <select
              className="form-input"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              style={{ width: 'auto', minWidth: '130px', height: '38px', fontSize: '0.875rem' }}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="important">Important</option>
              <option value="normal">Normal</option>
            </select>

            {/* Clear Filters Button */}
            {(searchQuery || selectedCategory !== 'all' || selectedCourseFilter !== 'all' || selectedPriority !== 'all' || readFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedCourseFilter('all');
                  setSelectedPriority('all');
                  setReadFilter('all');
                  setStatusFilter('all');
                }}
                style={{ fontSize: '0.825rem' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: ALL NOTIFICATIONS (STUDENT UNIFIED FEED)           */}
      {/* ======================================================== */}
      {activeTab === 'all' && isLearner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAnnouncements.length === 0 && studentReminders.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <CheckCircle2 size={40} color="var(--success)" style={{ marginBottom: '12px', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px 0' }}>You're all caught up!</h3>
              <p className="text-secondary text-sm" style={{ margin: 0 }}>
                No active announcements or academic reminders matching your filters.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {/* Announcements Section */}
              {filteredAnnouncements.map((ann) => {
                const isRead = user ? ann.readByUserIds.includes(user.id) : false;
                return (
                  <div
                    key={ann.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: isRead ? 'var(--bg-card)' : 'var(--primary-light)',
                      borderLeft: ann.priority === 'urgent' ? '4px solid var(--danger)' : isRead ? '1px solid var(--border-subtle)' : '4px solid var(--primary)',
                      position: 'relative',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div>
                      {/* Top Badges Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`badge badge-${ann.priority === 'urgent' ? 'error' : ann.priority === 'important' ? 'warning' : 'primary'}`}>
                            {ann.priority.toUpperCase()}
                          </span>
                          <span className="badge badge-secondary" style={{ fontSize: '0.725rem' }}>
                            {ann.category}
                          </span>
                        </div>
                        {!isRead ? (
                          <span className="badge badge-active" style={{ fontSize: '0.65rem', fontWeight: 700 }}>
                            NEW
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Read</span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.4, color: 'var(--text-main)' }}>
                        {ann.title}
                      </h3>
                      <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
                        {ann.content}
                      </p>
                    </div>

                    {/* Bottom Metadata & Actions */}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        <span>Target: <strong>{ann.targetAudience}</strong></span>
                        <span>{new Date(ann.publishedAt || ann.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span className="text-muted text-xs">By {ann.authorName}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => user && markAnnouncementRead(ann.id, user.id)}
                          style={{ fontSize: '0.75rem', color: isRead ? 'var(--text-muted)' : 'var(--primary)' }}
                        >
                          {isRead ? 'Marked as read' : 'Mark as read'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Academic Reminders Section */}
              {studentReminders.map((rem) => (
                <div
                  key={rem.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: rem.isRead ? 'var(--bg-card)' : 'var(--primary-light)',
                    borderLeft: '4px solid var(--warning)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="badge badge-warning" style={{ textTransform: 'capitalize' }}>
                          {rem.category.replace('_', ' ')}
                        </span>
                      </div>
                      {!rem.isRead && (
                        <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.4 }}>
                      {rem.title}
                    </h3>
                    <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
                      {rem.message}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="text-muted text-xs">
                      {new Date(rem.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                    {rem.link ? (
                      <a
                        href={rem.link}
                        onClick={() => markNotificationRead(rem.id)}
                        className="btn btn-secondary btn-xs"
                        style={{ fontSize: '0.75rem' }}
                      >
                        Open Action &rarr;
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => markNotificationRead(rem.id)}
                      >
                        {rem.isRead ? 'Read' : 'Mark as read'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ANNOUNCEMENTS FEED (ADMIN, TRAINER & STUDENT)     */}
      {/* ======================================================== */}
      {activeTab === 'announcements' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Institutional Banner info */}
          <div
            style={{
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 18px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'var(--text-main)',
            }}
          >
            <Megaphone size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
            <div>
              {isOrgAdmin ? (
                <span>
                  <strong>Institution Communication Hub:</strong> Broadcast bulletins, examinations, and operational announcements directly to faculty and student rosters across Acme Learning Corp.
                </span>
              ) : isFaculty ? (
                <span>
                  <strong>Faculty Course Bulletin:</strong> Create and publish announcements for your assigned courses, cohorts, and student rosters.
                </span>
              ) : (
                <span>
                  <strong>Campus & Course Bulletins:</strong> Verified notifications published by institution leadership and your course instructors.
                </span>
              )}
            </div>
          </div>

          {/* Announcements Grid */}
          {filteredAnnouncements.length === 0 ? (
            <div
              style={{
                padding: '48px 24px',
                textAlign: 'center',
                background: 'var(--bg-card)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Megaphone size={40} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.4 }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 6px 0' }}>No announcements found</h3>
              <p className="text-secondary text-sm" style={{ margin: 0 }}>
                {searchQuery || selectedCategory !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search criteria or resetting filters.'
                  : 'No announcements have been published to this feed yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
              {filteredAnnouncements.map((ann) => {
                const isRead = user ? ann.readByUserIds.includes(user.id) : false;
                const canManage =
                  !isLearner &&
                  (isOrgAdmin || ann.authorId === user?.id || ann.authorName.includes(user?.lastName || 'Wilson'));

                return (
                  <div
                    key={ann.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      background: isLearner && !isRead ? 'var(--primary-light)' : 'var(--bg-card)',
                      borderLeft:
                        ann.priority === 'urgent'
                          ? '4px solid var(--danger)'
                          : ann.status === 'scheduled'
                            ? '4px solid var(--info)'
                            : ann.status === 'draft'
                              ? '4px solid var(--warning)'
                              : isLearner && !isRead
                                ? '4px solid var(--primary)'
                                : '1px solid var(--border-subtle)',
                      position: 'relative',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div>
                      {/* Top Badges & Status Row */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {/* Priority badge */}
                          <span
                            className={`badge badge-${ann.priority === 'urgent' ? 'error' : ann.priority === 'important' ? 'warning' : 'primary'
                              }`}
                          >
                            {ann.priority.toUpperCase()}
                          </span>

                          {/* Category badge */}
                          <span className="badge badge-secondary" style={{ fontSize: '0.725rem' }}>
                            {ann.category}
                          </span>

                          {/* Status badge for Admin / Trainer */}
                          {!isLearner && (
                            <span
                              className={`badge badge-${ann.status === 'published'
                                  ? 'active'
                                  : ann.status === 'scheduled'
                                    ? 'info'
                                    : ann.status === 'draft'
                                      ? 'draft'
                                      : 'secondary'
                                }`}
                              style={{ textTransform: 'capitalize', fontSize: '0.7rem' }}
                            >
                              {ann.status}
                            </span>
                          )}
                        </div>

                        {/* Management Actions for Admin/Author */}
                        {canManage && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => handleOpenEditModal(ann)}
                              title="Edit Announcement"
                              style={{ padding: '4px', color: 'var(--text-secondary)' }}
                            >
                              <Edit2 size={15} />
                            </button>

                            {ann.status === 'draft' ? (
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => {
                                  publishDraft(ann.id);
                                  showToast('Draft announcement published!');
                                }}
                                title="Publish Draft Immediately"
                                style={{ padding: '4px', color: 'var(--success)' }}
                              >
                                <Send size={15} />
                              </button>
                            ) : ann.status === 'archived' ? (
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => {
                                  unarchiveAnnouncement(ann.id);
                                  showToast('Announcement unarchived.');
                                }}
                                title="Restore / Unarchive"
                                style={{ padding: '4px', color: 'var(--primary)' }}
                              >
                                <RefreshCw size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn-icon"
                                onClick={() => {
                                  archiveAnnouncement(ann.id);
                                  showToast('Announcement archived.');
                                }}
                                title="Archive Announcement"
                                style={{ padding: '4px', color: 'var(--text-muted)' }}
                              >
                                <Archive size={15} />
                              </button>
                            )}

                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => {
                                setDeleteError(null);
                                setAnnouncementToDelete(ann);
                              }}
                              title="Delete Announcement"
                              aria-label={`Delete announcement: ${ann.title}`}
                              style={{ padding: '4px', color: 'var(--danger)' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Announcement Headline */}
                      <h3
                        style={{
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          marginBottom: '8px',
                          lineHeight: 1.4,
                          color: 'var(--text-main)',
                        }}
                      >
                        {ann.title}
                      </h3>

                      {/* Message Content */}
                      <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.55 }}>
                        {ann.content}
                      </p>

                      {/* Associated Assessment or Live Session Button */}
                      {ann.associatedAssessmentId && (
                        <div
                          style={{
                            padding: '8px 12px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.825rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ClipboardCheck size={16} color="var(--primary)" />
                            <span>Linked Assessment: Midterm Practice Test</span>
                          </div>
                          <a
                            href={isLearner ? '/my-assessments' : '/assessments'}
                            className="btn btn-secondary btn-xs"
                          >
                            Open Quiz &rarr;
                          </a>
                        </div>
                      )}

                      {ann.associatedSessionId && (
                        <div
                          style={{
                            padding: '8px 12px',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.825rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Video size={16} color="var(--primary)" />
                            <span>Linked Lecture: Live Interactive Session</span>
                          </div>
                          <a
                            href={isLearner ? '/my-sessions' : '/live-sessions'}
                            className="btn btn-secondary btn-xs"
                          >
                            View Timetable &rarr;
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.8rem',
                          color: 'var(--text-muted)',
                          marginBottom: '8px',
                        }}
                      >
                        <span>
                          Target: <strong>{ann.targetAudience}</strong>
                        </span>
                        <span>
                          {ann.status === 'scheduled' && ann.scheduledAt
                            ? `Scheduled: ${new Date(ann.scheduledAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                            : new Date(ann.publishedAt || ann.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {ann.channels.map((ch) => (
                            <span key={ch} className="badge badge-draft" style={{ fontSize: '0.7rem' }}>
                              {ch === 'in_app' ? 'In-App Banner' : 'Email Broadcast'}
                            </span>
                          ))}
                          {!isLearner && ann.deliveryStatus && (
                            <span className="text-muted text-xs" style={{ marginLeft: '4px' }}>
                              &bull; {ann.readByUserIds.length}/{ann.deliveryStatus.totalTargetRecipients} read
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="text-muted text-xs">By {ann.authorName}</span>
                          {isLearner && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => user && markAnnouncementRead(ann.id, user.id)}
                              style={{ fontSize: '0.75rem', color: isRead ? 'var(--text-muted)' : 'var(--primary)' }}
                            >
                              {isRead ? 'Marked read' : 'Mark as read'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ACADEMIC REMINDERS (STUDENT) / TEACHING ALERTS    */}
      {/* ======================================================== */}
      {activeTab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isFaculty ? (
            /* FACULTY TEACHING ALERTS */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span className="badge badge-warning">Grading SLA</span>
                  <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
                    48h remaining
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                  3 Submissions Awaiting Evaluation
                </h4>
                <p className="text-secondary text-sm" style={{ marginBottom: '14px', lineHeight: 1.5 }}>
                  Advanced React Capstone submissions submitted by Alex Thompson and 2 others are ready for scoring against the course rubric.
                </p>
                <a href="/grading" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                  Open Grading Queue &rarr;
                </a>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span className="badge badge-primary">Lecture Schedule</span>
                  <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
                    Tomorrow 10:00 AM
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                  Live Class: State Machines & Async Hooks
                </h4>
                <p className="text-secondary text-sm" style={{ marginBottom: '14px', lineHeight: 1.5 }}>
                  Scheduled session for Spring 2026 Engineering cohort. Zoom room is verified and attendee roster contains 28 registered learners.
                </p>
                <a href="/live-sessions" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                  View Timetable & Link &rarr;
                </a>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span className="badge badge-danger">Attendance Check</span>
                  <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
                    Action Needed
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                  Attendance Warning: Summer 2026 Batch
                </h4>
                <p className="text-secondary text-sm" style={{ marginBottom: '14px', lineHeight: 1.5 }}>
                  2 learners have attendance rates below the institution 75% threshold in Cloud Infrastructure Engineering.
                </p>
                <a href="/attendance-ledger" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                  Review Batch Attendance &rarr;
                </a>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span className="badge badge-success">Milestone</span>
                  <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
                    Completed
                  </span>
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>
                  Module 3 Quiz Completion Rate &gt;90%
                </h4>
                <p className="text-secondary text-sm" style={{ marginBottom: '14px', lineHeight: 1.5 }}>
                  24 of 26 students in Spring 2026 Engineering have completed the TypeScript Architecture Quiz with an average score of 89.4%.
                </p>
                <a href="/assessments" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                  View Assessment Results &rarr;
                </a>
              </div>
            </div>
          ) : (
            /* STUDENT ACADEMIC REMINDERS */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Course Invitations from Auth Store */}
              {notifications
                .filter((n) => n.category === 'course')
                .map((inv) => (
                  <div
                    key={inv.id}
                    className="card"
                    style={{
                      borderLeft: '4px solid var(--primary)',
                      background: inv.isRead ? undefined : 'var(--primary-light)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span className="badge badge-primary">Course Invitation</span>
                      {!inv.isRead && (
                        <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
                          NEW
                        </span>
                      )}
                      <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
                        {new Date(inv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>{inv.title}</h4>
                    <p className="text-secondary text-sm" style={{ marginBottom: '12px', lineHeight: 1.5 }}>
                      {inv.message}
                    </p>
                    {inv.link && (
                      <a
                        href={inv.link}
                        onClick={() => markNotificationRead(inv.id)}
                        className="btn btn-primary btn-sm"
                        style={{ width: 'fit-content' }}
                      >
                        View Course Details & Join &rarr;
                      </a>
                    )}
                  </div>
                ))}

              <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span className="badge badge-warning">Assignment Due Soon</span>
                  <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
                    Due Oct 31, 2026
                  </span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                  Advanced React State Management Capstone
                </h4>
                <p className="text-secondary text-sm" style={{ marginBottom: '12px', lineHeight: 1.5 }}>
                  Your capstone deliverable (Offline Kanban Board) is due in 14 days. Deliverable format: GitHub repository with automated tests.
                </p>
                <a href="/assignments" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                  View Assignment & Submit &rarr;
                </a>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span className="badge badge-primary">Upcoming Live Lecture</span>
                  <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
                    Tomorrow 09:00 AM
                  </span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                  Docker Container Orchestration & Health Checks
                </h4>
                <p className="text-secondary text-sm" style={{ marginBottom: '12px', lineHeight: 1.5 }}>
                  Live session led by Dr. James Wilson for Distributed Systems & Cloud Architecture. Room link verified on Zoom.
                </p>
                <a href="/my-sessions" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                  Open Timetable & Join Room &rarr;
                </a>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span className="badge badge-success">Result Published</span>
                  <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
                    Oct 15, 2026
                  </span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                  Distributed Systems Capstone: 92/100 (Grade A)
                </h4>
                <p className="text-secondary text-sm" style={{ marginBottom: '12px', lineHeight: 1.5 }}>
                  Dr. James Wilson has evaluated your microservices submission. Faculty feedback and points are ready for review.
                </p>
                <a href="/my-results" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                  Inspect Evaluation & Feedback &rarr;
                </a>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--info)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span className="badge badge-info">Proctoring Notice</span>
                  <span className="text-muted text-xs" style={{ marginLeft: 'auto' }}>
                    System Check
                  </span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
                  Midterm Exam Window Opening
                </h4>
                <p className="text-secondary text-sm" style={{ marginBottom: '12px', lineHeight: 1.5 }}>
                  Midterm assessments will require verified camera and screen recording authorization. Complete your system check beforehand.
                </p>
                <a href="/my-assessments" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
                  Assessments Portal &rarr;
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: DELIVERY & CHANNEL LOGS (ADMIN ONLY)              */}
      {/* ======================================================== */}
      {activeTab === 'logs' && !isLearner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              padding: '16px 20px',
              background: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertCircle size={20} color="var(--warning)" style={{ flexShrink: 0 }} />
            <div>
              <strong>Delivery Gateway Status:</strong> In-App Web Push is operating live with 100% dispatch success. Transactional Email (SendGrid / SMTP) provider is currently <code>Not Configured</code> in Integrations. Email notifications are queued locally until gateway API credentials are provided.
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>
              Broadcast Delivery & Recipient Dispatch Logs
            </h3>
            <div className="table-container">
              <table className="table" style={{ fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Announcement / Event</th>
                    <th>Target Audience</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Delivery Details</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((ann) => (
                    <tr key={ann.id}>
                      <td className="text-muted text-xs">
                        {new Date(ann.publishedAt || ann.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ann.title}</div>
                        <div className="text-muted text-xs">ID: {ann.id} &bull; {ann.category}</div>
                      </td>
                      <td>
                        <span className="badge badge-secondary">{ann.targetAudience}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {ann.channels.map((ch) => (
                            <span key={ch} className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                              {ch === 'in_app' ? 'In-App' : 'Email'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {ann.status === 'published' ? (
                          <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Delivered
                          </span>
                        ) : ann.status === 'scheduled' ? (
                          <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Scheduled
                          </span>
                        ) : (
                          <span className="badge badge-draft">{ann.status}</span>
                        )}
                      </td>
                      <td className="text-muted text-xs">
                        {ann.status === 'published'
                          ? `In-App: 100% delivered (${ann.readByUserIds.length} read) • Email: SendGrid Queued`
                          : ann.status === 'scheduled'
                            ? `Awaiting trigger date: ${ann.scheduledAt ? new Date(ann.scheduledAt).toLocaleDateString() : 'N/A'}`
                            : 'Draft not broadcast'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: TEMPLATES (ADMIN ONLY)                            */}
      {/* ======================================================== */}
      {activeTab === 'templates' && !isLearner && !isFaculty && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              Automated Event Trigger Templates ({templates.length})
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => alert('New trigger rule wizard (Demo mode).')}
            >
              <Plus size={14} /> Add Template
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Event Trigger</th>
                  <th>Default Channels</th>
                  <th>Subject Line / Heading</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl) => (
                  <tr key={tpl.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tpl.name}</div>
                      <div className="text-muted text-xs">ID: {tpl.id} &bull; v{tpl.version}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.8rem', background: 'var(--bg-input)', padding: '2px 6px', borderRadius: '4px' }}>
                        {tpl.eventTrigger}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {(tpl.channels || [tpl.channel || 'email']).map((ch) => (
                          <span key={ch} className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                            {ch}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{tpl.subject}</td>
                    <td>
                      <span className={`badge badge-${tpl.enabled ?? tpl.isEnabled ?? true ? 'active' : 'draft'}`}>
                        {tpl.enabled ?? tpl.isEnabled ?? true ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setPreviewTemplate(tpl)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Eye size={14} /> Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: CHANNEL PROVIDERS (ADMIN ONLY)                    */}
      {/* ======================================================== */}
      {activeTab === 'channels' && !isLearner && !isFaculty && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Bell size={24} color="var(--primary)" />
              <span className="badge badge-active">Active</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              In-App Notification Banners & Drawer
            </h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
              Instant reactive in-app broadcast alerts delivered in real-time across browser tabs to enrolled students and faculty.
            </p>
            <span className="badge badge-primary">Default Delivery Provider</span>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <Mail size={24} color="var(--warning)" />
              <span className="badge badge-warning">Not Configured</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              Transactional Email (SendGrid / SMTP)
            </h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
              Campus mail gateway for batch rosters. SendGrid API key and SMTP host are not configured in Settings &gt; Integrations.
            </p>
            <a href="/settings" className="btn btn-secondary btn-sm" style={{ width: 'fit-content' }}>
              Configure SMTP &rarr;
            </a>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <MessageSquare size={24} color="var(--text-muted)" />
              <span className="badge badge-draft">Disabled</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
              SMS & WhatsApp Alerts (Twilio)
            </h3>
            <p className="text-secondary text-sm" style={{ marginBottom: '16px', lineHeight: 1.5 }}>
              Emergency campus closures and proctoring OTP security codes delivered via SMS.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => alert('Connect in Integrations directory.')}>
              Connect Twilio
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CREATE / EDIT ANNOUNCEMENT MODAL                         */}
      {/* ======================================================== */}
      {isFormModalOpen && (
        <div className="modal-overlay" onClick={() => setIsFormModalOpen(false)}>
          <div
            className="modal-card"
            style={{
              maxWidth: '720px',
              width: '95%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: 0,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Megaphone size={20} style={{ color: 'var(--primary)' }} />
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    {editingAnnouncementId
                      ? 'Edit Announcement'
                      : isFaculty
                        ? 'Publish Course Announcement'
                        : 'Broadcast Institution Announcement'}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {isFaculty
                      ? 'Targeting authorized courses and assigned student cohorts'
                      : 'Institution-wide communication studio'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                aria-label="Close modal"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px' }}>
              {/* Preview Mode View */}
              {isPreviewActive ? (
                <div>
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(99, 102, 241, 0.08)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--primary)' }}>
                      Live Preview Mode: How learners will view this announcement
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => setIsPreviewActive(false)}
                    >
                      Return to Editing
                    </button>
                  </div>

                  {/* Rendered Preview Card */}
                  <div
                    className="card"
                    style={{
                      borderLeft: formPriority === 'urgent' ? '4px solid var(--danger)' : '4px solid var(--primary)',
                      background: 'var(--bg-card)',
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <span className={`badge badge-${formPriority === 'urgent' ? 'error' : formPriority === 'important' ? 'warning' : 'primary'}`}>
                        {formPriority.toUpperCase()}
                      </span>
                      <span className="badge badge-secondary">{formCategory}</span>
                      <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
                        NEW
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '10px', color: 'var(--text-main)' }}>
                      {formTitle || 'Untitled Announcement Headline'}
                    </h3>

                    <p style={{ fontSize: '0.925rem', lineHeight: 1.6, color: 'var(--text-secondary)', marginBottom: '18px' }}>
                      {formContent || 'No message content provided.'}
                    </p>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>
                          Target: <strong>{formAudienceType === 'all' ? 'All Students & Faculty' : formAudienceType}</strong>
                        </span>
                        <span>{new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>By {user?.displayName || 'Faculty Instructor'}</span>
                        <span>Channels: In-App Banner</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Form Fields */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveAnnouncement('published');
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
                >
                  {/* Trainer Specific Workflow Step: Course / Cohort Selection */}
                  {isFaculty && (
                    <div
                      style={{
                        padding: '16px',
                        background: 'rgba(99, 102, 241, 0.05)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 10px 0', color: 'var(--primary)' }}>
                        Trainer Authorized Course & Cohort Scope
                      </h4>
                      <div className="grid-2" style={{ gap: '14px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                            Select Assigned Course *
                          </label>
                          <select
                            className="form-input"
                            value={formTargetCourseId}
                            onChange={(e) => {
                              setFormTargetCourseId(e.target.value);
                              setFormAudienceType('course');
                            }}
                            style={{ fontSize: '0.875rem' }}
                          >
                            {trainerAssignedCourses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title} ({c.id})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                            Select Assigned Cohort (Optional)
                          </label>
                          <select
                            className="form-input"
                            value={formTargetCohortId}
                            onChange={(e) => {
                              setFormTargetCohortId(e.target.value);
                              if (e.target.value) setFormAudienceType('cohort');
                            }}
                            style={{ fontSize: '0.875rem' }}
                          >
                            <option value="">All Cohorts in this Course</option>
                            {trainerAssignedCohorts.map((coh) => (
                              <option key={coh.id} value={coh.id}>
                                {coh.name} ({coh.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Link to existing assessment or timetable */}
                      <div className="grid-2" style={{ gap: '14px', marginTop: '12px' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                            Link to Assessment (Optional autofill)
                          </label>
                          <select
                            className="form-input"
                            value={formAssociatedAssessmentId}
                            onChange={(e) => handleSelectAssociatedAssessment(e.target.value)}
                            style={{ fontSize: '0.825rem', height: '34px' }}
                          >
                            <option value="">None (Custom Notice)</option>
                            {mockAssessments.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.title} ({a.duration || 45} mins)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                            Link to Timetable Session (Optional)
                          </label>
                          <select
                            className="form-input"
                            value={formAssociatedSessionId}
                            onChange={(e) => handleSelectAssociatedSession(e.target.value)}
                            style={{ fontSize: '0.825rem', height: '34px' }}
                          >
                            <option value="">None (Custom Notice)</option>
                            {mockLiveSessions.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.title} ({s.date || 'Upcoming'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Announcement Title */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '6px' }}>
                      Announcement Title / Headline <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder={
                        isFaculty
                          ? 'e.g. Lab Session 4 Extension: Async Promises & Fetch API'
                          : 'e.g. Fall Semester 2026 Midterm Exam Schedule & Proctoring Protocols'
                      }
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      style={{ fontSize: '0.95rem', padding: '10px 14px' }}
                    />
                  </div>

                  {/* Category & Priority Grid */}
                  <div className="grid-2" style={{ gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '6px' }}>
                        Announcement Category <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <select
                        className="form-input"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value as any)}
                        style={{ fontSize: '0.925rem', padding: '10px 14px' }}
                      >
                        {isFaculty ? (
                          <>
                            <option value="Course Updates">Course Updates</option>
                            <option value="Quiz & Assessment Notices">Quiz & Assessment Notices</option>
                            <option value="Assignment Deadlines">Assignment Deadlines</option>
                            <option value="Live Class Reminders">Live Class Reminders</option>
                            <option value="Learning Material Updates">Learning Material Updates</option>
                            <option value="Schedule Changes">Schedule Changes</option>
                          </>
                        ) : (
                          <>
                            <option value="General">General</option>
                            <option value="Academic">Academic</option>
                            <option value="Examination">Examination</option>
                            <option value="Holiday">Holiday</option>
                            <option value="Urgent">Urgent</option>
                            <option value="Maintenance">Maintenance</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '6px' }}>
                        Priority Level <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <select
                        className="form-input"
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as any)}
                        style={{ fontSize: '0.925rem', padding: '10px 14px' }}
                      >
                        <option value="normal">Normal (Informational)</option>
                        <option value="important">Important (Action Recommended)</option>
                        <option value="urgent">Urgent (Immediate Attention Required)</option>
                      </select>
                    </div>
                  </div>

                  {/* Admin Specific Audience Target Selection */}
                  {!isFaculty && (
                    <div
                      style={{
                        padding: '16px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <label className="form-label" style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '8px' }}>
                        Target Audience & Reach <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <div className="grid-2" style={{ gap: '14px' }}>
                        <select
                          className="form-input"
                          value={formAudienceType}
                          onChange={(e) => setFormAudienceType(e.target.value as any)}
                          style={{ fontSize: '0.9rem' }}
                        >
                          <option value="all">All Students & Faculty (Institution-wide)</option>
                          <option value="students">All Enrolled Students Only</option>
                          <option value="faculty">All Faculty & Staff Only</option>
                          <option value="department">Target Specific Department</option>
                          <option value="course">Target Specific Course</option>
                          <option value="cohort">Target Specific Cohort Batch</option>
                        </select>

                        {/* Department Selector */}
                        {formAudienceType === 'department' && (
                          <select
                            className="form-input"
                            value={formTargetDepartmentId}
                            onChange={(e) => setFormTargetDepartmentId(e.target.value)}
                            style={{ fontSize: '0.9rem' }}
                          >
                            {mockDepartments.map((dept) => (
                              <option key={dept.id} value={dept.id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Course Selector */}
                        {formAudienceType === 'course' && (
                          <select
                            className="form-input"
                            value={formTargetCourseId}
                            onChange={(e) => setFormTargetCourseId(e.target.value)}
                            style={{ fontSize: '0.9rem' }}
                          >
                            {courses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Cohort Selector */}
                        {formAudienceType === 'cohort' && (
                          <select
                            className="form-input"
                            value={formTargetCohortId}
                            onChange={(e) => setFormTargetCohortId(e.target.value)}
                            style={{ fontSize: '0.9rem' }}
                          >
                            {cohorts.map((coh) => (
                              <option key={coh.id} value={coh.id}>
                                {coh.name} ({coh.code})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message Content Textarea */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '6px' }}>
                      Announcement Message Content <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      className="form-textarea"
                      placeholder="Enter detailed announcements, schedule details, required actions, and guidance for recipients..."
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      style={{ fontSize: '0.925rem', padding: '10px 14px', lineHeight: 1.55 }}
                    />
                  </div>

                  {/* Scheduling & Expiry Controls */}
                  <div
                    style={{
                      padding: '16px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="timingType"
                          checked={formTimingType === 'now'}
                          onChange={() => setFormTimingType('now')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        Publish Immediately
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
                        <input
                          type="radio"
                          name="timingType"
                          checked={formTimingType === 'scheduled'}
                          onChange={() => setFormTimingType('scheduled')}
                          style={{ accentColor: 'var(--primary)' }}
                        />
                        Schedule for Future Date
                      </label>
                    </div>

                    <div className="grid-2" style={{ gap: '14px' }}>
                      {formTimingType === 'scheduled' && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.85rem' }}>
                            Scheduled Publication Time <span style={{ color: 'var(--danger)' }}>*</span>
                          </label>
                          <input
                            type="datetime-local"
                            className="form-input"
                            value={formScheduledDate}
                            onChange={(e) => setFormScheduledDate(e.target.value)}
                            style={{ fontSize: '0.875rem' }}
                          />
                        </div>
                      )}

                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.85rem' }}>
                          Optional Expiry Date
                        </label>
                        <input
                          type="date"
                          className="form-input"
                          value={formExpiryDate}
                          onChange={(e) => setFormExpiryDate(e.target.value)}
                          style={{ fontSize: '0.875rem' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Channels Checklist */}
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '6px' }}>
                      Delivery Channels
                    </label>
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input
                          type="checkbox"
                          checked={formInApp}
                          onChange={(e) => setFormInApp(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                        />
                        <span>In-App Notification Banner & Drawer (Instant)</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input
                          type="checkbox"
                          checked={formEmail}
                          onChange={(e) => setFormEmail(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                        />
                        <span>Email Broadcast (SendGrid Queue)</span>
                      </label>
                    </div>
                    {formEmail && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--warning)', marginTop: '4px', display: 'block' }}>
                        * Note: SendGrid/SMTP Mail Gateway is currently in queue mode. In-app notifications will deliver immediately.
                      </span>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div
              className="modal-footer"
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsPreviewActive(!isPreviewActive)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Eye size={15} /> {isPreviewActive ? 'Exit Preview' : 'Preview'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setIsFormModalOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSaveAnnouncement('draft')}
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleSaveAnnouncement('published')}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                >
                  <Send size={15} />
                  {formTimingType === 'scheduled' ? 'Schedule Announcement' : 'Publish Announcement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Preview Modal (Admin) */}
      {previewTemplate && (
        <div className="modal-overlay" onClick={() => setPreviewTemplate(null)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>
                Template Preview: {previewTemplate.name}
              </h3>
              <button onClick={() => setPreviewTemplate(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Subject Preview:</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{previewTemplate.subject}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Rendered Body Content:</div>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                  {(previewTemplate.bodyTemplate || previewTemplate.body || '')
                    .replace('{{userName}}', user?.displayName || 'Alex Thompson')
                    .replace('{{courseTitle}}', 'Fullstack React Architecture')}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setPreviewTemplate(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ACCESSIBLE DELETE ANNOUNCEMENT CONFIRMATION MODAL */}
      {announcementToDelete && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!isDeleting) {
              setAnnouncementToDelete(null);
              setDeleteError(null);
            }
          }}
          style={{ zIndex: 110 }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-announcement-title"
            aria-describedby="delete-announcement-description"
            style={{
              maxWidth: '480px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              className="modal-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 22px',
                borderBottom: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--danger)',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={18} />
                </div>
                <div>
                  <h3
                    id="delete-announcement-title"
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      margin: 0,
                      color: 'var(--text-main)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Delete Announcement?
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Permanent removal confirmation
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  if (!isDeleting) {
                    setAnnouncementToDelete(null);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
                aria-label="Close dialog"
                style={{
                  color: 'var(--text-muted)',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.5 : 1,
                  padding: '6px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              className="modal-body"
              style={{
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: 'var(--bg-card)',
              }}
            >
              <p
                id="delete-announcement-description"
                style={{
                  margin: 0,
                  fontSize: '0.92rem',
                  lineHeight: 1.55,
                  color: 'var(--text-main)',
                }}
              >
                Are you sure you want to delete{' '}
                <strong style={{ color: 'var(--text-main)', wordBreak: 'break-word' }}>
                  "{announcementToDelete.title}"
                </strong>
                ? This action cannot be undone.
              </p>

              {/* Subtle Warning Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  fontSize: '0.82rem',
                  color: '#d97706',
                  lineHeight: 1.45,
                }}
              >
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  This will permanently remove this bulletin for all assigned students and faculty members across the LMS.
                </span>
              </div>

              {/* Error Alert (if any) */}
              {deleteError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--danger)',
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                  }}
                  role="alert"
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{deleteError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div
              className="modal-footer"
              style={{
                padding: '16px 22px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'var(--bg-surface)',
              }}
            >
              <button
                ref={cancelDeleteBtnRef}
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!isDeleting) {
                    setAnnouncementToDelete(null);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeleting}
                style={{
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  background: 'var(--danger)',
                  borderColor: 'var(--danger)',
                  color: '#ffffff',
                  padding: '8px 18px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.75 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete Announcement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
