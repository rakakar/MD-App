import React, { useState } from 'react';
import { View, Note, User } from './types';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DiscussionsPage } from './components/DiscussionsPage';
import { DirectoryPage } from './components/DirectoryPage';
import { RoadmapPage } from './components/RoadmapPage';
import { EventsPage } from './components/EventsPage';
import { ReadPage } from './components/ReadPage';
import { ProfilePage } from './components/ProfilePage';
import { LoginPage } from './components/LoginPage';
import { MOCK_BOOKS, MOCK_CURRENT_USER, INITIAL_NOTES } from './constants';

interface UserData {
  user: User;
  bookmarks: string[];
  notes: Note[];
}

const App: React.FC = () => {
  const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.Discussions);
  
  const [bookToOpen, setBookToOpen] = useState<string | null>(null);
  const [chapterToOpen, setChapterToOpen] = useState<string | null>(null);
  const [noteToHighlight, setNoteToHighlight] = useState<Note | null>(null);
  
  const handleLogin = () => {
    setCurrentUserData({
      user: MOCK_CURRENT_USER,
      bookmarks: ['mvd-2', 'mvd-3'],
      notes: INITIAL_NOTES,
    });
    setCurrentView(View.Discussions);
  };

  const handleLogout = () => {
    setCurrentUserData(null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    if (currentUserData) {
      setCurrentUserData({ ...currentUserData, user: updatedUser });
    }
  };

  const handleToggleBookmark = (chapterId: string) => {
    if (currentUserData) {
      const newBookmarks = currentUserData.bookmarks.includes(chapterId)
        ? currentUserData.bookmarks.filter(id => id !== chapterId)
        : [...currentUserData.bookmarks, chapterId];
      setCurrentUserData({ ...currentUserData, bookmarks: newBookmarks });
    }
  };

  const handleAddNote = (note: Note) => {
    if (currentUserData) {
      setCurrentUserData({ ...currentUserData, notes: [...currentUserData.notes, note] });
    }
  };
  
  const handleNavigateToChapter = (bookId: string, chapterId: string, note?: Note) => {
    setBookToOpen(bookId);
    setChapterToOpen(chapterId);
    setNoteToHighlight(note || null);
    setCurrentView(View.Read);
  };
  
  if (!currentUserData) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const { user, bookmarks, notes } = currentUserData;

  const renderContent = () => {
    switch (currentView) {
      case View.Discussions:
        return <DiscussionsPage currentUser={user} />;
      case View.Directory:
        return <DirectoryPage />;
      case View.Roadmap:
        return <RoadmapPage />;
      case View.Events:
        return <EventsPage />;
      case View.Read:
        return <ReadPage 
          bookmarks={bookmarks}
          notes={notes}
          onToggleBookmark={handleToggleBookmark}
          onAddNote={handleAddNote}
          bookToOpen={bookToOpen}
          chapterToOpen={chapterToOpen}
          noteToHighlight={noteToHighlight}
          onDidOpenBook={() => {
            setBookToOpen(null);
            setChapterToOpen(null);
            setNoteToHighlight(null);
          }}
        />;
      case View.Profile:
        return <ProfilePage 
            user={user} 
            onUpdateUser={handleUpdateUser} 
            onLogout={handleLogout}
            books={MOCK_BOOKS}
            bookmarks={bookmarks}
            notes={notes}
            onNavigateToChapter={handleNavigateToChapter}
            onToggleBookmark={handleToggleBookmark}
        />;
      default:
        return <DiscussionsPage currentUser={user} />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <Sidebar currentUser={user} currentView={currentView} onNavigate={setCurrentView} />
      <main className="flex-1 h-full overflow-hidden pb-16 md:pb-0">
        {renderContent()}
      </main>
      <BottomNav currentView={currentView} onNavigate={setCurrentView} />
    </div>
  );
};

export default App;