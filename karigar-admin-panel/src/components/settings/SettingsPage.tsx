import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Users, 
  Server, 
  Clock, 
  Lock, 
  Sliders, 
  Eye, 
  HelpCircle,
  BellRing
} from 'lucide-react';
import { SessionUser, UserRole } from '../../types';

interface SettingsProps {
  sessionUser: SessionUser;
  onUpdateSessionUser: (user: SessionUser) => void;
}

export default function SettingsPage({ sessionUser, onUpdateSessionUser }: SettingsProps) {
  // Config States
  const [sessionTimeout, setSessionTimeout] = useState<number>(30); // in minutes
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [matchConfidenceThreshold, setMatchConfidenceThreshold] = useState<number>(75);
  const [platformCommissionBase, setPlatformCommissionBase] = useState<number>(20);
  
  // Custom Profile updates
  const [adminName, setAdminName] = useState(sessionUser.name);
  const [adminEmail, setAdminEmail] = useState(sessionUser.email);
  const [adminPassword, setAdminPassword] = useState('••••••••');
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Admin users lists
  const [adminsList, setAdminsList] = useState<any[]>([
    { id: "ADM-001", name: sessionUser.name, email: sessionUser.email, role: sessionUser.role, status: "Active" },
    { id: "ADM-002", name: "Sana Kulsoom", email: "sana.k@karigar.ai", role: "Operations Admin", status: "Active" },
    { id: "ADM-003", name: "Daniyal Malik", email: "daniyal.m@karigar.ai", role: "Support Agent", status: "Active" },
    { id: "ADM-004", name: "Rohan Sheikh", email: "rohan.s@karigar.ai", role: "Finance Admin", status: "Active" }
  ]);

  const handleUpdateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSessionUser({
      ...sessionUser,
      name: adminName,
      email: adminEmail
    });
    alert("Corporate administrator details have been saved successfully.");
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Error: Passwords do not match.");
      return;
    }
    alert("Security update success: Administrator login password updated.");
    setNewPassword('');
    setConfirmPassword('');
    setPasswordFormOpen(false);
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 leading-none">System Settings & Configurations</h1>
        <p className="text-xs text-slate-500 mt-1">Constitute platform-wide parameters, manage operations users, and regulate security parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Side: System Configurations */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sliders size={14} className="text-[#0D7377]" /> Core System Configuration
            </h3>

            {/* Config Fields */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-800 text-xs shadow-none">Platform Target Maintenance Mode</p>
                  <p className="text-[10px] text-slate-400 font-medium">Bypasses client schedules and displays standard maintenance.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`w-12 h-6 rounded-full p-1 transition-all relative shrink-0 ${
                    maintenanceMode ? 'bg-amber-500' : 'bg-slate-200'
                  }`}
                >
                  <span className={`block w-4 h-4 bg-white rounded-full transition-transform ${
                    maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                  }`}></span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-655 uppercase mb-1 flex justify-between">
                  <span>Match Confidence Threshold Coefficient</span>
                  <span className="text-[#0D7377] font-extrabold">{matchConfidenceThreshold}% matching</span>
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={matchConfidenceThreshold}
                    onChange={(e) => setMatchConfidenceThreshold(Number(e.target.value))}
                    className="flex-grow accent-[#0D7377] cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-slate-450 uppercase shrink-0">Min confidence</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-655 uppercase mb-1">Base Platform Commission (%)</label>
                  <input
                    type="number"
                    value={platformCommissionBase}
                    onChange={(e) => setPlatformCommissionBase(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#0D7377] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-655 uppercase mb-1">Inactive Token Timeout (Min)</label>
                  <input
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(Number(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg p-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#0D7377] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Admin profiling updates */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldCheck size={14} className="text-[#0D7377]" /> Administrator Access Credentials
            </h3>

            <form onSubmit={handleUpdateProfileSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Display Username</label>
                  <input
                    required
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-600 uppercase mb-1">Corporate Email Address</label>
                  <input
                    required
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#0D7377] hover:bg-[#0a5c5f] text-white font-bold rounded-lg transition-colors"
              >
                Save Profile Parameters
              </button>
            </form>

            {/* Change Password Panel */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              {!passwordFormOpen ? (
                <button
                  type="button"
                  onClick={() => setPasswordFormOpen(true)}
                  className="text-xs font-bold text-[#0D7377] hover:underline"
                >
                  Configure New Admin Password ?
                </button>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-150 animate-fade-in">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">New Pass Code</label>
                      <input
                        required
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-1.5 focus:ring-1 bg-white focus:ring-[#0D7377] focus:outline-none"
                        placeholder="Min 6 chars"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">Confirm Secret</label>
                      <input
                        required
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg p-1.5 focus:ring-1 bg-white focus:ring-[#0D7377] focus:outline-none"
                        placeholder="Re-type"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-grow py-1.5 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-black"
                    >
                      Verify Change Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setPasswordFormOpen(false)}
                      className="px-3 py-1.5 border border-slate-250 text-slate-600 hover:bg-slate-100 font-bold rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Admin List & Permissions (1 Column wide) */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Users size={14} className="text-[#0D7377]" /> Active Operations Team
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              {adminsList.map(adm => {
                const isCurrent = adm.email === sessionUser.email;

                return (
                  <div key={adm.id} className="py-3 flex justify-between items-center font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 font-bold border border-slate-100 text-[#0D7377] flex items-center justify-center select-none text-xs">
                        {adm.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-slate-900 font-bold flex items-center gap-1.5">
                          {adm.name}
                          {isCurrent && (
                            <span className="bg-teal-50 text-[#0D7377] text-[8px] font-black tracking-wider uppercase px-1.5 py-0.2 rounded border border-[#0d7377]/10">You</span>
                          )}
                        </p>
                        <p className="text-[10px] text-slate-450 font-semibold">{adm.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                        {adm.role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Security alerts / instructions */}
          <div className="bg-indigo-50/15 border border-indigo-100 p-4 rounded-xl space-y-2.5">
            <h4 className="font-extrabold text-[#0D7377] flex items-center gap-1">
              <ShieldCheck size={14} className="text-[#0D7377] shrink-0" /> Security Audit Compliance
            </h4>
            <p className="text-slate-600 leading-relaxed font-medium">
              This terminal enforces standard ISO network audits. All administrator transactions—including partner suspensions, dispute refund settlements, and push dispatches—log the active caller corporate credentials automatically to ensure full accountability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
