
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 

  Plus, 
  Trash2, 
  FileText, 
  Download, 
  Send,
  Calculator,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function PricingInvoice() {
  const [basePrice, setBasePrice] = useState(2000);
  const [travelFee, setTravelFee] = useState(500);
  const [taxRate, setTaxRate] = useState(10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
      {/* Left: Pricing Configuration */}
      <div className="lg:col-span-2 space-y-8">
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#0D7377]/10 rounded-xl text-[#0D7377]">
                <Calculator size={24} />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Standard Pricing Setup</CardTitle>
                <CardDescription className="text-sm font-medium text-slate-500">Configure your default service rates and fees.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Base Rates</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-600 font-bold text-xs uppercase tracking-tight">Standard Call-out Fee</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">Rs.</span>
                      <Input 
                        type="number" 
                        value={basePrice} 
                        onChange={(e) => setBasePrice(Number(e.target.value))}
                        className="pl-12 h-12 bg-gray-50/50 border-gray-100 font-bold focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600 font-bold text-xs uppercase tracking-tight">Travel Fee (per km)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">Rs.</span>
                      <Input 
                        type="number" 
                        value={travelFee}
                        className="pl-12 h-12 bg-gray-50/50 border-gray-100 font-bold focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Premiums</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-600 font-bold text-xs uppercase tracking-tight">Urgency/Emergency Loading (%)</Label>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
                      <Input 
                        type="number" 
                        defaultValue={20}
                        className="pl-9 h-12 bg-gray-50/50 border-gray-100 font-bold focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600 font-bold text-xs uppercase tracking-tight">After-Hours Loading (%)</Label>
                    <div className="relative">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
                      <Input 
                        type="number" 
                        defaultValue={15}
                        className="pl-9 h-12 bg-gray-50/50 border-gray-100 font-bold focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
               <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-6">Additional Services</h3>
               <div className="space-y-3">
                 {[
                   { name: "Filter Replacement", price: 4500 },
                   { name: "Deep Cleaning", price: 12000 },
                   { name: "Gas Recharge", price: 6500 }
                 ].map((service, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 group hover:border-[#0D7377]/30 transition-colors">
                     <span className="text-sm font-bold text-gray-700">{service.name}</span>
                     <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-[#0D7377]">Rs. {service.price.toLocaleString()}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-300 hover:text-red-500">
                          <Trash2 size={16} />
                        </Button>
                     </div>
                   </div>
                 ))}
                 <Button variant="outline" className="w-full h-12 border-dashed border-2 hover:bg-gray-50 hover:text-[#0D7377] hover:border-[#0D7377]/50 font-bold text-xs uppercase tracking-widest gap-2">
                   <Plus size={16} /> Add Custom Service
                 </Button>
               </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices Table (Simplified) */}
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             <div className="border-t border-gray-100">
               {[
                 { id: "INV-001", client: "John Doe", date: "May 15", amount: 15000, status: "Paid" },
                 { id: "INV-002", client: "Jane Smith", date: "May 14", amount: 8500, status: "Pending" },
                 { id: "INV-003", client: "Robert Brown", date: "May 12", amount: 21000, status: "Paid" }
               ].map((inv, i) => (
                 <div key={i} className="px-6 py-4 border-b border-gray-50 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer group">
                   <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{inv.id}</p>
                        <p className="text-xs text-gray-500">{inv.client} — {inv.date}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-8">
                     <span className="text-sm font-black text-gray-900">Rs. {inv.amount.toLocaleString()}</span>
                     <Badge className={cn(
                       "rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-widest",
                       inv.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                     )}>
                       {inv.status}
                     </Badge>
                     <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900" />
                   </div>
                 </div>
               ))}
             </div>
             <div className="p-4 bg-gray-50/30">
                <Button variant="ghost" className="w-full text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-900">View All Invoices</Button>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Invoice Preview / Summary */}
      <div className="space-y-8">
        <Card className="border-none shadow-xl bg-white sticky top-8">
          <CardHeader className="bg-[#1a1a1a] text-white p-8 rounded-t-none">
            <div className="flex justify-between items-start mb-6">
              <div className="space-y-1">
                <h2 className="text-2xl font-black tracking-tighter">INVOICE</h2>
                <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest">Draft Entry</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold opacity-50 mb-1">Total Due</p>
                <p className="text-3xl font-black">Rs. {(basePrice + travelFee + 500).toLocaleString()}</p>
              </div>
            </div>
            <div className="pt-6 border-t border-white/10 flex justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-bold opacity-50">Client</p>
                <p className="text-xs font-bold">New Booking Preview</p>
              </div>
               <div className="text-right space-y-1">
                <p className="text-[10px] uppercase font-bold opacity-50">Date</p>
                <p className="text-xs font-bold">May 18, 2026</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Standard Call-out</span>
                <span className="text-gray-900 font-bold">Rs. {basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Travel Compensation</span>
                <span className="text-gray-900 font-bold">Rs. {travelFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 font-medium">Emergency Loading (20%)</span>
                <span className="text-gray-900 font-bold">Rs. {(basePrice * 0.2).toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-gray-400 tracking-widest">Subtotal</span>
                <span className="text-base font-bold text-gray-900">Rs. {(basePrice + travelFee + (basePrice * 0.2)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Service Tax ({taxRate}%)</span>
                <span className="text-gray-900 font-bold">Rs. {((basePrice + travelFee + (basePrice * 0.2)) * (taxRate / 100)).toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-8 space-y-3">
              <Button className="w-full h-12 bg-[#0D7377] hover:bg-[#0b6366] font-bold text-xs uppercase tracking-widest gap-2 shadow-lg shadow-[#0D7377]/20">
                <Send size={16} /> Send to Client
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="h-11 border-gray-100 font-bold text-xs uppercase tracking-widest gap-2">
                  <Download size={16} /> PDF
                </Button>
                <Button variant="outline" className="h-11 border-gray-100 font-bold text-xs uppercase tracking-widest">
                  Preview
                </Button>
              </div>
            </div>
          </CardContent>
          <div className="p-4 bg-gray-50/50 rounded-b-2xl border-t border-gray-100">
            <div className="flex items-center gap-3 text-[10px] text-gray-400 font-black uppercase tracking-widest justify-center">
              <TrendingUp size={14} /> Average invoice value is up 4% this month
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
