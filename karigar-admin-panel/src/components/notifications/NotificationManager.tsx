import React, { useState } from 'react';
import { Bell, Send, History, CheckCircle, RefreshCw, Layers, Users, ShieldAlert } from 'lucide-react';
import { NotificationHistoryItem, NotificationAudience } from '../../types';

interface NotificationProps {
  notifications: NotificationHistoryItem[];
  onUpdateNotifications: (updated: NotificationHistoryItem[]) => void;
}

export default function NotificationManager({ notifications, onUpdateNotifications }: NotificationProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<NotificationAudience>('All Users');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  // Send Broadcast
  const handleBroadCastSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    setSending(true);
    setSuccess(false);

    setTimeout(() => {
      setSending(false);
      setSuccess(true);

      // Create Notification Entity
      const newNoti: NotificationHistoryItem = {
        id: `NOTI-${String(notifications.length + 1).padStart(3, '0')}`,
        title,
        message,
        sentDate: new Date().toISOString().split('T')[0],
        audience,
        deliveryStatus: 'Sent',
        recipientsCount: audience === 'All Users' ? 4500 : audience === 'All Providers' ? 380 : 120
      };

      onUpdateNotifications([newNoti, ...notifications]);

      // Reset form
      setTitle('');
      setMessage('');

      // Auto clear success alert
      setTimeout(() => {
        setSuccess(false);
      }, 4000);
    }, 1200);
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 leading-none">Notifications & Broadcast Manager</h1>
        <p className="text-xs text-slate-500 mt-1">Dispatch localized mobile push alerts, coordinate segment broadcasts, and monitor delivery history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Columns: Broadcast push dispatch form (1 Column wide) */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Send size={15} className="text-[#0D7377]" /> Send Corporate Multi-Channel Broadcast
          </h3>

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-semibold flex items-start gap-2 animate-fade-in select-none">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Broadcast Dispatch Authorized</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Mobile FCM/APNS clusters are broadcasting push notifications instantly to targets.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleBroadCastSend} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-655 uppercase mb-1">Target Audience Segment</label>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10.5px]">
                {(['All Users', 'All Providers', 'Selected Segment'] as NotificationAudience[]).map((segment) => (
                  <button
                    key={segment}
                    type="button"
                    onClick={() => setAudience(segment)}
                    className={`py-2 px-1 border font-semibold rounded-lg transition-all ${
                      audience === segment
                        ? 'border-[#0D7377] bg-[#0d7377]/5 text-[#0D7377]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600 bg-white'
                    }`}
                  >
                    {segment === 'All Users' ? 'Clients' : segment === 'All Providers' ? 'Contractors' : 'Segments'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-655 uppercase mb-1.5">Broadcast Title Header</label>
              <input
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-200 bg-white rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none"
                placeholder="e.g. Warning: Active Rain Surcharge Active"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-655 uppercase mb-1.5">Notification Body Message (160 Chars)</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={160}
                className="w-full border border-slate-200 bg-white rounded-lg p-2 focus:ring-1 focus:ring-[#0D7377] focus:outline-none leading-relaxed"
                placeholder="Compose push message e.g. Due to persistent rainfall in Karachi, platform hourly rates will experience a 10% premium adjustments..."
              />
              <span className="block text-right text-[10px] text-slate-400 font-bold select-none mt-0.5">
                {160 - message.length} characters remaining
              </span>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 bg-[#0D7377] hover:bg-[#0a5c5f] text-white font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-[#0D7377]/10 disabled:opacity-50 text-xs"
            >
              {sending ? (
                <>
                  <RefreshCw size={13} className="animate-spin" /> Authorizing Dispatch...
                </>
              ) : (
                <>
                  <Send size={12} /> Release BroadCast Alert
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Columns: Multi-channel broad cast registry History list (2 Columns Wide on large displays) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <History size={15} className="text-[#0D7377]" /> Corporate Dispatch logs
            </h3>

            <div className="space-y-3.5">
              {notifications.length === 0 ? (
                <p className="text-slate-400 italic text-center py-8">Notification logs are empty.</p>
              ) : (
                notifications.map((noti) => (
                  <div key={noti.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2 relative hover:bg-slate-50/70 transition-colors">
                    <span className="absolute top-3.5 right-3.5 text-[9px] font-black text-[#0D7377] bg-[#0d7377]/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {noti.audience}
                    </span>

                    <div className="flex gap-2 items-start">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D7377] flex items-center justify-center shrink-0 mt-0.5 animate-karigar-bob">
                        <Bell size={14} />
                      </div>
                      <div>
                        <h4 className="text-slate-900 font-extrabold text-xs leading-snug">{noti.title}</h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">ID: {noti.id} • Dispatched Action: {noti.sentDate}</p>
                      </div>
                    </div>

                    <p className="text-slate-600 leading-relaxed font-semibold pl-10 text-[11px]">
                      "{noti.message}"
                    </p>

                    <div className="pl-10 text-[10px] text-slate-450 border-t border-slate-200/50 pt-2 flex items-center justify-between">
                      <span className="font-semibold text-slate-550">Delivery Segment Success Flag: <strong className="text-slate-800">{noti.deliveryStatus}</strong></span>
                      <span className="font-bold">Delivered: {noti.recipientsCount.toLocaleString()} devices</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
