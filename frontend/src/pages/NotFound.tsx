import { Link } from 'react-router-dom';
import { AlertCircle, Home, LayoutDashboard } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-void text-fg flex items-center justify-center">
      <div className="container px-6 text-center max-w-xl">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6">
          <AlertCircle className="h-8 w-8 text-error" />
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-fg mb-4">404</h1>
        <p className="text-lg text-muted mb-10">
          This page doesn&#8217;t exist in ZERA. But your learning journey does.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary px-8 py-3 text-center flex-1 sm:flex-none">
            <Home className="h-4 w-4 mr-2" /> Back to home
          </Link>
          <Link to="/dashboard" className="btn-secondary px-8 py-3 text-center flex-1 sm:flex-none">
            <LayoutDashboard className="h-4 w-4 mr-2" /> Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}