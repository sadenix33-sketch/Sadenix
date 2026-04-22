import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2, Users, ShieldCheck, Plus, Power, Trash2, Eye,
  Stethoscope, BarChart3, TrendingUp, CheckCircle2, XCircle,
  LogOut, Search, RefreshCw, Mail, User, KeyRound, Globe,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router";

interface Clinic {
  id: string;
  name: string;
  owner_name: string;
  email: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  user_count?: number;
}

interface NewClinicForm {
  clinic_name: string;
  owner_name: string;
  email: string;
  password: string;
}

const PLAN_COLORS: Record<string, string> = {
  basic: "#6B7280",
  professional: "#1D5FBF",
  enterprise: "#7C3AED",
};

const PLAN_LABELS: Record<string, string> = {
  basic: "أساسي",
  professional: "احترافي",
  enterprise: "مؤسسي",
};

export function SuperAdminPage() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, totalUsers: 0 });
  const [form, setForm] = useState<NewClinicForm>({
    clinic_name: "",
    owner_name: "",
    email: "",
    password: "",
  });

  const fetchClinics = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clinics")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setClinics(data);
      setStats({
        total: data.length,
        active: data.filter((c) => c.is_active).length,
        totalUsers: 0,
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchClinics(); }, []);

  const handleToggleActive = async (clinic: Clinic) => {
    await supabase
      .from("clinics")
      .update({ is_active: !clinic.is_active })
      .eq("id", clinic.id);
    fetchClinics();
  };

  const handleAddClinic = async () => {
    if (!form.clinic_name || !form.email || !form.password || !form.owner_name) {
      setAddError("يرجى ملء جميع الحقول.");
      return;
    }
    setAdding(true);
    setAddError("");

    try {
      // 1. Create clinic row
      const { data: clinicData, error: clinicError } = await supabase
        .from("clinics")
        .insert({ 
          name: form.clinic_name, 
          owner_name: form.owner_name, 
          plan: "professional", 
          is_active: true,
          email: form.email,
        })
        .select()
        .single();

      if (clinicError || !clinicData) {
        throw new Error("فشل إنشاء العيادة: " + (clinicError?.message || "خطأ غير معروف"));
      }

      // 2. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.owner_name,
            role: "clinic_admin",
            clinic_id: clinicData.id,
          },
        },
      });

      if (authError) {
        // Rollback clinic if user creation failed
        await supabase.from("clinics").delete().eq("id", clinicData.id);
        throw new Error("فشل إنشاء المستخدم: " + authError.message);
      }

      if (!authData.user) {
        await supabase.from("clinics").delete().eq("id", clinicData.id);
        throw new Error("لم يتم إنشاء المستخدم بشكل صحيح");
      }

      // 3. Insert profile row
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        email: form.email.toLowerCase().trim(),
        full_name: form.owner_name,
        role: "clinic_admin",
        clinic_id: clinicData.id,
        is_active: true,
      });

      if (profileError) {
        console.error("Profile error:", profileError);
        // Don't rollback clinic and user, just log the error
      }

      setAddSuccess(`تم إنشاء عيادة "${form.clinic_name}" بنجاح!`);
      setForm({ clinic_name: "", owner_name: "", email: "", password: "" });
      fetchClinics();
      setTimeout(() => {
        setAddSuccess("");
        setShowAddModal(false);
      }, 3000);
    } catch (e: any) {
      setAddError(e.message || "حدث خطأ غير متوقع");
    } finally {
      setAdding(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const filteredClinics = clinics.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #0A0F1E 0%, #0F2547 100%)", direction: "rtl", fontFamily: "Cairo, sans-serif" }}
    >
      {/* Top Nav */}
      <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
            <Stethoscope size={18} color="white" />
          </div>
          <div>
            <span className="text-white font-black text-lg">Sadenix</span>
            <div className="text-xs" style={{ color: "#64B5F6" }}>لوحة تحكم مدير النظام</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(29,95,191,0.2)", border: "1px solid rgba(96,165,250,0.3)" }}>
            <ShieldCheck size={13} color="#60A5FA" />
            <span className="text-xs font-bold" style={{ color: "#60A5FA" }}>Super Admin</span>
          </div>
          <div className="text-sm font-semibold" style={{ color: "#CBD5E1" }}>{user?.full_name}</div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80" style={{ background: "rgba(220,38,38,0.15)", color: "#FCA5A5", border: "1px solid rgba(220,38,38,0.3)" }}>
            <LogOut size={13} />
            خروج
          </button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: "إجمالي العيادات", value: stats.total, icon: Building2, color: "#1D5FBF" },
            { label: "العيادات النشطة", value: stats.active, icon: CheckCircle2, color: "#10B981" },
            { label: "العيادات المعلّقة", value: stats.total - stats.active, icon: XCircle, color: "#EF4444" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-6"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}20` }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <TrendingUp size={14} style={{ color: "#64B5F6" }} />
              </div>
              <div className="text-3xl font-black text-white mb-1">{s.value}</div>
              <div className="text-sm" style={{ color: "#94A3B8" }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Clinics Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Table Header */}
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div>
              <h2 className="text-white font-bold text-lg">العيادات المشتركة</h2>
              <p className="text-xs mt-0.5" style={{ color: "#64B5F6" }}>إدارة جميع العيادات في المنصة</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#64B5F6" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="بحث..."
                  className="h-9 rounded-xl text-sm outline-none pr-9 pl-4"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white", width: 200, fontFamily: "Cairo, sans-serif" }}
                />
              </div>
              <button
                onClick={fetchClinics}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <RefreshCw size={14} style={{ color: "#94A3B8" }} />
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
              >
                <Plus size={15} />
                إضافة عيادة
              </motion.button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 rounded-full"
                style={{ borderColor: "rgba(96,165,250,0.2)", borderTopColor: "#60A5FA" }}
              />
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: "#64748B" }}>
              <Building2 size={40} className="mb-3 opacity-30" />
              <p className="text-sm">لا توجد عيادات مسجّلة بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["اسم العيادة", "المسؤول", "البريد الإلكتروني", "الخطة", "الحالة", "تاريخ الإنشاء", "إجراءات"].map(h => (
                      <th key={h} className="text-right py-3 px-5 text-xs font-bold" style={{ color: "#64748B" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredClinics.map((clinic, i) => (
                    <motion.tr
                      key={clinic.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(29,95,191,0.2)" }}>
                            <Building2 size={14} style={{ color: "#60A5FA" }} />
                          </div>
                          <span className="text-sm font-semibold text-white">{clinic.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm" style={{ color: "#CBD5E1" }}>{clinic.owner_name}</td>
                      <td className="py-4 px-5 text-sm" style={{ color: "#94A3B8" }}>{clinic.email}</td>
                      <td className="py-4 px-5">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: `${PLAN_COLORS[clinic.plan] || "#6B7280"}20`, color: PLAN_COLORS[clinic.plan] || "#6B7280" }}>
                          {PLAN_LABELS[clinic.plan] || clinic.plan}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className="flex items-center gap-1.5 text-xs font-bold w-fit px-2.5 py-1 rounded-full" style={{ background: clinic.is_active ? "#10B98120" : "#EF444420", color: clinic.is_active ? "#10B981" : "#EF4444" }}>
                          {clinic.is_active ? <><CheckCircle2 size={12} /> نشطة</> : <><XCircle size={12} /> معلّقة</>}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm" style={{ color: "#64748B" }}>
                        {new Date(clinic.created_at).toLocaleDateString("ar-JO")}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(clinic)}
                            title={clinic.is_active ? "تعليق العيادة" : "تفعيل العيادة"}
                            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                            style={{ background: clinic.is_active ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)" }}
                          >
                            <Power size={13} style={{ color: clinic.is_active ? "#EF4444" : "#10B981" }} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Clinic Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={e => e.target === e.currentTarget && setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-2xl p-8"
              style={{ background: "#0F1B2D", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <h3 className="text-white font-black text-xl mb-6">إضافة عيادة جديدة</h3>

              {addSuccess ? (
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                  <CheckCircle2 size={20} style={{ color: "#10B981" }} />
                  <p className="text-sm font-semibold" style={{ color: "#10B981" }}>{addSuccess}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { key: "clinic_name", label: "اسم العيادة", icon: Building2, placeholder: "عيادة الأسنان المتميزة" },
                    { key: "owner_name", label: "اسم المدير", icon: User, placeholder: "د. أحمد محمد" },
                    { key: "email", label: "البريد الإلكتروني", icon: Mail, placeholder: "admin@clinic.com", type: "email" },
                    { key: "password", label: "كلمة المرور الأولية", icon: KeyRound, placeholder: "••••••••", type: "password" },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-bold mb-1.5" style={{ color: "#94A3B8" }}>{field.label}</label>
                      <div className="relative">
                        <field.icon size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#64748B" }} />
                        <input
                          type={(field as any).type || "text"}
                          placeholder={field.placeholder}
                          value={(form as any)[field.key]}
                          onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                          className="w-full h-11 rounded-xl text-sm outline-none pr-9 pl-4"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontFamily: "Cairo, sans-serif" }}
                        />
                      </div>
                    </div>
                  ))}

                  {addError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)" }}>
                      <XCircle size={13} style={{ color: "#EF4444" }} />
                      <span className="text-xs font-semibold" style={{ color: "#EF4444" }}>{addError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleAddClinic}
                      disabled={adding}
                      className="flex-1 h-11 rounded-xl font-bold text-white text-sm"
                      style={{ background: adding ? "#1D5FBF80" : "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
                    >
                      {adding ? "جاري الإنشاء..." : "إنشاء العيادة"}
                    </motion.button>
                    <button
                      onClick={() => { setShowAddModal(false); setAddError(""); }}
                      className="px-5 h-11 rounded-xl text-sm font-semibold"
                      style={{ background: "rgba(255,255,255,0.07)", color: "#94A3B8" }}
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
