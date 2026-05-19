
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Settings,
  AlertCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Banknote
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ClipboardList, label: "Bookings", path: "/bookings" },
  { icon: Calendar, label: "Schedule", path: "/calendar" },
  { icon: Banknote, label: "Pricing & Invoices", path: "/pricing" },
  { icon: AlertCircle, label: "Disputes", path: "/disputes" },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const user = useMemo(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  }, []);

  const initials = user?.name
    ? (user.name as string).split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AR";

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-[#0F172A] text-white transition-all duration-300 border-r border-slate-800",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-6 h-20 border-b border-slate-800">
        {isCollapsed ? (
          <img src="/logo.png" alt="Karigar Logo" className="w-8 h-8 object-contain rounded" />
        ) : (
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <img src="/logo.png" alt="Karigar Logo" className="w-8 h-8 object-contain rounded shrink-0" />
            <span className="font-bold text-lg tracking-tight text-white truncate">Service App</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-4 px-4 py-2.5 rounded-lg transition-all duration-200 group",
              location.pathname === item.path
                ? "bg-[#0D7377] text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <item.icon size={18} className={cn(
              "shrink-0",
              location.pathname === item.path ? "text-white" : "group-hover:text-white"
            )} />
            {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        {!isCollapsed && (
          <div className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-600 border-2 border-[#0D7377] flex-shrink-0 flex items-center justify-center text-xs overflow-hidden text-white font-bold">
              {initials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-xs font-semibold truncate leading-none mb-1">{user?.name || "Alex Rivers"}</span>
              <span className="text-slate-400 text-[10px] truncate uppercase font-bold tracking-wider">{user?.service_type || user?.role || "AC Technician"}</span>
            </div>
          </div>
        )}
        <Link
          to="/login"
          onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); }}
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
          )}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium truncate">Logout</span>}
        </Link>
      </div>
    </div>
  );
}
