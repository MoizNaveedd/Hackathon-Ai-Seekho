
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Filter,
  MoreHorizontal,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fetchBookings } from "@/lib/api";


export default function Bookings() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { setLoading(false); return; }
    const user = JSON.parse(stored);
    const providerId = user.id?.replace("usr_", "") || "";
    if (!providerId) { setLoading(false); return; }

    fetchBookings(providerId)
      .then((res) => setBookings(res.bookings || []))
      .catch(() => toast.error("Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const filteredBookings = bookings.filter(b =>
    b.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(b.id).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCancelBooking = (bookingId: string) => {
    toast.success(`Booking #${bookingId} has been cancelled successfully.`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Search bookings..."
            className="pl-10 h-10 bg-white border-slate-200 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-10 bg-white border-slate-200 font-bold text-[10px] uppercase tracking-widest rounded-xl">
            <Filter size={14} className="mr-2" />
            Filters
          </Button>
          <Button variant="outline" className="h-10 bg-white border-slate-200 font-bold text-[10px] uppercase tracking-widest rounded-xl">
            <Calendar size={14} className="mr-2" />
            Date
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-200">
              <TableHead className="w-24 font-bold text-slate-400 text-[10px] uppercase tracking-widest pl-8 py-4">ID</TableHead>
              <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Customer</TableHead>
              <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Service</TableHead>
              <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest text-center">Price</TableHead>
              <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Status</TableHead>
              <TableHead className="font-bold text-slate-400 text-[10px] uppercase tracking-widest">Date & Time</TableHead>
              <TableHead className="w-12 pr-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20">
                  <div className="flex justify-center">
                    <div className="animate-spin h-8 w-8 border-4 border-[#0D7377] border-t-transparent rounded-full" />
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredBookings.map((booking) => (
              <TableRow
                key={booking.id}
                className="group hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100"
                onClick={() => navigate(`/bookings/${booking.id}`)}
              >
                <TableCell className="font-bold text-slate-900 pl-8 py-5 tracking-tight">#{booking.id}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-base">{booking.user?.name || "—"}</span>
                    <span className="text-xs text-slate-400">{booking.user?.phone || "—"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest">{booking.service_type || booking.provider?.service_type || "—"}</span>
                </TableCell>
                <TableCell className="text-center font-black text-slate-900 tracking-tighter text-base">{booking.price != null ? `Rs. ${Number(booking.price).toLocaleString()}` : "—"}</TableCell>
                <TableCell>
                  <span className={cn(
                    "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em]",
                    booking.status === 'Completed' ? "text-emerald-500" :
                      booking.status === 'Confirmed' ? "text-[#0D7377]" :
                        booking.status === 'Cancelled' ? "text-slate-400" :
                          "text-amber-500"
                  )}>
                    <div className={cn("w-2 h-2 rounded-full",
                      booking.status === 'Completed' ? "bg-emerald-400" :
                        booking.status === 'Confirmed' ? "bg-[#0D7377]" :
                          booking.status === 'Cancelled' ? "bg-slate-300" :
                            "bg-amber-400"
                    )} />
                    {booking.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700">{booking.booking_date || "—"}</span>
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{booking.time_slot || "—"}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!loading && filteredBookings.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white">
            <div className="p-4 rounded-full bg-slate-50 mb-4">
              <Search className="text-slate-300" size={40} />
            </div>
            <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">No bookings found</p>
          </div>
        )}
      </div>
    </div>
  );
}
