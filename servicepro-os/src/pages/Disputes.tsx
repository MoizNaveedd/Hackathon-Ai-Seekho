
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  ShieldAlert,
  User,
  Image as ImageIcon,
  MoreVertical,
  Scale
} from "lucide-react";
import { MOCK_DISPUTES, MOCK_BOOKINGS } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerFooter,
  DrawerClose
} from "@/components/ui/drawer";

export default function Disputes() {
  const [selectedDispute, setSelectedDispute] = useState<typeof MOCK_DISPUTES[0] | null>(null);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-rose-100 shadow-sm bg-rose-50/50 rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest">Active Disputes</p>
              <h3 className="text-2xl font-black text-rose-950">{MOCK_DISPUTES.filter(d => d.status === 'open').length}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-100 shadow-sm bg-amber-50/50 rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">In Review</p>
              <h3 className="text-2xl font-black text-amber-950">0</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 shadow-sm bg-emerald-50/50 rounded-2xl">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Resolved Today</p>
              <h3 className="text-2xl font-black text-emerald-950">0</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-2xl">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-600 rounded-xl text-white shadow-lg shadow-rose-600/20">
              <ShieldAlert size={24} />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-slate-800 tracking-tight">Client Disputes</CardTitle>
              <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">Manage and resolve service quality or payment claims.</CardDescription>
            </div>
          </div>
          <Button variant="outline" className="h-9 bg-white border-slate-200 font-black text-[10px] uppercase tracking-widest gap-2 rounded-lg">
            <Scale size={16} /> Mediation Policy
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {MOCK_DISPUTES.map((dispute) => {
              const booking = MOCK_BOOKINGS.find(b => b.id === dispute.bookingId);
              return (
                <div 
                  key={dispute.id} 
                  className="px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-all cursor-pointer group"
                  onClick={() => setSelectedDispute(dispute)}
                >
                  <div className="flex items-center gap-6">
                    <div className="text-center w-24">
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">ID</p>
                       <p className="text-sm font-black text-slate-900 tracking-tighter">#{dispute.id}</p>
                    </div>
                    <div className="h-10 w-px bg-slate-100" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={cn(
                          "rounded py-0 text-[10px] font-black uppercase tracking-widest border border-transparent shadow-none",
                          dispute.status === 'open' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                        )}>
                          {dispute.status}
                        </Badge>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dispute.type}</span>
                      </div>
                      <p className="text-base font-bold text-slate-800 group-hover:text-[#0D7377] transition-colors">
                        {booking?.customer.name} — Booking #{dispute.bookingId}
                      </p>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1 max-w-md">"{dispute.description}"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filed On</p>
                      <p className="text-sm font-bold text-slate-800">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 group-hover:text-slate-800 transition-colors">
                      <ChevronRight size={20} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Drawer open={!!selectedDispute} onOpenChange={(open) => !open && setSelectedDispute(null)}>
        <DrawerContent className="max-h-[90vh] border-none shadow-2xl">
          <div className="mx-auto w-full max-w-4xl overflow-y-auto scroll-none">
            <DrawerHeader className="px-8 pt-8 pb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <Badge className="bg-red-50 text-red-600 border-red-100 text-[10px] font-black tracking-widest uppercase mb-4 py-1 px-3">
                    Dispute ID: #{selectedDispute?.id}
                  </Badge>
                  <DrawerTitle className="text-3xl font-black tracking-tighter text-gray-900">Dispute Resolution Centre</DrawerTitle>
                  <DrawerDescription className="text-sm font-semibold text-gray-500 mt-2">
                    Review claim details and submit resolution evidence.
                  </DrawerDescription>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Status</p>
                  <div className="flex items-center gap-2 justify-end">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                    <span className="text-sm font-black text-red-600 uppercase tracking-widest">{selectedDispute?.status}</span>
                  </div>
                </div>
              </div>
            </DrawerHeader>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <section>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Claim Summary</h4>
                  <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl space-y-4">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-red-600 ring-4 ring-gray-100">
                          <MessageSquare size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dispute Type</p>
                          <p className="text-sm font-black text-gray-900 uppercase">{selectedDispute?.type}</p>
                        </div>
                     </div>
                     <p className="text-sm text-gray-600 leading-relaxed font-medium bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                       "{selectedDispute?.description}"
                     </p>
                  </div>
                </section>

                <section>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Evidence Logs</h4>
                  <div className="grid grid-cols-3 gap-4">
                     <div className="aspect-square bg-gray-100 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#0D7377]/50 hover:text-[#0D7377] transition-all cursor-pointer group">
                        <ImageIcon size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                     </div>
                     <div className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-300">
                        <ImageIcon size={24} />
                     </div>
                     <div className="aspect-square bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center text-gray-300">
                        <ImageIcon size={24} />
                     </div>
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Associated Contact</h4>
                  <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-full bg-[#0D7377]/10 flex items-center justify-center text-[#0D7377]">
                          <User size={20} />
                       </div>
                       <div>
                         <p className="text-sm font-black text-gray-900">John Doe</p>
                         <p className="text-xs font-bold text-gray-400 uppercase">Premium Member</p>
                       </div>
                       <Button variant="ghost" size="icon" className="ml-auto text-gray-300">
                          <MoreVertical size={16} />
                       </Button>
                    </div>
                    <div className="space-y-2 pt-2">
                       <Button className="w-full h-11 bg-[#0D7377] hover:bg-[#0b6366] text-xs font-bold uppercase tracking-widest gap-2">
                         <MessageSquare size={16} /> Open Chat
                       </Button>
                    </div>
                  </div>
                </section>

                <section>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Resolution Actions</h4>
                   <div className="space-y-3">
                      <Button variant="outline" className="w-full h-12 border-gray-100 font-bold text-xs uppercase tracking-widest text-green-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200">
                        Refund Full Amount
                      </Button>
                      <Button variant="outline" className="w-full h-12 border-gray-100 font-bold text-xs uppercase tracking-widest text-[#0D7377] hover:bg-[#0D7377]/5 hover:border-[#0D7377]/30">
                        Offer Service Credit
                      </Button>
                      <Button className="w-full h-12 bg-red-600 hover:bg-red-700 font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-600/20">
                        Reject Claim & escalate
                      </Button>
                   </div>
                </section>
              </div>
            </div>

            <DrawerFooter className="px-8 pb-12 pt-4">
              <DrawerClose asChild>
                <Button variant="ghost" className="text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 h-10">Close Resolution Centre</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
