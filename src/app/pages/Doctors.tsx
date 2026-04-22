import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Search, CheckCircle, X, Edit2, Shield, Loader2,
  Trash2, UserPlus, Key, Eye, EyeOff, Save, Users, 
  UserCheck, RefreshCw, Mail, ChevronDown, ChevronUp, Clock, User,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";

/* ─── Doctor Payment History Sub-Component ────────────────────────── */
function DoctorPaymentHistory({ doctorName, clinicId }: { doctorName: string; clinicId: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Get invoice IDs for this doctor
      const { data: invData } = await supabase
        .from('invoices')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('doctor_name', doctorName);
      
      if (!invData || invData.length === 0) { setPayments([]); setLoading(false); return; }

      const invoiceIds = invData.map(i => i.id);
      const { data: payData } = await supabase
        .from('payments')
        .select('*')
        .in('invoice_id', invoiceIds)
        .order('created_at', { ascending: false })
        .limit(20);

      setPayments(payData || []);
      setLoading(false);
    })();
  }, [doctorName, clinicId]);

  if (loading) return <div className="p-6 flex justify-center"><Loader2 size={20} className="animate-spin text-blue-500" /></div>;
  if (payments.length === 0) return <div className="p-6 text-center text-sm text-slate-400">لا توجد دفعات مسجلة لهذا الطبيب</div>;

  return (
    <div className="p-5 space-y-2">
      <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1">
        <Clock size={12} /> آخر 20 دفعة لمرضى الطبيب
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {payments.map((pay) => (
          <div key={pay.id} className="flex items-center justify-between p-3 rounded-xl transition-all"
            style={{ background: "white", border: "1px solid #E2E8F0" }}>
            <div className="space-y-1">
              <div className="text-sm font-black text-slate-800">{Number(pay.amount).toLocaleString()} JOD</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <span>{pay.method || 'نقدي'}</span>
              </div>
              {pay.created_by_name && (
                <div className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                  <User size={10} /> حاسَب: {pay.created_by_name}
                </div>
              )}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-600">
                {pay.created_at ? (() => { try { return format(parseISO(pay.created_at), "dd/MM/yyyy", { locale: arSA }); } catch { return ''; } })(): ''}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {pay.created_at ? (() => { try { return format(parseISO(pay.created_at), "HH:mm"); } catch { return ''; } })(): ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ROLES = {
  super_admin: { label: "مدير النظام", color: "#DC2626", bg: "#FEE2E2" },
  clinic_admin: { label: "مدير العيادة", color: "#7C3AED", bg: "#F5F3FF" },
  doctor: { label: "طبيب", color: "#1D5FBF", bg: "#EFF6FF" },
  receptionist: { label: "مستقبل", color: "#0891B2", bg: "#E0F2FE" },
  accountant: { label: "محاسب", color: "#16A34A", bg: "#DCFCE7" },
  nurse: { label: "ممرض/ة", color: "#D97706", bg: "#FEF3C7" },
};

const PERMISSIONS = {
  view_patients: { label: "عرض المرضى", category: "المرضى" },
  add_patients: { label: "إضافة مريض", category: "المرضى" },
  edit_patients: { label: "تعديل مريض", category: "المرضى" },
  delete_patients: { label: "حذف مريض", category: "المرضى" },
  view_appointments: { label: "عرض المواعيد", category: "المواعيد" },
  add_appointments: { label: "إضافة موعد", category: "المواعيد" },
  edit_appointments: { label: "تعديل موعد", category: "المواعيد" },
  cancel_appointments: { label: "إلغاء موعد", category: "المواعيد" },
  view_billing: { label: "عرض الفواتير", category: "المالية" },
  add_invoices: { label: "إضافة فاتورة", category: "المالية" },
  receive_payments: { label: "استلام دفعات", category: "المالية" },
  view_reports: { label: "عرض التقارير", category: "التقارير" },
  export_reports: { label: "تصدير التقارير", category: "التقارير" },
  view_staff: { label: "عرض الموظفين", category: "الفريق" },
  add_staff: { label: "إضافة موظف", category: "الفريق" },
  edit_staff: { label: "تعديل موظف", category: "الفريق" },
  manage_roles: { label: "إدارة الصلاحيات", category: "الفريق" },
  view_inventory: { label: "عرض المخزون", category: "المخزون" },
  manage_inventory: { label: "إدارة المخزون", category: "المخزون" },
  settings: { label: "الإعدادات", category: "الإعدادات" },
};

const DEFAULT_PERMISSIONS: Record<string, string[]> = {
  clinic_admin: Object.keys(PERMISSIONS),
  doctor: ["view_patients", "add_patients", "edit_patients", "view_appointments", "add_appointments", "edit_appointments", "view_billing", "add_invoices", "view_reports"],
  receptionist: ["view_patients", "add_patients", "view_appointments", "add_appointments", "cancel_appointments", "view_billing"],
  accountant: ["view_patients", "view_appointments", "view_billing", "add_invoices", "receive_payments", "view_reports", "export_reports"],
  nurse: ["view_patients", "view_appointments", "add_appointments", "view_inventory"],
};

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  specialty: string | null;
  is_active: boolean;
  permissions: string[];
  created_at: string;
}

function AddStaffModal({ clinicId, onClose, onCreated }: { clinicId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", role: "receptionist", specialty: "",
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const withTimeout = <T,>(promise: Promise<T>, ms: number, msg: string): Promise<T> =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(msg)), ms);
      promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !password) {
      setError("الرجاء ملء جميع الحقول المطلوبة");
      return;
    }
    if (!validateEmail(form.email)) {
      setError("البريد الإلكتروني غير صالح");
      return;
    }
    if (password.length < 6) {
      setError("كلمة المرور 6 أحرف على الأقل");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Create auth user first
      const { data: authData, error: authErr } = await withTimeout(
        supabase.auth.signUp({
          email: form.email.toLowerCase().trim(),
          password,
          options: {
            data: { 
              full_name: form.full_name, 
              role: form.role, 
              clinic_id: clinicId,
            },
          },
        }),
        20000,
        "انتهت مهلة الاتصال، تحقق من اتصالك بالإنترنت"
      );

      if (authErr) {
        if (authErr.message.includes("already registered") || authErr.code === "23505") {
          throw new Error("هذا البريد الإلكتروني مسجل مسبقاً");
        }
        throw new Error(authErr.message);
      }

      // Then create profile linked to auth user
      if (authData?.user) {
        const { error: profileErr } = await withTimeout(
          supabase.from("profiles").insert({
            id: authData.user.id,
            full_name: form.full_name,
            email: form.email.toLowerCase().trim(),
            phone: form.phone,
            role: form.role,
            specialty: form.specialty || null,
            clinic_id: clinicId,
            is_active: true,
            permissions: DEFAULT_PERMISSIONS[form.role] || [],
          }),
          15000,
          "تم إنشاء الحساب لكن فشل حفظ البيانات الإضافية"
        );

        if (profileErr && !profileErr.message.includes("duplicate")) {
          console.warn("Profile creation note:", profileErr.message);
        }
      }

      setSuccess(true);
      setTimeout(() => { onCreated(); onClose(); }, 2000);
    } catch (e: any) {
      setError(e.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} style={{ color: "#16A34A" }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: "#0F172A" }}>تم إنشاء الموظف بنجاح!</h3>
          <p className="text-sm" style={{ color: "#64748B" }}>يمكن للموظف الآن تسجيل الدخول</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(30,58,111,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
              <UserPlus size={18} color="white" />
            </div>
            <div>
              <h3 className="font-bold" style={{ color: "#0F172A" }}>إضافة موظف جديد</h3>
              <p className="text-xs" style={{ color: "#64748B" }}>سيتم إنشاء حساب دخول له</p>
            </div>
          </div>
          <button onClick={onClose}><X size={18} style={{ color: "#64748B" }} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: "#FEE2E2", color: "#DC2626" }}>
              <X size={16} />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>الاسم الكامل *</label>
            <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} 
              className="w-full h-10 px-3 rounded-xl text-sm" style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }} placeholder="اسم الموظف" />
          </div>

          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>البريد الإلكتروني *</label>
            <div className="relative">
              <Mail size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }} />
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} 
                className="w-full h-10 px-3 pr-10 rounded-xl text-sm" style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }} placeholder="email@clinic.com" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>كلمة المرور *</label>
            <div className="relative">
              <Key size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#94A3B8" }} />
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} 
                className="w-full h-10 px-3 pr-10 rounded-xl text-sm" style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }} placeholder="6 أحرف على الأقل" />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff size={14} style={{ color: "#94A3B8" }} /> : <Eye size={14} style={{ color: "#94A3B8" }} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>رقم الهاتف</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} 
                className="w-full h-10 px-3 rounded-xl text-sm" style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }} placeholder="0791234567" />
            </div>
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>الدور *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} 
                className="w-full h-10 px-3 rounded-xl text-sm" style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}>
                {Object.entries(ROLES).filter(([key]) => key !== "super_admin").map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.role === "doctor" && (
            <div>
              <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>التخصص</label>
              <input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} 
                className="w-full h-10 px-3 rounded-xl text-sm" style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }} placeholder="مثال: تقويم أسنان" />
            </div>
          )}

          <div className="p-3 rounded-xl" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} style={{ color: "#1D5FBF" }} />
              <span className="text-xs font-bold" style={{ color: "#1D5FBF" }}>الصلاحيات التلقائية:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {(DEFAULT_PERMISSIONS[form.role] || []).slice(0, 5).map(p => (
                <span key={p} className="px-2 py-0.5 rounded text-xs" style={{ background: "#DBEAFE", color: "#1D5FBF" }}>
                  {PERMISSIONS[p as keyof typeof PERMISSIONS]?.label}
                </span>
              ))}
              {(DEFAULT_PERMISSIONS[form.role] || []).length > 5 && (
                <span className="px-2 py-0.5 rounded text-xs" style={{ background: "#DBEAFE", color: "#1D5FBF" }}>
                  +{(DEFAULT_PERMISSIONS[form.role] || []).length - 5}
                </span>
              )}
            </div>
          </div>

          <button onClick={handleSubmit} disabled={saving} 
            className="w-full h-11 rounded-xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: saving ? "#94A3B8" : "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {saving ? "جاري الإنشاء..." : "إنشاء الموظف"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PermissionsModal({ profile, onClose, onUpdated }: { profile: Profile; onClose: () => void; onUpdated: () => void }) {
  const [permissions, setPermissions] = useState<string[]>(profile.permissions || []);
  const [saving, setSaving] = useState(false);

  const categories = [...new Set(Object.values(PERMISSIONS).map(p => p.category))];

  const togglePermission = (perm: string) => {
    setPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const applyRoleDefaults = (role: string) => {
    setPermissions(DEFAULT_PERMISSIONS[role] || []);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ permissions }).eq("id", profile.id);
      if (error) throw error;
      onUpdated();
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        
        <div className="sticky top-0 bg-white flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(30,58,111,0.08)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EFF6FF" }}>
              <Shield size={18} style={{ color: "#1D5FBF" }} />
            </div>
            <div>
              <h3 className="font-bold" style={{ color: "#0F172A" }}>صلاحيات: {profile.full_name}</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: ROLES[profile.role as keyof typeof ROLES]?.bg, color: ROLES[profile.role as keyof typeof ROLES]?.color }}>
                {ROLES[profile.role as keyof typeof ROLES]?.label}
              </span>
            </div>
          </div>
          <button onClick={onClose}><X size={18} style={{ color: "#64748B" }} /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#F5F3FF", border: "1px solid #DDD6FE" }}>
            <RefreshCw size={14} style={{ color: "#7C3AED" }} />
            <span className="text-xs" style={{ color: "#7C3AED" }}>تطبيق الصلاحيات الافتراضية للدور:</span>
            <select onChange={e => applyRoleDefaults(e.target.value)} className="text-xs px-2 py-1 rounded-lg" style={{ background: "white", border: "1px solid #DDD6FE" }}>
              <option value="">اختر دور...</option>
              {Object.entries(ROLES).filter(([key]) => key !== "super_admin").map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {categories.map(cat => (
            <div key={cat}>
              <h4 className="text-sm font-bold mb-2" style={{ color: "#374151" }}>{cat}</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PERMISSIONS).filter(([, p]) => p.category === cat).map(([key, perm]) => (
                  <label key={key} 
                    className="flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all"
                    style={{ 
                      background: permissions.includes(key) ? "#EFF6FF" : "#F8FAFC", 
                      border: `1.5px solid ${permissions.includes(key) ? "#BFDBFE" : "#E2E8F0"}` 
                    }}>
                    <input type="checkbox" checked={permissions.includes(key)} onChange={() => togglePermission(key)} className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm" style={{ color: permissions.includes(key) ? "#1D5FBF" : "#64748B" }}>
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} 
              className="flex-1 h-11 rounded-xl font-bold text-white flex items-center justify-center gap-2"
              style={{ background: saving ? "#94A3B8" : "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? "جاري الحفظ..." : "حفظ الصلاحيات"}
            </button>
            <button onClick={onClose} className="px-6 h-11 rounded-xl font-semibold" style={{ background: "#F1F5F9", color: "#64748B" }}>
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ResetPasswordModal({ profile, onClose, onReset }: { profile: Profile; onClose: () => void; onReset: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (password.length < 6) {
      setError("كلمة المرور 6 أحرف على الأقل");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const { error: err } = await supabase.auth.admin.updateUserById(profile.id, { password });
      if (err) throw err;
      setSuccess(true);
      setTimeout(() => { onReset(); onClose(); }, 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }}>
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl p-8 text-center">
          <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "#16A34A" }} />
          <h3 className="text-lg font-bold mb-2">تم تغيير كلمة المرور!</h3>
          <p className="text-sm" style={{ color: "#64748B" }}>يمكن للموظف استخدامها الآن</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-white rounded-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#FEF3C7" }}>
            <Key size={18} style={{ color: "#D97706" }} />
          </div>
          <div>
            <h3 className="font-bold" style={{ color: "#0F172A" }}>إعادة تعيين كلمة المرور</h3>
            <p className="text-xs" style={{ color: "#64748B" }}>لـ {profile.full_name}</p>
          </div>
        </div>

        {error && <div className="p-3 rounded-xl mb-4 text-sm" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</div>}

        <div className="mb-4">
          <label className="text-xs font-bold mb-1.5 block">كلمة المرور الجديدة</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} 
              className="w-full h-10 px-3 pr-10 rounded-xl text-sm" style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0" }} placeholder="6 أحرف على الأقل" />
            <button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2">
              {showPassword ? <EyeOff size={14} style={{ color: "#94A3B8" }} /> : <Eye size={14} style={{ color: "#94A3B8" }} />}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleReset} disabled={saving} className="flex-1 h-10 rounded-xl font-bold text-white" style={{ background: "#D97706" }}>
            {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : "تغيير"}
          </button>
          <button onClick={onClose} className="px-4 h-10 rounded-xl font-semibold" style={{ background: "#F1F5F9", color: "#64748B" }}>إلغاء</button>
        </div>
      </motion.div>
    </div>
  );
}

export function DoctorsPage() {
  const { clinicId, loading: authLoading, role: userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"doctors" | "staff" | "performance">("doctors");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [doctorStats, setDoctorStats] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedDoctorIdx, setExpandedDoctorIdx] = useState<number | null>(null);

  const isAdmin = userRole === "clinic_admin" || userRole === "super_admin";

  const fetchProfiles = useCallback(async () => {
    if (!clinicId) { setProfiles([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false });
      if (error) throw error;
      setProfiles((data || []) as Profile[]);

      // Fetch Doctor Performance Stats (only for admin)
      if (isAdmin) {
        const { data: invData } = await supabase
          .from('invoices')
          .select('doctor_name, total_amount, paid_amount')
          .eq('clinic_id', clinicId);
        if (invData) {
          const statsMap: Record<string, { work: number, paid: number, invoiceCount: number }> = {};
          invData.forEach(inv => {
            const d = inv.doctor_name || 'غير محدد';
            if (!statsMap[d]) statsMap[d] = { work: 0, paid: 0, invoiceCount: 0 };
            statsMap[d].work += Number(inv.total_amount) || 0;
            statsMap[d].paid += Number(inv.paid_amount) || 0;
            statsMap[d].invoiceCount += 1;
          });
          setDoctorStats(Object.entries(statsMap).map(([name, s]) => ({ name, ...s })));
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [clinicId, isAdmin]);

  useEffect(() => { if (!authLoading) fetchProfiles(); }, [authLoading, fetchProfiles]);

  if (authLoading || loading) return (
    <div className="py-20 flex justify-center" style={{ direction: "rtl" }}>
      <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
    </div>
  );

  if (!clinicId) return (
    <div className="p-8 text-center rounded-2xl bg-white border" style={{ direction: "rtl" }}>
      <p className="font-bold text-slate-800">لا يوجد معرّف عيادة.</p>
    </div>
  );

  const doctors = profiles.filter(p => p.role === "doctor");
  const staffList = profiles.filter(p => p.role !== "doctor");
  const filteredProfiles = activeTab === "doctors" ? doctors : staffList;
  const filtered = filteredProfiles.filter(p =>
    !search || 
    (p.full_name && p.full_name.includes(search)) || 
    (p.email && p.email.includes(search)) || 
    (p.specialty && p.specialty.includes(search))
  );

  const toggleStatus = async (profile: Profile) => {
    if (!isAdmin) return;
    await supabase.from("profiles").update({ is_active: !profile.is_active }).eq("id", profile.id);
    fetchProfiles();
  };

  const deleteProfile = async (profile: Profile) => {
    if (!isAdmin) return;
    if (!confirm(`هل أنت متأكد من حذف ${profile.full_name}؟`)) return;
    await supabase.from("profiles").delete().eq("id", profile.id);
    fetchProfiles();
  };

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-black text-xl" style={{ color: "#0F172A" }}>الأطباء والموظفون</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>{doctors.length} طبيب · {staffList.length} موظف</p>
        </div>
        {isAdmin && (
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
            <Plus size={16} /> إضافة موظف
          </motion.button>
        )}
      </div>

      <div className="flex gap-2">
        {[
          { id: "doctors", label: "الأطباء", count: doctors.length },
          { id: "staff", label: "طاقم العمل", count: staffList.length },
          ...(isAdmin ? [{ id: "performance", label: "أداء الأطباء", count: doctorStats.length }] : []),
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold transition-all"
            style={{ background: activeTab === tab.id ? "#EFF6FF" : "white", color: activeTab === tab.id ? "#1D5FBF" : "#64748B", border: activeTab === tab.id ? "1px solid #BFDBFE" : "1px solid rgba(30,58,111,0.08)" }}>
            {tab.label}
            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: activeTab === tab.id ? "#BFDBFE" : "#F1F5F9", color: activeTab === tab.id ? "#1D5FBF" : "#64748B" }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab !== 'performance' && (
        <div className="flex items-center gap-2 px-4 h-10 rounded-xl max-w-sm" style={{ background: "white", border: "1px solid rgba(30,58,111,0.08)" }}>
          <Search size={14} style={{ color: "#64748B" }} />
          <input type="text" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1 outline-none bg-transparent text-sm" />
          {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: "#94A3B8" }} /></button>}
        </div>
      )}

      {activeTab === 'performance' ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
          {doctorStats.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p>لا توجد بيانات فواتير للأطباء بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                    {["اسم الطبيب", "عدد الفواتير", "إجمالي العمل", "إجمالي التحصيل", "المتبقي", "نسبة التحصيل", ""].map(h => (
                      <th key={h} className="text-right px-6 py-4 text-xs font-bold uppercase" style={{ color: "#64748B" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {doctorStats.map((s, i) => {
                    const pct = s.work > 0 ? (s.paid / s.work) * 100 : 0;
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                              style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                              {s.name?.charAt(0) || "د"}
                            </div>
                            <span className="font-bold text-slate-800">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: "#EFF6FF", color: "#1D5FBF" }}>
                            {s.invoiceCount || 0} فاتورة
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-800">{s.work.toLocaleString()} JOD</td>
                        <td className="px-6 py-4 font-black text-green-600">{s.paid.toLocaleString()} JOD</td>
                        <td className="px-6 py-4 font-black text-red-600">{(s.work - s.paid).toLocaleString()} JOD</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden min-w-[80px]">
                              <div className="h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, pct)}%`, background: pct >= 80 ? "#16A34A" : pct >= 50 ? "#D97706" : "#DC2626" }} />
                            </div>
                            <span className="text-xs font-bold" style={{ color: pct >= 80 ? "#16A34A" : pct >= 50 ? "#D97706" : "#DC2626" }}>
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setExpandedDoctorIdx(expandedDoctorIdx === i ? null : i)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: expandedDoctorIdx === i ? "#EFF6FF" : "#F8FAFC", color: "#1D5FBF", border: "1px solid #BFDBFE" }}>
                            {expandedDoctorIdx === i ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {expandedDoctorIdx === i ? "إخفاء" : "سجل الدفعات"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Expanded Payment History for selected doctor */}
              {expandedDoctorIdx !== null && doctorStats[expandedDoctorIdx] && clinicId && (
                <div className="border-t" style={{ background: "#FAFBFF" }}>
                  <DoctorPaymentHistory
                    doctorName={doctorStats[expandedDoctorIdx].name}
                    clinicId={clinicId}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
          {filtered.length === 0 ? (
            <div className="py-16 text-center"><p className="text-slate-500">لا يوجد موظفون.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                    {["الموظف", "الدور", "الحالة", "الصلاحيات", ""].map(h => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-bold" style={{ color: "#64748B" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/30" style={{ borderBottom: "1px solid rgba(30,58,111,0.04)" }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: ROLES[p.role as keyof typeof ROLES]?.color || "#64748B" }}>
                            {p.full_name?.charAt(0) || "م"}
                          </div>
                          <div>
                            <div className="text-sm font-bold" style={{ color: "#0F172A" }}>{p.full_name}</div>
                            <div className="text-xs" style={{ color: "#94A3B8" }}>{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ background: ROLES[p.role as keyof typeof ROLES]?.bg || "#F1F5F9", color: ROLES[p.role as keyof typeof ROLES]?.color || "#64748B" }}>
                          {ROLES[p.role as keyof typeof ROLES]?.label || p.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => isAdmin && toggleStatus(p)}
                          className="px-2 py-1 rounded-full text-xs font-bold cursor-pointer"
                          style={{ background: p.is_active ? "#DCFCE7" : "#FEF3C7", color: p.is_active ? "#16A34A" : "#D97706" }}>
                          {p.is_active ? "نشط" : "غير نشط"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(p.permissions || []).slice(0, 3).map(perm => (
                            <span key={perm} className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#F1F5F9", color: "#64748B" }}>
                              {PERMISSIONS[perm as keyof typeof PERMISSIONS]?.label || perm}
                            </span>
                          ))}
                          {(p.permissions || []).length > 3 && (
                            <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "#F1F5F9", color: "#64748B" }}>+{(p.permissions || []).length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <>
                              <button onClick={() => { setSelectedProfile(p); setShowPermissionsModal(true); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50" title="الصلاحيات">
                                <Shield size={14} style={{ color: "#1D5FBF" }} />
                              </button>
                              <button onClick={() => { setSelectedProfile(p); setShowResetPasswordModal(true); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-amber-50" title="كلمة المرور">
                                <Key size={14} style={{ color: "#D97706" }} />
                              </button>
                              <button onClick={() => deleteProfile(p)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50" title="حذف">
                                <Trash2 size={14} style={{ color: "#DC2626" }} />
                              </button>
                            </>
                          )}
                          <button onClick={() => setSelectedProfile(p)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100" title="عرض">
                            <Eye size={14} style={{ color: "#94A3B8" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showAddModal && <AddStaffModal clinicId={clinicId} onClose={() => setShowAddModal(false)} onCreated={fetchProfiles} />}
        {showPermissionsModal && selectedProfile && (
          <PermissionsModal profile={selectedProfile} onClose={() => { setShowPermissionsModal(false); setSelectedProfile(null); }} onUpdated={fetchProfiles} />
        )}
        {showResetPasswordModal && selectedProfile && (
          <ResetPasswordModal profile={selectedProfile} onClose={() => { setShowResetPasswordModal(false); setSelectedProfile(null); }} onReset={fetchProfiles} />
        )}
        {selectedProfile && !showPermissionsModal && !showResetPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setSelectedProfile(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm bg-white rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${ROLES[selectedProfile.role as keyof typeof ROLES]?.color || "#1D5FBF"}, #06B6D4)` }}>
                <button onClick={() => setSelectedProfile(null)} className="absolute top-4 left-4 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                  <X size={14} color="white" />
                </button>
              </div>
              <div className="px-6 pb-6">
                <div className="flex items-end justify-between -mt-10 mb-4">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-black border-4 border-white" style={{ background: ROLES[selectedProfile.role as keyof typeof ROLES]?.color || "#1D5FBF" }}>
                    {selectedProfile.full_name?.charAt(0)}
                  </div>
                </div>
                <h2 className="font-black text-lg" style={{ color: "#0F172A" }}>{selectedProfile.full_name}</h2>
                <span className="px-2 py-1 rounded-full text-xs font-bold mb-4 inline-block" style={{ background: ROLES[selectedProfile.role as keyof typeof ROLES]?.bg || "#F1F5F9", color: ROLES[selectedProfile.role as keyof typeof ROLES]?.color || "#1D5FBF" }}>
                  {ROLES[selectedProfile.role as keyof typeof ROLES]?.label || selectedProfile.role}
                </span>
                <div className="space-y-2">
                  {[
                    { label: "البريد", value: selectedProfile.email },
                    { label: "الهاتف", value: selectedProfile.phone || "—" },
                    { label: "التخصص", value: selectedProfile.specialty || "—" },
                    { label: "تاريخ الإنضمام", value: selectedProfile.created_at ? format(parseISO(selectedProfile.created_at), "dd/MM/yyyy", { locale: arSA }) : "—" },
                  ].map(f => (
                    <div key={f.label} className="flex justify-between text-sm">
                      <span style={{ color: "#94A3B8" }}>{f.label}</span>
                      <span className="font-semibold" style={{ color: "#0F172A" }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
