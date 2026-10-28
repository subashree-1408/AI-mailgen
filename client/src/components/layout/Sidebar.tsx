import React from 'react';
import {
  Sparkles,
  Inbox,
  FileEdit,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Send,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
}) => {
  const { user, logout } = useAuth();

  // Exactly the 6 requested administrator modules
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'create-email', label: 'Create Email', icon: Sparkles, isPrimary: true },
    { id: 'my-emails', label: 'My Emails', icon: Inbox },
    { id: 'drafts', label: 'Draft', icon: FileEdit },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-20 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-100 flex-shrink-0">
            <Send className="w-5 h-5 -rotate-12" />
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <span className="font-bold text-slate-900 tracking-tight text-lg">MailPilot</span>
              <span className="text-xs font-semibold text-indigo-600 ml-1.5 uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded">
                Admin
              </span>
              <p className="text-[11px] text-slate-400 font-medium truncate">Administrator Console</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          if (item.isPrimary) {
            return (
              <div key={item.id} className="py-1">
                <button
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center rounded-xl transition-all font-medium group ${
                    collapsed
                      ? 'p-2.5 justify-center'
                      : 'px-3.5 py-2.5 space-x-3'
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 ring-2 ring-indigo-500/20'
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100/80 border border-indigo-200/60'
                  }`}
                  title="Create Email (Primary action)"
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      isActive ? 'text-white' : 'text-indigo-600'
                    }`}
                  />
                  {!collapsed && (
                    <span className="font-semibold text-sm tracking-tight flex-1 text-left">
                      {item.label}
                    </span>
                  )}
                  {!collapsed && !isActive && (
                    <span className="text-[10px] font-bold bg-white text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                      AI
                    </span>
                  )}
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center rounded-lg transition-colors text-sm font-medium ${
                collapsed ? 'p-2.5 justify-center' : 'px-3 py-2 space-x-3'
              } ${
                isActive
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Admin User Card Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            {!collapsed && (
              <div className="truncate text-left leading-tight">
                <div className="flex items-center space-x-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
                  <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-800 px-1 rounded uppercase tracking-wider">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign out of Admin Console"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
