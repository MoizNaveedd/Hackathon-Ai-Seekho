import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Cpu, 
  TrendingUp, 
  X, 
  FileText, 
  MessageSquare, 
  Sparkles, 
  Coins, 
  CheckCircle, 
  Ban, 
  AlertTriangle,
  Receipt
} from 'lucide-react';
import { Booking, BookingStatus, Dispute } from '../../types';

interface BookingManagementProps {
  bookings: Booking[];
  onUpdateBookings: (updated: Booking[]) => void;
  disputes: Dispute[];
  onUpdateDisputes: (updated: Dispute[]) => void;
  providers: any[];
}

export default function BookingManagement({ 
  bookings, 
  onUpdateBookings, 
  disputes, 
  onUpdateDisputes,
  providers 
}: BookingManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedService, setSelectedService] = useState<string>('All');
  
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Dispute creation form states
  const [disputeComplaint, setDisputeComplaint] = useState('');

  // Selected Booking Object
  const selectedBooking = useMemo(() => {
    return bookings.find(b => b.id === selectedBookingId) || null;
  }, [bookings, selectedBookingId]);

  // Action status updater
  const handleUpdateStatus = (id: string, status: BookingStatus) => {
    const updated = bookings.map(b => {
      if (b.id === id) {
        return { ...b, status };
      }
      return b;
    });
    onUpdateBookings(updated);
  };

  // Launch Dispute Submission
  const handleCreateDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !disputeComplaint) return;

    // Create dispute entity
    const newDispute: Dispute = {
      id: `DSP-${String(disputes.length + 501).padStart(3, '0')}`,
      bookingId: selectedBooking.id,
      bookingServiceType: selectedBooking.serviceType,
      bookingAmount: selectedBooking.amount,
      customerName: selectedBooking.customerName,
      providerName: selectedBooking.providerName,
      complaintText: disputeComplaint,
      status: 'Open',
      evidenceUrls: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    // Update dispute list
    onUpdateDisputes([newDispute, ...disputes]);

    // Update booking status to dispute
    const updatedBookings = bookings.map(b => {
      if (b.id === selectedBooking.id) {
        return { ...b, status: 'Dispute' as BookingStatus };
      }
      return b;
    });
    onUpdateBookings(updatedBookings);

    // Reset and close
    setDisputeComplaint('');
    setShowDisputeModal(false);
    alert(`Dispute filed successfully against booking ID ${selectedBooking.id}. Case ID is ${newDispute.id}.`);
  };

  // Filter Bookings logic
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = 
        b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.providerName.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = selectedStatus === 'All' || b.status === selectedStatus;
      const matchesService = selectedService === 'All' || b.serviceType === selectedService;

      return matchesSearch && matchesStatus && matchesService;
    });
  }, [bookings, searchTerm, selectedStatus, selectedService]);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 leading-none">Marketplace Bookings Ledger</h1>
        <p className="text-xs text-slate-500 mt-1">Review active customer appointments, inspect AI recommended scores, and dispatch dispatch adjustments.</p>
      </div>

      {/* Grid Layout splits screen */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Side: Directory Table list with Search & Filters */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                id="booking-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377] transition-all"
                placeholder="Search appointments by Booking ID, Customer name, or Provider name..."
              />
            </div>

            {/* Quick Filters */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Status Match</label>
                <select
                  id="filter-booking-status"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#0D7377] bg-white font-semibold"
                >
                  <option value="All">All Lifecycles</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Dispute">Dispute Cases</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-wider">Service Skill Type</label>
                <select
                  id="filter-booking-service"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-[#0D7377] bg-white font-semibold"
                >
                  <option value="All">All Categories</option>
                  <option value="AC Repair">AC Repair</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Carpentry">Carpentry</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Painting">Painting</option>
                  <option value="Others">Others</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Listings */}
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/55">
                    <th className="p-4">Booking ID</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Match Provider</th>
                    <th className="p-4">Service Required</th>
                    <th className="p-4">Date • Slot</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Net Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold text-xs">
                        No transactions found in this range.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map(b => (
                      <tr 
                        key={b.id} 
                        id={`booking-row-${b.id}`}
                        onClick={() => setSelectedBookingId(b.id)}
                        className={`cursor-pointer hover:bg-slate-50/80 transition-colors ${
                          selectedBookingId === b.id ? 'bg-[#0d7377]/5 border-l-2 border-l-[#0D7377]' : ''
                        }`}
                      >
                        <td className="p-4 font-bold text-slate-450">{b.id}</td>
                        <td className="p-4 font-bold text-slate-900">{b.customerName}</td>
                        <td className="p-4">
                          <p className="font-semibold text-slate-750">{b.providerName}</p>
                          <span className="text-[10px] text-slate-400">⭐⭐⭐⭐ {b.providerRating}</span>
                        </td>
                        <td className="p-4">
                          <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            {b.serviceType}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-slate-800">{b.bookingDate}</p>
                          <p className="text-[10px] text-slate-400 leading-none mt-1 font-mono">{b.timeSlot}</p>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-extrabold rounded-full border ${
                            b.status === 'Completed' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                              : b.status === 'Confirmed'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : b.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-black text-[#0D7377]">Rs{b.amount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Appointment Detail Card */}
        <div id="booking-aux-panel">
          {selectedBooking ? (
            <div id="booking-detail-card" className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-4 text-xs animate-fade-in pb-6">
              {/* Card Title Header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-950 flex items-center gap-1.5">
                    Case Entry: {selectedBooking.id}
                  </h2>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Skills tier: {selectedBooking.serviceType}</p>
                </div>
                <button onClick={() => setSelectedBookingId(null)} className="p-1 rounded bg-slate-50 border border-slate-100 text-slate-450 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>

              {/* Status Action Buttons depending on lifecycle */}
              <div className="flex gap-2">
                {selectedBooking.status === 'Confirmed' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'Completed')}
                      className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold rounded-lg text-[10.5px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckCircle size={11} /> Mark Completed
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'Cancelled')}
                      className="flex-1 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 border border-rose-150 text-rose-600 font-bold rounded-lg text-[10.5px] flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Ban size={11} /> Cancel Booking
                    </button>
                  </>
                )}

                {selectedBooking.status !== 'Dispute' && selectedBooking.status !== 'Cancelled' && (
                  <button
                    onClick={() => setShowDisputeModal(true)}
                    className="flex-1 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold rounded-lg text-[10.5px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <AlertTriangle size={11} /> Open Dispute
                  </button>
                )}

                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="py-1.5 px-3 border border-slate-200 hover:border-[#0D7377] hover:text-[#0D7377] font-bold rounded-lg text-[10.5px] flex items-center justify-center gap-1.5"
                >
                  <Receipt size={12} /> Invoice
                </button>
              </div>

              {/* Customer Info Box */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Client Coordinates</h3>
                <div className="bg-slate-50 p-3 rounded-lg space-y-1.5">
                  <p className="font-bold text-slate-900 text-xs">{selectedBooking.customerName}</p>
                  <p className="text-slate-600 font-medium">✉️ {selectedBooking.customerEmail}</p>
                  <p className="text-slate-650 font-medium">📞 {selectedBooking.customerPhone}</p>
                  <p className="text-slate-655 font-semibold text-[11px] leading-relaxed flex gap-1 mt-1 border-t border-slate-200/60 pt-1.5">
                    <MapPin size={12} className="text-rose-500 shrink-0 mt-0.5" />
                    <span>{selectedBooking.customerLocation}</span>
                  </p>
                </div>
              </div>

              {/* Provider Info Box */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Matched Professional</h3>
                <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                  <p className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-[#0D7377]">
                    {selectedBooking.providerCategory} Partner
                  </p>
                  <p className="font-black text-slate-800 text-xs">{selectedBooking.providerName}</p>
                  <p className="text-[10px] text-amber-600 font-bold">⭐ {selectedBooking.providerRating} Rating in Operations</p>
                </div>
              </div>

              {/* AI MATCHING DISPATCH TELEMETRY (Investor / Judge Showstopper) */}
              {selectedBooking.aiPrompt && (
                <div className="space-y-2 border border-indigo-150 rounded-xl p-3 bg-indigo-50/15">
                  <h3 className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1 font-sans">
                    <Cpu size={12} className="text-indigo-600 animate-karigar-breathe" /> AI Orchestrator Match Telemetry
                  </h3>
                  <div className="space-y-2 mt-1">
                    <div className="bg-white border border-slate-100 p-2 rounded-lg relative">
                      <p className="text-[10px] font-bold text-slate-400">booking.prompt</p>
                      <p className="text-slate-650 italic leading-relaxed mt-0.5 font-medium">"{selectedBooking.aiPrompt}"</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-slate-400">Evaluation Logic</p>
                      <p className="text-slate-700 leading-relaxed font-semibold text-[11px] mt-0.5 bg-indigo-50/20 p-2 rounded-lg border border-indigo-50">
                        {selectedBooking.aiRecommendationReason}
                      </p>
                    </div>

                    {selectedBooking.aiRecommendedProviders && (
                      <div className="bg-white border border-slate-150 rounded-lg p-2">
                        <p className="text-[10px] font-bold text-slate-450 flex items-center gap-1">
                          <Sparkles size={10} className="text-[#0D7377]" /> Confidence Scores Breakdown
                        </p>
                        <div className="space-y-2 mt-1.5 divide-y divide-slate-100">
                          {selectedBooking.aiRecommendedProviders.map((rp) => (
                            <div key={rp.id} className="pt-2 text-[10.5px]">
                              <div className="flex justify-between font-bold text-slate-800">
                                <span className={rp.id === selectedBooking.providerId ? 'text-[#0D7377]' : ''}>
                                  {rp.name} (ID: {rp.id})
                                </span>
                                <span className="bg-[#0d7377]/10 text-[#0D7377] px-1.5 py-0.5 rounded text-[9px]">
                                  {rp.score}% match
                                </span>
                              </div>
                              <p className="text-slate-500 mt-0.5 italic leading-snug">{rp.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Box */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Transaction Ledger</h3>
                <div className="bg-slate-55 border border-slate-150 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-slate-650 font-medium">
                    <span>Base Booking Billing:</span>
                    <span className="font-extrabold text-slate-800">Rs{selectedBooking.amount}</span>
                  </div>
                  <div className="flex justify-between text-slate-650 font-medium">
                    <span>Service Surcharges (Tax):</span>
                    <span className="font-extrabold text-slate-800">Rs{selectedBooking.serviceCharges}</span>
                  </div>
                  <div className="flex justify-between text-slate-650 font-medium pb-1 border-b border-dashed border-slate-200">
                    <span>Platform Commission (20%):</span>
                    <span className="font-extrabold text-indigo-650">Rs{selectedBooking.platformCommission}</span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-bold text-xs pt-1">
                    <span className="text-[#0D7377]">Gross Partner Share:</span>
                    <span className="text-base font-black text-[#0D7377]">Rs{selectedBooking.netRevenue}</span>
                  </div>
                </div>
              </div>

              {/* Client Review Box */}
              {selectedBooking.feedbackRating && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Client Feedback Response</h3>
                  <div className="bg-amber-50/40 border border-amber-100 p-3 rounded-lg">
                    <div className="flex justify-between items-center bg-white/70 px-2 py-1 rounded-md">
                      <span className="font-bold text-amber-600">Operations Rating</span>
                      <span className="text-amber-500 font-black">{"⭐".repeat(selectedBooking.feedbackRating)}</span>
                    </div>
                    {selectedBooking.feedbackText && (
                      <p className="text-slate-650 italic leading-relaxed text-[11px] mt-1.5 pl-1 font-medium">
                        "{selectedBooking.feedbackText}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-semibold h-96 flex flex-col items-center justify-center">
              <Calendar size={32} className="text-slate-300 mb-2.5" />
              Select any matching case entry from the ledger to load geolocation coordinates, AI confidence scores, invoices, and client feedback reviews.
            </div>
          )}
        </div>
      </div>

      {/* STYLIZED INVOICE MODAL MODAL */}
      {showInvoiceModal && selectedBooking && (
        <div id="invoice-modal" className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden space-y-4">
            <button onClick={() => setShowInvoiceModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>

            <div className="text-center pt-2">
              <div className="w-12 h-12 rounded-full bg-teal-50 text-[#0D7377] flex items-center justify-center mx-auto text-xl font-bold animate-karigar-bob">
                Rs
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-2.5">Platform Booking Invoice</h3>
              <p className="text-[10px] font-bold tracking-widest text-[#0D7377] uppercase mt-0.5">EST. TRANSACTION RECEIPT</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-200 py-3 text-xs space-y-2">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-450">Invoice Token:</span>
                <span className="text-slate-800 font-mono font-bold">INV-{selectedBooking.id}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-450">Billing Date:</span>
                <span className="text-slate-800 font-bold">{selectedBooking.bookingDate}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-450">Beneficiary Customer:</span>
                <span className="text-slate-800 font-bold">{selectedBooking.customerName}</span>
              </div>
              <div className="flex justify-between font-semibold pb-2 border-b border-slate-100">
                <span className="text-slate-450">Dispatched Contractor:</span>
                <span className="text-[#0D7377] font-bold">{selectedBooking.providerName}</span>
              </div>

              <div className="flex justify-between font-semibold">
                <span className="text-slate-450">Skill Diagnostics Fee:</span>
                <span className="text-slate-800 font-bold">Rs{selectedBooking.amount}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-450">Service Platform Surcharge:</span>
                <span className="text-slate-800 font-bold">Rs{selectedBooking.serviceCharges}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900 font-bold text-sm pt-2 bg-slate-50 p-2 rounded-lg">
                <span className="text-slate-800">Total Charged Amt:</span>
                <span className="text-base font-black text-[#0D7377]">Rs{selectedBooking.amount + selectedBooking.serviceCharges}</span>
              </div>
            </div>

            <div className="text-center">
              <span className="block text-[9px] font-bold text-slate-400 select-none uppercase">Authorized Karigar.ai Settlement System</span>
              <button 
                onClick={() => {
                  alert("Executing browser print dispatch pipeline...");
                }}
                className="mt-3.5 w-full py-2 bg-[#0D7377] hover:bg-[#0a5c5f] text-white font-bold rounded-lg transition-colors text-xs"
              >
                Download Ledger Printout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTE REGISTRATION MODAL */}
      {showDisputeModal && selectedBooking && (
        <div id="dispute-creation-modal" className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button onClick={() => setShowDisputeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>

            <div className="flex gap-2.5 items-center pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Initiate Escalation Dispute</h3>
                <p className="text-[10px] text-slate-450 font-semibold uppercase mt-0.5">Booking Reference: {selectedBooking.id}</p>
              </div>
            </div>

            <form onSubmit={handleCreateDispute} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg text-slate-650 space-y-1">
                <p><strong className="text-slate-800">Client:</strong> {selectedBooking.customerName}</p>
                <p><strong className="text-slate-800">Partner:</strong> {selectedBooking.providerName}</p>
                <p><strong className="text-slate-800">Billed Amount:</strong> Rs{selectedBooking.amount}</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1.5">Detailed Complaint/Investigation Notes</label>
                <textarea
                  required
                  rows={4}
                  value={disputeComplaint}
                  onChange={(e) => setDisputeComplaint(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-[#0D7377] focus:outline-none"
                  placeholder="Record customer's exact verbal or chat screenshots of complaint. These details populate our dispute panel for arbitrations..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDisputeModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-bold rounded-lg text-slate-600 transition-colors"
                >
                  Terminate Case
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg transition-colors shadow-md shadow-amber-500/10"
                >
                  File Complaint Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
