import { ReactNode } from 'react';
import { useApp } from '../../contexts/AppContext';
import Header from './Header';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { sidebarOpen, settings } = useApp();
  const primaryColor = settings?.primaryColor || '#6366f1';

  return (
    <div className="min-h-screen relative flex overflow-x-hidden bg-slate-50/60 dark:bg-[#070b14]" dir="rtl">
      {/* Ambient background glow orbs for futuristic depth */}
      <div
        className="fixed top-[-50px] right-1/4 w-[600px] h-[450px] rounded-full blur-[150px] pointer-events-none opacity-20 dark:opacity-25"
        style={{ backgroundColor: primaryColor }}
      />
      <div
        className="fixed bottom-0 left-10 w-[500px] h-[400px] rounded-full blur-[140px] pointer-events-none opacity-15 dark:opacity-20 bg-cyan-500"
      />
      <div
        className="fixed top-1/2 left-1/3 w-[400px] h-[300px] rounded-full blur-[130px] pointer-events-none opacity-10 dark:opacity-15 bg-purple-600"
      />

      <Sidebar />
      <div
        className="flex-1 min-w-0 flex flex-col transition-all duration-300 relative z-10"
        style={{ marginRight: sidebarOpen ? '256px' : '64px' }}
      >
        <Header title={title} />
        <main className="flex-1 min-w-0 p-3 sm:p-6 mt-16 max-w-7xl mx-auto w-full fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
