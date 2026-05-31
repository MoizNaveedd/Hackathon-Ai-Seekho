import { useEffect, useMemo, useState } from "react";
import { Search, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { fetchBookings } from "@/lib/api";
import { KarigarLoader } from "@/components/ui/karigar-loader";
import { ChatPanel } from "@/components/chat/ChatPanel";

interface ChatItem {
  id: string | number;
  name: string;
  service?: string;
  lastDate?: string;
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Messages() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      setLoading(false);
      return;
    }
    let user: { id?: string } | null = null;
    try {
      user = JSON.parse(stored);
    } catch {
      setLoading(false);
      return;
    }
    const providerId = user?.id?.replace("usr_", "") || user?.id || "";
    if (!providerId) {
      setLoading(false);
      return;
    }

    fetchBookings(providerId, 1, 25)
      .then((res) => {
        const items: ChatItem[] = (res.bookings || []).map((b: any) => ({
          id: b.id,
          name: b.user?.name || "Customer",
          service: b.service_type || b.provider?.service_type,
          lastDate: b.booking_date,
        }));
        setChats(items);
        if (items.length > 0) setSelectedId(items[0].id);
      })
      .catch(() => {
        /* keep list empty on failure */
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      chats.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
      ),
    [chats, search]
  );

  const selected = chats.find((c) => c.id === selectedId) || null;

  return (
    <div className="h-full flex gap-4 max-w-7xl mx-auto">
      {/* Left — chat history list (25%) */}
      <div className="w-1/4 min-w-[240px] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2 mb-3">
            <MessageSquare size={18} className="text-[#0D7377]" /> Messages
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="pl-9 h-9 bg-slate-50 border-slate-200 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scroll-none">
          {loading ? (
            <div className="flex justify-center py-16">
              <KarigarLoader label="Loading chats..." />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="p-3 rounded-full bg-slate-50 mb-3">
                <MessageSquare className="text-slate-300" size={28} />
              </div>
              <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                No chats found
              </p>
            </div>
          ) : (
            filtered.map((chat) => {
              const active = chat.id === selectedId;
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedId(chat.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 border-b border-slate-50 transition-colors text-left",
                    active ? "bg-[#0D7377]/5" : "hover:bg-slate-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white",
                      active ? "bg-[#0D7377]" : "bg-slate-400"
                    )}
                  >
                    {initialsOf(chat.name)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-bold truncate",
                          active ? "text-[#0D7377]" : "text-slate-800"
                        )}
                      >
                        {chat.name}
                      </span>
                      {chat.lastDate && (
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">
                          {chat.lastDate}
                        </span>
                      )}
                    </div>
                    {chat.service && (
                      <span className="text-[10px] text-slate-400 truncate uppercase tracking-wide font-bold">
                        {chat.service}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right — chat view for the selected user (75%) */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div key={selected.id} className="h-full w-full">
            <ChatPanel customerName={selected.name} bookingId={selected.id} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white border border-slate-200 rounded-2xl shadow-sm text-center px-6">
            <div className="h-16 w-16 rounded-2xl bg-[#0D7377]/10 flex items-center justify-center mb-4">
              <User size={30} className="text-[#0D7377]" />
            </div>
            <p className="text-slate-700 font-black tracking-tight">Select a conversation</p>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Choose a chat from the list to view the conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
