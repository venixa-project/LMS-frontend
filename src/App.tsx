import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RoleGuard } from './components/RoleGuard';

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
import { CohortCreatePage } from './pages/Administration/CohortCreatePage';
import { PersonCreatePage } from './pages/Administration/PersonCreatePage';
import { PersonEditPage } from './pages/Administration/PersonEditPage';
import { AdminPlannerPage } from './pages/Administration/AdminPlannerPage';
import { RolesPage } from './pages/Administration/RolesPage';
import { OrganisationManagementPage } from './pages/Organisation/OrganisationManagementPage';

// Courses & Learning
import { CoursesPage } from './pages/Courses/CoursesPage';
import { CourseBuilderPage } from './pages/Courses/CourseBuilderPage';
import { LearningPathsPage } from './pages/Courses/LearningPathsPage';
import { LearnerCoursePlayerPage } from './pages/Courses/LearnerCoursePlayerPage';
import { EnrollmentsPage } from './pages/Academics/EnrollmentsPage';
import { PublicCourseDetailsPage } from './pages/Courses/PublicCourseDetailsPage';
import { JoinCourseWithLinkPage } from './pages/Courses/JoinCourseWithLinkPage';
import { ShareCoursePage } from './pages/Courses/ShareCoursePage';
import { AssignStudentsPage } from './pages/Courses/AssignStudentsPage';

// Live Classes & Attendance
import { LiveSessionsPage } from './pages/LiveSessions/LiveSessionsPage';
import { TimetablePage } from './pages/LiveSessions/TimetablePage';
import { AttendanceLedgerPage } from './pages/LiveSessions/AttendanceLedgerPage';

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

          {/* Platform Admin Only Protected Routes */}
          <Route element={<RoleGuard allowedRoles={['platform_admin']} />}>
            <Route path="organizations" element={<OrganizationsPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="settings" element={<PlatformSettingsPage />} />
          </Route>

          {/* Organisation Management & Admin Directory (Platform Admin & Institution Admin) */}
          <Route element={<RoleGuard allowedRoles={['platform_admin', 'org_admin']} />}>
            <Route path="organisation" element={<OrganisationManagementPage />} />
            <Route path="organisation/company-profile" element={<OrganisationManagementPage subNav="ca-company-profile" />} />
            <Route path="organisation/branches-locations" element={<OrganisationManagementPage subNav="ca-branches-locations" />} />
            <Route path="organisation/departments-designations" element={<OrganisationManagementPage subNav="ca-departments-designations" />} />
            <Route path="organisation/teams-hierarchy" element={<Navigate to="/organisation/departments-designations" replace />} />

            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="people/new" element={<PersonCreatePage />} />
            <Route path="people/student/new" element={<PersonCreatePage />} />
            <Route path="people/faculty/new" element={<PersonCreatePage />} />
            <Route path="people/staff/new" element={<PersonCreatePage />} />
            <Route path="people/:id/edit" element={<PersonEditPage />} />
            <Route path="students/new" element={<PersonCreatePage />} />
            <Route path="faculty" element={<PeoplePage initialMode="faculty" />} />
            <Route path="faculty/new" element={<PersonCreatePage />} />
            <Route path="cohorts/new" element={<CohortCreatePage />} />
            <Route path="enrollments" element={<EnrollmentsPage />} />
          </Route>

          {/* Academic Operations & Teaching (Platform Admin, Org Admin, Trainer) */}
          <Route element={<RoleGuard allowedRoles={['platform_admin', 'org_admin', 'trainer']} />}>
            <Route path="students" element={<PeoplePage initialMode="students" />} />
            <Route path="cohorts" element={<CohortsPage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:id/share" element={<ShareCoursePage />} />
            <Route path="course/:id/share" element={<ShareCoursePage />} />
            <Route path="courses/share" element={<ShareCoursePage />} />
            <Route path="courses/:id/assign-students" element={<AssignStudentsPage />} />
            <Route path="course/:id/assign-students" element={<AssignStudentsPage />} />
            <Route path="courses/assign-students" element={<AssignStudentsPage />} />
            <Route path="course-builder" element={<CourseBuilderPage />} />
            <Route path="learning-paths" element={<LearningPathsPage />} />
            <Route path="calendar" element={<AdminPlannerPage />} />
            <Route path="planner" element={<AdminPlannerPage />} />
            <Route path="assessments" element={<AssessmentsPage />} />
            <Route path="question-banks" element={<QuestionBanksPage />} />
            <Route path="grading" element={<GradingPage />} />
            <Route path="proctoring" element={<ProctoringPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Course Discovery, Learning Player & Link Enrollment */}
          <Route path="course/:id" element={<PublicCourseDetailsPage />} />
          <Route path="courses/:id" element={<PublicCourseDetailsPage />} />
          <Route path="join-course" element={<JoinCourseWithLinkPage />} />
          <Route path="my-learning" element={<CoursesPage />} />
          <Route path="catalog" element={<CoursesPage />} />
          <Route path="course-player/:id" element={<LearnerCoursePlayerPage />} />
          <Route path="learning-materials" element={<LearnerCoursePlayerPage />} />
          <Route path="my-paths" element={<LearningPathsPage />} />

          {/* Live Sessions, Timetable & Attendance */}
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="classes-timetable" element={<TimetablePage />} />
          <Route path="live-sessions" element={<LiveSessionsPage />} />
          <Route path="my-sessions" element={<LiveSessionsPage />} />
          <Route path="attendance" element={<AttendanceLedgerPage />} />
          <Route path="attendance-ledger" element={<AttendanceLedgerPage />} />

          {/* Student Assessments & Transcripts */}
          <Route path="assignments" element={<AssessmentsPage defaultTab="assignments" />} />
          <Route path="my-assessments" element={<AssessmentsPage />} />
          <Route path="my-results" element={<AssessmentsPage defaultTab="results" />} />

          {/* Certificates, Notifications & Profile */}
          <Route path="certificates" element={<CertificatesPage />} />
          <Route path="my-certificates" element={<CertificatesPage />} />
          <Route path="notifications" element={<NotificationsCenterPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Error fallback routes */}
          <Route path="unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
