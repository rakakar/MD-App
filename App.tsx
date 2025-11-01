import React, { useState } from 'react';
import { View } from './types';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DiscussionsPage } from './components/DiscussionsPage';
import { DirectoryPage } from './components/DirectoryPage';
import { RoadmapPage } from './components/RoadmapPage';
import { EventsPage } from './components/EventsPage';
import { ReadPage } from './components/ReadPage';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.Discussions);

  const renderContent = () => {
    switch (currentView) {
      case View.Discussions:
        return <DiscussionsPage />;
      case View.Directory:
        return <DirectoryPage />;
      case View.Roadmap:
        return <RoadmapPage />;
      case View.Events:
        return <EventsPage />;
      case View.Read:
        return <ReadPage />;
      default:
        return <DiscussionsPage />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      <main className="flex-1 h-full overflow-hidden pb-16 md:pb-0">
        {renderContent()}
      </main>
      <BottomNav currentView={currentView} onNavigate={setCurrentView} />
    </div>
  );
};

export default App;