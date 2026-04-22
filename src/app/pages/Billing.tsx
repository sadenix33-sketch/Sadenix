import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  FileText,
  TrendingUp,
  Eye,
  Printer,
  Loader2,
  User,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, parseISO, isBefore, startOfDay, startOfMonth } from "date-fns";
import { arSA } from "date-fns/locale";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Patient } from "./Patients";

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  مدفوعة: { bg: "#DCFCE7", text: "#16A34A", dot: "#16A34A" },
  "مدفوعة جزئيًا": { bg: "#FEF3C7", text: "#D97706", dot: "#D97706" },
  "غير مدفوعة": { bg: "#FEE2E2", text: "#DC2626", dot: "#DC2626" },
  متأخرة: { bg: "#FEE2E2", text: "#B91C1C", dot: "#B91C1C" },
};

const methodConfig: Record<string, { icon: string; color: string }> = {
  نقدي: { icon: String.fromCodePoint(0x1f4b5), color: "#16A34A" },
  بطاقة: { icon: String.fromCodePoint(0x1f4b3), color: "#1D5FBF" },
  "تحويل بنكي": { icon: String.fromCodePoint(0x1f3e6), color: "#8B5CF6" },
  تأمين: { icon: String.fromCodePoint(0x1f6e1) + String.fromCodePoint(0xfe0f), color: "#06B6D4" },
};

interface InvoiceRow {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_name: string;
  invoice_code: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  tax_rate: number;
  tax_amount: number;
  status: string;
  last_payment_method: string | null;
  doctor_name: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface PaymentRow {
  id: string;
  invoice_id: string;
  patient_id: string | null;
  amount: number;
  method: string;
  created_by_name: string | null;
  created_at: string;
}

interface InvoiceDisplay {
  id: string;
  dbId: string;
  patient: string;
  patientId: string | null;
  date: string;
  due: string;
  dueIso: string;
  amount: number;
  paid: number;
  status: string;
  method: string | null;
  doctor: string | null;
  createdBy: string | null;
  createdAt: string;
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function roundNum(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function deriveStatus(total: number, paid: number, dueDateIso: string): string {
  const t = roundNum(num(total));
  const p = roundNum(num(paid));
  if (t <= 0) return "غير مدفوعة";
  if (p >= t - 0.001) return "مدفوعة";
  if (p > 0.001) return "مدفوعة جزئيًا";
  try {
    const due = startOfDay(parseISO(dueDateIso));
    if (isBefore(due, startOfDay(new Date()))) return "متأخرة";
  } catch {
    /* ignore */
  }
  return "غير مدفوعة";
}

function rowToDisplay(row: InvoiceRow): InvoiceDisplay {
  const total = num(row.total_amount);
  const paid = num(row.paid_amount);
  const status = deriveStatus(total, paid, row.due_date);
  return {
    id: row.invoice_code,
    dbId: row.id,
    patient: row.patient_name,
    patientId: row.patient_id,
    date: format(parseISO(row.issue_date), "dd/MM/yyyy", { locale: arSA }),
    due: format(parseISO(row.due_date), "dd/MM/yyyy", { locale: arSA }),
    dueIso: row.due_date,
    amount: total,
    paid,
    status,
    method: row.last_payment_method,
    doctor: row.doctor_name,
    createdBy: row.created_by_name,
    createdAt: row.created_at,
  };
}

function safeFormatDate(iso: string, fmt: string) {
  try {
    return format(parseISO(iso), fmt, { locale: arSA });
  } catch {
    return iso;
  }
}

function openPrintInvoice(inv: InvoiceDisplay, clinicName = "عيادة Sadenix") {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) { alert("اسمح بالنوافذ المنبثقة لطباعة الفاتورة."); return; }
  const remaining = Math.max(0, inv.amount - inv.paid);
  const paidPct = inv.amount > 0 ? Math.min(100, Math.round((inv.paid / inv.amount) * 100)) : 0;
  const statusAr = inv.status === "مدفوعة" ? "✅ مدفوعة" : inv.status === "مدفوعة جزئيًا" ? "🟡 مدفوعة جزئياً" : inv.status === "متأخرة" ? "🔴 متأخرة" : "⬜ غير مدفوعة";
  const now = new Date().toLocaleDateString("ar-EG", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width"/>
<title>فاتورة رقم ${inv.id}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;background:#f8fafc;color:#0f172a;min-height:100vh;padding:20px}
  .page{max-width:700px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
  .header{background:linear-gradient(135deg,#1D5FBF,#06B6D4);padding:28px 32px;color:white}
  .header h1{font-size:1.6rem;font-weight:900;margin-bottom:4px}
  .header .subtitle{opacity:0.85;font-size:0.9rem}
  .header .inv-num{background:rgba(255,255,255,0.2);display:inline-block;padding:4px 12px;border-radius:8px;font-weight:700;margin-top:8px;font-size:0.85rem}
  .body{padding:28px 32px}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .meta-card{background:#f0f5fc;border-radius:12px;padding:14px;border:1px solid #e2e8f0}
  .meta-card .label{font-size:0.72rem;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:4px}
  .meta-card .value{font-size:0.95rem;font-weight:700;color:#0f172a}
  .section-title{font-weight:800;font-size:0.9rem;color:#1D5FBF;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid #EFF6FF}
  .amounts{background:#1D5FBF;border-radius:12px;padding:20px;color:white;margin:20px 0}
  .amounts-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center}
  .amounts .label{font-size:0.72rem;opacity:0.8;margin-bottom:4px}
  .amounts .value{font-size:1.2rem;font-weight:900}
  .amounts .value.red{color:#fca5a5}
  .progress-wrap{margin-top:12px}
  .progress-bar{background:rgba(255,255,255,0.2);border-radius:8px;height:8px;overflow:hidden;margin-top:4px}
  .progress-fill{background:#4ade80;height:100%;border-radius:8px;transition:width 0.6s}
  .status-badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:0.8rem;font-weight:700;margin-bottom:16px}
  .status-paid{background:#dcfce7;color:#16a34a}
  .status-partial{background:#fef3c7;color:#d97706}
  .status-late{background:#fee2e2;color:#dc2626}
  .status-unpaid{background:#f1f5f9;color:#64748b}
  .footer{background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;font-size:0.75rem;color:#94a3b8;text-align:center}
  @media print{
    body{background:white;padding:0}
    .page{box-shadow:none;border-radius:0}
    .no-print{display:none}
    @page{margin:1.5cm;size:A4}
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1>🦷 ${clinicName}</h1>
        <div class="subtitle">فاتورة طبية رسمية</div>
        <div class="inv-num">رقم الفاتورة: ${inv.id}</div>
      </div>
      <div style="text-align:left;opacity:0.85;font-size:0.8rem">
        <div>تاريخ الطباعة</div>
        <div style="font-weight:700">${now}</div>
      </div>
    </div>
  </div>

  <div class="body">
    <div class="meta-grid">
      <div class="meta-card">
        <div class="label">👤 المريض</div>
        <div class="value">${inv.patient}</div>
      </div>
      <div class="meta-card">
        <div class="label">👨‍⚕️ الطبيب</div>
        <div class="value">${inv.doctor || "غير محدد"}</div>
      </div>
      <div class="meta-card">
        <div class="label">📅 تاريخ الإصدار</div>
        <div class="value">${inv.date}</div>
      </div>
      <div class="meta-card">
        <div class="label">⏰ تاريخ الاستحقاق</div>
        <div class="value">${inv.due}</div>
      </div>
      ${inv.createdBy ? `<div class="meta-card" style="grid-column:1/-1">
        <div class="label">🖊️ أدخلها</div>
        <div class="value">${inv.createdBy}</div>
      </div>` : ""}
    </div>

    <div class="amounts">
      <div class="amounts-grid">
        <div>
          <div class="label">إجمالي الفاتورة</div>
          <div class="value">${inv.amount.toLocaleString()} JOD</div>
        </div>
        <div>
          <div class="label">المبلغ المدفوع</div>
          <div class="value" style="color:#4ade80">${inv.paid.toLocaleString()} JOD</div>
        </div>
        <div>
          <div class="label">المتبقي</div>
          <div class="value ${remaining > 0 ? 'red' : ''}">${remaining.toLocaleString()} JOD</div>
        </div>
      </div>
      <div class="progress-wrap">
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;opacity:0.8;margin-bottom:3px">
          <span>نسبة السداد</span><span>${paidPct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${paidPct}%"></div>
        </div>
      </div>
    </div>

    <div>
      <div class="section-title">حالة الفاتورة</div>
      <span class="status-badge ${inv.status === "مدفوعة" ? "status-paid" : inv.status === "مدفوعة جزئيًا" ? "status-partial" : inv.status === "متأخرة" ? "status-late" : "status-unpaid"}">${statusAr}</span>
      ${inv.method ? `<p style="color:#64748b;font-size:0.85rem">طريقة آخر دفعة: ${inv.method}</p>` : ""}
    </div>
  </div>

  <div class="footer">
    <p>شكراً لثقتكم بعيادة ${clinicName} · للاستفسار تواصلوا مع الإدارة</p>
    <p style="margin-top:4px">هذه الفاتورة وثيقة رسمية · ${now}</p>
  </div>
</div>

<div class="no-print" style="text-align:center;margin-top:20px">
  <button onclick="window.print()" style="background:linear-gradient(135deg,#1D5FBF,#06B6D4);color:white;border:none;padding:12px 28px;border-radius:10px;font-size:1rem;cursor:pointer;font-weight:700">
    🖨️ طباعة / حفظ PDF
  </button>
</div>
</body></html>`);
  w.document.close();
  setTimeout(() => w.focus(), 300);
}

/* ─── Payment Details Panel ─────────────────────────────────────────── */
function PaymentHistoryPanel({
  invoiceId,
  clinicId,
  isAdmin,
}: {
  invoiceId: string;
  clinicId: string;
  isAdmin: boolean;
}) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false });
      setPayments((data || []) as PaymentRow[]);
      setLoading(false);
    })();
  }, [invoiceId]);

  if (loading) return <div className="py-4 flex justify-center"><Loader2 size={18} className="animate-spin text-blue-500" /></div>;
  if (payments.length === 0) return <div className="py-4 text-center text-xs text-slate-400">لا توجد دفعات مسجلة لهذه الفاتورة</div>;

  return (
    <div className="p-3 space-y-2">
      <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
        <History size={12} /> سجل الدفعات
      </div>
      {payments.map((pay) => (
        <div key={pay.id} className="flex items-start justify-between p-3 rounded-xl" style={{ background: "#F0F5FC", border: "1px solid rgba(30,58,111,0.06)" }}>
          <div className="space-y-0.5">
            <div className="text-sm font-black text-slate-800">{num(pay.amount)} JOD</div>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <span>{methodConfig[pay.method]?.icon || "💳"}</span>
              <span>{pay.method || "—"}</span>
            </div>
            {isAdmin && pay.created_by_name && (
              <div className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-1">
                <User size={10} />
                سجّله: <span className="font-bold">{pay.created_by_name}</span>
              </div>
            )}
          </div>
          <div className="text-left text-xs text-slate-400 space-y-0.5">
            <div className="font-semibold text-slate-600">{safeFormatDate(pay.created_at, "dd/MM/yyyy")}</div>
            <div>{safeFormatDate(pay.created_at, "HH:mm")}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Payment Modal ─────────────────────────────────────────────────── */
interface PaymentModalProps {
  invoice: InvoiceDisplay;
  clinicId: string;
  onClose: () => void;
  onPaid: () => void;
}

function PaymentModal({ invoice, clinicId, onClose, onPaid }: PaymentModalProps) {
  const { profile } = useAuth();
  const [method, setMethod] = useState("نقدي");
  const [amount, setAmount] = useState(String(Math.max(0, invoice.amount - invoice.paid)));
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const remaining = Math.max(0, invoice.amount - invoice.paid);

  const handlePay = async () => {
    const payN = Number(amount);
    if (!Number.isFinite(payN) || payN <= 0) {
      alert("أدخل مبلغاً صالحاً.");
      return;
    }
    if (payN > remaining + 0.001) {
      alert(`المتبقي على الفاتورة ${remaining} JOD فقط.`);
      return;
    }

    setSaving(true);
    try {
      const newPaid = roundNum(invoice.paid + payN);
      const newStatus = deriveStatus(invoice.amount, newPaid, invoice.dueIso);

      const { error: payErr } = await supabase.from("payments").insert({
        clinic_id: clinicId,
        invoice_id: invoice.dbId,
        patient_id: invoice.patientId,
        amount: num(amount),
        method: method,
        created_by_name: profile?.full_name || "System",
        notes: `تحصيل بواسطة ${profile?.full_name || "System"}`,
      });

      if (payErr) {
        console.error("Payment Error Details:", payErr);
        throw payErr;
      }

      const { error: invErr } = await supabase
        .from("invoices")
        .update({
          paid_amount: newPaid,
          status: newStatus,
          last_payment_method: method,
        })
        .eq("id", invoice.dbId)
        .eq("clinic_id", clinicId);

      if (invErr) throw invErr;

      if (invoice.patientId) {
        const { data: p, error: pErr } = await supabase
          .from("patients")
          .select("balance")
          .eq("id", invoice.patientId)
          .single();
        if (!pErr && p) {
          const bal = num(p.balance);
          const newBal = roundNum(bal + payN);
          await supabase.from("patients").update({ balance: newBal }).eq("id", invoice.patientId);
        }
      }

      setSuccess(true);
      onPaid();
      setTimeout(onClose, 1400);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      alert("تعذر تسجيل الدفعة: " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "white", boxShadow: "0 20px 60px rgba(15,37,71,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {!success ? (
          <>
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid rgba(30,58,111,0.08)" }}
            >
              <h3 className="font-bold" style={{ color: "#0F172A" }}>
                تحصيل دفعة
              </h3>
              <button type="button" onClick={onClose}>
                <X size={15} style={{ color: "#64748B" }} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="p-4 rounded-xl" style={{ background: "#F0F5FC" }}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "#64748B" }}>رقم الفاتورة</span>
                  <span className="font-bold" style={{ color: "#0F172A" }}>
                    {invoice.id}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "#64748B" }}>المريض</span>
                  <span className="font-bold" style={{ color: "#0F172A" }}>
                    {invoice.patient}
                  </span>
                </div>
                {invoice.doctor && (
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: "#64748B" }}>الطبيب</span>
                    <span className="font-bold" style={{ color: "#0F172A" }}>
                      {invoice.doctor}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "#64748B" }}>إجمالي الفاتورة</span>
                  <span className="font-bold" style={{ color: "#0F172A" }}>
                    {invoice.amount} JOD
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "#64748B" }}>المبلغ المتبقي</span>
                  <span className="font-black" style={{ color: "#DC2626" }}>
                    {remaining} JOD
                  </span>
                </div>
              </div>

              {/* محاسب - من يسجّل الدفعة */}
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                <User size={14} style={{ color: "#1D5FBF" }} />
                <span className="text-xs font-bold" style={{ color: "#1D5FBF" }}>
                  يسجّل الدفعة: <span className="text-slate-700">{profile?.full_name || "النظام"}</span>
                </span>
              </div>

              <div>
                <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>
                  المبلغ المدفوع (JOD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 h-11 rounded-xl text-base font-black outline-none text-center"
                  style={{ background: "#F0F5FC", fontFamily: "Cairo, sans-serif", color: "#0F172A" }}
                />
              </div>

              <div>
                <label className="text-xs font-bold mb-2 block" style={{ color: "#374151" }}>
                  طريقة الدفع
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["نقدي", "بطاقة", "تحويل بنكي", "تأمين"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: method === m ? "#EFF6FF" : "#F0F5FC",
                        border: method === m ? "1.5px solid #1D5FBF" : "1.5px solid transparent",
                        color: method === m ? "#1D5FBF" : "#64748B",
                      }}
                    >
                      <span>{methodConfig[m]?.icon}</span>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: saving ? 1 : 1.02 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                onClick={handlePay}
                disabled={saving}
                className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #16A34A, #22D3EE)", opacity: saving ? 0.85 : 1 }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                تأكيد الدفع · {amount} JOD
              </motion.button>
            </div>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-8 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "#DCFCE7" }}
            >
              <CheckCircle size={30} style={{ color: "#16A34A" }} />
            </motion.div>
            <h3 className="font-black mb-2" style={{ color: "#0F172A" }}>
              تم الدفع بنجاح!
            </h3>
            <p className="text-sm" style={{ color: "#64748B" }}>
              تم تسجيل دفعة {amount} JOD بواسطة {profile?.full_name}
            </p>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─── New Invoice Modal ─────────────────────────────────────────────── */
interface NewInvoiceModalProps {
  clinicId: string;
  patients: Patient[];
  doctorName?: string; // if doctor role, pre-filter
  onClose: () => void;
  onCreated: () => void;
}

function addDaysSafe(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function NewInvoiceModal({ clinicId, patients, doctorName, onClose, onCreated }: NewInvoiceModalProps) {
  const { profile } = useAuth();
  const [patientId, setPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [total, setTotal] = useState("");
  const [dueDate, setDueDate] = useState(() => format(addDaysSafe(new Date(), 14), "yyyy-MM-dd"));
  const [selectedDoctorName, setSelectedDoctorName] = useState(doctorName || "");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingInvoices, setExistingInvoices] = useState<InvoiceRow[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedExistingInvoice, setSelectedExistingInvoice] = useState<string | null>(null);
  const [addPaymentAmount, setAddPaymentAmount] = useState("");
  const [discountType, setDiscountType] = useState("مبلغ");
  const [discountValue, setDiscountValue] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("clinic_id", clinicId).eq("role", "doctor");
      if (data) setDoctors(data);
    };
    fetchDoctors();
  }, [clinicId]);

  const filteredPatients = patients.filter(
    (p) =>
      !patientSearch ||
      (p.first_name && p.first_name.toLowerCase().includes(patientSearch.toLowerCase())) ||
      (p.patient_code && p.patient_code.toLowerCase().includes(patientSearch.toLowerCase()))
  );

  const selectedPatient = patients.find((p) => p.id === patientId);

  const handlePatientSelect = async (id: string) => {
    setPatientId(id);
    setSelectedExistingInvoice(null);
    setTotal("");
    if (id) {
      setLoadingInvoices(true);
      const { data } = await supabase
        .from("invoices")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });
      setExistingInvoices((data || []) as InvoiceRow[]);
      setLoadingInvoices(false);
    } else {
      setExistingInvoices([]);
    }
  };

  const handleAddPaymentToExisting = async () => {
    if (!selectedExistingInvoice || !addPaymentAmount) {
      alert("اختر الفاتورة وأدخل المبلغ");
      return;
    }
    const amount = num(addPaymentAmount);
    if (amount <= 0) {
      alert("أدخل مبلغاً صالحاً");
      return;
    }
    setSaving(true);
    try {
      const inv = existingInvoices.find((i) => i.id === selectedExistingInvoice);
      if (!inv) throw new Error("الفاتورة غير موجودة");
      const newPaid = roundNum(num(inv.paid_amount) + amount);
      const newTotal = num(inv.total_amount);
      const newStatus = newPaid >= newTotal - 0.001 ? "مدفوعة" : "مدفوعة جزئيًا";

      const { error } = await supabase
        .from("invoices")
        .update({ paid_amount: newPaid, status: newStatus })
        .eq("id", selectedExistingInvoice);
      if (error) throw error;

      await supabase.from("payments").insert({
        clinic_id: clinicId,
        patient_id: inv.patient_id,
        invoice_id: selectedExistingInvoice,
        amount,
        method: "نقدي",
        created_by_name: profile?.full_name || "System",
      });

      onCreated();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    const subN = Number(total);
    if (!patientId || !selectedPatient) {
      alert("اختر المريض.");
      return;
    }
    if (!Number.isFinite(subN) || subN <= 0) {
      alert("أدخل مبلغاً صالحاً أكبر من صفر.");
      return;
    }

    const discVal = Number(discountValue) || 0;
    const finalN = discountType === "نسبة" ? subN - (subN * (discVal / 100)) : subN - discVal;
    const calculatedTotal = Math.max(0, roundNum(finalN));

    const code = `INV-${Date.now().toString(36).toUpperCase()}`;
    const issue = format(new Date(), "yyyy-MM-dd");
    const status = deriveStatus(calculatedTotal, 0, dueDate);
    setSaving(true);
    try {
      const { error: invErr } = await supabase.from("invoices").insert({
        clinic_id: clinicId,
        patient_id: patientId,
        patient_name: selectedPatient.first_name,
        invoice_code: code,
        issue_date: issue,
        due_date: dueDate,
        total_amount: calculatedTotal,
        discount_amount: discVal,
        discount_type: discountType,
        paid_amount: 0,
        tax_rate: 0,
        tax_amount: 0,
        status,
        doctor_name: selectedDoctorName.trim() || selectedPatient.doctor_name || null,
        notes: notes.trim() || null,
        created_by_name: profile?.full_name || "System",
      });
      if (invErr) throw invErr;

      const { data: p, error: pErr } = await supabase
        .from("patients")
        .select("balance")
        .eq("id", patientId)
        .single();
      if (pErr) throw pErr;
      const bal = num(p?.balance);
      const newBal = roundNum(bal - calculatedTotal);
      const { error: uErr } = await supabase
        .from("patients")
        .update({ balance: newBal })
        .eq("id", patientId);
      if (uErr) throw uErr;

      onCreated();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ غير معروف";
      alert("تأكد من تشغيل schema_billing.sql في Supabase. التفاصيل: " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ background: "white", boxShadow: "0 20px 60px rgba(15,37,71,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(30,58,111,0.08)" }}>
          <div>
            <h3 className="font-bold" style={{ color: "#0F172A" }}>فاتورة جديدة</h3>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>أضيفت بواسطة: {profile?.full_name || "النظام"}</p>
          </div>
          <button type="button" onClick={onClose}>
            <X size={15} style={{ color: "#64748B" }} />
          </button>
        </div>
        <div className="p-5 space-y-4" style={{ direction: "rtl" }}>
          {/* Patient Search */}
          <div>
            <label className="text-xs font-bold mb-1.5 block text-gray-700">اختر المريض *</label>
            <input
              type="text"
              placeholder="ابحث بالاسم أو رقم المريض..."
              value={patientSearch}
              onChange={(e) => {
                setPatientSearch(e.target.value);
                if (!e.target.value) setPatientId("");
              }}
              className="w-full px-3 h-10 rounded-xl text-sm outline-none bg-gray-50 border mb-2"
            />
            <select
              value={patientId}
              onChange={(e) => handlePatientSelect(e.target.value)}
              className="w-full px-3 h-10 rounded-xl text-sm outline-none bg-gray-50 border"
            >
              <option value="">— اختر المريض —</option>
              {filteredPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} ({p.patient_code})
                </option>
              ))}
            </select>
          </div>

          {/* Existing Invoices */}
          {patientId && (
            <div className="rounded-xl p-4" style={{ background: "#F0F5FC", border: "1px solid #E2E8F0" }}>
              <h4 className="text-xs font-bold mb-2" style={{ color: "#64748B" }}>
                {loadingInvoices ? "جاري تحميل الفواتير..." : `فواتير ${selectedPatient?.first_name || "المريض"}`}
              </h4>
              {loadingInvoices ? (
                <Loader2 size={20} className="animate-spin text-blue-600 mx-auto" />
              ) : existingInvoices.length === 0 ? (
                <p className="text-sm text-center py-2" style={{ color: "#94A3B8" }}>
                  لا توجد فواتير سابقة - يمكنك إنشاء فاتورة جديدة
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {existingInvoices.map((inv) => {
                    const remaining = num(inv.total_amount) - num(inv.paid_amount);
                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedExistingInvoice(selectedExistingInvoice === inv.id ? null : inv.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${selectedExistingInvoice === inv.id ? "ring-2 ring-blue-500" : "hover:bg-white"}`}
                        style={{ background: selectedExistingInvoice === inv.id ? "#EFF6FF" : "white", border: "1px solid #E2E8F0" }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold" style={{ color: "#0F172A" }}>{inv.invoice_code}</div>
                            <div className="text-xs" style={{ color: "#64748B" }}>{format(parseISO(inv.issue_date), "dd/MM/yyyy")}</div>
                            {inv.created_by_name && (
                              <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>أضافها: {inv.created_by_name}</div>
                            )}
                          </div>
                          <div className="text-left">
                            <div className="text-sm font-bold" style={{ color: "#0F172A" }}>{num(inv.total_amount)} JOD</div>
                            <div className="text-xs" style={{ color: remaining > 0 ? "#DC2626" : "#16A34A" }}>
                              {remaining > 0 ? `مستحق: ${remaining} JOD` : "مدفوعة بالكامل"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Add Payment to Existing */}
          {selectedExistingInvoice && (
            <div className="rounded-xl p-4" style={{ background: "#DCFCE7", border: "1px solid #86EFAC" }}>
              <h4 className="text-xs font-bold mb-2" style={{ color: "#16A34A" }}>إضافة دفعة للفاتورة المختارة</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="المبلغ"
                  value={addPaymentAmount}
                  onChange={(e) => setAddPaymentAmount(e.target.value)}
                  className="flex-1 px-3 h-10 rounded-xl text-sm outline-none bg-white border"
                />
                <button
                  onClick={handleAddPaymentToExisting}
                  disabled={saving}
                  className="px-4 h-10 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#16A34A" }}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : "إضافة"}
                </button>
              </div>
            </div>
          )}

          {/* New Invoice Form */}
          {!selectedExistingInvoice && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold mb-1.5 block text-gray-700">المبلغ الأساسي (JOD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={total}
                    onChange={(e) => setTotal(e.target.value)}
                    className="w-full px-3 h-10 rounded-xl text-sm outline-none bg-gray-50 border"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1.5 block text-gray-700">الخصم</label>
                  <div className="flex bg-gray-50 border rounded-xl overflow-hidden h-10 w-full">
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full px-2 text-sm outline-none bg-transparent flex-1"
                      placeholder="0"
                    />
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value)}
                      className="px-2 text-xs bg-gray-100 border-r outline-none border-gray-200"
                    >
                      <option value="مبلغ">JOD</option>
                      <option value="نسبة">%</option>
                    </select>
                  </div>
                </div>
              </div>
              {Number(discountValue) > 0 && Number(total) > 0 && (
                <div className="text-xs font-bold text-blue-700 bg-blue-50 p-2 rounded-lg text-center border border-blue-100">
                  الإجمالي بعد الخصم: {Math.max(0, roundNum(discountType === 'نسبة' ? Number(total) - (Number(total) * (Number(discountValue) / 100)) : Number(total) - Number(discountValue)))} JOD
                </div>
              )}
              <div>
                <label className="text-xs font-bold mb-1.5 block text-gray-700">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 h-10 rounded-xl text-sm outline-none bg-gray-50 border"
                />
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block text-gray-700">الطبيب</label>
                {doctorName ? (
                  <div className="w-full px-3 h-10 rounded-xl text-sm bg-blue-50 border border-blue-200 flex items-center font-semibold text-blue-700">
                    {doctorName}
                  </div>
                ) : (
                  <select
                    value={selectedDoctorName}
                    onChange={(e) => setSelectedDoctorName(e.target.value)}
                    className="w-full px-3 h-10 rounded-xl text-sm outline-none bg-gray-50 border shadow-sm"
                  >
                    <option value="">— اختر الطبيب —</option>
                    {doctors.map((doc, idx) => (
                      <option key={idx} value={doc.full_name}>{doc.full_name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs font-bold mb-1.5 block text-gray-700">ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none bg-gray-50 border resize-none"
                />
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2">
                سيتم خصم المبلغ من رصيد المريض
              </p>
              <motion.button
                type="button"
                whileHover={{ scale: saving ? 1 : 1.02 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                onClick={handleCreate}
                disabled={saving || !patientId}
                className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)", opacity: saving || !patientId ? 0.85 : 1 }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : null}
                إنشاء فاتورة جديدة
              </motion.button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Billing Page ─────────────────────────────────────────────── */
export function BillingPage() {
  const { clinicId, profile, role, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [paymentsMonthSum, setPaymentsMonthSum] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [search, setSearch] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDisplay | null>(null);
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [expandedInvId, setExpandedInvId] = useState<string | null>(null);

  // Role flags
  const isAdmin = role === "clinic_admin" || role === "super_admin";
  const isDoctor = role === "doctor";
  const myName = profile?.full_name || "";

  const invoices = useMemo(() => rows.map(rowToDisplay), [rows]);

  const fetchAll = useCallback(async () => {
    if (!clinicId) {
      setRows([]);
      setPatients([]);
      setPaymentsMonthSum(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const monthStart = startOfMonth(new Date()).toISOString();

    // Build invoices query - doctors see only their own
    let invQuery = supabase
      .from("invoices")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false });

    // Doctors only see invoices assigned to them
    if (isDoctor && myName) {
      invQuery = invQuery.eq("doctor_name", myName);
    }

    // Patients query - doctors only see their patients
    let patQuery = supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("first_name", { ascending: true });

    if (isDoctor && myName) {
      patQuery = patQuery.eq("doctor_name", myName);
    }

    const [invRes, patRes, payRes] = await Promise.all([
      invQuery,
      patQuery,
      supabase.from("payments").select("amount").eq("clinic_id", clinicId).gte("created_at", monthStart),
    ]);

    if (invRes.error) console.error(invRes.error);
    else if (invRes.data) setRows(invRes.data as InvoiceRow[]);

    if (!patRes.error && patRes.data) setPatients(patRes.data as Patient[]);

    if (!payRes.error && payRes.data) {
      setPaymentsMonthSum(payRes.data.reduce((s, r) => s + num(r.amount), 0));
    } else {
      setPaymentsMonthSum(0);
    }

    setLoading(false);
  }, [clinicId, isDoctor, myName]);

  useEffect(() => {
    if (!authLoading) fetchAll();
  }, [authLoading, fetchAll]);

  const filtered = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          (statusFilter === "الكل" || inv.status === statusFilter) &&
          (search === "" ||
            inv.patient.includes(search) ||
            inv.id.includes(search) ||
            (inv.doctor && inv.doctor.includes(search)))
      ),
    [invoices, statusFilter, search]
  );

  const totalPending = useMemo(
    () => invoices.reduce((s, i) => s + Math.max(0, i.amount - i.paid), 0),
    [invoices]
  );

  const overdueCount = useMemo(() => invoices.filter((i) => i.status === "متأخرة").length, [invoices]);

  const exportCsv = () => {
    const headers = ["رمز_الفاتورة,المريض,التاريخ,الاستحقاق,الإجمالي,المدفوع,الحالة,الطبيب,أضافها"];
    const lines = invoices.map(
      (i) => `${i.id},${i.patient},${i.date},${i.due},${i.amount},${i.paid},${i.status},${i.doctor || ""},${i.createdBy || ""}`
    );
    const blob = new Blob(["\uFEFF" + headers + "\n" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `invoices_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (authLoading) {
    return (
      <div className="py-20 flex justify-center" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10" style={{ color: "#1D5FBF" }} />
      </div>
    );
  }

  if (!clinicId) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border" style={{ direction: "rtl" }}>
        <AlertTriangle className="mx-auto mb-3 text-amber-500" size={40} />
        <p className="font-bold text-slate-800">لا يوجد معرّف عيادة مرتبط بحسابك.</p>
        <p className="text-sm text-slate-500 mt-1">ربط الحساب بعيادة مطلوب لعرض الفواتير.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10" style={{ color: "#1D5FBF" }} />
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-black" style={{ color: "#0F172A", fontSize: 20 }}>
            {isDoctor ? `فواتير مرضاي` : "الفواتير والمدفوعات"}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
            {isDoctor
              ? `عرض فواتير مرضاك فقط · ${invoices.length} فاتورة`
              : "إدارة الفواتير وتتبع المدفوعات بالدينار الأردني"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={exportCsv}
              className="flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-bold border hover:bg-gray-50 transition-all"
              style={{ color: "#64748B", borderColor: "rgba(30,58,111,0.12)" }}
            >
              <Download size={13} />
              تصدير
            </button>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowNewInvoice(true)}
            disabled={patients.length === 0}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
            title={patients.length === 0 ? "أضف مرضى أولاً" : undefined}
          >
            <Plus size={15} />
            فاتورة جديدة
          </motion.button>
        </div>
      </div>

      {/* KPI Cards - financial totals only for admin */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-2"} gap-4`}>
        {/* الفواتير المتأخرة - for all */}
        {[
          ...(isAdmin
            ? [
                {
                  label: "تحصيلات الشهر",
                  value: `${paymentsMonthSum.toLocaleString("en-US", { maximumFractionDigits: 2 })} JOD`,
                  icon: TrendingUp,
                  color: "#16A34A",
                  bg: "#DCFCE7",
                  change: "مجموع المدفوعات",
                },
                {
                  label: "أرصدة مستحقة",
                  value: `${totalPending.toLocaleString("en-US", { maximumFractionDigits: 2 })} JOD`,
                  icon: Clock,
                  color: "#D97706",
                  bg: "#FEF3C7",
                  change: `${invoices.filter((i) => i.status !== "مدفوعة").length} فاتورة`,
                },
              ]
            : []),
          {
            label: "فواتير متأخرة",
            value: overdueCount,
            icon: AlertTriangle,
            color: "#DC2626",
            bg: "#FEE2E2",
            change: "تحتاج متابعة",
          },
          {
            label: isDoctor ? "فواتير مرضاي" : "إجمالي الفواتير",
            value: invoices.length,
            icon: FileText,
            color: "#1D5FBF",
            bg: "#EFF6FF",
            change: "مسجّلة",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              whileHover={{ y: -2 }}
              className="rounded-2xl p-5"
              style={{
                background: "white",
                border: "1px solid rgba(30,58,111,0.06)",
                boxShadow: "0 2px 12px rgba(15,37,71,0.04)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                  <Icon size={18} style={{ color: kpi.color }} />
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: kpi.bg, color: kpi.color }}>
                  {kpi.change}
                </span>
              </div>
              <div className="text-xl font-black mb-1" style={{ color: "#0F172A" }}>
                {kpi.value}
              </div>
              <div className="text-xs" style={{ color: "#64748B" }}>
                {kpi.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Invoices Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "white",
          border: "1px solid rgba(30,58,111,0.06)",
          boxShadow: "0 2px 12px rgba(15,37,71,0.04)",
        }}
      >
        <div className="flex items-center gap-3 p-4 flex-wrap" style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs px-3 h-9 rounded-xl" style={{ background: "#F0F5FC" }}>
            <Search size={14} style={{ color: "#64748B" }} />
            <input
              type="search"
              placeholder="بحث عن فاتورة أو مريض..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none bg-transparent text-xs min-w-0"
              style={{ fontFamily: "Cairo, sans-serif" }}
            />
          </div>

          {["الكل", "مدفوعة", "مدفوعة جزئيًا", "غير مدفوعة", "متأخرة"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className="px-3 h-8 rounded-lg text-xs font-bold transition-all"
              style={{
                background: statusFilter === s ? "#EFF6FF" : "transparent",
                color: statusFilter === s ? "#1D5FBF" : "#64748B",
                border: statusFilter === s ? "1px solid #BFDBFE" : "1px solid transparent",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                {[
                  "رقم الفاتورة",
                  "المريض",
                  "الطبيب",
                  "التاريخ",
                  "المبلغ",
                  "المدفوع",
                  "الطريقة",
                  "الحالة",
                  ...(isAdmin ? ["أضيفت بواسطة"] : []),
                  "",
                ].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-bold" style={{ color: "#64748B" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} className="px-4 py-12 text-center text-sm text-slate-500">
                    {isDoctor ? "لا توجد فواتير لمرضاك حتى الآن." : "لا فواتير بعد. أنشئ فاتورة جديدة."}
                  </td>
                </tr>
              ) : (
                filtered.map((inv, i) => {
                  const sc = statusConfig[inv.status] || statusConfig["غير مدفوعة"];
                  const remaining = inv.amount - inv.paid;
                  const isExpanded = expandedInvId === inv.dbId;
                  return (
                    <>
                      <motion.tr
                        key={inv.dbId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="group hover:bg-blue-50/40 transition-all cursor-pointer"
                        style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(30,58,111,0.04)" }}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold" style={{ color: "#1D5FBF" }}>
                            {inv.id}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                              style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
                            >
                              {inv.patient[0]}
                            </div>
                            <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>
                              {inv.patient}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: "#64748B" }}>
                          {inv.doctor || "—"}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: "#64748B" }}>
                          <div>{inv.date}</div>
                          <div className="text-xs text-slate-400">{safeFormatDate(inv.createdAt, "HH:mm")}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-black" style={{ color: "#0F172A" }}>
                            {inv.amount} JOD
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-sm font-bold"
                            style={{
                              color: inv.paid >= inv.amount ? "#16A34A" : inv.paid > 0 ? "#D97706" : "#DC2626",
                            }}
                          >
                            {inv.paid} JOD
                          </span>
                          {remaining > 0 && inv.paid < inv.amount && (
                            <span className="block text-[10px] font-bold text-red-600">متبقي {remaining} JOD</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {inv.method ? (
                            <span className="text-sm" style={{ color: "#64748B" }}>
                              {methodConfig[inv.method]?.icon} {inv.method}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "#94A3B8" }}>-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold w-fit"
                            style={{ background: sc.bg, color: sc.text }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.dot }} />
                            {inv.status}
                          </span>
                        </td>
                        {/* "أضيفت بواسطة" - Admin only */}
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                              <User size={11} className="text-slate-400" />
                              {inv.createdBy || "—"}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {/* سجل الدفعات */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedInvId(isExpanded ? null : inv.dbId);
                              }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-100"
                              title="سجل الدفعات"
                            >
                              {isExpanded ? (
                                <ChevronUp size={12} style={{ color: "#1D5FBF" }} />
                              ) : (
                                <History size={12} style={{ color: "#64748B" }} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="طباعة / PDF"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPrintInvoice(inv);
                              }}
                            >
                              <Printer size={12} style={{ color: "#64748B" }} />
                            </button>
                            <button
                              type="button"
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="معاينة"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPrintInvoice(inv);
                              }}
                            >
                              <Eye size={12} style={{ color: "#1D5FBF" }} />
                            </button>
                            {inv.status !== "مدفوعة" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInvoice(inv);
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 opacity-0 group-hover:opacity-100"
                                style={{ background: "linear-gradient(135deg, #16A34A, #22D3EE)" }}
                              >
                                تحصيل
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                      {/* Expanded Payment History Row */}
                      {isExpanded && (
                        <tr style={{ borderBottom: "1px solid rgba(30,58,111,0.04)" }}>
                          <td colSpan={isAdmin ? 10 : 9} style={{ background: "#FAFBFF" }}>
                            <PaymentHistoryPanel
                              invoiceId={inv.dbId}
                              clinicId={clinicId}
                              isAdmin={isAdmin}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedInvoice && (
          <PaymentModal
            invoice={selectedInvoice}
            clinicId={clinicId}
            onClose={() => setSelectedInvoice(null)}
            onPaid={fetchAll}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewInvoice && (
          <NewInvoiceModal
            clinicId={clinicId}
            patients={patients}
            doctorName={isDoctor ? myName : undefined}
            onClose={() => setShowNewInvoice(false)}
            onCreated={fetchAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
