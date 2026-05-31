/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  loadData, 
  saveData, 
  INITIAL_PROVIDERS, 
  INITIAL_USERS, 
  INITIAL_BOOKINGS, 
  INITIAL_DISPUTES, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_AI_SUMMARY 
} from './data';
import { SessionUser, ServiceProvider, User, Booking, Dispute, NotificationHistoryItem, AIAnalyticsSummary } from './types';

// Import Modular Components
import LoginPage from './components/auth/LoginPage';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './components/dashboard/DashboardPage';
import ProviderManagement from './components/providers/ProviderManagement';
import UserManagement from './components/users/UserManagement';
import BookingManagement from './components/bookings/BookingManagement';
import AIAnalyticsPage from './components/ai-analytics/AIAnalyticsPage';
import RevenuePage from './components/revenue/RevenuePage';
import DisputeManagement from './components/disputes/DisputeManagement';
import NotificationManager from './components/notifications/NotificationManager';
import SettingsPage from './components/settings/SettingsPage';

export default function App() {
  // Authentication states
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Persistence States
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [aiSummary, setAiSummary] = useState<AIAnalyticsSummary>(INITIAL_AI_SUMMARY);

  // Layout Configurations
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 1. Authenticate check on mount
  useEffect(() => {
    const jwt = localStorage.getItem('karigar_admin_jwt');
    const remember = localStorage.getItem('karigar_admin_remember') === 'true';
    
    // Seed initial session if remembered, or simulation default
    if (jwt && remember) {
      setSessionUser({
        id: "ADM-001",
        name: "Koderspace Team",
        email: "admin@karigar.ai",
        role: "Super Admin",
        avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
      });
    }
    setAuthChecked(true);

    // 2. Load lists from localStorage or seed
    setProviders(loadData('karigar_providers', INITIAL_PROVIDERS));
    setUsers(loadData('karigar_users', INITIAL_USERS));
    setBookings(loadData('karigar_bookings', INITIAL_BOOKINGS));
    setDisputes(loadData('karigar_disputes', INITIAL_DISPUTES));
    setNotifications(loadData('karigar_notifications', INITIAL_NOTIFICATIONS));
  }, []);

  // Sync state mutators and write back to LocalStorage
  const handleUpdateProviders = (updated: ServiceProvider[]) => {
    setProviders(updated);
    saveData('karigar_providers', updated);
  };

  const handleUpdateUsers = (updated: User[]) => {
    setUsers(updated);
    saveData('karigar_users', updated);
  };

  const handleUpdateBookings = (updated: Booking[]) => {
    setBookings(updated);
    saveData('karigar_bookings', updated);
  };

  const handleUpdateDisputes = (updated: Dispute[]) => {
    setDisputes(updated);
    saveData('karigar_disputes', updated);
  };

  const handleUpdateNotifications = (updated: NotificationHistoryItem[]) => {
    setNotifications(updated);
    saveData('karigar_notifications', updated);
  };

  const handleUpdateSessionUser = (user: SessionUser) => {
    setSessionUser(user);
  };

  // Authentication controllers
  const handleLoginSuccess = (user: SessionUser) => {
    setSessionUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('karigar_admin_jwt');
    localStorage.removeItem('karigar_admin_remember');
    setSessionUser(null);
  };

  // If initial auth is not verified, show empty skeleton or skip
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-sm tracking-widest text-[#0D7377] uppercase font-mono animate-pulse">Initializing System Access...</p>
      </div>
    );
  }

  // Logged-out state: show the login page
  if (!sessionUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Logged-in Core App Structure
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex font-sans antialiased text-slate-900">
      {/* Collapsible Corporate Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        onLogout={handleLogout} 
        sessionUser={sessionUser}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <main 
        id="main-content-layout"
        className={`flex-1 transition-all duration-300 p-6 min-h-screen ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Active Navigation Tab Router */}
          {currentTab === 'dashboard' && (
            <DashboardPage 
              providers={providers} 
              users={users} 
              bookings={bookings} 
              disputes={disputes} 
            />
          )}

          {currentTab === 'users' && (
            <UserManagement 
              users={users} 
              onUpdateUsers={handleUpdateUsers} 
              bookings={bookings} 
            />
          )}

          {currentTab === 'providers' && (
            <ProviderManagement 
              providers={providers} 
              onUpdateProviders={handleUpdateProviders} 
              bookings={bookings} 
            />
          )}

          {currentTab === 'bookings' && (
            <BookingManagement 
              bookings={bookings} 
              onUpdateBookings={handleUpdateBookings} 
              disputes={disputes} 
              onUpdateDisputes={handleUpdateDisputes}
              providers={providers}
            />
          )}

          {currentTab === 'ai_analytics' && (
            <AIAnalyticsPage 
              analyticsSummary={aiSummary} 
            />
          )}

          {currentTab === 'revenue' && (
            <RevenuePage 
              bookings={bookings} 
            />
          )}

          {currentTab === 'disputes' && (
            <DisputeManagement 
              disputes={disputes} 
              onUpdateDisputes={handleUpdateDisputes} 
            />
          )}

          {currentTab === 'notifications' && (
            <NotificationManager 
              notifications={notifications} 
              onUpdateNotifications={handleUpdateNotifications} 
            />
          )}

          {currentTab === 'settings' && (
            <SettingsPage 
              sessionUser={sessionUser} 
              onUpdateSessionUser={handleUpdateSessionUser} 
            />
          )}
        </div>
      </main>
    </div>
  );
}
