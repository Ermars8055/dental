import { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: ReactNode;
  currentSection: 'appointments' | 'money';
  currentTab: string;
  onNavigate: (section: 'appointments' | 'money', tab: string) => void;
}

export function AppLayout({ children, currentSection, currentTab, onNavigate }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />
      <div className="flex-1 flex">
        <Sidebar
          currentSection={currentSection}
          currentTab={currentTab}
          onNavigate={onNavigate}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
