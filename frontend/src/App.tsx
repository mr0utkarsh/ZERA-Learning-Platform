import { useEffect } from 'react';
import Lenis from '@studio-freight/lenis';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
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
import Doubts from './pages/Doubts';
import Handwriting from './pages/Handwriting';
import Interview from './pages/Interview';
import Performance from './pages/Performance';
import Resources from './pages/Resources';
import Pyqs from './pages/Pyqs';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Loading…</div>;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
      <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to="/dashboard" replace /> : <ResetPassword />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/syllabus" element={<Syllabus />} />
        <Route path="/study-plan" element={<StudyPlan />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/doubts" element={<Doubts />} />
        <Route path="/handwriting" element={<Handwriting />} />
        <Route path="/pyqs" element={<Pyqs />} />
        <Route path="/interview" element={<Interview />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/resources" element={<Resources />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/'} replace />} />
    </Routes>
  );
}
