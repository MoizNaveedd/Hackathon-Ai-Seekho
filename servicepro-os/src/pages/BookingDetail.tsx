import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  Banknote,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Star,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fetchBookingById, cancelBooking, completeBooking } from "@/lib/api";
import { KarigarLoader } from "@/components/ui/karigar-loader";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const currentUser = useMemo(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchBookingById(id)
      .then(setBooking)
      .catch(() => toast.error("Failed to load booking"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <KarigarLoader label="Loading booking..." />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-slate-500 font-bold uppercase tracking-widest">Booking not found</p>
        <Button onClick={() => navigate("/bookings")}>Back to Bookings</Button>
      </div>
    );
  }

  const handleCancel = async () => {
    const providerId = currentUser?.id?.replace("usr_", "") || "";
    try {
      await cancelBooking(id!, providerId);
      toast.success("Booking cancelled successfully.");
      navigate("/bookings");
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel booking");
    }
  };

  const handleComplete = async () => {
    const providerId = currentUser?.id?.replace("usr_", "") || "";
    try {
      await completeBooking(id!, providerId, "Good Service", 5);
      toast.success("Job marked as completed.");
      navigate("/bookings");
    } catch (err: any) {
      toast.error(err.message || "Failed to complete booking");
    }
  };

  const formatFeedbackDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-PK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const showFeedbackSection =
    booking.feedback ||
    booking.status === "Completed";

  const customerLat = booking.customer?.latitude ?? booking.latitude;
  const customerLng = booking.customer?.longitude ?? booking.longitude;
  const hasCoords =
    typeof customerLat === "number" &&
    typeof customerLng === "number" &&
    (customerLat !== 0 || customerLng !== 0);
  const mapQuery = hasCoords
    ? `${customerLat},${customerLng}`
    : booking.customer.address || booking.location || "Islamabad, Pakistan";
  const customerPhone = booking.customer.phone || "+92 300 1234567";

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => navigate("/bookings")}
          className="rounded-full border-slate-200 hover:bg-slate-50 h-10 w-10 shrink-0"
        >
          <ChevronLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">Booking Details</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Order ID: #{booking.id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
          <Badge className={cn(
            "rounded px-4 py-1 font-black uppercase tracking-widest text-[10px] border-none shadow-none",
            booking.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
            booking.status === 'Confirmed' || booking.status === 'In Progress' ? 'bg-teal-50 text-[#0D7377]' :
            booking.status === 'Cancelled' ? 'bg-slate-50 text-slate-400' :
            'bg-amber-50 text-amber-600'
          )}>
            {booking.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Map & Location Card */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="h-64 bg-slate-100 relative group overflow-hidden">
                {/* Real Google Map */}
                <iframe
                  title="Job Location Map"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`}
                  className="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
            </div>
            <CardHeader className="p-8 border-b border-slate-100">
               <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black tracking-tight text-slate-800">Job Location</CardTitle>
                    <p className="text-sm font-medium text-slate-500">
                      {booking.customer.address ||
                        (hasCoords ? `${customerLat.toFixed(5)}, ${customerLng.toFixed(5)}` : "Location not provided")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Distance</p>
                    <p className="text-lg font-black text-[#0D7377]">3.8 km</p>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div>
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Customer Problem Description</h4>
                   <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                       <p className="text-slate-600 font-medium leading-relaxed">
                         {booking.prompt || `Having Problem in the ${currentUser?.service_type || "AC"} in G-13 tomorrow would be the right time for service any expert required`}
                       </p>
                   </div>
                </div>
            </CardContent>
          </Card>

          {/* Job Requirements/Service Info */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="p-8 border-b border-slate-100">
              <CardTitle className="text-lg font-black tracking-tight uppercase text-slate-800">Service Highlights</CardTitle>
            </CardHeader>
            <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0D7377] shadow-sm">
                        <Calendar size={18} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scheduled Date</p>
                        <p className="text-sm font-bold text-slate-800">{booking.date}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0D7377] shadow-sm">
                        <Clock size={18} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Time Slot</p>
                        <p className="text-sm font-bold text-slate-800">{booking.time}</p>
                     </div>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0D7377] shadow-sm">
                        <Banknote size={18} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agreed Budget</p>
                        <p className="text-sm font-black text-slate-800">Rs. {booking.price.toLocaleString()}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#0D7377] shadow-sm">
                        <AlertCircle size={18} />
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Status</p>
                        <p className="text-sm font-bold text-amber-600">Standard Service</p>
                     </div>
                  </div>
               </div>
            </CardContent>
          </Card>

          {showFeedbackSection && (
            <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg font-black tracking-tight uppercase text-slate-800">
                    Customer Feedback
                  </CardTitle>
                  {booking.feedback && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={cn(
                            i < booking.feedback!.rating
                              ? "fill-amber-400 text-amber-400"
                              : "fill-slate-100 text-slate-200"
                          )}
                        />
                      ))}
                      <span className="ml-2 text-sm font-black text-slate-800">
                        {booking.feedback.rating}/5
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {booking.feedback ? (
                  <div className="space-y-4">
                    <div
                      className={cn(
                        "p-6 rounded-2xl border",
                        booking.feedback.rating >= 4
                          ? "bg-emerald-50/50 border-emerald-100"
                          : booking.feedback.rating >= 3
                            ? "bg-amber-50/50 border-amber-100"
                            : "bg-rose-50/50 border-rose-100"
                      )}
                    >
                      <p className="text-slate-600 font-medium leading-relaxed">
                        &ldquo;{booking.feedback.comment}&rdquo;
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Submitted by {booking.customer.name}</span>
                      <span>{formatFeedbackDate(booking.feedback.createdAt)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Star size={28} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-sm font-bold text-slate-500">No feedback yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      The customer has not submitted a review for this booking.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Customer & Actions */}
        <div className="space-y-8">
           <Card className="border-slate-200 shadow-sm rounded-2xl bg-[#0D7377] text-white p-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-6">Customer Profile</h3>
              <div className="flex items-center gap-4 mb-8">
                 <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-white border-2 border-white/20 shadow-xl">
                    <User size={32} />
                 </div>
                 <div>
                    <h4 className="text-xl font-black tracking-tighter">{booking.customer.name}</h4>
                    <p className="text-xs font-bold opacity-60 uppercase tracking-widest">Customer since 2025</p>
                 </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-white/10">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                       <Phone size={14} />
                    </div>
                    <span className="text-sm font-bold">{customerPhone}</span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                       <Mail size={14} />
                    </div>
                    <span className="text-sm font-bold truncate">{booking.customer.email}</span>
                 </div>
              </div>

              <div className="pt-8">
                 <Button
                    className="w-full bg-white text-[#0D7377] hover:bg-white/90 font-black text-xs uppercase tracking-widest h-12 rounded-xl gap-2 shadow-xl"
                    onClick={() => navigate(`/bookings/${id}/chat`, { state: { customerName: booking.customer.name } })}
                 >
                    <MessageSquare size={16} /> Chat with Customer
                 </Button>
              </div>
           </Card>

           <Card className="border-slate-200 shadow-sm rounded-2xl bg-white p-6 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">Lifecycle Management</h3>
              
              {booking.status !== 'Completed' && booking.status !== 'Cancelled' ? (
                <>
                  <Button 
                    className="w-full h-12 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                    onClick={handleComplete}
                  >
                    <CheckCircle2 size={16} className="mr-2" /> Mark as Completed
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                    onClick={handleCancel}
                  >
                    <XCircle size={16} className="mr-2" /> Cancel Booking
                  </Button>
                </>
              ) : booking.status === 'Completed' ? (
                <>
                  <Button
                    className="w-full h-12 bg-[#0D7377] hover:bg-[#0b6366] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all gap-2 shadow-lg shadow-[#0D7377]/20"
                    onClick={() => setInvoiceOpen(true)}
                  >
                    <FileText size={16} /> View Invoice
                  </Button>
                  <p className="text-center text-xs font-bold text-slate-400 pt-1">This booking has been completed. View or download the invoice above.</p>
                </>
              ) : (
                <div className="text-center py-4 px-2">
                   <p className="text-xs font-bold text-slate-400">This booking has been {booking.status.toLowerCase()}. No further actions required.</p>
                </div>
              )}
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6">
                 <div className="text-center">
                    <p className="text-xs font-black text-slate-900 leading-none mb-1">08</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Steps taken</p>
                 </div>
                 <div className="w-px h-6 bg-slate-100" />
                 <div className="text-center">
                    <p className="text-xs font-black text-slate-900 leading-none mb-1">45m</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Avg duration</p>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      <InvoiceDialog
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
        booking={booking}
        provider={currentUser}
      />
    </div>
  );
}
