import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Wrench, 
  CalendarCheck, 
  Cpu, 
  TrendingUp, 
  AlertTriangle, 
  LogOut, 
  Menu, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { SessionUser } from '../../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onLogout: () => void;
  sessionUser: SessionUser;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  onLogout,
  sessionUser,
  collapsed,
  setCollapsed
}: SidebarProps) {
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'providers', label: 'Service Providers', icon: Wrench },
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck },
    { id: 'ai_analytics', label: 'AI Analytics', icon: Cpu },
    { id: 'revenue', label: 'Revenue & Finance', icon: TrendingUp },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle, badgeKey: 'disputesCount' }
  ];

  // For visual badges, let's say we have active disputes
  // In a actual app we would fetch count from state
  const disputesCount = 1;

  return (
    <aside 
      id="admin-sidebar"
      className={`fixed top-0 left-0 z-40 h-screen bg-[#0F172A] text-white flex flex-col justify-between border-r border-slate-800 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div id="sidebar-header" className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="/logo.png"
              alt="Karigar.ai"
              className="w-9 h-9 rounded-lg object-contain shrink-0 animate-karigar-breathe"
            />
            {!collapsed && (
              <div className="flex flex-col select-none">
                <span className="text-lg font-bold tracking-tight text-white font-sans leading-none">Karigar AI</span>
                <span className="text-[9px] text-[#0D7377] font-bold tracking-widest uppercase mt-0.5">Control Center</span>
              </div>
            )}
          </div>
          <button 
            id="toggle-sidebar-btn"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors duration-200"
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Nav Items */}
        <nav id="sidebar-nav" className="mt-4 px-2 space-y-1">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentTab === item.id;
            const hasBadge = item.badgeKey === 'disputesCount' && disputesCount > 0;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-item-${item.id}`}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-[#0D7377] text-white shadow-md shadow-[#0D7377]/20 font-semibold' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent 
                    size={18} 
                    className={`shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors duration-200'}`} 
                  />
                  {!collapsed && (
                    <span className="font-sans font-medium text-sm truncate animate-fade-in">
                      {item.label}
                    </span>
                  )}
                </div>

                {hasBadge && !collapsed && (
                  <span id="dispute-badge" className="bg-[#EF4444] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {disputesCount}
                  </span>
                )}

                {/* Micro tooltip when collapsed */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[11px] font-semibold rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-md">
                    {item.label} {hasBadge ? `(${disputesCount})` : ''}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Info & Footer */}
      <div id="sidebar-footer">
        {/* User Card */}
        <div className={`p-2 border-t border-slate-800`}>
          <div id="user-profile-card" className={`flex items-center gap-3 p-2 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 transition-colors duration-200 ${collapsed ? 'justify-center' : ''}`}>
            <div className={`w-8 h-8 rounded-full border border-[#0D7377] overflow-hidden shrink-0 bg-white`}>
              <img
                src="/logo.png"
                alt={sessionUser.name}
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 select-none">
                <p className="text-xs font-semibold text-white truncate leading-tight">{sessionUser.name}</p>
                <p className="text-[10px] font-bold text-[#0D7377] uppercase tracking-wider mt-0.5">{sessionUser.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-2 border-t border-slate-800">
          <button
            id="logout-btn"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
          >
            <LogOut size={20} className="shrink-0" />
            {!collapsed && <span className="font-sans font-medium text-sm truncate">Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
