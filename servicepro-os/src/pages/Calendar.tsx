
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus,
  MoreVertical,
  CalendarDays,
  User,
  MapPin,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { MOCK_BOOKINGS } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

export default function CalendarScreen() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 h-full">
      {/* Left Sidebar: Calendar & Availability */}
      <div className="xl:col-span-1 space-y-6">
        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-400">Select Date</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <CalendarUI
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border-none p-0"
              classNames={{
                day_selected: "bg-[#0D7377] text-white hover:bg-[#0D7377]/90",
                day_today: "bg-gray-100 text-gray-900 border-none",
                head_cell: "text-gray-400 font-bold uppercase text-[10px] tracking-widest",
              }}
            />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="bg-gray-50/50 pb-4">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-gray-400">Daily Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center p-3 rounded-xl bg-green-50 border border-green-100">
              <span className="text-xs font-bold text-green-700">Available Slots</span>
              <span className="text-lg font-bold text-green-700">4</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-xs font-bold text-blue-700">Scheduled Jobs</span>
              <span className="text-lg font-bold text-blue-700">3</span>
            </div>
            <div className="pt-2">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Conflicts</h4>
              <div className="flex items-center gap-2 p-3 text-red-600 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle size={16} />
                <span className="text-xs font-bold">No scheduling conflicts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Content: Daily Timeline */}
      <Card className="xl:col-span-3 border-none shadow-sm flex flex-col h-full bg-white">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 px-8 py-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#0D7377]/10 rounded-xl text-[#0D7377]">
              <CalendarDays size={24} />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                {date?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </CardTitle>
              <p className="text-sm text-gray-500 font-medium">Weekly view active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-gray-100">
              <ChevronLeft size={18} />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-gray-100">
              <ChevronRight size={18} />
            </Button>
            <Button className="h-10 bg-[#0D7377] hover:bg-[#0b6366] ml-2">Today</Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-0 scroll-area">
          <div className="relative min-h-[800px]">
            {/* Timeline Lines */}
            {HOURS.map((hour) => (
              <div key={hour} className="group relative border-b border-gray-50 h-24 flex">
                <div className="w-24 shrink-0 text-center py-4 border-r border-slate-50 bg-slate-50/30">
                  <span className="text-xs font-black text-slate-400 tracking-tighter uppercase whitespace-nowrap">
                    {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </span>
                </div>
                <div className="flex-1 hover:bg-slate-50/50 transition-colors relative" />
              </div>
            ))}

            {/* Injected Bookings (Example visualization) */}
            {MOCK_BOOKINGS.filter(b => b.status !== 'Completed').map((booking, idx) => {
              // Simple mock mapping to the timeline
              const h = parseInt(booking.time.split(':')[0]);
              const ampm = booking.time.split(' ')[1];
              const displayHour = ampm === 'PM' && h !== 12 ? h + 12 : (ampm === 'AM' && h === 12 ? 0 : h);
              
              if (displayHour < 8 || displayHour > 19) return null;
              
              const topPos = (displayHour - 8) * 96; // 96px per hour
              
              return (
                <div 
                  key={booking.id}
                  className="absolute left-[97px] right-6 p-4 rounded-2xl shadow-xl shadow-[#0D7377]/5 border-l-4 border-[#0D7377] bg-white group cursor-pointer hover:scale-[1.01] transition-transform z-10"
                  style={{ top: `${topPos + 12}px`, height: '72px' }}
                >
                  <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-[#0D7377] shrink-0 border-2 border-white shadow-sm">
                        <User size={18} />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-black tracking-tight text-gray-900 group-hover:text-[#0D7377] transition-colors">
                          {booking.customer.name} — {booking.serviceType}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Clock size={10} /> {booking.time}</span>
                          <span className="flex items-center gap-1"><MapPin size={10} /> {booking.customer.address}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Badge className="bg-[#0D7377]/10 text-[#0D7377] border-none text-[10px] font-bold uppercase tracking-widest py-1 h-fit">
                        {booking.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-gray-900">
                        <MoreVertical size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
