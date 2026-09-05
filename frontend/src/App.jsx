import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoadingScreen } from './components/ui';

import PublicLayout from './layouts/PublicLayout';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';

// Public
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Features = lazy(() => import('./pages/Features'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

// Student
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MyCourses = lazy(() => import('./pages/MyCourses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Lesson = lazy(() => import('./pages/Lesson'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const Notes = lazy(() => import('./pages/Notes'));
const DoubtSolver = lazy(() => import('./pages/DoubtSolver'));
const Quiz = lazy(() => import('./pages/Quiz'));
const QuizRunner = lazy(() => import('./pages/QuizRunner'));
const MockTest = lazy(() => import('./pages/MockTest'));
const PYQs = lazy(() => import('./pages/PYQs'));
const Performance = lazy(() => import('./pages/Performance'));
const StudyPlan = lazy(() => import('./pages/StudyPlan'));
const Interview = lazy(() => import('./pages/Interview'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

// Admin
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminAdmins = lazy(() => import('./pages/admin/AdminAdmins'));

const NotFound = lazy(() => import('./pages/NotFound'));

function RequireStudent({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <LoadingScreen label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'STUDENT') return <Navigate to="/admin" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <LoadingScreen label="Checking your session…" />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
}

function RequireSuperAdmin({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <LoadingScreen label="Checking your session…" />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen label="Loading ZERA…" />}>
      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Student app */}
        <Route element={<RequireStudent><StudentLayout /></RequireStudent>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<MyCourses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/lessons/:id" element={<Lesson />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/doubts" element={<DoubtSolver />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/quiz/run/:quizId" element={<QuizRunner />} />
          <Route path="/quiz/review/:attemptId" element={<QuizRunner review />} />
          <Route path="/tests" element={<MockTest />} />
          <Route path="/tests/run/:quizId" element={<QuizRunner />} />
          <Route path="/pyqs" element={<PYQs />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/study-plan" element={<StudyPlan />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/settings" element={<RequireSuperAdmin><AdminSettings /></RequireSuperAdmin>} />
          <Route path="/admin/admins" element={<RequireSuperAdmin><AdminAdmins /></RequireSuperAdmin>} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
