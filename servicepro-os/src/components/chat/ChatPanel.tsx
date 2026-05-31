import { useState, useEffect, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  Send,
  User,
  CheckCheck,
  Sparkles,
  Receipt,
  Pencil,
  BadgeCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  InvoiceEstimateDialog,
  type InvoiceEstimate,
} from "@/components/chat/InvoiceEstimateDialog";

interface ChatMessage {
  id: number;
  text: string;
  sender: "provider" | "customer";
  time: string;
  invoice?: InvoiceEstimate;
}

const QUICK_REPLIES = [
  "Hi! I've accepted your booking. I'll be there on time. 👍",
  "I'm on my way to your location now.",
  "Could you please share more details about the issue?",
];

const CUSTOMER_RESPONSES = [
  "Thank you so much! 🙏",
  "Great, that works for me.",
  "Sure, let me share a bit more detail.",
  "Sounds good. How long do you think it'll take?",
  "Perfect, I'll be home waiting.",
  "Okay, please let me know once you arrive.",
  "Appreciate the quick response! 👍",
  "Got it. See you soon!",
  "That's fine. Do you accept cash payment?",
  "No problem, take your time.",
];

function nowTime() {
  return new Date().toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface ChatPanelProps {
  customerName: string;
  /** Booking this chat belongs to. Used to persist the selected booking invoice. */
  bookingId?: string | number;
  /** Optional back handler. When provided, a back button is shown in the header. */
  onBack?: () => void;
}

export function ChatPanel({ customerName, bookingId, onBack }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      text: "Hello! I just placed a booking for my AC. Hope you can help.",
      sender: "customer",
      time: "10:24 AM",
    },
    {
      id: 2,
      text: "Looking forward to getting this sorted out soon.",
      sender: "customer",
      time: "10:25 AM",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(3);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  /** Id of the invoice message currently set as the official booking invoice. */
  const [bookingInvoiceId, setBookingInvoiceId] = useState<number | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: msgIdRef.current++, text: trimmed, sender: "provider", time: nowTime() },
    ]);
    setInput("");

    // Mock customer reply from a random pool
    const reply = CUSTOMER_RESPONSES[Math.floor(Math.random() * CUSTOMER_RESPONSES.length)];
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: msgIdRef.current++, text: reply, sender: "customer", time: nowTime() },
      ]);
    }, 1200);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const openNewInvoice = () => {
    setEditingId(null);
    setInvoiceOpen(true);
  };

  const openEditInvoice = (id: number) => {
    setEditingId(id);
    setInvoiceOpen(true);
  };

  const persistBookingInvoice = (estimate: InvoiceEstimate) => {
    if (bookingId == null) return;
    try {
      localStorage.setItem(`bookingInvoice:${bookingId}`, JSON.stringify(estimate));
    } catch {
      /* ignore storage failures */
    }
  };

  const setAsBookingInvoice = (id: number, estimate: InvoiceEstimate) => {
    setBookingInvoiceId(id);
    persistBookingInvoice(estimate);
    toast.success("Estimate set as the booking invoice.");
  };

  const handleInvoiceSubmit = (estimate: InvoiceEstimate, asBookingInvoice = false) => {
    if (editingId !== null) {
      // Update the existing invoice message in place.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingId ? { ...m, invoice: estimate, time: nowTime() } : m
        )
      );
      if (asBookingInvoice) setAsBookingInvoice(editingId, estimate);
      // Keep the persisted booking invoice in sync when editing the active one.
      else if (editingId === bookingInvoiceId) persistBookingInvoice(estimate);
    } else {
      const newId = msgIdRef.current++;
      setMessages((prev) => [
        ...prev,
        {
          id: newId,
          text: "Here's your booking estimate.",
          sender: "provider",
          time: nowTime(),
          invoice: estimate,
        },
      ]);
      if (asBookingInvoice) setAsBookingInvoice(newId, estimate);
    }
    setEditingId(null);
  };

  const editingEstimate =
    editingId !== null
      ? messages.find((m) => m.id === editingId)?.invoice ?? null
      : null;

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          {onBack && (
            <Button
              variant="outline"
              size="icon"
              onClick={onBack}
              className="rounded-full border-slate-200 hover:bg-slate-50 h-10 w-10 shrink-0"
            >
              <ChevronLeft size={20} />
            </Button>
          )}
          <div className="relative">
            <div className="h-11 w-11 rounded-full bg-[#0D7377] flex items-center justify-center text-white shadow-md">
              <User size={22} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-800 tracking-tight truncate">{customerName}</h2>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              onClick={openNewInvoice}
              className="h-10 bg-[#0D7377] hover:bg-[#0b6366] font-black text-[11px] uppercase tracking-widest gap-2 rounded-full px-4 shadow-lg shadow-[#0D7377]/20"
            >
              <Receipt size={15} /> Estimate Invoice
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-[#F8FAFC] scroll-smooth scroll-none"
        >
          <div className="flex justify-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
              Today
            </span>
          </div>

          {messages.map((msg) => {
            const isProvider = msg.sender === "provider";
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300",
                  isProvider ? "justify-end" : "justify-start"
                )}
              >
                {!isProvider && (
                  <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <User size={14} />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] shadow-sm",
                    msg.invoice
                      ? "rounded-2xl rounded-br-md bg-white border border-slate-200 overflow-hidden w-[340px] shadow-md"
                      : cn(
                          "px-4 py-2.5 rounded-2xl",
                          isProvider
                            ? "bg-[#0D7377] text-white rounded-br-md"
                            : "bg-white text-slate-700 border border-slate-100 rounded-bl-md"
                        )
                  )}
                >
                  {msg.invoice ? (
                    <div className="flex flex-col">
                      {/* Branded invoice header */}
                      <div className="bg-[#0D7377] px-5 pt-5 pb-5 text-white">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0">
                              <img
                                src="/logo.png"
                                alt="Karigar AI"
                                className="h-6 w-6 object-contain"
                              />
                            </div>
                            <div className="leading-tight">
                              <p className="text-sm font-black tracking-tight">
                                Karigar<span className="text-white/60">.ai</span>
                              </p>
                              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/70">
                                Service Estimate
                              </p>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-full">
                            {bookingInvoiceId === msg.id ? (
                              <>
                                <BadgeCheck size={11} /> Booking Invoice
                              </>
                            ) : (
                              <>
                                <Receipt size={11} /> Estimate
                              </>
                            )}
                          </span>
                        </div>
                        <div className="mt-4 flex items-end justify-between">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">
                              Invoice No.
                            </p>
                            <p className="text-xs font-black tracking-wide">
                              EST-{String(msg.id).padStart(4, "0")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-white/60">
                              Issued
                            </p>
                            <p className="text-xs font-black tracking-wide">{msg.time}</p>
                          </div>
                        </div>
                      </div>

                      {/* Billed to */}
                      <div className="px-5 pt-4 pb-3 border-b border-dashed border-slate-200">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                          Billed To
                        </p>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{customerName}</p>
                      </div>

                      {/* Line items */}
                      <div className="px-5 py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Description
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Amount
                          </span>
                        </div>
                        {msg.invoice.items.map((it, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 text-xs">
                            <span className="font-semibold text-slate-700 leading-snug">
                              {it.name}
                            </span>
                            <span className="font-black text-slate-800 shrink-0 tabular-nums">
                              Rs. {it.price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between gap-3 text-xs pt-3 border-t border-slate-100">
                          <span className="font-semibold text-slate-500">Visiting Charges</span>
                          <span className="font-black text-slate-800 tabular-nums">
                            Rs. {(msg.invoice.visitingCharge ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-semibold text-slate-500">
                            Service Fee
                            {msg.invoice.hours != null && (
                              <span className="text-slate-400 font-medium">
                                {" "}
                                ({msg.invoice.hours} hr)
                              </span>
                            )}
                          </span>
                          <span className="font-black text-slate-800 tabular-nums">
                            Rs. {msg.invoice.serviceFee.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="mx-5 mb-3 flex items-center justify-between rounded-xl bg-[#0D7377]/5 border border-[#0D7377]/10 px-4 py-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#0D7377]">
                          Total Estimate
                        </span>
                        <span className="text-lg font-black text-[#0D7377] tabular-nums">
                          Rs. {msg.invoice.total.toLocaleString()}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 px-5 pb-3">
                        <button
                          type="button"
                          onClick={() => openEditInvoice(msg.id)}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#0D7377] hover:text-[#0b6366] bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full transition-colors active:scale-95"
                        >
                          <Pencil size={11} /> Edit
                        </button>
                        {bookingInvoiceId === msg.id ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                            <BadgeCheck size={12} /> Booking Invoice
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAsBookingInvoice(msg.id, msg.invoice!)}
                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white bg-[#0D7377] hover:bg-[#0b6366] px-3 py-1.5 rounded-full transition-colors active:scale-95 shadow-sm"
                          >
                            <BadgeCheck size={12} /> Set as Booking Invoice
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1 px-5 pb-2 text-slate-400">
                        <span className="text-[10px] font-bold">{msg.time}</span>
                        <CheckCheck size={12} />
                      </div>

                      {/* Footer note */}
                      <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100">
                        <p className="text-[9px] font-medium text-slate-400 text-center tracking-wide">
                          Estimate generated via Karigar.ai · Final amount may vary
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                      <div
                        className={cn(
                          "flex items-center gap-1 mt-1 justify-end",
                          isProvider ? "text-white/70" : "text-slate-400"
                        )}
                      >
                        <span className="text-[10px] font-bold">{msg.time}</span>
                        {isProvider && <CheckCheck size={12} />}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Replies */}
        <div className="px-6 pt-4 bg-white border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles size={12} className="text-[#0D7377]" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Replies</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                onClick={() => sendMessage(reply)}
                className="text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-teal-50 hover:text-[#0D7377] border border-slate-200 hover:border-[#0D7377]/30 px-3.5 py-2 rounded-full transition-all active:scale-95"
              >
                {reply}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-3 px-6 py-4 bg-white shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 h-12 rounded-full bg-slate-50 border-slate-200 px-5 text-sm font-medium focus-visible:ring-[#0D7377]/30 focus-visible:border-[#0D7377]"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim()}
            className="h-12 w-12 rounded-full bg-[#0D7377] hover:bg-[#0b6366] shadow-lg shadow-[#0D7377]/20 shrink-0 disabled:opacity-40 disabled:shadow-none"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>

      <InvoiceEstimateDialog
        open={invoiceOpen}
        onOpenChange={(o) => {
          setInvoiceOpen(o);
          if (!o) setEditingId(null);
        }}
        onAttach={handleInvoiceSubmit}
        initialEstimate={editingEstimate}
      />
    </div>
  );
}
