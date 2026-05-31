import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: any;
  provider: any;
}

const TAX_RATE = 0.1; // 10% service tax (price is treated as tax-inclusive total)

function getInvoiceModel(booking: any, provider: any) {
  const total = Number(booking?.price) || 0;
  // Treat the agreed price as the tax-inclusive total and back out the subtotal/tax.
  const subtotal = Math.round(total / (1 + TAX_RATE));
  const tax = total - subtotal;

  const invoiceNo = `INV-${String(booking?.id ?? "0").padStart(5, "0")}`;
  const issueDate = new Date().toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const serviceType =
    booking?.service_type || provider?.service_type || "Service";

  return {
    logoUrl: `${window.location.origin}/logo.png`,
    invoiceNo,
    issueDate,
    serviceType,
    total,
    subtotal,
    tax,
    customer: {
      name: booking?.customer?.name || "—",
      email: booking?.customer?.email || "—",
      phone: booking?.customer?.phone || "—",
      address: booking?.customer?.address || "—",
    },
    provider: {
      name: provider?.name || "Karigar Provider",
      email: provider?.email || "—",
      phone: provider?.phone || "—",
      serviceType: provider?.service_type || serviceType,
    },
    schedule: {
      date: booking?.date || "—",
      time: booking?.time || "—",
    },
  };
}

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString()}`;

function buildPrintHtml(m: ReturnType<typeof getInvoiceModel>) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${m.invoiceNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 48px; }
  .wrap { max-width: 720px; margin: 0 auto; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 28px; border-bottom: 2px solid #0D7377; }
  .brandrow { display: flex; align-items: center; gap: 12px; }
  .logo { width: 48px; height: 48px; object-fit: contain; border-radius: 8px; }
  .brand { font-size: 26px; font-weight: 900; letter-spacing: -1px; color: #0D7377; }
  .brand span { color: #1e293b; }
  .tag { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-top: 4px; }
  .inv-title { font-size: 30px; font-weight: 900; letter-spacing: -1px; text-align: right; }
  .inv-meta { font-size: 12px; color: #64748b; text-align: right; margin-top: 6px; line-height: 1.6; }
  .inv-meta b { color: #1e293b; }
  .parties { display: flex; justify-content: space-between; gap: 32px; margin: 32px 0; }
  .party { flex: 1; }
  .label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 8px; }
  .party .name { font-size: 16px; font-weight: 800; margin-bottom: 4px; }
  .party .line { font-size: 13px; color: #64748b; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  thead th { text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; padding: 12px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
  thead th.r, tbody td.r { text-align: right; }
  tbody td { padding: 16px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
  tbody td .sub { font-size: 12px; color: #94a3b8; margin-top: 2px; }
  .totals { margin-top: 24px; margin-left: auto; width: 280px; }
  .totals .row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #64748b; }
  .totals .row b { color: #1e293b; font-weight: 700; }
  .totals .grand { margin-top: 8px; padding: 16px; background: #0D7377; color: #fff; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
  .totals .grand .gl { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; opacity: .8; }
  .totals .grand .gv { font-size: 22px; font-weight: 900; }
  .paid { display: inline-block; margin-top: 12px; padding: 4px 14px; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; border-radius: 999px; }
  .foot { margin-top: 48px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <div class="brandrow">
        <img class="logo" src="${m.logoUrl}" alt="Karigar Logo" />
        <div>
          <div class="brand">karigar<span>.ai</span></div>
          <div class="tag">Service Invoice</div>
        </div>
      </div>
      <div>
        <div class="inv-title">INVOICE</div>
        <div class="inv-meta">
          <div><b>${m.invoiceNo}</b></div>
          <div>Issued: ${m.issueDate}</div>
        </div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="label">From</div>
        <div class="name">${m.provider.name}</div>
        <div class="line">${m.provider.serviceType} Specialist</div>
        <div class="line">${m.provider.phone}</div>
        <div class="line">${m.provider.email}</div>
      </div>
      <div class="party">
        <div class="label">Bill To</div>
        <div class="name">${m.customer.name}</div>
        <div class="line">${m.customer.address}</div>
        <div class="line">${m.customer.phone}</div>
        <div class="line">${m.customer.email}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="r">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div><b>${m.serviceType} Service</b></div>
            <div class="sub">Scheduled: ${m.schedule.date} &middot; ${m.schedule.time}</div>
          </td>
          <td class="r">${money(m.subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><b>${money(m.subtotal)}</b></div>
      <div class="row"><span>Service Tax (10%)</span><b>${money(m.tax)}</b></div>
      <div class="grand">
        <span class="gl">Total Due</span>
        <span class="gv">${money(m.total)}</span>
      </div>
      <div style="text-align:right;"><span class="paid">Paid</span></div>
    </div>

    <div class="foot">
      Thank you for choosing karigar.ai &mdash; This invoice was generated for booking #${String(m.invoiceNo).replace("INV-", "")}.
    </div>
  </div>
</body>
</html>`;
}

export function InvoiceDialog({ open, onOpenChange, booking, provider }: InvoiceDialogProps) {
  const m = getInvoiceModel(booking, provider);

  const handleDownloadPdf = () => {
    const win = window.open("", "_blank", "width=820,height=1000");
    if (!win) return;
    win.document.write(buildPrintHtml(m));
    win.document.close();
    win.focus();
    // Give the new window a tick to render before invoking the print dialog.
    win.onload = () => {
      win.print();
    };
    // Fallback for browsers that fire load before onload is attached.
    setTimeout(() => {
      try { win.print(); } catch { /* noop */ }
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scroll-none p-0 rounded-2xl">
        {/* Invoice Header */}
        <div className="flex items-start justify-between p-8 border-b-2 border-[#0D7377]">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Karigar Logo" className="w-12 h-12 object-contain rounded-lg shrink-0" />
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-[#0D7377]">
                karigar<span className="text-slate-800">.ai</span>
              </h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Service Invoice</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black tracking-tighter text-slate-800">INVOICE</p>
            <p className="text-sm font-bold text-slate-800 mt-1">{m.invoiceNo}</p>
            <p className="text-xs text-slate-400">Issued: {m.issueDate}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-8 px-8 pt-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">From</p>
            <p className="text-base font-black text-slate-800">{m.provider.name}</p>
            <p className="text-sm text-slate-500">{m.provider.serviceType} Specialist</p>
            <p className="text-sm text-slate-500">{m.provider.phone}</p>
            <p className="text-sm text-slate-500 truncate">{m.provider.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bill To</p>
            <p className="text-base font-black text-slate-800">{m.customer.name}</p>
            <p className="text-sm text-slate-500">{m.customer.address}</p>
            <p className="text-sm text-slate-500">{m.customer.phone}</p>
            <p className="text-sm text-slate-500 truncate">{m.customer.email}</p>
          </div>
        </div>

        {/* Line items */}
        <div className="px-8 pt-6">
          <div className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-t-xl border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</span>
          </div>
          <div className="flex items-start justify-between px-4 py-4 border-x border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-800">{m.serviceType} Service</p>
              <p className="text-xs text-slate-400 mt-0.5">Scheduled: {m.schedule.date} · {m.schedule.time}</p>
            </div>
            <span className="text-sm font-bold text-slate-800">{money(m.subtotal)}</span>
          </div>
        </div>

        {/* Totals */}
        <div className="px-8 pt-6">
          <div className="ml-auto w-full sm:w-72 space-y-2">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal</span>
              <span className="font-bold text-slate-800">{money(m.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Service Tax (10%)</span>
              <span className="font-bold text-slate-800">{money(m.tax)}</span>
            </div>
            <div className="flex items-center justify-between bg-[#0D7377] text-white px-4 py-3 rounded-xl mt-2">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Due</span>
              <span className="text-xl font-black">{money(m.total)}</span>
            </div>
            <div className="text-right">
              <span className="inline-block mt-1 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full">Paid</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 p-8 pt-6 mt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
          <p className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <FileText size={14} /> Generated by karigar.ai
          </p>
          <Button
            onClick={handleDownloadPdf}
            className="h-12 bg-[#0D7377] hover:bg-[#0b6366] text-white font-black text-xs uppercase tracking-widest rounded-xl gap-2 shadow-lg shadow-[#0D7377]/20 px-6"
          >
            <Download size={16} /> Download as PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
