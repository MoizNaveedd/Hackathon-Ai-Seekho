import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Receipt, Paperclip, Check, Clock, BadgeCheck } from "lucide-react";

/** Default flat charge for the provider visiting the customer (editable). */
export const DEFAULT_VISITING_CHARGE = 200;
/** Rate charged per hour of service work. */
export const HOURLY_RATE = 500;
/** Default number of hours pre-filled in the estimate. */
export const DEFAULT_HOURS = 1;

export interface InvoiceItem {
  id: number;
  name: string;
  price: number;
}

export interface InvoiceEstimate {
  items: { name: string; price: number }[];
  visitingCharge: number;
  hours: number;
  hourlyRate: number;
  /** Labour fee = hourlyRate * hours. */
  serviceFee: number;
  subtotal: number;
  total: number;
}

interface InvoiceEstimateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Attach the estimate to the chat. When `asBookingInvoice` is true, also mark it as the official booking invoice. */
  onAttach: (estimate: InvoiceEstimate, asBookingInvoice?: boolean) => void;
  /** When provided, the dialog opens in edit mode prefilled with this estimate. */
  initialEstimate?: InvoiceEstimate | null;
}

let rowSeq = 1;
const newRow = (): InvoiceItem => ({ id: rowSeq++, name: "", price: 0 });

const rowsFromEstimate = (estimate?: InvoiceEstimate | null): InvoiceItem[] =>
  estimate && estimate.items.length
    ? estimate.items.map((it) => ({ id: rowSeq++, name: it.name, price: it.price }))
    : [newRow()];

export function InvoiceEstimateDialog({
  open,
  onOpenChange,
  onAttach,
  initialEstimate,
}: InvoiceEstimateDialogProps) {
  const isEditing = !!initialEstimate;
  const [items, setItems] = useState<InvoiceItem[]>(() => rowsFromEstimate(initialEstimate));
  const [visitingCharge, setVisitingCharge] = useState<number>(
    initialEstimate?.visitingCharge ?? DEFAULT_VISITING_CHARGE
  );
  const [hours, setHours] = useState<number>(initialEstimate?.hours ?? DEFAULT_HOURS);

  // Re-seed the fields each time the dialog opens, from the estimate being edited (if any).
  useEffect(() => {
    if (open) {
      setItems(rowsFromEstimate(initialEstimate));
      setVisitingCharge(initialEstimate?.visitingCharge ?? DEFAULT_VISITING_CHARGE);
      setHours(initialEstimate?.hours ?? DEFAULT_HOURS);
    }
  }, [open, initialEstimate]);

  const updateItem = (id: number, patch: Partial<InvoiceItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const removeItem = (id: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));

  const addItem = () => setItems((prev) => [...prev, newRow()]);

  const validItems = items.filter((it) => it.name.trim() && it.price > 0);
  const subtotal = validItems.reduce((sum, it) => sum + it.price, 0);
  const serviceFee = HOURLY_RATE * Math.max(0, hours);
  const total = subtotal + Math.max(0, visitingCharge) + serviceFee;

  const reset = () => {
    setItems([newRow()]);
    setVisitingCharge(DEFAULT_VISITING_CHARGE);
    setHours(DEFAULT_HOURS);
  };

  const buildEstimate = (): InvoiceEstimate => ({
    items: validItems.map(({ name, price }) => ({ name: name.trim(), price })),
    visitingCharge: Math.max(0, visitingCharge),
    hours: Math.max(0, hours),
    hourlyRate: HOURLY_RATE,
    serviceFee,
    subtotal,
    total,
  });

  const submit = (asBookingInvoice: boolean) => {
    if (!validItems.length) return;
    onAttach(buildEstimate(), asBookingInvoice);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <DialogHeader className="flex-row items-center gap-4 p-6 pb-5 border-b border-slate-100 space-y-0">
          <div className="h-11 w-11 rounded-xl bg-[#0D7377]/10 flex items-center justify-center text-[#0D7377] shrink-0">
            <Receipt size={22} />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-black tracking-tight text-slate-800">
              {isEditing ? "Edit Booking Invoice" : "Estimate Booking Invoice"}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">
              Add items, visiting charges and labour hours to build the estimate.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4 max-h-[45vh] overflow-y-auto">
          <div className="flex items-center gap-3 px-1">
            <span className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Item / Part
            </span>
            <span className="w-32 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Price
            </span>
            <span className="w-8" />
          </div>

          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Input
                value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                placeholder="e.g. Compressor capacitor"
                className="flex-1 h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-medium focus-visible:ring-[#0D7377]/30 focus-visible:border-[#0D7377]"
              />
              <div className="relative w-32">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                  Rs.
                </span>
                <Input
                  type="number"
                  min={0}
                  value={item.price || ""}
                  onChange={(e) => updateItem(item.id, { price: Number(e.target.value) })}
                  placeholder="0"
                  className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-bold focus-visible:ring-[#0D7377]/30 focus-visible:border-[#0D7377]"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
                className="h-8 w-8 shrink-0 text-slate-300 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-30"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addItem}
            className="w-full h-11 border-dashed border-2 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#0D7377] hover:border-[#0D7377]/40 font-black text-xs uppercase tracking-widest gap-2 rounded-xl"
          >
            <Plus size={16} /> Add Item
          </Button>

          {/* Visiting charge + labour hours */}
          <div className="pt-2 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                Visiting Charges
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                  Rs.
                </span>
                <Input
                  type="number"
                  min={0}
                  value={visitingCharge || ""}
                  onChange={(e) => setVisitingCharge(Number(e.target.value))}
                  placeholder="0"
                  className="pl-10 h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-bold focus-visible:ring-[#0D7377]/30 focus-visible:border-[#0D7377]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Number of Hours
                </label>
                <span className="flex items-center gap-1 text-[10px] font-black text-[#0D7377] bg-[#0D7377]/10 px-2 py-0.5 rounded-full">
                  <Clock size={11} /> Rs. {HOURLY_RATE.toLocaleString()} / hr
                </span>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={hours || ""}
                  onChange={(e) => setHours(Number(e.target.value))}
                  placeholder="0"
                  className="pr-12 h-11 rounded-xl bg-slate-50 border-slate-200 text-sm font-bold focus-visible:ring-[#0D7377]/30 focus-visible:border-[#0D7377]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">
                  hrs
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-500">Subtotal</span>
            <span className="font-bold text-slate-800">Rs. {subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-500">Visiting Charges</span>
            <span className="font-bold text-slate-800">
              Rs. {Math.max(0, visitingCharge).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-500">
              Service Fee
              <span className="text-slate-400 font-normal">
                {" "}
                ({Math.max(0, hours)} hr × Rs. {HOURLY_RATE.toLocaleString()})
              </span>
            </span>
            <span className="font-bold text-slate-800">Rs. {serviceFee.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              Total
            </span>
            <span className="text-xl font-black text-[#0D7377]">
              Rs. {total.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 space-y-3">
          <Button
            type="button"
            onClick={() => submit(true)}
            disabled={!validItems.length}
            className="w-full h-12 bg-[#0D7377] hover:bg-[#0b6366] font-black text-xs uppercase tracking-widest gap-2 rounded-xl shadow-lg shadow-[#0D7377]/20 disabled:opacity-40 disabled:shadow-none"
          >
            <BadgeCheck size={16} /> Set as Booking Invoice
          </Button>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="flex-1 h-12 border-slate-200 font-black text-xs uppercase tracking-widest rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => submit(false)}
              disabled={!validItems.length}
              className="flex-1 h-12 border-[#0D7377]/30 text-[#0D7377] hover:bg-teal-50 font-black text-xs uppercase tracking-widest gap-2 rounded-xl disabled:opacity-40"
            >
              {isEditing ? (
                <>
                  <Check size={16} /> Save Changes
                </>
              ) : (
                <>
                  <Paperclip size={16} /> Attach to Chat
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
