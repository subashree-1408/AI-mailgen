import React from 'react';
import { Sparkles } from 'lucide-react';

interface TopbarProps {
  currentTab: string;
  onNewEmailClick: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ currentTab, onNewEmailClick }) => {
  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return 'Overview';
      case 'create-email':
        return 'Create Email';
      case 'my-emails':
        return 'My Emails';
      case 'drafts':
        return 'Draft';
      case 'contacts':
        return 'Contacts';
      case 'settings':
        return 'Settings';
      default:
        return 'Overview';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight">{getPageTitle(currentTab)}</h1>
        <p className="text-xs text-slate-500 font-medium">
          Administrator Control Console &bull; MailPilot Engine
        </p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Quick New Email Action */}
        {currentTab !== 'create-email' && (
          <button
            onClick={onNewEmailClick}
            className="flex items-center space-x-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Create Email</span>
          </button>
        )}
      </div>
    </header>
  );
};
