import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Syllabus from './pages/Syllabus';
import StudyPlan from './pages/StudyPlan';
import Progress from './pages/Progress';
import Notes from './pages/Notes';
import Quiz from './pages/Quiz';
import AIStudy from './pages/AIStudy';
import Doubts from './pages/Doubts';
import Handwriting from './pages/Handwriting';
import Interview from './pages/Interview';
import Performance from './pages/Performance';
import Resources from './pages/Resources';
import Pyqs from './pages/Pyqs';
import About from './pages/About';
import Support from './pages/Support';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-fg">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/**
 * The admin surface is reachable only with an administrator account. A signed
 * in student who lands here is sent to the admin sign-in page instead of the
 * student app, so the two entry points never blur into each other.
 */
function AdminOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-fg">Loading…</div>;
  if (!user) return <Navigate to="/admin-login" replace />;
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return <Navigate to="/admin-login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="grid min-h-screen place-items-center text-fg">Loading…</div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/admin-login" element={user ? <Navigate to="/admin" replace /> : <AdminLogin />} />
      <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to="/dashboard" replace /> : <ResetPassword />} />
      <Route path="/about" element={<About />} />
      <Route path="/support" element={<Support />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/syllabus" element={<Syllabus />} />
        <Route path="/study-plan" element={<StudyPlan />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/ai-tools" element={<AIStudy />} />
        <Route path="/doubts" element={<Doubts />} />
        <Route path="/handwriting" element={<Handwriting />} />
        <Route path="/pyqs" element={<Pyqs />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/resources" element={<Resources />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
