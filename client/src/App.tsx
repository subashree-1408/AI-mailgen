import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { Topbar } from './components/layout/Topbar.js';
import { Dashboard } from './pages/Dashboard.js';
import { CreateEmail } from './pages/CreateEmail.js';
import { MyEmails } from './pages/MyEmails.js';
import { Drafts } from './pages/Drafts.js';
import { Contacts } from './pages/Contacts.js';
import { Settings } from './pages/Settings.js';
import { AuthPage } from './pages/AuthPage.js';
import { Lock, LogOut } from 'lucide-react';

function MainApp() {
  const { user, loading, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(undefined);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 tracking-wide uppercase">Initializing Admin Console...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Strict Admin authorization guard
  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Administrator Access Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            This website is restricted and can be handled by authorized administrators only. Your current account does not have administrator privileges.
          </p>
          <div className="pt-2">
            <button
              onClick={logout}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center space-x-2 mx-auto"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out & Switch to Admin Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleNavigate = (tab: string, draftId?: string) => {
    setActiveDraftId(draftId);
    setCurrentTab(tab);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'create-email':
        return (
          <CreateEmail
            initialDraftId={activeDraftId}
            onTabChange={(tab) => handleNavigate(tab)}
          />
        );
      case 'my-emails':
        return (
          <MyEmails
            onOpenEmail={(id) => handleNavigate('create-email', id)}
            onNewEmail={() => handleNavigate('create-email')}
          />
        );
      case 'drafts':
        return (
          <Drafts
            onOpenDraft={(id) => handleNavigate('create-email', id)}
            onNewEmail={() => handleNavigate('create-email')}
          />
        );
      case 'contacts':
        return <Contacts />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Collapsible Admin Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setActiveDraftId(undefined);
          setCurrentTab(tab);
        }}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          currentTab={currentTab}
          onNewEmailClick={() => handleNavigate('create-email')}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
