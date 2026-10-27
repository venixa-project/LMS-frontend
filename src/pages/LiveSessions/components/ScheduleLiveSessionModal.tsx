import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../../lib/store';
import { useLiveSessionStore } from '../../../lib/liveSessionStore';
import { useCohortStore } from '../../../lib/cohortStore';
import { mockDepartments, mockCourses } from '../../../data/mockData';
import { mockUsers } from '../../../data/mockUsers';
import { LiveSession, User } from '../../../types';
import {
  Video, Calendar, Clock, Users, X, Check, AlertCircle,
  Sparkles, CheckCircle2, Search, ArrowRight, ArrowLeft,
  Copy, BookOpen, GraduationCap, Building2, UserCheck,
  Layers, AlertTriangle, Shield, CheckCheck, Briefcase
} from 'lucide-react';

import { GoogleMeetLinkField } from '../../../components/GoogleMeet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sessionToEdit?: LiveSession | null;
  onSuccess?: (msg: string) => void;
}

type StepNumber = 1 | 2 | 3;

const PROVIDERS = [
  { id: 'Google Meet', name: 'Google Meet', desc: 'Secure high-definition video meetings hosted on Google Meet' },
  { id: 'Zoom Meeting', name: 'Zoom Meeting', desc: 'Synced with institutional Zoom Education account' },
  { id: 'Microsoft Teams', name: 'Microsoft Teams', desc: 'Synced with institutional Microsoft 365 tenant' },
  { id: 'VeniLearn Live Classroom (Built-in)', name: 'VeniLearn Live Classroom', desc: 'Interactive browser-based classroom with audio, video, chat & screen share' },
];

export const ScheduleLiveSessionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sessionToEdit,
  onSuccess,
}) => {
  const { user } = useAuthStore();
  const { sessions, addSession, updateSession } = useLiveSessionStore();
  const { cohorts } = useCohortStore();

  const isTrainer = user?.activeRole === 'trainer' || user?.activeRole === 'instructor';

  // 3-Step Wizard Navigation
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [isSuccessState, setIsSuccessState] = useState<boolean>(false);
  const [createdSessionData, setCreatedSessionData] = useState<LiveSession | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // STEP 1 — Session Details
  // --------------------------------------------------------------------------
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('dep-001');
  const [courseId, setCourseId] = useState('crs-001');
  const [cohortId, setCohortId] = useState('coh-001');
  const [description, setDescription] = useState('');
  const [agenda, setAgenda] = useState('');

  // --------------------------------------------------------------------------
  // STEP 2 — Host, Schedule & Participants
  // --------------------------------------------------------------------------
  // Host & Schedule
  const [instructorId, setInstructorId] = useState(user?.id || 'u-004');
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:30');
  const [room, setRoom] = useState(sessionToEdit?.room || 'Hall 101');
  const [dayOfWeek, setDayOfWeek] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday'>(() => {
    if (sessionToEdit?.dayOfWeek) return sessionToEdit.dayOfWeek;
    const dayNames: Array<'Sunday'|'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'> = [
      'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
    ];
    const initialDate = sessionToEdit?.date || new Date().toISOString().split('T')[0];
    const d = new Date(`${initialDate}T00:00:00`).getDay();
    const computed = dayNames[d];
    return computed === 'Sunday' || computed === 'Saturday' ? 'Monday' : computed;
  });

  // Meeting Provider
  const [provider, setProvider] = useState('Google Meet');
  const [googleMeetUrl, setGoogleMeetUrl] = useState('');

  // Audience 1: Students
  const [includeStudents, setIncludeStudents] = useState<boolean>(true);
  const [studentAudienceType, setStudentAudienceType] = useState<'all_cohort' | 'selected'>('all_cohort');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  // Audience 2: Faculty & Staff
  const [includeFaculty, setIncludeFaculty] = useState<boolean>(false);
  const [facultyAudienceType, setFacultyAudienceType] = useState<'all_faculty' | 'selected'>('all_faculty');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [facultySearch, setFacultySearch] = useState('');
  const [facultyDeptFilter, setFacultyDeptFilter] = useState('all');

  // Policy & Notifications
  const [notifyParticipants, setNotifyParticipants] = useState<boolean>(true);
  const [recordingEnabled, setRecordingEnabled] = useState<boolean>(true);

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  // --------------------------------------------------------------------------
  // Filtered Options & Eligibility Data
  // --------------------------------------------------------------------------
  // All Trainers list
  const allTrainers = useMemo(() => {
    return mockUsers.filter(
      (u) => (u.activeRole === 'trainer' || u.activeRole === 'instructor') && u.status !== 'suspended'
    );
  }, []);

  // Filtered Courses based on Department
  const departmentCourses = useMemo(() => {
    let list = mockCourses.filter((c) => !c.departmentId || c.departmentId === departmentId);
    if (isTrainer && user?.id) {
      const trainerUser = mockUsers.find((u) => u.id === user.id);
      const eligible = trainerUser?.eligibleCourseIds || ['crs-001', 'crs-002', 'crs-004'];
      list = list.filter((c) => eligible.includes(c.id));
    }
    return list;
  }, [departmentId, isTrainer, user?.id]);

  // Filtered Cohorts based on Course & Department
  const eligibleCohorts = useMemo(() => {
    return cohorts.filter((coh) => {
      const matchCourse = !coh.courseId || coh.courseId === courseId;
      const matchDept = !coh.departmentId || coh.departmentId === departmentId;
      return matchCourse && matchDept;
    });
  }, [cohorts, courseId, departmentId]);

  // Selected Cohort
  const activeCohort = useMemo(() => {
    return cohorts.find((c) => c.id === cohortId) || eligibleCohorts[0] || cohorts[0];
  }, [cohorts, cohortId, eligibleCohorts]);

  // Eligible students in selected cohort
  const cohortStudents = useMemo(() => {
    if (!activeCohort || !activeCohort.studentIds || activeCohort.studentIds.length === 0) {
      return mockUsers.filter((u) => u.activeRole === 'student' || u.activeRole === 'learner');
    }
    const ids = activeCohort.studentIds;
    return mockUsers.filter((u) => ids.includes(u.id) || ids.includes(u.rollNo || ''));
  }, [activeCohort]);

  // Filtered Students list by search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return cohortStudents;
    const q = studentSearch.toLowerCase().trim();
    return cohortStudents.filter(
      (s) =>
        s.displayName?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.rollNo?.toLowerCase().includes(q)
    );
  }, [cohortStudents, studentSearch]);

  // Eligible Faculty & Staff
  const eligibleFacultyStaff = useMemo(() => {
    return mockUsers.filter(
      (u) =>
        u.status !== 'suspended' &&
        (u.activeRole === 'trainer' ||
          u.activeRole === 'instructor' ||
          u.activeRole === 'platform_admin' ||
          u.activeRole === 'org_admin')
    );
  }, []);

  // Filtered Faculty & Staff by search and department
  const filteredFacultyStaff = useMemo(() => {
    return eligibleFacultyStaff.filter((m) => {
      if (facultyDeptFilter !== 'all' && m.departmentId !== facultyDeptFilter) {
        return false;
      }
      if (facultySearch.trim()) {
        const q = facultySearch.toLowerCase().trim();
        const matchName = m.displayName?.toLowerCase().includes(q);
        const matchEmail = m.email?.toLowerCase().includes(q);
        const matchRole = m.activeRole?.toLowerCase().includes(q);
        const matchSpec = m.specialization?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchRole && !matchSpec) return false;
      }
      return true;
    });
  }, [eligibleFacultyStaff, facultySearch, facultyDeptFilter]);

  // Duration calculation
  const durationInfo = useMemo(() => {
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const diff = eh * 60 + em - (sh * 60 + sm);
      if (diff <= 0) return { minutes: 0, text: 'Invalid time range', isInvalid: true };
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      let text = '';
      if (hours > 0) text += `${hours} hr${hours > 1 ? 's' : ''} `;
      if (mins > 0) text += `${mins} min${mins > 1 ? 's' : ''}`;
      return { minutes: diff, text: `${diff} mins (${text.trim()})`, isInvalid: false };
    } catch {
      return { minutes: 60, text: '60 mins', isInvalid: false };
    }
  }, [startTime, endTime]);

  // Trainer Schedule Conflict Warning
  const trainerConflict = useMemo(() => {
    if (!date || !startTime || !endTime || !instructorId) return null;
    return sessions.find((s) => {
      if (sessionToEdit && s.id === sessionToEdit.id) return false;
      if (s.instructorId !== instructorId) return false;
      if (s.date !== date) return false;
      if (s.status === 'cancelled') return false;
      if (!s.startTime) return false;
      const sEnd = s.endTime || s.startTime;
      return startTime < sEnd && endTime > s.startTime;
    });
  }, [sessions, date, startTime, endTime, instructorId, sessionToEdit]);

  // --------------------------------------------------------------------------
  // Form Initialization & Reset
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    setIsSuccessState(false);
    setCreatedSessionData(null);
    setCurrentStep(1);
    setShowDiscardConfirm(false);
    setIsDirty(false);
    setErrors({});
    setStudentSearch('');
    setFacultySearch('');
    setFacultyDeptFilter('all');

    if (sessionToEdit) {
      setTitle(sessionToEdit.title);
      setDepartmentId(sessionToEdit.departmentId || 'dep-001');
      setCourseId(sessionToEdit.courseId || 'crs-001');
      setCohortId(sessionToEdit.cohortId || 'coh-001');
      setInstructorId(sessionToEdit.instructorId);
      setDate(sessionToEdit.date || new Date().toISOString().split('T')[0]);
      setStartTime(sessionToEdit.startTime || '10:00');
      setEndTime(sessionToEdit.endTime || '11:30');
      setRoom(sessionToEdit.room || 'Hall 101');
      if (sessionToEdit.dayOfWeek) {
        setDayOfWeek(sessionToEdit.dayOfWeek);
      }
      setProvider(sessionToEdit.provider || 'Google Meet');
      setGoogleMeetUrl(sessionToEdit.meetingUrl || sessionToEdit.joinLink || '');
      setDescription(sessionToEdit.description || '');
      setAgenda(sessionToEdit.agenda || '');
      setRecordingEnabled(sessionToEdit.recordingEnabled ?? true);

      // Determine audience settings from existing session
      const isFacultyOnly =
        sessionToEdit.audienceScope === 'faculty' ||
        sessionToEdit.targetAudienceType === 'faculty_only' ||
        sessionToEdit.targetAudienceType === 'faculty_all' ||
        sessionToEdit.targetAudienceType === 'faculty_selected';

      const isCombined =
        sessionToEdit.audienceScope === 'both' ||
        sessionToEdit.targetAudienceType === 'combined';

      if (isFacultyOnly) {
        setIncludeStudents(false);
        setIncludeFaculty(true);
        setSelectedStaffIds(sessionToEdit.targetStaffIds || []);
        setFacultyAudienceType(
          sessionToEdit.targetStaffIds && sessionToEdit.targetStaffIds.length > 0 ? 'selected' : 'all_faculty'
        );
      } else if (isCombined) {
        setIncludeStudents(true);
        setIncludeFaculty(true);
        setSelectedStudentIds(sessionToEdit.targetStudentIds || []);
        setSelectedStaffIds(sessionToEdit.targetStaffIds || []);
        setStudentAudienceType(
          sessionToEdit.targetStudentIds && sessionToEdit.targetStudentIds.length > 0 ? 'selected' : 'all_cohort'
        );
        setFacultyAudienceType(
          sessionToEdit.targetStaffIds && sessionToEdit.targetStaffIds.length > 0 ? 'selected' : 'all_faculty'
        );
      } else {
        // Students only (default)
        setIncludeStudents(true);
        setIncludeFaculty(false);
        const hasSelected = sessionToEdit.targetAudienceType === 'selected_students';
        setStudentAudienceType(hasSelected ? 'selected' : 'all_cohort');
        setSelectedStudentIds(sessionToEdit.targetStudentIds || []);
      }
    } else {
      // Default clean values
      setTitle('');
      setDepartmentId('dep-001');
      setCourseId('crs-001');
      setCohortId('coh-001');
      setDescription('');
      setAgenda('');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      setStartTime('10:00');
      setEndTime('11:30');
      setRoom('Hall 101');
      setProvider('Google Meet');
      setGoogleMeetUrl('');
      setRecordingEnabled(true);
      setNotifyParticipants(true);

      setIncludeStudents(true);
      setStudentAudienceType('all_cohort');
      setSelectedStudentIds([]);

      setIncludeFaculty(false);
      setFacultyAudienceType('all_faculty');
      setSelectedStaffIds([]);

      if (isTrainer && user?.id) {
        setInstructorId(user.id);
      } else {
        setInstructorId('u-004');
      }
    }
  }, [isOpen, sessionToEdit, isTrainer, user?.id]);

  // Handle department dependency change
  const handleDepartmentChange = (newDeptId: string) => {
    setIsDirty(true);
    setDepartmentId(newDeptId);
    const validCourses = mockCourses.filter((c) => !c.departmentId || c.departmentId === newDeptId);
    if (validCourses.length > 0) {
      const nextCourseId = validCourses.some((c) => c.id === courseId) ? courseId : validCourses[0].id;
      setCourseId(nextCourseId);
      const validCohorts = cohorts.filter((c) => c.courseId === nextCourseId);
      if (validCohorts.length > 0) {
        setCohortId(validCohorts[0].id);
      }
    }
  };

  // Handle course dependency change
  const handleCourseChange = (newCourseId: string) => {
    setIsDirty(true);
    setCourseId(newCourseId);
    const validCohorts = cohorts.filter((c) => c.courseId === newCourseId);
    if (validCohorts.length > 0) {
      setCohortId(validCohorts[0].id);
    }
  };

  // Student list helpers
  const handleToggleStudent = (sId: string) => {
    setIsDirty(true);
    setSelectedStudentIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  };

  const handleSelectAllStudents = () => {
    setIsDirty(true);
    if (selectedStudentIds.length === cohortStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(cohortStudents.map((s) => s.id));
    }
  };

  // Faculty list helpers
  const handleToggleStaff = (fId: string) => {
    setIsDirty(true);
    setSelectedStaffIds((prev) =>
      prev.includes(fId) ? prev.filter((id) => id !== fId) : [...prev, fId]
    );
  };

  const handleSelectAllStaff = () => {
    setIsDirty(true);
    if (selectedStaffIds.length === eligibleFacultyStaff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(eligibleFacultyStaff.map((f) => f.id));
    }
  };

  // --------------------------------------------------------------------------
  // Step Validations
  // --------------------------------------------------------------------------
  const validateStep = (step: StepNumber): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!title.trim()) errs.title = 'Session title is required.';
      if (!departmentId) errs.departmentId = 'Academic department selection is required.';
      if (!courseId) errs.courseId = 'Course selection is required.';
      if (!cohortId) errs.cohortId = 'Cohort selection is required.';
    }

    if (step === 2) {
      if (!instructorId) errs.instructorId = 'Session host / lead trainer is required.';
      if (!date) errs.date = 'Session date is required.';
      if (!startTime) errs.startTime = 'Start time is required.';
      if (!endTime) errs.endTime = 'End time is required.';
      if (durationInfo.isInvalid) {
        errs.endTime = 'End time must be later than start time.';
      }

      // Participant Scope Validation
      if (!includeStudents && !includeFaculty) {
        errs.audience = 'Please select at least one audience: Students or Faculty & Staff.';
      } else {
        if (includeStudents && studentAudienceType === 'selected' && selectedStudentIds.length === 0) {
          errs.students = 'Please select at least one student, or choose "All eligible students in cohort".';
        }
        if (includeFaculty && facultyAudienceType === 'selected' && selectedStaffIds.length === 0) {
          errs.faculty = 'Please select at least one faculty member, or choose "All eligible faculty & staff".';
        }
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step transitions
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep((prev) => (prev + 1) as StepNumber);
      }
    }
  };

  const handlePrevStep = () => {
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as StepNumber);
    }
  };

  // Close attempt
  const handleAttemptClose = () => {
    if (isDirty && !isSuccessState) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // --------------------------------------------------------------------------
  // Final Submission (Schedule or Save as Draft)
  // --------------------------------------------------------------------------
  const handleFinalSubmit = (asDraft: boolean = false) => {
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    const hostTrainer = allTrainers.find((t) => t.id === instructorId) || user;

    const finalStudentIds = includeStudents
      ? studentAudienceType === 'all_cohort'
        ? cohortStudents.map((s) => s.id)
        : selectedStudentIds
      : [];

    const finalStaffIds = includeFaculty
      ? facultyAudienceType === 'all_faculty'
        ? eligibleFacultyStaff.map((f) => f.id)
        : selectedStaffIds
      : [];

    const totalParticipants = finalStudentIds.length + finalStaffIds.length;

    const audienceScope: 'students' | 'faculty' | 'both' =
      includeStudents && includeFaculty ? 'both' : includeFaculty ? 'faculty' : 'students';

    const targetAudienceType =
      audienceScope === 'faculty'
        ? facultyAudienceType === 'all_faculty'
          ? 'faculty_all'
          : 'faculty_selected'
        : audienceScope === 'both'
        ? 'combined'
        : studentAudienceType === 'all_cohort'
        ? 'all_cohort'
        : 'selected_students';

    // Realistically provision room URL according to selected provider
    const finalMeetingUrl =
      provider === 'Google Meet'
        ? (googleMeetUrl.trim() || `https://meet.google.com/ven-${Date.now().toString().slice(-4)}`)
        : provider.includes('Zoom')
        ? `https://zoom.us/j/venilearn-${Date.now().toString().slice(-6)}`
        : provider.includes('Teams')
        ? `https://teams.microsoft.com/l/meetup-join/venilearn-${Date.now().toString().slice(-6)}`
        : `https://meet.google.com/ven-${Date.now().toString().slice(-4)}`;

    const payload = {
      title: title.trim(),
      departmentId,
      courseId,
      cohortId,
      instructorId: hostTrainer?.id || user?.id || 'u-004',
      instructorName: hostTrainer?.displayName || 'Dr. James Wilson',
      date,
      dayOfWeek,
      startTime,
      endTime,
      room: room.trim() || 'Hall 101',
      cohortName: activeCohort?.name || cohorts.find((c) => c.id === cohortId)?.name || 'Spring 2026 Engineering',
      courseTitle: mockCourses.find((c) => c.id === courseId)?.title || 'Course Lecture',
      createdBy: sessionToEdit?.createdBy || user?.id,
      createdRole: sessionToEdit?.createdRole || user?.activeRole,
      duration: durationInfo.minutes,
      durationMinutes: durationInfo.minutes,
      timezone: 'Asia/Kolkata (IST)',
      capacity: activeCohort?.capacity || 35,
      enrolledCount: totalParticipants,
      provider,
      meetingUrl: finalMeetingUrl,
      joinLink: finalMeetingUrl,
      recordingPolicy: recordingEnabled ? 'Cloud Recorded with automated AI transcript' : 'Not recorded',
      recordingEnabled,
      description: description.trim(),
      agenda: agenda.trim(),
      targetAudienceType,
      targetStudentIds: finalStudentIds,
      targetStaffIds: finalStaffIds,
      audienceScope,
      status: 'scheduled' as const,
      isDraft: asDraft,
    };

    let result;
    if (sessionToEdit) {
      result = updateSession({ ...sessionToEdit, ...payload }, notifyParticipants && !asDraft);
    } else {
      result = addSession(payload, notifyParticipants && !asDraft);
    }

    setCreatedSessionData(result.session);
    setIsSuccessState(true);

    if (asDraft) {
      onSuccess?.(`Live session draft "${title}" saved successfully.`);
      onClose();
    } else {
      onSuccess?.(`Live session "${title}" scheduled successfully.`);
    }
  };

  const handleCopyLink = () => {
    if (!createdSessionData?.meetingUrl) return;
    navigator.clipboard.writeText(createdSessionData.meetingUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  const selectedDeptObj = mockDepartments.find((d) => d.id === departmentId);
  const selectedCourseObj = mockCourses.find((c) => c.id === courseId);
  const selectedCohortObj = cohorts.find((c) => c.id === cohortId);
  const selectedHostObj = allTrainers.find((t) => t.id === instructorId) || user;

  const totalCalculatedParticipants =
    (includeStudents
      ? studentAudienceType === 'all_cohort'
        ? cohortStudents.length
        : selectedStudentIds.length
      : 0) +
    (includeFaculty
      ? facultyAudienceType === 'all_faculty'
        ? eligibleFacultyStaff.length
        : selectedStaffIds.length
      : 0);

  return (
    <div
      className="modal-overlay"
      onClick={handleAttemptClose}
      style={{
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(5, 8, 16, 0.75)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-surface)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ======================================================== */}
        {/* FIXED HEADER: TITLE & 3-STEP PROGRESS INDICATOR          */}
        {/* ======================================================== */}
        <div
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                  }}
                >
                  <Video size={16} />
                </span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                  {sessionToEdit ? 'Edit Live Session' : 'Schedule Live Session'}
                </h2>
              </div>
              <p style={{ margin: '3px 0 0 36px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Configure academic parameters, lead host, timetable slot, and participant audience.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAttemptClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '6px', borderRadius: '8px', color: 'var(--text-muted)' }}
              title="Close Dialog"
            >
              <X size={18} />
            </button>
          </div>

          {/* 3-STEP PROGRESS STEPPER */}
          {!isSuccessState && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              {[
                { number: 1, title: 'Session Details', caption: 'Academic & Course Info' },
                { number: 2, title: 'Host, Schedule & Participants', caption: 'Host, Timing & Audience' },
                { number: 3, title: 'Review & Schedule', caption: 'Summary & Confirmation' },
              ].map((s, idx) => {
                const isActive = currentStep === s.number;
                const isCompleted = currentStep > s.number;

                return (
                  <React.Fragment key={s.number}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: isCompleted ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (isCompleted) {
                          setErrors({});
                          setCurrentStep(s.number as StepNumber);
                        }
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          background: isActive
                            ? 'var(--primary)'
                            : isCompleted
                            ? 'var(--success)'
                            : 'var(--bg-input)',
                          color: isActive || isCompleted ? '#ffffff' : 'var(--text-muted)',
                          border: isActive || isCompleted ? 'none' : '1px solid var(--border-subtle)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {isCompleted ? <Check size={16} /> : s.number}
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '0.825rem',
                            fontWeight: isActive ? 700 : 600,
                            color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
                          }}
                        >
                          {s.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.caption}</div>
                      </div>
                    </div>

                    {idx < 2 && (
                      <div
                        style={{
                          flex: 1,
                          height: '2px',
                          margin: '0 16px',
                          background: currentStep > idx + 1 ? 'var(--success)' : 'var(--border-subtle)',
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SCROLLABLE BODY                                          */}
        {/* ======================================================== */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* SUCCESS SCREEN */}
          {isSuccessState && createdSessionData ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '24px 16px',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  border: '2px solid #22c55e',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(34, 197, 94, 0.25)',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', fontWeight: 800 }}>
                  Live Session Scheduled Successfully!
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '520px' }}>
                  The session is now published on the cohort academic schedule. Automated notifications and calendar invitations have been queued for all invited scholars and faculty.
                </p>
              </div>

              {/* Summary Card of Created Session */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '560px',
                  background: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-subtle)',
                  padding: '18px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span className="badge badge-primary font-mono" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>
                      {createdSessionData.id}
                    </span>
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', fontWeight: 700 }}>
                      {createdSessionData.title}
                    </h4>
                  </div>
                  <span className="badge badge-active">Scheduled</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <div><strong>Date:</strong> {createdSessionData.date}</div>
                  <div><strong>Time:</strong> {createdSessionData.startTime} – {createdSessionData.endTime}</div>
                  <div><strong>Host:</strong> {createdSessionData.instructorName}</div>
                  <div><strong>Provider:</strong> {createdSessionData.provider}</div>
                  <div><strong>Participants:</strong> {createdSessionData.enrolledCount} invited</div>
                  <div><strong>Audience:</strong> {createdSessionData.audienceScope === 'both' ? 'Students & Faculty' : createdSessionData.audienceScope === 'faculty' ? 'Faculty/Staff Only' : 'Students Only'}</div>
                </div>

                {/* Meeting Link Box */}
                {createdSessionData.meetingUrl && (
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '10px 14px',
                      background: 'var(--bg-input)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-main)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {createdSessionData.meetingUrl}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleCopyLink}
                      style={{ gap: '4px', fontSize: '0.72rem', flexShrink: 0 }}
                    >
                      {isCopied ? <CheckCheck size={12} color="var(--success)" /> : <Copy size={12} />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
                style={{ padding: '10px 28px', fontWeight: 700, borderRadius: '8px', marginTop: '8px' }}
              >
                Done & Return to Live Sessions
              </button>
            </div>
          ) : (
            <>
              {/* ======================================================== */}
              {/* STEP 1: SESSION DETAILS                                  */}
              {/* ======================================================== */}
              {currentStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Session Title */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Session Title <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Advanced React 19: Optimistic Mutations & Server Actions"
                      value={title}
                      onChange={(e) => {
                        setIsDirty(true);
                        setTitle(e.target.value);
                        if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                      }}
                      style={{ height: '42px', fontSize: '0.9rem', borderColor: errors.title ? 'var(--danger)' : undefined }}
                    />
                    {errors.title && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={13} /> {errors.title}
                      </span>
                    )}
                  </div>

                  {/* 2-Column Academic Hierarchy: Department & Course */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    {/* Academic Department */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                        Academic Department <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <select
                        className="input"
                        value={departmentId}
                        onChange={(e) => handleDepartmentChange(e.target.value)}
                        style={{ height: '40px', fontSize: '0.85rem' }}
                      >
                        {mockDepartments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Filtering courses in this discipline
                      </span>
                    </div>

                    {/* Course */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                        Curriculum Course <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <select
                        className="input"
                        value={courseId}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        style={{ height: '40px', fontSize: '0.85rem' }}
                      >
                        {departmentCourses.length === 0 ? (
                          <option value="">No courses available in this department</option>
                        ) : (
                          departmentCourses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))
                        )}
                      </select>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Filtering eligible batches
                      </span>
                    </div>
                  </div>

                  {/* Cohort / Class / Batch */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Cohort / Class / Batch <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
                    <select
                      className="input"
                      value={cohortId}
                      onChange={(e) => {
                        setIsDirty(true);
                        setCohortId(e.target.value);
                      }}
                      style={{ height: '40px', fontSize: '0.85rem' }}
                    >
                      {eligibleCohorts.length === 0 ? (
                        cohorts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code}) &bull; {c.learnerCount}/{c.capacity || 35} Scholars
                          </option>
                        ))
                      ) : (
                        eligibleCohorts.map((coh) => (
                          <option key={coh.id} value={coh.id}>
                            {coh.name} ({coh.code}) &bull; {coh.learnerCount}/{coh.capacity || 35} Scholars
                          </option>
                        ))
                      )}
                    </select>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Primary academic cohort linked to this classroom session
                    </span>
                  </div>

                  {/* Session Description (Optional) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Session Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
                    </label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Brief overview of lecture objectives, prerequisites, and learning outcomes..."
                      value={description}
                      onChange={(e) => {
                        setIsDirty(true);
                        setDescription(e.target.value);
                      }}
                      style={{ fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>

                  {/* Session Agenda (Optional) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                      Session Agenda <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Optional)</span>
                    </label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="1. Architecture Overview&#10;2. Live Demonstration&#10;3. Interactive Q&A"
                      value={agenda}
                      onChange={(e) => {
                        setIsDirty(true);
                        setAgenda(e.target.value);
                      }}
                      style={{ fontSize: '0.85rem', resize: 'vertical' }}
                    />
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: HOST, SCHEDULE & PARTICIPANTS                    */}
              {/* ======================================================== */}
              {currentStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  {/* SUBSECTION A: HOST & SCHEDULE */}
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} color="var(--primary)" />
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Host & Timetable Schedule</h3>
                    </div>

                    {/* Lead Host */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                        Session Host / Lead Trainer <span style={{ color: 'var(--danger)' }}>*</span>
                      </label>
                      <select
                        className="input"
                        value={instructorId}
                        onChange={(e) => {
                          setIsDirty(true);
                          setInstructorId(e.target.value);
                        }}
                        style={{ height: '40px', fontSize: '0.85rem' }}
                      >
                        {allTrainers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.displayName} ({t.rollNo || 'Faculty'}) &bull; {t.specialization || 'Lead Instructor'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date and Time Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                          Session Date <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <input
                          type="date"
                          className="input"
                          value={date}
                          onChange={(e) => {
                            setIsDirty(true);
                            setDate(e.target.value);
                            const d = new Date(`${e.target.value}T00:00:00`).getDay();
                            const dayNames: Array<'Sunday'|'Monday'|'Tuesday'|'Wednesday'|'Thursday'|'Friday'|'Saturday'> = [
                              'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
                            ];
                            if (dayNames[d]) {
                              setDayOfWeek(dayNames[d]);
                            }
                          }}
                          style={{ height: '40px', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                          Timetable Weekday <span style={{ color: 'var(--primary)' }}>*</span>
                        </label>
                        <select
                          className="input"
                          value={dayOfWeek}
                          onChange={(e) => {
                            setIsDirty(true);
                            setDayOfWeek(e.target.value as any);
                          }}
                          style={{ height: '40px', fontSize: '0.85rem' }}
                        >
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                          <option value="Sunday">Sunday</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                          Start Time <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <input
                          type="time"
                          className="input"
                          value={startTime}
                          onChange={(e) => {
                            setIsDirty(true);
                            setStartTime(e.target.value);
                          }}
                          style={{ height: '40px', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                          End Time <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>
                        <input
                          type="time"
                          className="input"
                          value={endTime}
                          onChange={(e) => {
                            setIsDirty(true);
                            setEndTime(e.target.value);
                          }}
                          style={{ height: '40px', fontSize: '0.85rem', borderColor: errors.endTime ? 'var(--danger)' : undefined }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
                          Campus Room / Location
                        </label>
                        <input
                          type="text"
                          className="input"
                          placeholder="e.g. Hall 101, Lab B, Virtual Room A"
                          value={room}
                          onChange={(e) => {
                            setIsDirty(true);
                            setRoom(e.target.value);
                          }}
                          style={{ height: '40px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* Calculated Duration & Conflict Notification */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.8rem' }}>
                      <span style={{ color: durationInfo.isInvalid ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        <strong>Duration:</strong> {durationInfo.text} &bull; Scheduled in institution local time
                      </span>

                      {trainerConflict && (
                        <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          <AlertTriangle size={13} />
                          Host already has a lecture on {date} at {trainerConflict.startTime}
                        </span>
                      )}
                    </div>

                    {errors.endTime && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={13} /> {errors.endTime}
                      </span>
                    )}
                  </div>

                  {/* SUBSECTION B: MEETING PROVIDER */}
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video size={18} color="var(--primary)" />
                      <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Meeting Provider</h3>
                    </div>

                    <div>
                      <select
                        className="input"
                        value={provider}
                        onChange={(e) => {
                          setIsDirty(true);
                          setProvider(e.target.value);
                        }}
                        style={{ height: '40px', fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        {PROVIDERS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {PROVIDERS.find((p) => p.id === provider)?.desc || 'Secure virtual classroom integration'}
                      </p>
                    </div>

                    <div
                      style={{
                        padding: '10px 14px',
                        background: 'var(--bg-input)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.78rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {provider === 'Google Meet' ? (
                        <span>
                          📹 <strong>Google Meet Integration:</strong> Enter an existing Google Meet link below, or leave it blank to auto-generate a secure demo link upon scheduling.
                        </span>
                      ) : provider.includes('VeniLearn') ? (
                        <span>
                          ✨ <strong>Automatic Room Provisioning:</strong> The built-in interactive classroom link will be generated automatically upon scheduling.
                        </span>
                      ) : (
                        <span>
                          🔗 <strong>Integration Link Sync:</strong> The meeting link will be generated and synchronized with your configured {provider} account upon scheduling.
                        </span>
                      )}
                    </div>

                    {provider === 'Google Meet' && (
                      <div style={{ marginTop: '4px' }}>
                        <GoogleMeetLinkField
                          value={googleMeetUrl}
                          onChange={(val) => {
                            setIsDirty(true);
                            setGoogleMeetUrl(val);
                          }}
                          required={false}
                        />
                      </div>
                    )}
                  </div>

                  {/* SUBSECTION C: PARTICIPANT SCOPE & ACCESS RIGHTS */}
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} color="var(--primary)" />
                        <div>
                          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Participant Scope & Access Rights</h3>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Target either or both audiences: Students and Faculty/Staff
                          </span>
                        </div>
                      </div>

                      <span
                        className="badge badge-primary font-mono"
                        style={{ fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px' }}
                      >
                        Total Selected: {totalCalculatedParticipants}
                      </span>
                    </div>

                    {errors.audience && (
                      <div style={{ padding: '8px 12px', background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AlertCircle size={14} /> {errors.audience}
                      </div>
                    )}

                    {/* AUDIENCE 1: STUDENTS PANEL */}
                    <div
                      style={{
                        borderRadius: '10px',
                        border: includeStudents ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Header toggle */}
                      <div
                        style={{
                          padding: '12px 16px',
                          background: includeStudents ? 'var(--primary-light)' : 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setIsDirty(true);
                          setIncludeStudents(!includeStudents);
                          if (errors.audience) setErrors((prev) => ({ ...prev, audience: '' }));
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>
                          <input
                            type="checkbox"
                            checked={includeStudents}
                            onChange={(e) => {
                              setIsDirty(true);
                              setIncludeStudents(e.target.checked);
                            }}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                          />
                          <GraduationCap size={18} color="var(--primary)" />
                          <span>1. Students ({cohortStudents.length} eligible in {activeCohort?.name || 'Cohort'})</span>
                        </label>

                        <span style={{ fontSize: '0.75rem', color: includeStudents ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {includeStudents ? (studentAudienceType === 'all_cohort' ? `All ${cohortStudents.length} Students` : `${selectedStudentIds.length} Selected`) : 'Disabled'}
                        </span>
                      </div>

                      {includeStudents && (
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Radio Selection */}
                          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="studentAudienceType"
                                checked={studentAudienceType === 'all_cohort'}
                                onChange={() => {
                                  setIsDirty(true);
                                  setStudentAudienceType('all_cohort');
                                }}
                                style={{ accentColor: 'var(--primary)' }}
                              />
                              <span>All eligible students in cohort ({cohortStudents.length})</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="studentAudienceType"
                                checked={studentAudienceType === 'selected'}
                                onChange={() => {
                                  setIsDirty(true);
                                  setStudentAudienceType('selected');
                                }}
                                style={{ accentColor: 'var(--primary)' }}
                              />
                              <span>Select specific students</span>
                            </label>
                          </div>

                          {errors.students && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={13} /> {errors.students}
                            </span>
                          )}

                          {/* Specific Student Selection List */}
                          {studentAudienceType === 'selected' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                                  <input
                                    type="text"
                                    className="input"
                                    placeholder="Search by student name, roll no, or email..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    style={{ paddingLeft: '32px', height: '34px', fontSize: '0.8rem' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleSelectAllStudents}
                                    style={{ fontSize: '0.72rem', height: '32px' }}
                                  >
                                    {selectedStudentIds.length === cohortStudents.length ? 'Deselect All' : 'Select All'}
                                  </button>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    {selectedStudentIds.length} of {cohortStudents.length} selected
                                  </span>
                                </div>
                              </div>

                              {/* Scrollable Student Items */}
                              <div
                                style={{
                                  maxHeight: '180px',
                                  overflowY: 'auto',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '8px',
                                  background: 'var(--bg-input)',
                                  padding: '4px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                }}
                              >
                                {filteredStudents.map((s) => {
                                  const isSelected = selectedStudentIds.includes(s.id);
                                  return (
                                    <div
                                      key={s.id}
                                      onClick={() => handleToggleStudent(s.id)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        background: isSelected ? 'var(--primary-light)' : 'transparent',
                                        fontSize: '0.8rem',
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        style={{ accentColor: 'var(--primary)' }}
                                      />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.displayName}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                          {s.rollNo || s.email}
                                        </div>
                                      </div>
                                      <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>Student</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* AUDIENCE 2: FACULTY & STAFF PANEL */}
                    <div
                      style={{
                        borderRadius: '10px',
                        border: includeFaculty ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Header toggle */}
                      <div
                        style={{
                          padding: '12px 16px',
                          background: includeFaculty ? 'var(--primary-light)' : 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                        onClick={() => {
                          setIsDirty(true);
                          setIncludeFaculty(!includeFaculty);
                          if (errors.audience) setErrors((prev) => ({ ...prev, audience: '' }));
                        }}
                      >
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontWeight: 700, fontSize: '0.875rem' }}>
                          <input
                            type="checkbox"
                            checked={includeFaculty}
                            onChange={(e) => {
                              setIsDirty(true);
                              setIncludeFaculty(e.target.checked);
                            }}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                          />
                          <Briefcase size={18} color="var(--primary)" />
                          <span>2. Faculty & Staff ({eligibleFacultyStaff.length} institutional members)</span>
                        </label>

                        <span style={{ fontSize: '0.75rem', color: includeFaculty ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {includeFaculty ? (facultyAudienceType === 'all_faculty' ? `All ${eligibleFacultyStaff.length} Members` : `${selectedStaffIds.length} Selected`) : 'Disabled'}
                        </span>
                      </div>

                      {includeFaculty && (
                        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {/* Radio Selection */}
                          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="facultyAudienceType"
                                checked={facultyAudienceType === 'all_faculty'}
                                onChange={() => {
                                  setIsDirty(true);
                                  setFacultyAudienceType('all_faculty');
                                }}
                                style={{ accentColor: 'var(--primary)' }}
                              />
                              <span>All eligible faculty & staff ({eligibleFacultyStaff.length})</span>
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="facultyAudienceType"
                                checked={facultyAudienceType === 'selected'}
                                onChange={() => {
                                  setIsDirty(true);
                                  setFacultyAudienceType('selected');
                                }}
                                style={{ accentColor: 'var(--primary)' }}
                              />
                              <span>Select specific faculty/staff</span>
                            </label>
                          </div>

                          {errors.faculty && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <AlertCircle size={13} /> {errors.faculty}
                            </span>
                          )}

                          {/* Specific Faculty Selection List */}
                          {facultyAudienceType === 'selected' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                                  <input
                                    type="text"
                                    className="input"
                                    placeholder="Search faculty name, role..."
                                    value={facultySearch}
                                    onChange={(e) => setFacultySearch(e.target.value)}
                                    style={{ paddingLeft: '32px', height: '34px', fontSize: '0.8rem' }}
                                  />
                                </div>

                                <select
                                  className="input"
                                  value={facultyDeptFilter}
                                  onChange={(e) => setFacultyDeptFilter(e.target.value)}
                                  style={{ height: '34px', fontSize: '0.78rem', width: 'auto' }}
                                >
                                  <option value="all">All Departments</option>
                                  {mockDepartments.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                  ))}
                                </select>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleSelectAllStaff}
                                    style={{ fontSize: '0.72rem', height: '32px' }}
                                  >
                                    {selectedStaffIds.length === eligibleFacultyStaff.length ? 'Deselect All' : 'Select All'}
                                  </button>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                    {selectedStaffIds.length} of {eligibleFacultyStaff.length} selected
                                  </span>
                                </div>
                              </div>

                              {/* Scrollable Faculty Items */}
                              <div
                                style={{
                                  maxHeight: '180px',
                                  overflowY: 'auto',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: '8px',
                                  background: 'var(--bg-input)',
                                  padding: '4px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                }}
                              >
                                {filteredFacultyStaff.map((f) => {
                                  const isSelected = selectedStaffIds.includes(f.id);
                                  const dept = mockDepartments.find((d) => d.id === f.departmentId);
                                  return (
                                    <div
                                      key={f.id}
                                      onClick={() => handleToggleStaff(f.id)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '6px 10px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        background: isSelected ? 'var(--primary-light)' : 'transparent',
                                        fontSize: '0.8rem',
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        style={{ accentColor: 'var(--primary)' }}
                                      />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{f.displayName}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                          {f.specialization || f.activeRole} &bull; {dept?.name || 'Academic Faculty'}
                                        </div>
                                      </div>
                                      <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
                                        {f.activeRole === 'platform_admin' || f.activeRole === 'org_admin' ? 'Admin Staff' : 'Faculty'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 3: REVIEW & SCHEDULE                                */}
              {/* ======================================================== */}
              {currentStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="var(--primary)" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Review Session Specifications</h3>
                  </div>

                  {/* Summary Grid Card */}
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <span className="badge badge-primary font-mono" style={{ fontSize: '0.7rem', marginBottom: '4px' }}>
                        Live Class Header
                      </span>
                      <h4 style={{ margin: '4px 0 0 0', fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {title}
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
                      <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACADEMIC UNIT</span>
                        <strong>{selectedDeptObj?.name || 'Department'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedCourseObj?.title}</div>
                      </div>

                      <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>COHORT BATCH</span>
                        <strong>{selectedCohortObj?.name || 'Cohort'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Code: {selectedCohortObj?.code}</div>
                      </div>

                      <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>LEAD TRAINER / HOST</span>
                        <strong>{selectedHostObj?.displayName || 'Lead Trainer'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{selectedHostObj?.email}</div>
                      </div>

                      <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>DATE & TIMETABLE</span>
                        <strong>{date} ({dayOfWeek})</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{startTime} – {endTime} ({durationInfo.minutes} mins) &bull; Room: {room || 'Hall 101'}</div>
                      </div>

                      <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>MEETING PROVIDER</span>
                        <strong>{provider}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Secure WebRTC / Integrated URL provisioned</div>
                      </div>

                      <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>PARTICIPANT ROSTER</span>
                        <strong>{totalCalculatedParticipants} Total Attendees</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {includeStudents ? `${studentAudienceType === 'all_cohort' ? cohortStudents.length : selectedStudentIds.length} Students` : '0 Students'}
                          {' + '}
                          {includeFaculty ? `${facultyAudienceType === 'all_faculty' ? eligibleFacultyStaff.length : selectedStaffIds.length} Faculty` : '0 Faculty'}
                        </div>
                      </div>
                    </div>

                    {/* Description & Agenda Previews */}
                    {(description || agenda) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontSize: '0.8rem' }}>
                        {description && (
                          <div>
                            <strong>Description:</strong> <span style={{ color: 'var(--text-secondary)' }}>{description}</span>
                          </div>
                        )}
                        {agenda && (
                          <div>
                            <strong>Agenda:</strong> <pre style={{ margin: '4px 0 0 0', fontFamily: 'inherit', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{agenda}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notification & Recording Options */}
                  <div
                    style={{
                      background: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-subtle)',
                      padding: '14px 18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontSize: '0.825rem' }}>
                      <input
                        type="checkbox"
                        checked={notifyParticipants}
                        onChange={(e) => setNotifyParticipants(e.target.checked)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>Dispatch automated in-app notifications and calendar invitations to all {totalCalculatedParticipants} selected participants</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', margin: 0, fontSize: '0.825rem' }}>
                      <input
                        type="checkbox"
                        checked={recordingEnabled}
                        onChange={(e) => setRecordingEnabled(e.target.checked)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>Enable automated cloud recording with post-session video archive replay</span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ======================================================== */}
        {/* FIXED FOOTER: BACK, CANCEL, DRAFT, NEXT / SCHEDULE       */}
        {/* ======================================================== */}
        {!isSuccessState && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            {/* Left Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentStep > 1 ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrevStep}
                  style={{ gap: '6px', fontSize: '0.85rem' }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAttemptClose}
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
              )}
            </div>

            {/* Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {currentStep < 3 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextStep}
                  style={{ gap: '6px', fontSize: '0.85rem', padding: '9px 20px', fontWeight: 700 }}
                >
                  Next: {currentStep === 1 ? 'Host & Participants' : 'Review & Schedule'} <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleFinalSubmit(true)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleFinalSubmit(false)}
                    style={{
                      gap: '8px',
                      fontSize: '0.9rem',
                      padding: '10px 24px',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      borderColor: '#059669',
                      color: '#ffffff',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    <CheckCircle2 size={17} /> Schedule Live Session
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-MODAL: DISCARD UNSAVED CHANGES CONFIRMATION          */}
        {/* ======================================================== */}
        {showDiscardConfirm && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 70,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setShowDiscardConfirm(false)}
          >
            <div
              className="card"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '420px',
                borderRadius: '16px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--warning-bg)',
                    border: '1px solid var(--warning)',
                    color: 'var(--warning)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                    Discard Unsaved Changes?
                  </h3>
                  <span className="text-secondary text-xs">You have unsubmitted live session parameters</span>
                </div>
              </div>

              <p className="text-secondary text-xs" style={{ margin: 0, lineHeight: 1.5 }}>
                Closing this dialog will discard any progress made across the scheduling steps. Are you sure you want to exit?
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDiscardConfirm(false)}
                >
                  Keep Editing
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                >
                  Discard & Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
