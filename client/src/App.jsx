import React, { useState } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ToastContainer from './components/Toast';
import AuthModal from './components/AuthModal';
import DevMailboxModal from './components/DevMailboxModal';
import CreateTaskModal from './components/CreateTaskModal';
import SubmitWorkModal from './components/SubmitWorkModal';
import FilePreviewModal from './components/FilePreviewModal';
import OonjalIdBadge from './components/OonjalIdBadge';
import UserProfileModal from './components/UserProfileModal';
import AdminProfileModal from './components/AdminProfileModal';
import CredentialsView from './views/CredentialsView';
import Footer from './components/Footer';
import LaunchScreen from './components/LaunchScreen';
import LogoLightboxModal from './components/LogoLightboxModal';

import AdminDashboardView from './views/AdminDashboardView';
import TasksBoardView from './views/TasksBoardView';
import SpreadsheetLogsView from './views/SpreadsheetLogsView';
import TeamMembersView from './views/TeamMembersView';
import FilesManagerView from './views/FilesManagerView';
import ChatView from './views/ChatView';

function MainApp() {
  const { isAuthenticated, user, isLoading, showLaunchScreen, dismissLaunchScreen } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Navigation State
  const [activeView, setActiveView] = useState(() => (isAdmin ? 'dashboard' : 'tasks'));

  // Modals State
  const [isDevMailboxOpen, setIsDevMailboxOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submittingWorkTask, setSubmittingWorkTask] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [chatTargetUser, setChatTargetUser] = useState(null);
  const [tasksRefreshTrigger, setTasksRefreshTrigger] = useState(0);
  const [selectedUserProfileId, setSelectedUserProfileId] = useState(null);
  const [isAdminProfileOpen, setIsAdminProfileOpen] = useState(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [isLogoLightboxOpen, setIsLogoLightboxOpen] = useState(false);

  const handleTaskRefresh = () => setTasksRefreshTrigger(prev => prev + 1);

  // Auto-switch view if non-admin tries to view admin-only view
  React.useEffect(() => {
    if (!isAdmin && (activeView === 'dashboard' || activeView === 'logs' || activeView === 'team' || activeView === 'credentials')) {
      setActiveView('tasks');
    }
  }, [isAdmin, activeView]);

  if (isLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-main)', color: '#a5b4fc', fontSize: '14px', fontWeight: 600, gap: '12px'
      }}>
        <div style={{
          width: '28px', height: '28px', border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite'
        }} />
        <span>Initializing TeamTask Workspace...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthModal onOpenDevMailbox={() => setIsDevMailboxOpen(true)} />
        <ToastContainer />
      </>
    );
  }

  const handleOpenEditTask = (task) => {
    setEditingTask(task);
    setIsCreateTaskOpen(true);
  };

  const handleStartChatWithUser = (targetUser) => {
    setChatTargetUser(targetUser);
    setActiveView('chat');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navigation */}
      <Navbar
        activeView={activeView}
        onOpenDevMailbox={() => setIsDevMailboxOpen(true)}
        onOpenAdminProfile={() => setIsAdminProfileOpen(true)}
        isIdCardOpen={isIdCardOpen}
        onToggleIdCard={() => setIsIdCardOpen(prev => !prev)}
        onSetActiveView={setActiveView}
      />

      {/* Main Content (no sidebar) */}
      <main style={{
        flex: 1,
        padding: '24px 32px',
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%',
        overflowX: 'hidden'
      }}>
        {isAdmin && activeView === 'dashboard' && (
          <AdminDashboardView
            onNavigate={setActiveView}
            onOpenCreateTask={() => { setEditingTask(null); setIsCreateTaskOpen(true); }}
          />
        )}

        {activeView === 'tasks' && (
          <TasksBoardView
            onOpenCreateTask={() => { setEditingTask(null); setIsCreateTaskOpen(true); }}
            onOpenEditTask={handleOpenEditTask}
            onOpenSubmitWork={(task) => setSubmittingWorkTask(task)}
            onPreviewFile={(file) => setPreviewFile(file)}
            refreshTrigger={tasksRefreshTrigger}
          />
        )}

        {isAdmin && activeView === 'logs' && (
          <SpreadsheetLogsView
            onViewProfile={(member) => setSelectedUserProfileId(member.id)}
          />
        )}

        {isAdmin && activeView === 'team' && (
          <TeamMembersView
            onStartChat={handleStartChatWithUser}
            onOpenCreateTask={() => { setEditingTask(null); setIsCreateTaskOpen(true); }}
            onViewProfile={(member) => setSelectedUserProfileId(member.id)}
          />
        )}

        {isAdmin && activeView === 'credentials' && (
          <CredentialsView />
        )}

        {activeView === 'files' && (
          <FilesManagerView onPreviewFile={(file) => setPreviewFile(file)} />
        )}

        {activeView === 'chat' && (
          <ChatView
            initialContact={chatTargetUser}
            onPreviewFile={(file) => setPreviewFile(file)}
            onViewProfile={(contact) => setSelectedUserProfileId(contact.id)}
          />
        )}
      </main>

      {/* Global Responsive Website Footer */}
      <Footer onLogoClick={() => setIsLogoLightboxOpen(true)} />

      {/* Full-Size Interactive Logo Lightbox Modal */}
      <LogoLightboxModal
        isOpen={isLogoLightboxOpen}
        onClose={() => setIsLogoLightboxOpen(false)}
      />

      {/* Electronics Themed Welcome / Launch Screen */}
      {showLaunchScreen && (
        <LaunchScreen user={user} onComplete={dismissLaunchScreen} />
      )}

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => { setIsCreateTaskOpen(false); setEditingTask(null); }}
        initialTask={editingTask}
        onTaskCreated={handleTaskRefresh}
      />

      <SubmitWorkModal
        isOpen={!!submittingWorkTask}
        onClose={() => setSubmittingWorkTask(null)}
        task={submittingWorkTask}
        onWorkSubmitted={handleTaskRefresh}
      />

      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      {isAdmin && (
        <DevMailboxModal
          isOpen={isDevMailboxOpen}
          onClose={() => setIsDevMailboxOpen(false)}
        />
      )}

      <UserProfileModal
        isOpen={!!selectedUserProfileId}
        onClose={() => setSelectedUserProfileId(null)}
        userId={selectedUserProfileId}
        onStartChat={(member) => { setSelectedUserProfileId(null); handleStartChatWithUser(member); }}
        onAssignTask={(member) => { setSelectedUserProfileId(null); setEditingTask(null); setIsCreateTaskOpen(true); }}
      />

      {/* Account Details Modal (Photo-only edit + Password change via OTP) */}
      <AdminProfileModal
        isOpen={isAdminProfileOpen}
        onClose={() => setIsAdminProfileOpen(false)}
      />

      {isIdCardOpen && (
        <OonjalIdBadge
          user={user}
          onClose={() => setIsIdCardOpen(false)}
          onOpenProfile={() => setIsAdminProfileOpen(true)}
        />
      )}

      <ToastContainer />
      <SpeedInsights />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
      <SpeedInsights />
    </AuthProvider>
  );
}
