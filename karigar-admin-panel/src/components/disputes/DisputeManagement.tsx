import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Search, 
  X, 
  MapPin, 
  CheckCircle, 
  ShieldAlert, 
  ChevronRight, 
  FolderOpen, 
  Clock, 
  User, 
  FileText 
} from 'lucide-react';
import { Dispute, DisputeStatus } from '../../types';

interface DisputeProps {
  disputes: Dispute[];
  onUpdateDisputes: (updated: Dispute[]) => void;
}

export default function DisputeManagement({ disputes, onUpdateDisputes }: DisputeProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<DisputeStatus | 'All'>('All');
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  // Form states to resolve case
  const [resolutionOutcome, setResolutionOutcome] = useState<'Refund client' | 'Payout provider' | 'Compromise split'>('Refund client');
  const [resolutionComment, setResolutionComment] = useState('');

  // Selected Dispute
  const selectedDispute = useMemo(() => {
    return disputes.find(d => d.id === selectedDisputeId) || null;
  }, [disputes, selectedDisputeId]);

  // Resolve Handler
  const handleResolveDispute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !resolutionComment) return;

    const notesSummary = `[Resolved via ${resolutionOutcome}]: ${resolutionComment}`;

    const updated = disputes.map(d => {
      if (d.id === selectedDispute.id) {
        return {
          ...d,
          status: 'Resolved' as DisputeStatus,
          resolutionNotes: notesSummary
        };
      }
      return d;
    });

    onUpdateDisputes(updated);
    setResolutionComment('');
    alert(`Dispute Case ID ${selectedDispute.id} has been marked as RESOLVED and archived.`);
  };

  // Filtered Disputes
  const filteredDisputes = useMemo(() => {
    return disputes.filter(d => {
      const matchesSearch = 
        d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.providerName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatusTab === 'All' || d.status === selectedStatusTab;

      return matchesSearch && matchesStatus;
    });
  }, [disputes, searchTerm, selectedStatusTab]);

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 leading-none">Operations Dispute Arbitration</h1>
        <p className="text-xs text-slate-500 mt-1">Review active complaints, aggregate evidence, and issue refund settlements.</p>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Side: Directory case registry lists */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3.5">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                id="dispute-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D7377] transition-all"
                placeholder="Search active cases by dispute reference ID, customer, booking ID..."
              />
            </div>

            {/* Status tab filters */}
            <div className="flex border-b border-slate-100 pb-1 gap-4 font-bold select-none text-slate-500 text-xs">
              {(['All', 'Open', 'In Review', 'Resolved'] as const).map((tab) => {
                const count = tab === 'All' ? disputes.length : disputes.filter(d => d.status === tab).length;

                return (
                  <button
                    key={tab}
                    onClick={() => setSelectedStatusTab(tab)}
                    className={`pb-2 px-1 relative transition-all ${
                      selectedStatusTab === tab
                        ? 'text-[#0D7377] border-b-2 border-[#0D7377] font-extrabold'
                        : 'hover:text-slate-900 font-bold'
                    }`}
                  >
                    {tab} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table-based cases list */}
          <div className="bg-white border border-slate-100 rounded-xl shadow-sm text-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="p-4">Case ID</th>
                    <th className="p-4">Linked Booking ID</th>
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Defending Provider</th>
                    <th className="p-4 text-right">Billed Amt</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDisputes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-semibold text-xs">
                        No dispute arbitration files registered under this tab.
                      </td>
                    </tr>
                  ) : (
                    filteredDisputes.map(d => (
                      <tr 
                        key={d.id} 
                        id={`dispute-row-${d.id}`}
                        onClick={() => setSelectedDisputeId(d.id)}
                        className={`cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedDisputeId === d.id ? 'bg-[#0d7377]/5 border-l-2 border-l-[#0D7377]' : ''
                        }`}
                      >
                        <td className="p-4 font-bold text-[#0D7377]">{d.id}</td>
                        <td className="p-4 font-bold text-slate-450">{d.bookingId}</td>
                        <td className="p-4 font-bold text-slate-900">{d.customerName}</td>
                        <td className="p-4 text-slate-750 font-semibold">{d.providerName}</td>
                        <td className="p-4 text-right font-bold text-slate-900">Rs{d.bookingAmount}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 text-[9px] font-extrabold rounded-full border ${
                            d.status === 'Resolved' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : d.status === 'In Review'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="p-4 text-right text-slate-400 font-bold">{d.createdAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side Details panel */}
        <div id="dispute-aux-panel">
          {selectedDispute ? (
            <div id="dispute-detail-card" className="bg-white border border-slate-150 rounded-xl p-5 shadow-sm space-y-4 text-xs animate-fade-in pb-6">
              {/* Card Title */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">Case Examination: {selectedDispute.id}</h2>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">LIPECYCLE STATUS: {selectedDispute.status}</p>
                </div>
                <button onClick={() => setSelectedDisputeId(null)} className="p-1 rounded bg-slate-50 border border-slate-100 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              </div>

              {/* Status Warning Alert if Unresolved */}
              {selectedDispute.status !== 'Resolved' && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg font-semibold flex gap-2">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Pending Compliance Settlement</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">Please review client complaint and contractor response below before arbitrating coordinates.</p>
                  </div>
                </div>
              )}

              {/* Case booking basic identifiers */}
              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <p><strong className="text-slate-800">Booking Reference:</strong> {selectedDispute.bookingId}</p>
                <p><strong className="text-slate-800">Category Service:</strong> {selectedDispute.bookingServiceType}</p>
                <p><strong className="text-slate-800">Billed Gross Value:</strong> Rs{selectedDispute.bookingAmount}</p>
              </div>

              {/* Customer Complaint description */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Customer Complaint Text</h4>
                <div className="bg-rose-50/20 border border-rose-100 p-3 rounded-lg relative">
                  <span className="absolute top-2 right-2 text-[9px] font-extrabold text-rose-550 flex items-center gap-0.5 uppercase"><User size={10} /> Client</span>
                  <p className="text-slate-650 italic leading-relaxed mt-1 font-medium">"{selectedDispute.complaintText}"</p>
                </div>
              </div>

              {/* Provider response if applicable */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Contractor Response statement</h4>
                {selectedDispute.providerResponseText ? (
                  <div className="bg-blue-50/20 border border-blue-100 p-3 rounded-lg relative">
                    <span className="absolute top-2 right-2 text-[9px] font-extrabold text-blue-650 flex items-center gap-0.5 uppercase">👷 Partner</span>
                    <p className="text-slate-650 italic leading-relaxed mt-1 font-medium">"{selectedDispute.providerResponseText}"</p>
                  </div>
                ) : (
                  <p className="text-slate-400 italic bg-slate-50 p-2 text-xs rounded-md">Partner response remains empty; awaiting scheduled callback dispatch.</p>
                )}
              </div>

              {/* Evidence attachments */}
              {selectedDispute.evidenceUrls && selectedDispute.evidenceUrls.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Arbitration Evidence Uploads</h4>
                  <div className="flex gap-2">
                    {selectedDispute.evidenceUrls.map((url, idx) => (
                      <div key={idx} className="w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group">
                        <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-all"
                        >
                          Expand
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolution Form if pending, otherwise show resolution notes */}
              {selectedDispute.status !== 'Resolved' ? (
                <form onSubmit={handleResolveDispute} className="space-y-3 pt-3 border-t border-slate-150">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-1">
                    <CheckCircle size={12} className="text-emerald-500" /> Arbitrate Settlement Decision
                  </h4>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-650 uppercase mb-1">Settlement Action</label>
                    <select
                      value={resolutionOutcome}
                      onChange={(e) => setResolutionOutcome(e.target.value as any)}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white font-semibold"
                    >
                      <option value="Refund client">Full Payout Refund to Client (24hr credit)</option>
                      <option value="Payout provider">Decline Claim & Release Provider Settlement Share</option>
                      <option value="Compromise split">50/50 Compromised Settlement Split (Platform credit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-655 uppercase mb-1">Final Settlement Resolution Comments</label>
                    <textarea
                      required
                      rows={2.5}
                      value={resolutionComment}
                      onChange={(e) => setResolutionComment(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0D7377]"
                      placeholder="Comment on reasoning (e.g. Verified lack of equipment cleaning check...)"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-650 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors text-xs"
                    style={{ backgroundColor: '#10B981' }}
                  >
                    Authorize & Disburse Settlement
                  </button>
                </form>
              ) : (
                <div className="space-y-2 pt-3 border-t border-slate-150">
                  <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest pl-1 flex items-center gap-1 select-none">
                    <CheckCircle size={12} className="text-emerald-500 shrink-0" /> Dispute Archive Resolved
                  </h4>
                  <div className="bg-emerald-50/50 border border-emerald-150 p-3 rounded-lg text-emerald-800 leading-relaxed font-semibold">
                    {selectedDispute.resolutionNotes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs font-semibold h-96 flex flex-col items-center justify-center">
              <AlertTriangle size={32} className="text-slate-300 mb-2.5" />
              Select a active dispute case entry from the registry list to examine customer complaints, provider defensive claims, evidence photos and file resolutions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
