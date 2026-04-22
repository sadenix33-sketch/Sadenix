import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  TrendingDown,
  BarChart3,
  X,
  Loader2,
  MinusCircle,
} from "lucide-react";
import { format, parseISO, isBefore, addDays, startOfDay } from "date-fns";
import { arSA } from "date-fns/locale";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  متوفر: { bg: "#DCFCE7", text: "#16A34A", dot: "#16A34A" },
  منخفض: { bg: "#FEF3C7", text: "#D97706", dot: "#D97706" },
  حرج: { bg: "#FEE2E2", text: "#DC2626", dot: "#DC2626" },
};

interface InventoryRow {
  id: string;
  clinic_id: string;
  sku: string | null;
  name: string;
  category: string | null;
  quantity: number;
  reorder_point: number;
  unit: string;
  supplier: string | null;
  unit_cost: number;
  expiry_date: string | null;
  created_at: string;
}

type StockStatus = "متوفر" | "منخفض" | "حرج";

function num(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rowToItem(row: InventoryRow): {
  id: string;
  sku: string;
  name: string;
  category: string;
  stock: number;
  min: number;
  unit: string;
  supplier: string;
  cost: number;
  expiry: string;
  status: StockStatus;
  expirySoon: boolean;
  expiryExpired: boolean;
} {
  const stock = num(row.quantity);
  const min = num(row.reorder_point);
  let expiryExpired = false;
  let expirySoon = false;
  let expiryLabel = "—";
  if (row.expiry_date) {
    try {
      const ex = startOfDay(parseISO(row.expiry_date));
      const today = startOfDay(new Date());
      expiryExpired = isBefore(ex, today);
      expirySoon = !expiryExpired && isBefore(ex, addDays(today, 30));
      expiryLabel = format(ex, "MM/yyyy", { locale: arSA });
    } catch {
      expiryLabel = row.expiry_date;
    }
  }

  let status: StockStatus = "متوفر";
  if (expiryExpired || stock <= 0) status = "حرج";
  else if (stock <= min) status = "منخفض";

  return {
    id: row.id,
    sku: row.sku || row.id.slice(0, 8),
    name: row.name,
    category: row.category || "—",
    stock,
    min,
    unit: row.unit || "قطعة",
    supplier: row.supplier || "—",
    cost: num(row.unit_cost),
    expiry: expiryLabel,
    status,
    expirySoon,
    expiryExpired,
  };
}

interface AddItemModalProps {
  clinicId: string;
  onClose: () => void;
  onSaved: () => void;
}

function AddItemModal({ clinicId, onClose, onSaved }: AddItemModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("10");
  const [unit, setUnit] = useState("قطعة");
  const [supplier, setSupplier] = useState("");
  const [unitCost, setUnitCost] = useState("0");
  const [sku, setSku] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  const { profile } = useAuth();
  const submit = async () => {
    if (!name.trim()) {
      alert("اسم الصنف مطلوب.");
      return;
    }
    setSaving(true);
    try {
      const { data: inserted, error } = await supabase.from("inventory_items").insert({
        clinic_id: clinicId,
        name: name.trim(),
        category: category.trim() || null,
        quantity: num(quantity),
        reorder_point: num(reorderPoint),
        unit: unit.trim() || "قطعة",
        supplier: supplier.trim() || null,
        unit_cost: num(unitCost),
        sku: sku.trim() || null,
        expiry_date: expiryDate ? expiryDate : null,
      }).select().single();
      if (error) throw error;
      
      if (inserted) {
        await supabase.from("inventory_logs").insert({
          clinic_id: clinicId,
          item_id: inserted.id,
          action_type: 'إضافة',
          quantity_changed: num(quantity),
          new_quantity: num(quantity),
          notes: 'إضافة صنف جديد',
          created_by_name: profile?.full_name || 'System',
        });
      }

      onSaved();
      onClose();
    } catch (e) {
      alert("تأكد من تشغيل schema_inventory.sql. " + (e instanceof Error ? e.message : ""));
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ direction: "rtl" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">إضافة صنف</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">الاسم *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">الفئة</label>
              <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">SKU</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">الكمية</label>
              <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">نقطة إعادة الطلب</label>
              <input type="number" min="0" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">الوحدة</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">تكلفة الوحدة (JOD)</label>
              <input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">المورد</label>
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">انتهاء الصلاحية</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
          </div>
          <motion.button
            type="button"
            whileHover={{ scale: saving ? 1 : 1.02 }}
            whileTap={{ scale: saving ? 1 : 0.98 }}
            onClick={submit}
            disabled={saving}
            className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)", opacity: saving ? 0.85 : 1 }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : null}
            حفظ
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface DeductModalProps {
  item: ReturnType<typeof rowToItem>;
  onClose: () => void;
  onDone: () => void;
}

function DeductModal({ item, onClose, onDone }: DeductModalProps) {
  const { profile, clinicId } = useAuth();
  const [qty, setQty] = useState("1");
  const [notes, setNotes] = useState("صرف عيادة");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const q = num(qty);
    if (q <= 0) {
      alert("أدخل كمية صحيحة.");
      return;
    }
    if (q > item.stock) {
      alert("الكمية أكبر من المخزون المتاح.");
      return;
    }
    setSaving(true);
    try {
      const newStock = item.stock - q;
      const { error } = await supabase.from("inventory_items").update({ quantity: newStock }).eq("id", item.id);
      if (error) throw error;
      
      if (clinicId) {
        await supabase.from("inventory_logs").insert({
          clinic_id: clinicId,
          item_id: item.id,
          action_type: 'صرف',
          quantity_changed: -q,
          new_quantity: newStock,
          notes: notes.trim(),
          created_by_name: profile?.full_name || 'System',
        });
      }

      onDone();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "فشل الصرف");
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ direction: "rtl" }}
      >
        <h3 className="font-bold text-slate-900 mb-1">صرف مخزون</h3>
        <p className="text-xs text-slate-500 mb-4">{item.name} — متاح {item.stock} {item.unit}</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">الكمية المصروفة</label>
            <input type="number" min="1" max={item.stock} value={qty} onChange={(e) => setQty(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">ملاحظات / سبب</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 h-10 rounded-xl border bg-slate-50 text-sm" />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border text-sm font-bold text-slate-600">
            إلغاء
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={submit}
            disabled={saving}
            className="flex-1 h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "#1D5FBF", opacity: saving ? 0.8 : 1 }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            تأكيد الصرف
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function InventoryPage() {
  const { clinicId, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [showAdd, setShowAdd] = useState(false);
  const [deductItem, setDeductItem] = useState<ReturnType<typeof rowToItem> | null>(null);
  const [logItemId, setLogItemId] = useState<string | null>(null);

  const items = useMemo(() => rows.map(rowToItem), [rows]);

  const fetchItems = useCallback(async () => {
    if (!clinicId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("name", { ascending: true });
    if (error) console.error(error);
    else setRows((data as InventoryRow[]) || []);
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    if (!authLoading) fetchItems();
  }, [authLoading, fetchItems]);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (statusFilter === "الكل" || item.status === statusFilter) &&
          (search === "" || item.name.includes(search) || item.category.includes(search))
      ),
    [items, statusFilter, search]
  );

  const lowItems = useMemo(() => items.filter((i) => i.status === "منخفض" || i.status === "حرج"), [items]);
  const totalValue = useMemo(() => items.reduce((s, i) => s + i.stock * i.cost, 0), [items]);

  if (authLoading) {
    return (
      <div className="py-20 flex justify-center" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      </div>
    );
  }

  if (!clinicId) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border" style={{ direction: "rtl" }}>
        <AlertTriangle className="mx-auto mb-3 text-amber-500" size={40} />
        <p className="font-bold text-slate-800">لا يوجد معرّف عيادة مرتبط بحسابك.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-black text-slate-900" style={{ fontSize: 20 }}>
            المخزون والمواد
          </h1>
          <p className="text-sm mt-0.5 text-slate-500">
            {items.length} صنف · قيمة إجمالية تقريبية: {totalValue.toFixed(0)} JOD
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-bold border hover:bg-amber-50"
            style={{ color: "#D97706", borderColor: "#FCD34D", background: "#FEF3C7" }}
            onClick={() => lowItems.length && alert(`أصناف تحتاج طلب: ${lowItems.map((i) => i.name).join("، ")}`)}
          >
            طلب شراء
          </button>
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
          >
            <Plus size={15} />
            إضافة صنف
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الأصناف", value: items.length, icon: Package, color: "#1D5FBF", bg: "#EFF6FF" },
          { label: "مخزون منخفض", value: items.filter((i) => i.status === "منخفض").length, icon: TrendingDown, color: "#D97706", bg: "#FEF3C7" },
          { label: "وضع حرج", value: items.filter((i) => i.status === "حرج").length, icon: AlertTriangle, color: "#DC2626", bg: "#FEE2E2" },
          { label: "قيمة المخزون", value: `${totalValue.toFixed(0)} JOD`, icon: BarChart3, color: "#16A34A", bg: "#DCFCE7" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div              key={kpi.label}
              className="rounded-2xl p-5 bg-white border border-slate-100 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                  <Icon size={18} style={{ color: kpi.color }} />
                </div>
                <div>
                  <div className="text-xl font-black text-slate-900">{kpi.value}</div>
                  <div className="text-xs text-slate-500">{kpi.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lowItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{ background: "#FEF9EC", border: "1px solid #FCD34D" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} style={{ color: "#D97706" }} />
            <span className="text-sm font-bold text-amber-900">تنبيه: {lowItems.length} أصناف تحتاج إعادة طلب أو صلاحية</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowItems.map((item) => (
              <span
                key={item.id}
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: item.status === "حرج" ? "#FEE2E2" : "#FEF3C7",
                  color: item.status === "حرج" ? "#DC2626" : "#D97706",
                }}
              >
                {item.name} ({item.stock} {item.unit})
                {item.expiryExpired ? " · منتهي" : item.expirySoon ? " · يقارب الانتهاء" : ""}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <div className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 p-4 flex-wrap border-b border-slate-100">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs px-3 h-9 rounded-xl bg-slate-50">
            <Search size={14} className="text-slate-400 shrink-0" />
            <input
              type="search"
              placeholder="بحث عن صنف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none bg-transparent text-xs min-w-0"
              style={{ fontFamily: "Cairo, sans-serif" }}
            />
            {search ? (
              <button type="button" onClick={() => setSearch("")}>
                <X size={12} className="text-slate-400" />
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {["الكل", "متوفر", "منخفض", "حرج"].map((s) => (
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {["الصنف", "الفئة", "المخزون", "الحد الأدنى", "المورد", "التكلفة", "انتهاء الصلاحية", "الحالة", ""].map((h) => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-bold text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                    لا أصناف. أضف صنفاً أو نفّذ schema_inventory.sql في Supabase.
                  </td>
                </tr>
              ) : (
                filtered.map((item, i) => {
                  const sc = statusConfig[item.status];
                  const stockPercent = Math.min((item.stock / Math.max(item.min * 2, 1)) * 100, 100);
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="group hover:bg-blue-50/30 border-b border-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-blue-50">
                            <Package size={14} className="text-blue-600" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{item.name}</div>
                            <div className="text-xs text-slate-400">{item.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 text-slate-600">{item.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div
                            className="text-sm font-black mb-1"
                            style={{
                              color: item.status === "حرج" ? "#DC2626" : item.status === "منخفض" ? "#D97706" : "#0F172A",
                            }}
                          >
                            {item.stock} {item.unit}
                          </div>
                          <div className="w-20 h-1.5 rounded-full overflow-hidden bg-slate-200">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${stockPercent}%`,
                                background: item.status === "حرج" ? "#DC2626" : item.status === "منخفض" ? "#D97706" : "#16A34A",
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {item.min} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.supplier}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-slate-900">{item.cost} JOD</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-sm font-semibold"
                          style={{
                            color: item.expiryExpired ? "#DC2626" : item.expirySoon ? "#D97706" : "#64748B",
                          }}
                        >
                          {item.expiry}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold w-fit"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.dot }} />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                            onClick={() => setLogItemId(item.id)}
                          >
                            <BarChart3 size={12} />
                            سجل الحركة
                          </button>
                          <button
                            type="button"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                            onClick={() => setDeductItem(item)}
                          >
                            <MinusCircle size={12} />
                            صرف
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && clinicId && <AddItemModal clinicId={clinicId} onClose={() => setShowAdd(false)} onSaved={fetchItems} />}
      </AnimatePresence>
      <AnimatePresence>
        {deductItem && <DeductModal item={deductItem} onClose={() => setDeductItem(null)} onDone={fetchItems} />}
      </AnimatePresence>
      <AnimatePresence>
        {logItemId && <LogModal itemId={logItemId} clinicId={clinicId} onClose={() => setLogItemId(null)} />}
      </AnimatePresence>
    </div>
  );
}

function LogModal({ itemId, clinicId, onClose }: { itemId: string, clinicId: string, onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("item_id", itemId)
        .order("created_at", { ascending: false });
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [itemId, clinicId]);

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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ direction: "rtl" }}
      >
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="font-bold text-slate-900">سجل حركات الصنف</h3>
          <button onClick={onClose} className="p-1"><X size={16}/></button>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center text-sm text-slate-400 py-10">لا توجد حركات مسجلة لهذا الصنف</div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="flex justify-between p-3 rounded-lg border bg-slate-50">
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    {log.action_type === 'إضافة' ? <Plus size={12} className="inline text-green-600 ml-1" /> : <MinusCircle size={12} className="inline text-red-600 ml-1" />}
                    {log.action_type} - {Math.abs(log.quantity_changed)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">بواسطة: {log.created_by_name} | ملاحظات: {log.notes || '-'}</div>
                </div>
                <div className="text-left text-xs text-slate-400">
                  <div className="font-bold text-slate-700 mb-1">الرصيد: {log.new_quantity}</div>
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
