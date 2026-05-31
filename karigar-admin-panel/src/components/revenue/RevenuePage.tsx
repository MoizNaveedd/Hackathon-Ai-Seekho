import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Coins, 
  DollarSign, 
  Wrench, 
  ArrowUpRight, 
  FileSpreadsheet, 
  Download, 
  CheckCircle, 
  Clock, 
  Users 
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { Booking } from '../../types';

interface RevenueProps {
  bookings: Booking[];
}

export default function RevenuePage({ bookings }: RevenueProps) {
  const [selectedSettlementStatus, setSelectedSettlementStatus] = useState<string>('All');

  // Compute Revenue Stats dynamically
  const financeStats = useMemo(() => {
    let grossValue = 0;
    let netPlatformCommission = 0;
    let platformServiceCharges = 0;
    let providerPayoutTotal = 0;
    
    const activeAndCompleted = bookings.filter(b => b.status === 'Completed' || b.status === 'Confirmed');

    activeAndCompleted.forEach(b => {
      grossValue += b.amount;
      netPlatformCommission += b.platformCommission;
      platformServiceCharges += b.serviceCharges;
      providerPayoutTotal += b.netRevenue;
    });

    const averageRetentionRate = grossValue > 0 
      ? Math.round((netPlatformCommission / grossValue) * 100) 
      : 20;

    return {
      grossValue,
      netPlatformCommission,
      platformServiceCharges,
      providerPayoutTotal,
      averageRetentionRate,
      activeTransactionCount: activeAndCompleted.length
    };
  }, [bookings]);

  // Compute dynamic category revenue percentages
  const revenueByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    
    bookings.forEach(b => {
      if (b.status === 'Completed' || b.status === 'Confirmed') {
        categories[b.serviceType] = (categories[b.serviceType] || 0) + b.amount;
      }
    });

    const colors = ['#0D7377', '#14B8A6', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#64748B'];

    return Object.keys(categories).map((key, idx) => ({
      name: key,
      value: categories[key],
      color: colors[idx % colors.length]
    })).sort((a,b) => b.value - a.value);
  }, [bookings]);

  // static monthly allocation
  const monthlyRevenueTrend = [
    { name: 'Jan', Gross: 48000, Platform: 9600 },
    { name: 'Feb', Gross: 58500, Platform: 11700 },
    { name: 'Mar', Gross: 72000, Platform: 14400 },
    { name: 'Apr', Gross: 89000, Platform: 17800 },
    { name: 'May', Gross: 114000, Platform: 22800 },
  ];

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 leading-none">Financial Ledger & Revenue Tracking</h1>
        <p className="text-xs text-slate-500 mt-1">Review ledger transactions, track commission percentages, and coordinate partner payouts.</p>
      </div>

      {/* KPI Stats cards */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Ledger Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Booking Volume */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-1 relative group overflow-hidden">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Gross Merchandise Value (GMV)</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-extrabold text-slate-950 font-sans">Rs{financeStats.grossValue}</h2>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight size={12} /> +18.4%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold">Processed across {financeStats.activeTransactionCount} settlements</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D7377] scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* Net Platform Commission */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-1 relative group overflow-hidden">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Net Platform Commission</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-extrabold text-[#0D7377] font-sans">Rs{financeStats.netPlatformCommission}</h2>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight size={12} /> +20.1%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold">Excluding service tax surcharges</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D7377] scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* Gross Partner Share */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-1 relative group overflow-hidden">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Gross Partner Settlement Share</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-extrabold text-slate-950 font-sans">Rs{financeStats.providerPayoutTotal}</h2>
            <span className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-0.5">
               Released to bank
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold">Net contractor payout matrix</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D7377] scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* Retention Tax Rate */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-1 relative group overflow-hidden">
          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Average Retention Margin</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl font-extrabold text-slate-950 font-sans">{financeStats.averageRetentionRate}%</h2>
            <span className="text-[10.5px] text-[#0D7377] font-bold">
               High profitability
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold">Flat 20% platform commission matching</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0D7377] scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>
      </div>

      {/* Visual Trends for Revenue */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Visual Financial Streams</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Revenue by category */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-3.5">
          <h3 className="text-sm font-bold text-slate-900 leading-none">Net GMV Share by Skill Category</h3>
          <p className="text-[10px] text-slate-450">Financial volume distribution by skill classifications.</p>

          <div className="space-y-3 pt-1">
            {revenueByCategory.length === 0 ? (
              <p className="text-slate-400 italic">No revenue streams available.</p>
            ) : (
              revenueByCategory.map(rc => {
                const percentage = financeStats.grossValue > 0 
                  ? Math.round((rc.value / financeStats.grossValue) * 100) 
                  : 0;

                return (
                  <div key={rc.name} className="space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-800 font-bold">{rc.name}</span>
                      <span className="text-[#0D7377] font-black">Rs{rc.value.toLocaleString()} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: rc.color }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Monthly cumulative trend */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 leading-none">Monthly Cumulative Billing Volume</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D7377" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#0D7377" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="Gross" name="Gross GMV (Rs)" stroke="#0D7377" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGross)" />
                <Area type="monotone" dataKey="Platform" name="Commission Retention (Rs)" stroke="#8B5CF6" strokeWidth={1.5} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Settlement Commissions list mapping detailed spreadsheet */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 leading-none">
              <FileSpreadsheet size={16} className="text-[#0D7377]" /> Commission Settlement Spreadsheet
            </h3>
            <p className="text-[10px] text-slate-450 mt-1">Audit settlement transactions, Platform service charges, and payouts release statuses.</p>
          </div>
          <button
            onClick={() => {
              alert("Downloading spreadsheet columns in CSV encoding format...");
            }}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5"
          >
            <Download size={13} /> Export Ledger CSV
          </button>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="p-4">Transaction Booking ID</th>
                <th className="p-4">Category Type</th>
                <th className="p-4">Beneficiary Partner</th>
                <th className="p-4 text-right">Charged Amount</th>
                <th className="p-4 text-right">Tax Surcharges</th>
                <th className="p-4 text-right">Platform Commission (20%)</th>
                <th className="p-4 text-right">Settled Payout Net Share</th>
                <th className="p-4 text-center">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-750">
              {bookings.map(b => {
                const isActiveOrComplete = b.status === 'Completed' || b.status === 'Confirmed';
                const setStatusString = b.status === 'Completed' ? 'Released' : b.status === 'Confirmed' ? 'Pending Escrow' : 'Forfeited';

                return (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-bold text-slate-450">{b.id}</td>
                    <td className="p-4 pr-1 font-bold text-slate-800">{b.serviceType}</td>
                    <td className="p-4">{b.providerName}</td>
                    <td className="p-4 text-right font-bold text-slate-900">Rs{b.amount}</td>
                    <td className="p-4 text-right text-slate-500">Rs{b.serviceCharges}</td>
                    <td className="p-4 text-right text-indigo-700 font-bold">Rs{b.platformCommission}</td>
                    <td className="p-4 text-right font-black text-[#0D7377]">
                      {isActiveOrComplete ? `Rs${b.netRevenue}` : `Rs0`}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-extrabold rounded-full border ${
                        setStatusString === 'Released' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : setStatusString === 'Pending Escrow'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {setStatusString === 'Released' ? <CheckCircle size={9} /> : <Clock size={9} />}
                        {setStatusString}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
