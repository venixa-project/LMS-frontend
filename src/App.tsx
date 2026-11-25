import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, X } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { RoleGuard } from './components/RoleGuard';

const lazyPage = <T extends Record<string, any>>(loader: () => Promise<T>, exportName: keyof T) =>
  React.lazy(() => loader().then((module) => ({ default: module[exportName] })));

// Smooth, instant route loading fallback without Cumulative Layout Shift (CLS)
const RouteLoadingFallback: React.FC = () => (
  <div
    style={{
      padding: '32px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
    }}
  >
    <div
      style={{
        height: '3px',
        width: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 99999,
        background: 'linear-gradient(90deg, #6366f1, #a855f7, #ec4899)',
      }}
    />
    <div
      style={{
        height: '36px',
        width: '240px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
      }}
    />
    <div
      style={{
        height: '120px',
        width: '100%',
        background: 'rgba(255,255,255,0.04)',
        borderRadius: '12px',
      }}
    />
    <div
      style={{
        height: '240px',
        width: '100%',
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px',
      }}
    />
  </div>
);

// Lazy Loaded Routes for Instant Initial Bundle
const LoginPage = lazyPage(() => import('./pages/Auth/LoginPage'), 'LoginPage');
const ForgotPasswordPage = lazyPage(() => import('./pages/Auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const AcceptInvitePage = lazyPage(() => import('./pages/Auth/AcceptInvitePage'), 'AcceptInvitePage');
const ChangePasswordPage = lazyPage(() => import('./pages/Auth/ChangePasswordPage'), 'ChangePasswordPage');
const ProfilePage = lazyPage(() => import('./pages/Auth/ProfilePage'), 'ProfilePage');

// Main Dashboard
const DashboardPage = lazyPage(() => import('./pages/Dashboard/DashboardPage'), 'DashboardPage');

// Administration
const OrganizationsPage = lazyPage(() => import('./pages/Administration/OrganizationsPage'), 'OrganizationsPage');
const DepartmentsPage = lazyPage(() => import('./pages/Administration/DepartmentsPage'), 'DepartmentsPage');
const PeoplePage = lazyPage(() => import('./pages/Administration/PeoplePage'), 'PeoplePage');
const CohortsPage = lazyPage(() => import('./pages/Administration/CohortsPage'), 'CohortsPage');
const CohortCreatePage = lazyPage(() => import('./pages/Administration/CohortCreatePage'), 'CohortCreatePage');
const PersonCreatePage = lazyPage(() => import('./pages/Administration/PersonCreatePage'), 'PersonCreatePage');
const PersonEditPage = lazyPage(() => import('./pages/Administration/PersonEditPage'), 'PersonEditPage');
const AdminPlannerPage = lazyPage(() => import('./pages/Administration/AdminPlannerPage'), 'AdminPlannerPage');
const RolesPage = lazyPage(() => import('./pages/Administration/RolesPage'), 'RolesPage');
const OrganisationManagementPage = lazyPage(() => import('./pages/Organisation/OrganisationManagementPage'), 'OrganisationManagementPage');

// Courses & Learning
const CoursesPage = lazyPage(() => import('./pages/Courses/CoursesPage'), 'CoursesPage');
const CourseBuilderPage = lazyPage(() => import('./pages/Courses/CourseBuilderPage'), 'CourseBuilderPage');
const LearningPathsPage = lazyPage(() => import('./pages/Courses/LearningPathsPage'), 'LearningPathsPage');
const LearnerCoursePlayerPage = lazyPage(() => import('./pages/Courses/LearnerCoursePlayerPage'), 'LearnerCoursePlayerPage');
const EnrollmentsPage = lazyPage(() => import('./pages/Academics/EnrollmentsPage'), 'EnrollmentsPage');
const PublicCourseDetailsPage = lazyPage(() => import('./pages/Courses/PublicCourseDetailsPage'), 'PublicCourseDetailsPage');
const JoinCourseWithLinkPage = lazyPage(() => import('./pages/Courses/JoinCourseWithLinkPage'), 'JoinCourseWithLinkPage');
const ShareCoursePage = lazyPage(() => import('./pages/Courses/ShareCoursePage'), 'ShareCoursePage');
const AssignStudentsPage = lazyPage(() => import('./pages/Courses/AssignStudentsPage'), 'AssignStudentsPage');
const MomentumPage = lazyPage(() => import('./pages/Momentum/MomentumPage'), 'MomentumPage');
const LeaderboardPage = lazyPage(() => import('./pages/Academics/LeaderboardPage'), 'LeaderboardPage');

// Live Classes & Attendance
const LiveSessionsPage = lazyPage(() => import('./pages/LiveSessions/LiveSessionsPage'), 'LiveSessionsPage');
const AttendanceLedgerPage = lazyPage(() => import('./pages/LiveSessions/AttendanceLedgerPage'), 'AttendanceLedgerPage');

// Assessments
const QuestionBanksPage = lazyPage(() => import('./pages/Assessments/QuestionBanksPage'), 'QuestionBanksPage');
const AssessmentsPage = lazyPage(() => import('./pages/Assessments/AssessmentsPage'), 'AssessmentsPage');
const ExamPlayerPage = lazyPage(() => import('./pages/Assessments/ExamPlayerPage'), 'ExamPlayerPage');
const MyProctoringReportPage = lazyPage(() => import('./pages/Assessments/MyProctoringReportPage'), 'MyProctoringReportPage');

// Grading & Moderation
const GradingPage = lazyPage(() => import('./pages/Grading/GradingPage'), 'GradingPage');

// Proctoring
const ProctoringPage = lazyPage(() => import('./pages/Proctoring/ProctoringPage'), 'ProctoringPage');
const ProctoringVideosPage = lazyPage(() => import('./pages/Proctoring/ProctoringVideosPage'), 'ProctoringVideosPage');

// Certificates & Reports
const CertificatesPage = lazyPage(() => import('./pages/Certificates/CertificatesPage'), 'CertificatesPage');
const VerifyCertificatePage = lazyPage(() => import('./pages/Certificates/VerifyCertificatePage'), 'VerifyCertificatePage');
const ReportsPage = lazyPage(() => import('./pages/Reports/ReportsPage'), 'ReportsPage');

// System & Notifications
const NotificationsCenterPage = lazyPage(() => import('./pages/Notifications/NotificationsCenterPage'), 'NotificationsCenterPage');
const IntegrationsPage = lazyPage(() => import('./pages/System/IntegrationsPage'), 'IntegrationsPage');
const PlatformSettingsPage = lazyPage(() => import('./pages/System/PlatformSettingsPage'), 'PlatformSettingsPage');

// Errors
const NotFoundPage = lazyPage(() => import('./pages/ErrorPages/NotFoundPage'), 'NotFoundPage');
const UnauthorizedPage = lazyPage(() => import('./pages/ErrorPages/UnauthorizedPage'), 'UnauthorizedPage');
import { useAuthStore } from './lib/store';

const IndexRouteRedirect: React.FC = () => {
  return <Navigate to="/dashboard" replace />;
};

const TemporaryPasswordNoticeModal: React.FC = () => {
  const { user } = useAuthStore();
  const [dismissed, setDismissed] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (sessionStorage.getItem('venilearn_dismissed_pwd_notice') === 'true') {
      setDismissed(true);
    }
  }, []);

  if (!user?.mustChangePassword || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem('venilearn_dismissed_pwd_notice', 'true');
    setDismissed(true);
  };

  const handleGoToProfile = () => {
    handleDismiss();
    navigate('/profile?tab=security');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 18, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={handleDismiss}
    >
      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
          border: '1px solid var(--border-accent)',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <KeyRound size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700, color: 'var(--text-main)' }}>
              Welcome to VeniLearn!
            </h3>
            <span className="text-muted text-xs">Account security recommendation</span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-secondary text-sm" style={{ lineHeight: 1.5, marginBottom: '20px' }}>
          You logged in with an initial password. You can easily change your password anytime in your Profile.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleDismiss}>
            Got it, Continue
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={handleGoToProfile}>
            Change in Profile
          </button>
        </div>
      </div>
    </div>
  );
};

const FirstLoginPasswordGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <TemporaryPasswordNoticeModal />
      {children}
    </>
  );
};

export const App: React.FC = () => {

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          {/* Dedicated Fullscreen Exam Player (No AppShell sidebar to prevent distractions) */}
          <Route path="/exam/:id" element={<ExamPlayerPage />} />

          {/* Main Application Shell Protected Layout */}
          <Route path="/" element={<FirstLoginPasswordGuard><AppShell /></FirstLoginPasswordGuard>}>
            <Route index element={<IndexRouteRedirect />} />
            <Route path="change-password" element={<ChangePasswordPage />} />
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

            {/* Cohorts & Batches (Admin, Trainer & Enrolled Student View) */}
            <Route path="cohorts" element={<CohortsPage />} />

            {/* Academic Operations & Teaching (Platform Admin, Org Admin, Trainer) */}
            <Route element={<RoleGuard allowedRoles={['platform_admin', 'org_admin', 'trainer']} />}>
              <Route path="students" element={<PeoplePage initialMode="students" />} />
              <Route path="courses/:id/share" element={<ShareCoursePage />} />
              <Route path="course/:id/share" element={<ShareCoursePage />} />
              <Route path="courses/share" element={<ShareCoursePage />} />
              <Route path="courses/:id/assign-students" element={<AssignStudentsPage />} />
              <Route path="course/:id/assign-students" element={<AssignStudentsPage />} />
              <Route path="courses/assign-students" element={<AssignStudentsPage />} />
              <Route path="course-builder" element={<CourseBuilderPage />} />
              <Route path="learning-paths" element={<LearningPathsPage />} />
              <Route path="question-banks" element={<QuestionBanksPage />} />
              <Route path="grading" element={<GradingPage />} />
              <Route path="proctoring" element={<ProctoringPage />} />
              <Route path="proctoring-videos" element={<ProctoringVideosPage />} />
              <Route path="proctoring/videos" element={<ProctoringVideosPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            {/* Assessments & Evaluations (Universal Access for Admin, Faculty & Students) */}
            <Route path="assessments" element={<AssessmentsPage />} />

            {/* Course Discovery, Learning Player & Link Enrollment */}
            <Route path="courses" element={<CoursesPage />} />
            <Route path="my-courses" element={<CoursesPage />} />
            <Route path="course/:id" element={<PublicCourseDetailsPage />} />
            <Route path="courses/:id" element={<PublicCourseDetailsPage />} />
            <Route path="join-course" element={<JoinCourseWithLinkPage />} />
            <Route path="my-learning" element={<CoursesPage />} />
            <Route path="my_learning" element={<CoursesPage />} />
            <Route path="catalog" element={<CoursesPage />} />
            <Route path="course-player/:id" element={<LearnerCoursePlayerPage />} />
            <Route path="course-player" element={<Navigate to="/my-learning" replace />} />
            <Route path="learning-materials" element={<Navigate to="/my-learning" replace />} />
            <Route path="my-paths" element={<LearningPathsPage />} />
            <Route path="momentum" element={<MomentumPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />

            {/* Academic Calendar & Planner (All Roles) */}
            <Route path="calendar" element={<AdminPlannerPage />} />
            <Route path="planner" element={<AdminPlannerPage />} />

            {/* Live Sessions, Timetable & Attendance */}
            <Route path="timetable" element={<LiveSessionsPage defaultTab="timetable" />} />
            <Route path="weekly-timetable" element={<LiveSessionsPage defaultTab="timetable" />} />
            <Route path="classes-timetable" element={<LiveSessionsPage defaultTab="timetable" />} />
            <Route path="live-sessions" element={<LiveSessionsPage defaultTab="live_sessions" />} />
            <Route path="my-sessions" element={<LiveSessionsPage defaultTab="live_sessions" />} />
            <Route path="recorded-classes" element={<LiveSessionsPage defaultTab="recordings" />} />
            <Route path="recorded_classes" element={<LiveSessionsPage defaultTab="recordings" />} />
            <Route path="recordings" element={<LiveSessionsPage defaultTab="recordings" />} />
            <Route path="attendance" element={<AttendanceLedgerPage />} />
            <Route path="attendance-ledger" element={<AttendanceLedgerPage />} />

            {/* Student Assessments & Transcripts */}
            <Route path="assignments" element={<AssessmentsPage defaultTab="assignments" />} />
            <Route path="my-assignments" element={<AssessmentsPage defaultTab="assignments" />} />
            <Route path="my_assignments" element={<AssessmentsPage defaultTab="assignments" />} />
            <Route path="my-assessments" element={<AssessmentsPage defaultTab="assessments" />} />
            <Route path="my_assessments" element={<AssessmentsPage defaultTab="assessments" />} />
            <Route path="my-results" element={<AssessmentsPage defaultTab="results" />} />
            <Route path="my_results" element={<AssessmentsPage defaultTab="results" />} />
            <Route path="my-proctoring-reports" element={<MyProctoringReportPage />} />
            <Route path="my_proctoring_reports" element={<MyProctoringReportPage />} />
            <Route path="my_proctoring_report" element={<MyProctoringReportPage />} />
            <Route path="my_proctoring_report/:sessionId" element={<MyProctoringReportPage />} />
            <Route path="my-proctoring-report" element={<MyProctoringReportPage />} />
            <Route path="my-proctoring-report/:sessionId" element={<MyProctoringReportPage />} />

            {/* Certificates, Verification, Notifications & Profile */}
            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="my-certificates" element={<CertificatesPage />} />
            <Route path="verify-certificate" element={<VerifyCertificatePage />} />
            <Route path="verify-certificate/:certId" element={<VerifyCertificatePage />} />
            <Route path="notifications" element={<NotificationsCenterPage />} />
            <Route path="profile" element={<ProfilePage />} />

            {/* Error fallback routes */}
            <Route path="unauthorized" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};
