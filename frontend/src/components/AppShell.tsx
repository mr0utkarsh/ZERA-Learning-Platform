import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppSidebar, MobileNavButton } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-void text-fg">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 bg-void/60 px-4 backdrop-blur-xl md:px-6">
          <div className="md:hidden">
            <MobileNavButton onClick={() => setSidebarOpen(true)} />
          </div>
          <TopBar title={user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Dashboard'} />
        </div>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
