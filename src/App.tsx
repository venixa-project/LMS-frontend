import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
          <Route path="people" element={<PeoplePage key="people" initialMode="all" />} />
          <Route path="students" element={<PeoplePage key="students" initialMode="students" />} />
          <Route path="faculty" element={<PeoplePage key="faculty" initialMode="faculty" />} />
          <Route path="cohorts" element={<CohortsPage />} />
          <Route path="roles" element={<RolesPage />} />

          {/* Course Management & Learning */}
          <Route path="courses" element={<CoursesPage key="courses" />} />
          <Route path="my-learning" element={<CoursesPage key="my-learning" />} />
          <Route path="catalog" element={<CoursesPage key="catalog" />} />
          <Route path="course-builder" element={<CourseBuilderPage />} />
          <Route path="course-player/:id" element={<LearnerCoursePlayerPage />} />
          <Route path="learning-materials" element={<LearnerCoursePlayerPage />} />
          <Route path="learning-paths" element={<LearningPathsPage key="learning-paths" />} />
          <Route path="my-paths" element={<LearningPathsPage key="my-paths" />} />
          <Route path="enrollments" element={<EnrollmentsPage />} />

          {/* Live Sessions, Timetable & Attendance */}
          <Route path="live-sessions" element={<LiveSessionsPage key="live-sessions" />} />
          <Route path="my-sessions" element={<LiveSessionsPage key="my-sessions" />} />
          <Route path="attendance" element={<LiveSessionsPage key="attendance" defaultTab="attendance" />} />

          {/* Assessments & Assignments */}
          <Route path="assignments" element={<AssessmentsPage key="assignments" defaultTab="assignments" />} />
          <Route path="question-banks" element={<QuestionBanksPage />} />
          <Route path="assessments" element={<AssessmentsPage key="assessments" defaultTab="assessments" />} />
          <Route path="my-assessments" element={<AssessmentsPage key="my-assessments" defaultTab="assessments" />} />
          <Route path="my-results" element={<AssessmentsPage key="my-results" defaultTab="results" />} />

          {/* Grading & Proctoring */}
          <Route path="grading" element={<GradingPage />} />
          <Route path="proctoring" element={<ProctoringPage />} />

          {/* Certificates & Analytics */}
          <Route path="certificates" element={<CertificatesPage key="certificates" />} />
          <Route path="my-certificates" element={<CertificatesPage key="my-certificates" />} />
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
