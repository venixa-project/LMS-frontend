import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import { AppShell } from './components/AppShell';

// Auth Pages
import { LoginPage } from './pages/Auth/LoginPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { AcceptInvitePage } from './pages/Auth/AcceptInvitePage';
import { ProfilePage } from './pages/Auth/ProfilePage';

// Main Dashboard
import { DashboardPage } from './pages/Dashboard/DashboardPage';

// Administration
import { OrganizationsPage } from './pages/Administration/OrganizationsPage';
import { DepartmentsPage } from './pages/Administration/DepartmentsPage';
import { PeoplePage } from './pages/Administration/PeoplePage';
import { CohortsPage } from './pages/Administration/CohortsPage';
import { RolesPage } from './pages/Administration/RolesPage';

// Courses & Learning
import { CoursesPage } from './pages/Courses/CoursesPage';
import { CourseBuilderPage } from './pages/Courses/CourseBuilderPage';
import { LearningPathsPage } from './pages/Courses/LearningPathsPage';
import { LearnerCoursePlayerPage } from './pages/Courses/LearnerCoursePlayerPage';
import { EnrollmentsPage } from './pages/Academics/EnrollmentsPage';

// Live Classes & Attendance
import { LiveSessionsPage } from './pages/LiveSessions/LiveSessionsPage';

// Assessments
import { QuestionBanksPage } from './pages/Assessments/QuestionBanksPage';
import { AssessmentsPage } from './pages/Assessments/AssessmentsPage';
import { ExamPlayerPage } from './pages/Assessments/ExamPlayerPage';

// Grading & Moderation
import { GradingPage } from './pages/Grading/GradingPage';

// Proctoring
import { ProctoringPage } from './pages/Proctoring/ProctoringPage';

// Certificates & Reports
import { CertificatesPage } from './pages/Certificates/CertificatesPage';
import { ReportsPage } from './pages/Reports/ReportsPage';

// System & Notifications
import { NotificationsCenterPage } from './pages/Notifications/NotificationsCenterPage';
import { IntegrationsPage } from './pages/System/IntegrationsPage';
import { PlatformSettingsPage } from './pages/System/PlatformSettingsPage';

// Errors
import { NotFoundPage } from './pages/ErrorPages/NotFoundPage';
import { UnauthorizedPage } from './pages/ErrorPages/UnauthorizedPage';

export const App: React.FC = () => {
  const { isAuthenticated, login } = useAuthStore();

  // Initialize with default demo login on initial load if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      login('admin@lms.demo', 'password123');
    }
  }, [isAuthenticated, login]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />

        {/* Dedicated Fullscreen Exam Player (No AppShell sidebar to prevent distractions) */}
        <Route path="/exam/:id" element={<ExamPlayerPage />} />

        {/* Main Application Shell Protected Layout */}
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Administration & Directory */}
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="students" element={<PeoplePage initialMode="students" />} />
          <Route path="faculty" element={<PeoplePage initialMode="faculty" />} />
          <Route path="cohorts" element={<CohortsPage />} />
          <Route path="roles" element={<RolesPage />} />

          {/* Course Management & Learning */}
          <Route path="courses" element={<CoursesPage />} />
          <Route path="my-learning" element={<CoursesPage />} />
          <Route path="catalog" element={<CoursesPage />} />
          <Route path="course-builder" element={<CourseBuilderPage />} />
          <Route path="course-player/:id" element={<LearnerCoursePlayerPage />} />
          <Route path="learning-materials" element={<LearnerCoursePlayerPage />} />
          <Route path="learning-paths" element={<LearningPathsPage />} />
          <Route path="my-paths" element={<LearningPathsPage />} />
          <Route path="enrollments" element={<EnrollmentsPage />} />

          {/* Live Sessions, Timetable & Attendance */}
          <Route path="live-sessions" element={<LiveSessionsPage />} />
          <Route path="my-sessions" element={<LiveSessionsPage />} />
          <Route path="attendance" element={<LiveSessionsPage defaultTab="attendance" />} />

          {/* Assessments & Assignments */}
          <Route path="assignments" element={<AssessmentsPage defaultTab="assignments" />} />
          <Route path="question-banks" element={<QuestionBanksPage />} />
          <Route path="assessments" element={<AssessmentsPage />} />
          <Route path="my-assessments" element={<AssessmentsPage />} />
          <Route path="my-results" element={<AssessmentsPage defaultTab="results" />} />

          {/* Grading & Proctoring */}
          <Route path="grading" element={<GradingPage />} />
          <Route path="proctoring" element={<ProctoringPage />} />

          {/* Certificates & Analytics */}
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="my-certificates" element={<CertificatesPage />} />
          <Route path="reports" element={<ReportsPage />} />

          {/* System & Notifications */}
          <Route path="notifications" element={<NotificationsCenterPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="settings" element={<PlatformSettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Error fallback routes */}
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
