import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Smartphone, 
  Ban, 
  CheckCircle, 
  X, 
  Mail, 
  MapPin, 
  Calendar, 
  Cpu, 
  TrendingUp, 
  MessageSquare,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  UserCheck,
  Users
} from 'lucide-react';
import { User, Booking } from '../../types';

interface UserManagementProps {
  users: User[];
  onUpdateUsers: (updated: User[]) => void;
  bookings: Booking[];
}

export default function UserManagement({ users, onUpdateUsers, bookings }: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Selected User Object
  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Bookings linked to selected user
  const userBookings = useMemo(() => {
    if (!selectedUserId) return [];
    return bookings.filter(b => b.customerId === selectedUserId);
  }, [selectedUserId, bookings]);

  // Suspend / Reactivate Action Handlers
  const handleToggleStatus = (id: string, currentStatus: 'Active' | 'Suspended') => {
    const nextStatus = (currentStatus === 'Active' ? 'Suspended' : 'Active') as 'Active' | 'Suspended';
    const msg = `Are you sure you want to ${nextStatus === 'Suspended' ? 'suspend' : 'reactivate'} this user?`;
    
    if (confirm(msg)) {
      const updated = users.map(u => {
        if (u.id === id) {
          return { ...u, status: nextStatus };
        }
        return u;
      });
      onUpdateUsers(updated);
    }
  };

  // Filter Logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPlatform = selectedPlatform === 'All' || u.deviceType === selectedPlatform;
      const matchesStatus = selectedStatus === 'All' || u.status === selectedStatus;

      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [users, searchTerm, selectedPlatform, selectedStatus]);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 leading-none">User Accounts Registry</h1>
        <p className="text-xs text-slate-500 mt-1">Manage mobile platform clients, view AI tokens telemetry, and control access permissions.</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left: User Search Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                id="user-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377] transition-all"
                placeholder="Search clients by Name, Email address, or ID..."
              />
            </div>

            {/* Quick Filters */}
            <div className="flex gap-4 text-xs font-semibold select-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Platform:</span>
                {(['All', 'Android', 'iOS'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPlatform(p)}
                    className={`px-3 py-1 bg-slate-55 border rounded-lg transition-all ${
                      selectedPlatform === p
                        ? 'border-[#0D7377] bg-[#0d7377]/5 text-[#0D7377]'
                        : 'border-slate-150 text-slate-550 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[10px] uppercase font-bold text-slate-400">Status:</span>
                {(['All', 'Active', 'Suspended'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(s)}
                    className={`px-3 py-1 bg-slate-55 border rounded-lg transition-all ${
                      selectedStatus === s
                        ? 'border-[#0D7377] bg-[#0d7377]/5 text-[#0D7377]'
                        : 'border-slate-150 text-slate-550 hover:bg-slate-50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/55">
                    <th className="p-4">User ID</th>
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4 text-center">Mobile OS</th>
                    <th className="p-4 text-center">Bookings</th>
                    <th className="p-4 text-right">Spend Vol</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs font-semibold">
                        No clients meet the configured query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr 
                        key={u.id} 
                        id={`user-row-${u.id}`}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`text-xs cursor-pointer group hover:bg-slate-50/80 transition-colors ${
                          selectedUserId === u.id ? 'bg-[#0d7377]/5 hover:bg-[#0d7377]/5 border-l-2 border-l-[#0D7377]' : ''
                        }`}
                      >
                        <td className="p-4 font-bold text-slate-400">{u.id}</td>
                        <td className="p-4 font-bold text-slate-900 group-hover:text-[#0D7377] transition-colors">{u.name}</td>
                        <td className="p-4 text-slate-500 font-medium">{u.email}</td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700">
                            <Smartphone size={12} className="text-slate-400" /> {u.deviceType}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-500">{u.totalBookings}</td>
                        <td className="p-4 text-right font-black text-slate-800">Rs{u.totalSpend}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-extrabold rounded-full border ${
                            u.status === 'Active' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end">
                            {u.status === 'Active' ? (
                              <button
                                onClick={() => handleToggleStatus(u.id, u.status)}
                                className="p-1 px-2.5 text-[10px] font-bold border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <Ban size={10} /> Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(u.id, u.status)}
                                className="p-1 px-2.5 text-[10px] font-bold border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1 transition-colors"
                              >
                                <UserCheck size={10} /> Activate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Panel: Detail Profiling */}
        <div id="user-aux-panel">
          {selectedUser ? (
            <div id="user-detail-card" className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-5 animate-fade-in text-xs">
              {/* Header profile info */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-slate-900 leading-none">{selectedUser.name}</h2>
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                      selectedUser.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} title={selectedUser.status}></span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">CLIENT ID: {selectedUser.id}</p>
                </div>
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded bg-slate-50 border border-slate-100"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Suspended user callout warning if applicable */}
              {selectedUser.status === 'Suspended' && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-semibold flex gap-2 items-start">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Access Privileges Suspended</p>
                    <p className="text-[10.5px] text-rose-600 mt-0.5">This user is flagged. All conversational matching is disabled.</p>
                  </div>
                </div>
              )}

              {/* Status Action Switcher */}
              <button
                onClick={() => handleToggleStatus(selectedUser.id, selectedUser.status)}
                className={`w-full py-2 flex items-center justify-center gap-2 font-bold rounded-lg transition-all ${
                  selectedUser.status === 'Active'
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-250'
                }`}
              >
                {selectedUser.status === 'Active' ? (
                  <>
                    <Ban size={12} /> Flag & Suspend Account
                  </>
                ) : (
                  <>
                    <CheckCircle size={12} /> Reactivate Access Privileges
                  </>
                )}
              </button>

              {/* Basic and Core Contact Coordinates */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Client Profiling</h3>
                <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-slate-650">
                  <div className="flex items-center gap-2.5">
                    <Mail size={12} className="text-slate-400" />
                    <span className="font-medium truncate">{selectedUser.email}</span>
                  </div>
                  {selectedUser.googleId && (
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={12} className="text-[#0D7377]" />
                      <span className="font-medium">Oauth Google ID: {selectedUser.googleId.slice(7)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Smartphone size={12} className="text-slate-400" />
                    <span className="font-medium">Device: {selectedUser.deviceType} | {selectedUser.deviceToken.split('_')[0]}..</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar size={12} className="text-slate-400" />
                    <span className="font-medium">Joined: {selectedUser.registrationDate}</span>
                  </div>
                </div>
              </div>

              {/* Location telemetry coords */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Geolocation Logs</h3>
                <div className="bg-slate-50 p-3 rounded-lg flex items-start gap-2.5">
                  <MapPin size={12} className="text-rose-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-800">{selectedUser.lastLocation.name}</span>
                    <p className="text-[10px] text-slate-450 font-semibold mt-0.5 font-mono">Lat: {selectedUser.lastLocation.latitude}, Lng: {selectedUser.lastLocation.longitude}</p>
                  </div>
                </div>
              </div>

              {/* Operational Marketplace Metrics */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Operational Metrics</h3>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-[#0d7377]/5 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Spend Volume</p>
                    <h4 className="text-base font-black text-[#0D7377] mt-0.5">Rs{selectedUser.totalSpend}</h4>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Match Bookings</p>
                    <h4 className="text-base font-bold text-slate-800 mt-0.5">{selectedUser.totalBookings}</h4>
                  </div>
                </div>
              </div>

              {/* AI Token diagnostics info */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                  <Cpu size={12} className="text-indigo-600" /> Smart Orchestrator Logs
                </h3>
                <div className="bg-indigo-50/20 border border-indigo-100 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-550 flex items-center gap-1"><MessageSquare size={11} className="text-indigo-500" /> Match Conversations:</span>
                    <span className="text-indigo-900 font-bold">{selectedUser.totalConversations} sessions</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-550 flex items-center gap-1"><TrendingUp size={11} className="text-indigo-500" /> Tokens Dispatched:</span>
                    <span className="text-indigo-900 font-black">{(selectedUser.totalTokensConsumed).toLocaleString()} JWT tokens</span>
                  </div>
                </div>
              </div>

              {/* Connected historic booking ledger */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Booking History Ledger</h3>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                  {userBookings.length === 0 ? (
                    <p className="text-slate-400 text-xs py-2 italic">No transactions generated yet.</p>
                  ) : (
                    userBookings.map((b) => (
                      <div key={b.id} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800 truncate w-32">{b.serviceType} / {b.providerName}</p>
                          <p className="text-[9px] text-slate-450 font-semibold">{b.bookingDate} • {b.timeSlot}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-[#0D7377]" style={{ fontSize: '11px' }}>Rs{b.amount}</p>
                          <span className={`inline-block text-[8px] font-extrabold percent-span px-1.5 rounded-full ${
                            b.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                            b.status === 'Confirmed' ? 'bg-blue-50 text-blue-600' :
                            b.status === 'Cancelled' ? 'bg-rose-50 text-rose-550' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {b.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-semibold h-96 flex flex-col items-center justify-center">
              <Users size={32} className="text-slate-300 mb-2.5" />
              Select a customer from the directory to review audit coordinates, geolocations, and telemetry chat statistics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
