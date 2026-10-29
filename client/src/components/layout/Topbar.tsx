import React from 'react';
import { Sparkles, Menu } from 'lucide-react';

interface TopbarProps {
  currentTab: string;
  onNewEmailClick: () => void;
  onMenuToggle?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ currentTab, onNewEmailClick, onMenuToggle }) => {
  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview';
      case 'create-email':
        return 'Create Email';
      case 'my-emails':
        return 'My Emails';
      case 'drafts':
        return 'Drafts';
      case 'contacts':
        return 'Contacts';
      case 'settings':
        return 'Settings';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 select-none">
      <div className="flex items-center space-x-3 min-w-0">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="truncate">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
            {getPageTitle(currentTab)}
          </h1>
          <p className="hidden sm:block text-xs text-slate-500 font-medium truncate">
            Administrator Control Console &bull; MailPilot Engine
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
        {/* Quick New Email Action */}
        {currentTab !== 'create-email' && (
          <button
            onClick={onNewEmailClick}
            className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-3.5 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Create Email</span>
            <span className="xs:hidden">New</span>
          </button>
        )}
      </div>
    </header>
  );
};
