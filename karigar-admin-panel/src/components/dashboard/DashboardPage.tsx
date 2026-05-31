import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Wrench, 
  CalendarCheck, 
  Cpu, 
  TrendingUp, 
  Smartphone, 
  Activity, 
  Award, 
  Percent,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { ServiceProvider, User, Booking, Dispute } from '../../types';

interface DashboardProps {
  providers: ServiceProvider[];
  users: User[];
  bookings: Booking[];
  disputes: Dispute[];
}

export default function DashboardPage({ providers, users, bookings, disputes }: DashboardProps) {
  const [topSortBy, setTopSortBy] = useState<'revenue' | 'rating' | 'bookings'>('revenue');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Let's compute statistics dynamically based on current lists!
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const totalProviders = providers.length;
    const totalBookingsCount = bookings.length;
    const activeBookings = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Dispute').length;
    const completedBookings = bookings.filter(b => b.status === 'Completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'Cancelled').length;

    // Mobile analytics
    const androidUsers = users.filter(u => u.deviceType === 'Android').length;
    const iosUsers = users.filter(u => u.deviceType === 'iOS').length;
    const activeThisMonth = users.filter(u => u.status === 'Active').length; // simple approximation

    // AI analytics from user logs
    const totalConversationsSum = users.reduce((acc, current) => acc + current.totalConversations, 0);
    const totalTokensConsumedSum = users.reduce((acc, current) => acc + current.totalTokensConsumed, 0);
    const averageTokensPerSession = totalConversationsSum > 0 
      ? Math.round(totalTokensConsumedSum / totalConversationsSum) 
      : 0;

    // Revenue analytics
    let totalRevenueSum = 0;
    let totalServiceFees = 0;
    let netRevenueSum = 0;
    bookings.forEach(b => {
      if (b.status === 'Completed' || b.status === 'Confirmed') {
        totalRevenueSum += b.amount;
        totalServiceFees += b.serviceCharges;
        netRevenueSum += b.platformCommission;
      }
    });

    const averageBookingValue = completedBookings > 0 
      ? Math.round(totalRevenueSum / (completedBookings + activeBookings)) 
      : 0;

    return {
      totalUsers,
      totalProviders,
      totalBookings: totalBookingsCount,
      activeBookings,
      completedBookings,
      cancelledBookings,
      androidUsers,
      iosUsers,
      activeThisMonth,
      totalConversationsSum,
      totalTokensConsumedSum,
      averageTokensPerSession,
      totalRevenueSum,
      totalServiceFees,
      netRevenueSum,
      averageBookingValue,
    };
  }, [providers, users, bookings]);

  // Dynamic distribution counts
  const categoryChartData = useMemo(() => {
    const counts: Record<string, number> = {
      'AC Repair': 0,
      'Plumbing': 0,
      'Electrical': 0,
      'Carpentry': 0,
      'Cleaning': 0,
      'Painting': 0,
      'Others': 0
    };

    bookings.forEach(b => {
      if (counts[b.serviceType] !== undefined) {
        counts[b.serviceType]++;
      } else {
        counts['Others']++;
      }
    });

    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    })).filter(item => item.value > 0);
  }, [bookings]);

  // Status Distribution data
  const statusChartData = useMemo(() => {
    const counts = { Confirmed: 0, Completed: 0, Cancelled: 0, Dispute: 0 };
    bookings.forEach(b => {
      if (counts[b.status] !== undefined) {
        counts[b.status]++;
      }
    });
    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key as keyof typeof counts]
    }));
  }, [bookings]);

  // Sort Top Providers
  const sortedTopProviders = useMemo(() => {
    return [...providers].sort((a, b) => {
      if (topSortBy === 'revenue') return b.revenueGenerated - a.revenueGenerated;
      if (topSortBy === 'rating') return b.rating - a.rating;
      return b.totalBookings - a.totalBookings;
    }).slice(0, 5);
  }, [providers, topSortBy]);

  // Chart timeframes static datasets with custom adjustments slightly influenced by timeframe scale
  const trendData = useMemo(() => {
    if (timeframe === 'daily') {
      return [
        { label: 'Mon', bookings: 4, revenue: 1600 },
        { label: 'Tue', bookings: 6, revenue: 2400 },
        { label: 'Wed', bookings: 8, revenue: 4200 },
        { label: 'Thu', bookings: 5, revenue: 1900 },
        { label: 'Fri', bookings: 9, revenue: 5300 },
        { label: 'Sat', bookings: 12, revenue: 6800 },
        { label: 'Sun', bookings: 11, revenue: 5900 }
      ];
    } else if (timeframe === 'weekly') {
      return [
        { label: 'Wk 17', bookings: 25, revenue: 11200 },
        { label: 'Wk 18', bookings: 32, revenue: 14500 },
        { label: 'Wk 19', bookings: 28, revenue: 12900 },
        { label: 'Wk 20', bookings: 41, revenue: 18900 },
        { label: 'Wk 21', bookings: 44, revenue: 19800 },
        { label: 'Wk 22', bookings: 52, revenue: 24700 }
      ];
    } else {
      return [
        { label: 'Jan', bookings: 110, revenue: 48000 },
        { label: 'Feb', bookings: 135, revenue: 58500 },
        { label: 'Mar', bookings: 160, revenue: 72000 },
        { label: 'Apr', bookings: 190, revenue: 89000 },
        { label: 'May', bookings: 240, revenue: 114000 }
      ];
    }
  }, [timeframe]);

  // Colors for Category and Status distributions
  const COLORS = ['#0D7377', '#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#64748B'];
  const STATUS_COLORS = {
    Confirmed: '#3B82F6',
    Completed: '#10B981',
    Cancelled: '#EF4444',
    Dispute: '#F59E0B'
  };

  return (
    <div className="space-y-6">
      {/* Platform Metrics Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 font-sans">Platform Operations Dashboard</h1>
          <p className="text-sm text-slate-500">Real-time smart match execution and marketplace performance indexes.</p>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(['daily', 'weekly', 'monthly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md uppercase transition-all ${
                timeframe === t
                  ? 'bg-white text-[#0D7377] shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Row 1: KPI Stats Cards */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Platform Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Users</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center text-[#0D7377]">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats.totalUsers}</span>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight size={12} /> +12%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Platform registered client accounts</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D7377] scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* Total Providers */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Service Providers</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Wrench size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats.totalProviders}</span>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight size={12} /> +8.4%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Vetted freelance Karigars onboarded</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D7377] scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* Total Bookings */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Bookings</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <CalendarCheck size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{stats.totalBookings}</span>
            <span className="text-xs text-[#0D7377] font-semibold">
              {stats.activeBookings} active
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Completed: {stats.completedBookings} | Cancel: {stats.cancelledBookings}</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D7377] scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm relative overflow-hidden group">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Platform Net Earnings</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">Rs{stats.netRevenueSum}</span>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight size={12} /> +20.1%
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">From total gross volume: Rs{stats.totalRevenueSum}</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D7377] scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>
      </div>

      {/* Mobile Platform & AI Usage Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mobile Platform & Users */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Smartphone size={16} className="text-[#0D7377]" /> Mobile Platform Analytics
            </h3>
            <span className="text-[10px] font-bold text-[#0D7377] bg-teal-50 px-2 py-0.5 rounded-full uppercase">Android vs iOS</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Android Users</p>
              <h4 className="text-xl font-black text-slate-800 mt-1">{stats.androidUsers}</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">FCM Enabled</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Apple iOS Users</p>
              <h4 className="text-xl font-black text-slate-800 mt-1">{stats.iosUsers}</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">APNS Push Registered</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Monthly Active</p>
              <h4 className="text-xl font-black text-emerald-600 mt-1">{stats.activeThisMonth}</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">In previous 30d</p>
            </div>
          </div>
        </div>

        {/* AI Usage Analytics */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Cpu size={16} className="text-indigo-600" /> AI Agent Dispatch Metrics
            </h3>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">LLM Engine</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-indigo-50/30 p-3 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Conversations</p>
              <h4 className="text-xl font-black text-indigo-700 mt-1">{stats.totalConversationsSum}</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Matched Chat Sessions</p>
            </div>
            <div className="bg-indigo-50/30 p-3 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tokens Consumed</p>
              <h4 className="text-sm font-black text-indigo-700 mt-2 truncate">{(stats.totalTokensConsumedSum / 1000).toFixed(1)}k</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Gemini + Groq</p>
            </div>
            <div className="bg-indigo-50/30 p-3 rounded-lg text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Avg Tokens/Chat</p>
              <h4 className="text-xl font-black text-indigo-700 mt-1">{stats.averageTokensPerSession}</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Per orchestrator match</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Row 2: Charts Area */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Visual Trend Visualizations</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Booking & Revenue Trend Chart */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Booking & Revenue Trend</h3>
              <p className="text-[11px] text-slate-500">Comparing booking match counts to platform billing volume.</p>
            </div>
            <span className="text-xs font-bold text-[#0D7377] bg-[#0d7377]/5 px-2.5 py-1 rounded-md">
              {timeframe === 'daily' ? 'Current Week' : timeframe === 'weekly' ? 'Last 6 Weeks' : 'Last 5 Months'}
            </span>
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D7377" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0D7377" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis yAxisId="left" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#0D7377" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #E2E8F0' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area yAxisId="left" type="monotone" dataKey="bookings" name="Bookings Completed" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorBookings)" />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Total Revenue (Rs)" stroke="#0D7377" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Service Categories Distribution</h3>
          <p className="text-[11px] text-slate-500 mb-4">Total booking allocation share by skill tier.</p>
          <div className="h-56 relative flex items-center justify-center">
            {categoryChartData.length === 0 ? (
              <span className="text-slate-400 text-xs">No booking records found yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} bookings`, 'Volume']} contentStyle={{ fontSize: '10px', borderRadius: '6px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute text-center select-none" style={{ top: '42%' }}>
              <span className="block text-2xl font-black text-slate-800">{stats.totalBookings}</span>
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Total Bookings</span>
            </div>
          </div>
          {/* Legend Lists */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-[10px] font-medium text-slate-600">
            {categoryChartData.slice(0, 4).map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="truncate">{entry.name} ({entry.value})</span>
              </div>
            ))}
            {categoryChartData.length > 4 && (
              <div className="col-span-2 text-center text-slate-400 text-[10px] mt-1 font-bold">
                + {categoryChartData.length - 4} more active category skills
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Booking Status Distribution Donut */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Booking Status Breakdown</h3>
          <p className="text-[11px] text-slate-500 mb-4">Tracking active lifecycle and cancellation metrics.</p>
          <div className="h-44 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusChartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || '#CBD5E1'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {statusChartData.map((entry) => (
              <div key={entry.name} className="bg-slate-50 p-2 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] }}></span>
                  <span className="text-[11px] font-bold text-slate-600">{entry.name}</span>
                </div>
                <span className="text-xs font-extrabold text-slate-950">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Service Providers Widget */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Leaderboard: Top Service Providers</h3>
              <p className="text-[11px] text-slate-500">Providers sorted by key marketplace contributions.</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
              {(['revenue', 'rating', 'bookings'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setTopSortBy(s)}
                  className={`px-2 py-1 text-[10px] font-bold rounded uppercase transition-all ${
                    topSortBy === s
                      ? 'bg-white text-[#0D7377] shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Provider</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2 text-center">Rating</th>
                  <th className="pb-2 text-center">Bookings</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Comp. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTopProviders.map((provider, idx) => (
                  <tr key={provider.id} className="text-xs hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}</span>
                      <div className="w-7 h-7 rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                        <img src={provider.profilePicture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{provider.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">#{provider.id}</p>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <span className="bg-slate-100 text-slate-800 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                        {provider.category}
                      </span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="font-bold text-slate-800 flex items-center justify-center gap-0.5">
                        ⭐ {provider.rating}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-bold text-slate-700">{provider.totalBookings}</td>
                    <td className="py-2.5 text-right font-black text-[#0D7377]">Rs{provider.revenueGenerated}</td>
                    <td className="py-2.5 text-right font-bold text-emerald-600">{provider.completionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
