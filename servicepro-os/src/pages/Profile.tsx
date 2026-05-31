
import { useMemo, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Phone,
  Briefcase,
  BadgeCheck,
  ShieldAlert,
  AlertTriangle,
  Wallet,
  Info,
  Star,
  Calendar,
  Plus,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StoredUser {
  id?: number | string;
  name?: string;
  email?: string;
  phone?: string;
  service_type?: string;
  role?: string;
  avatar?: string;
  created_at?: string;
  hourly_rate?: number;
}

// Static system warnings — replace with API data when available.
const SYSTEM_WARNINGS = [
  {
    title: "Late Arrival Reported",
    detail: "You arrived 25 minutes late for booking #B102. Repeated delays may affect your ranking.",
    severity: "high" as const,
    date: "May 24, 2026",
  },
  {
    title: "Incomplete Job Notes",
    detail: "Booking #B097 was closed without service notes. Always document the work performed.",
    severity: "medium" as const,
    date: "May 18, 2026",
  },
  {
    title: "Profile Photo Missing",
    detail: "A professional profile photo builds customer trust and improves bookings.",
    severity: "low" as const,
    date: "May 10, 2026",
  },
];

// Static wallet credits — replace with API data when available.
const CURRENT_CREDITS = 42;
const RECOMMENDATION_THRESHOLD = 50;

const severityStyles = {
  high: { wrap: "bg-rose-50 border-rose-100", icon: "bg-rose-100 text-rose-600", label: "text-rose-600" },
  medium: { wrap: "bg-amber-50 border-amber-100", icon: "bg-amber-100 text-amber-600", label: "text-amber-600" },
  low: { wrap: "bg-slate-50 border-slate-200", icon: "bg-slate-100 text-slate-500", label: "text-slate-500" },
};

export default function Profile() {
  const user = useMemo<StoredUser | null>(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }, []);

  const name = user?.name || "Alex Rivers";
  const role = user?.service_type || user?.role || "AC Technician";
  const avatarSrc = user?.avatar;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const isRecommended = CURRENT_CREDITS > RECOMMENDATION_THRESHOLD;

  const [rateInput, setRateInput] = useState(
    user?.hourly_rate != null ? String(user.hourly_rate) : ""
  );
  const [savedRate, setSavedRate] = useState<number | null>(
    user?.hourly_rate != null ? user.hourly_rate : null
  );
  const [savingRate, setSavingRate] = useState(false);

  const handleSaveRate = (e: FormEvent) => {
    e.preventDefault();
    const rate = Number(rateInput);
    if (!rateInput.trim() || Number.isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid hourly rate.");
      return;
    }

    setSavingRate(true);
    try {
      const stored = localStorage.getItem("user");
      const current = stored ? JSON.parse(stored) : {};
      localStorage.setItem("user", JSON.stringify({ ...current, hourly_rate: rate }));
      setSavedRate(rate);
      toast.success("Hourly rate updated.");
    } catch {
      toast.error("Failed to save hourly rate.");
    } finally {
      setSavingRate(false);
    }
  };

  const details = [
    { icon: Mail, label: "Email", value: user?.email || "alex@provider.com" },
    { icon: Phone, label: "Phone", value: user?.phone || "+1 (555) 000-0000" },
    { icon: Briefcase, label: "Service Type", value: role },
    {
      icon: Calendar,
      label: "Member Since",
      value: user?.created_at
        ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : "January 2026",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Section */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
          <CardContent className="p-0">
            {/* Header banner */}
            <div className="bg-[#0F172A] px-8 py-8 flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-[#0D7377] border-2 border-[#0D7377] overflow-hidden shrink-0 flex items-center justify-center">
                {false ? (
                  <img src={avatarSrc} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-white tracking-wide">{initials}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white truncate">{name}</h2>
                  <BadgeCheck size={18} className="text-[#0D7377] shrink-0" />
                </div>
                <span className="inline-block mt-2 px-2.5 py-1 bg-white/10 text-white rounded-md text-[10px] font-bold uppercase tracking-widest">
                  {role}
                </span>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-1.5 text-amber-400">
                <Star size={16} className="fill-amber-400" />
                <span className="text-white font-black text-lg">4.8</span>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest self-end mb-1">/ 5.0</span>
              </div>
            </div>

            {/* Details */}
            <div className="p-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5">
                Account Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {details.map((d) => (
                  <div
                    key={d.label}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[#0D7377] shrink-0">
                      <d.icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        {d.label}
                      </p>
                      <p className="text-sm font-bold text-slate-800 truncate">{d.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet / Credits */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-[#0D7377] text-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold tracking-tight uppercase flex items-center gap-2">
                <Wallet size={18} />
                Wallet Credits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className="text-[10px] uppercase font-bold opacity-50 tracking-widest mb-1">
                  Current Balance
                </p>
                <p className="text-4xl font-black">
                  {CURRENT_CREDITS}
                  <span className="text-base font-bold opacity-60 ml-1.5">credits</span>
                </p>
              </div>

              <div
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border",
                  isRecommended
                    ? "bg-white/10 border-white/20"
                    : "bg-amber-400/15 border-amber-300/30"
                )}
              >
                <Info size={18} className="shrink-0 mt-0.5 text-amber-200" />
                <p className="text-xs font-medium leading-relaxed">
                  {isRecommended ? (
                    <>
                      You are eligible to be <span className="font-black">recommended</span> to
                      customers — your balance is above {RECOMMENDATION_THRESHOLD} credits.
                    </>
                  ) : (
                    <>
                      You will only be <span className="font-black">recommended</span> to customers
                      once your wallet has more than {RECOMMENDATION_THRESHOLD} credits. Top up{" "}
                      {RECOMMENDATION_THRESHOLD - CURRENT_CREDITS + 1} more to qualify.
                    </>
                  )}
                </p>
              </div>

              <Button className="w-full bg-white text-[#0D7377] hover:bg-white/90 font-bold rounded-xl">
                <Plus size={18} className="mr-1" />
                Topup Wallet
              </Button>
            </CardContent>
          </Card>

          {/* Hourly Rate */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2 text-slate-800">
                <Clock size={18} className="text-[#0D7377]" />
                Hourly Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveRate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly-rate" className="text-slate-600">
                    Your rate per hour
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      Rs.
                    </span>
                    <Input
                      id="hourly-rate"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step="1"
                      placeholder="0"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      className="pl-11 font-bold"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    {savedRate != null
                      ? `Current rate: Rs. ${savedRate.toLocaleString()} / hour`
                      : "Set the rate customers will be charged per hour."}
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={savingRate}
                  className="w-full bg-[#0D7377] text-white hover:bg-[#0D7377]/90 font-bold rounded-xl"
                >
                  {savingRate ? "Saving..." : "Save Rate"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Warnings */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2 text-slate-800">
            <ShieldAlert size={18} className="text-rose-500" />
            System Warnings
          </CardTitle>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {SYSTEM_WARNINGS.length} Active
          </span>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {SYSTEM_WARNINGS.map((warning, i) => {
              const styles = severityStyles[warning.severity];
              return (
                <div
                  key={i}
                  className={cn("flex items-start gap-4 p-4 rounded-xl border", styles.wrap)}
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                      styles.icon
                    )}
                  >
                    <AlertTriangle size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-800 truncate">{warning.title}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                        {warning.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{warning.detail}</p>
                    <span
                      className={cn(
                        "inline-block mt-2 text-[10px] font-black uppercase tracking-widest",
                        styles.label
                      )}
                    >
                      {warning.severity} priority
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
