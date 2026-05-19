
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Banknote, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Plus,
  AlertCircle
} from "lucide-react";
import { MOCK_BOOKINGS } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const stats = [
  { 
    title: "Total Revenue", 
    value: "Rs. 4,285", 
    change: "+12.5%", 
    trend: "up", 
    icon: Banknote, 
    color: "text-green-600", 
    bg: "bg-green-50" 
  },
  { 
    title: "Completed Jobs", 
    value: "24", 
    change: "+8.2%", 
    trend: "up", 
    icon: CheckCircle2, 
    color: "text-blue-600", 
    bg: "bg-blue-50" 
  },
  { 
    title: "Pending Requests", 
    value: "12", 
    change: "-2.4%", 
    trend: "down", 
    icon: Clock, 
    color: "text-orange-600", 
    bg: "bg-orange-50" 
  },
  { 
    title: "Active Disputes", 
    value: "1", 
    change: "0%", 
    trend: "neutral", 
    icon: Briefcase, 
    color: "text-red-600", 
    bg: "bg-red-50" 
  },
];

import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const activeBookings = MOCK_BOOKINGS.filter(b => b.status === "In Progress" || b.status === "Pending");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardContent className="p-6">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.title}</span>
              <div className="mt-2 flex items-baseline justify-between">
                <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded",
                  stat.trend === "up" ? "bg-emerald-50 text-emerald-600" : stat.trend === "down" ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
                )}>
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Progress */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden flex flex-col">
          <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between bg-white text-slate-800">
            <CardTitle className="text-base font-bold tracking-tight">Today's Schedule</CardTitle>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-slate-100">
              {activeBookings.map((booking) => (
                <div key={booking.id} className={cn(
                  "px-8 py-5 flex items-center justify-between hover:bg-slate-50 transition-colors group",
                  booking.status === 'In Progress' ? "bg-[#F0F9F9]" : ""
                )}>
                  <div className="flex items-center gap-6">
                    <div className="w-16">
                      <p className="text-sm font-bold text-slate-600">{booking.time}</p>
                    </div>
                    <div className="space-y-1">
                      <p className={cn("text-base font-bold transition-colors", booking.status === 'In Progress' ? "text-[#0D7377]" : "text-slate-800")}>
                        {booking.customer.name}
                      </p>
                      <div className="flex items-center gap-2">
                         <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-widest leading-none">{booking.serviceType}</span>
                         <span className="text-slate-300">·</span>
                         <span className="text-xs text-slate-400 font-medium">{booking.customer.address}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={cn(
                      "flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest",
                      booking.status === 'In Progress' ? "text-[#0D7377]" : "text-amber-500"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", booking.status === 'In Progress' ? "bg-[#0D7377] animate-pulse" : "bg-amber-400")} />
                      {booking.status}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-slate-400 group-hover:text-slate-800 font-bold uppercase text-[10px] tracking-widest"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
             </div>
             <div className="p-4 bg-slate-50/50">
                <Button variant="ghost" className="w-full text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-[#0D7377]">View Full Calendar</Button>
             </div>
          </CardContent>
        </Card>

        {/* Earning Overview */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-[#0D7377] text-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold tracking-tight uppercase flex items-center gap-2">
                <TrendingUp size={18} />
                Profit Target
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold tracking-widest uppercase">
                  <span className="opacity-70">Month Progress</span>
                  <span>75%</span>
                </div>
                <Progress value={75} className="bg-white/10 h-1.5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mb-1">Target</p>
                  <p className="text-xl font-black">Rs. 6.2k</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mb-1">Current</p>
                  <p className="text-xl font-black italic">Rs. 4.5k</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-6">
            <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-widest">Growth Forecast</h3>
            <div className="flex items-end gap-2 h-24 mb-4">
              {[60, 45, 80, 65, 95, 40, 20].map((h, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "flex-1 rounded-t-sm transition-all duration-500",
                    i === 4 ? "bg-[#0D7377]" : "bg-slate-100 hover:bg-slate-200"
                  )} 
                  style={{ height: `${h}%` }} 
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 uppercase font-black px-1 tracking-[0.1em]">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span className="text-[#0D7377]">Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </Card>
          
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-6">
            <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-widest">Recent Activity</h3>
            <div className="space-y-4">
               <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-dotted border-slate-200">
                  <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Job Completed</p>
                    <p className="text-xs font-bold text-slate-800 truncate">Marcus Wong · AC Repair</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-dotted border-slate-200">
                  <div className="w-8 h-8 rounded bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertCircle size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Dispute</p>
                    <p className="text-xs font-bold text-slate-800 truncate italic">Alice Wilson · Order #B4</p>
                  </div>
               </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
