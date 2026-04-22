import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2, Clock, Shield, Bell, Globe,
  MessageSquare, Calendar, Users, Lock, Database,
  ChevronLeft, CheckCircle, Edit2, Upload, Palette,
  Phone, Mail, MapPin, Zap, Loader2, Save, X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionsContext";

const sections = [
  { id: "clinic", label: "ملف العيادة", icon: Building2 },
  { id: "hours", label: "ساعات العمل", icon: Clock },
  { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "whatsapp", label: "أتمتة التواصل (Automations)", icon: MessageSquare },
  { id: "roles", label: "الأدوار والصلاحيات", icon: Users },
  { id: "security", label: "الأمان والخصوصية", icon: Shield },
  { id: "backup", label: "النسخ الاحتياطي", icon: Database },
];

const defaultWorkingHours = [
  { day: "السبت", from: "09:00", to: "17:00", active: true },
  { day: "الأحد", from: "09:00", to: "17:00", active: true },
  { day: "الاثنين", from: "09:00", to: "17:00", active: true },
  { day: "الثلاثاء", from: "09:00", to: "17:00", active: true },
  { day: "الأربعاء", from: "09:00", to: "17:00", active: true },
  { day: "الخميس", from: "09:00", to: "14:00", active: true },
  { day: "الجمعة", from: "", to: "", active: false },
];

const roles = [
  { name: "مدير المنصة", permissions: ["كل الصلاحيات"], color: "#DC2626" },
  { name: "مالك العيادة", permissions: ["عرض", "تعديل", "حذف", "التقارير", "الإعدادات"], color: "#1D5FBF" },
  { name: "مدير العيادة", permissions: ["عرض", "تعديل", "التقارير"], color: "#8B5CF6" },
  { name: "مستقبلة", permissions: ["عرض", "حجز المواعيد"], color: "#16A34A" },
  { name: "طبيب", permissions: ["عرض المرضى", "المواعيد", "العلاجات"], color: "#D97706" },
  { name: "محاسب", permissions: ["الفواتير", "التقارير المالية"], color: "#06B6D4" },
];

function Toggle({ active, onChange, disabled }: { active: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-12 h-6 rounded-full relative transition-all duration-200 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{ background: active ? "#1D5FBF" : "#CBD5E1" }}
    >
      <motion.div
        animate={{ x: active ? 24 : 2 }}
        transition={{ duration: 0.2 }}
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

export function SettingsPage() {
  const { clinicId, user, loading: authLoading } = useAuth();
  const { canView } = usePermissions();
  
  const [activeSection, setActiveSection] = useState("clinic");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [clinic, setClinic] = useState<any>({
    name: "",
    owner_name: "",
    phone: "",
    email: "",
    address: "",
    currency: "JOD",
    logo_url: "",
  });

  const [hours, setHours] = useState(defaultWorkingHours);
  const [notifications, setNotifications] = useState({
    appointment: true,
    payment: true,
    reminder: true,
    lowStock: true,
    email: false,
    sms: true,
    whatsapp: true,
    autoReminder24h: false,
    autoPostOp: false,
    autoCheckup: false,
  });

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    loadClinicData();
  }, [clinicId]);

  const loadClinicData = async () => {
    try {
      const { data, error } = await supabase
        .from("clinics")
        .select("*")
        .eq("id", clinicId)
        .single();

      if (error) throw error;

      if (data) {
        setClinic({
          name: data.name || "",
          owner_name: data.owner_name || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          currency: data.currency || "JOD",
          logo_url: data.logo_url || "",
        });

        if (data.working_hours) {
          try {
            setHours(JSON.parse(data.working_hours));
          } catch {}
        }

        if (data.notifications) {
          try {
            setNotifications(JSON.parse(data.notifications));
          } catch {}
        }
      }
    } catch (e) {
      console.error("Error loading clinic:", e);
    }
    setLoading(false);
  };

  const handleSaveClinic = async () => {
    if (!clinicId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({
          name: clinic.name,
          owner_name: clinic.owner_name,
          phone: clinic.phone,
          email: clinic.email,
          address: clinic.address,
          currency: clinic.currency,
          working_hours: JSON.stringify(hours),
          notifications: JSON.stringify(notifications),
        })
        .eq("id", clinicId);

      if (error) throw error;

      setEditing(false);
      setSaveMsg("تم حفظ التغييرات بنجاح!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (e: any) {
      setSaveMsg("خطأ: " + e.message);
    }
    setSaving(false);
  };

  const toggleHour = (i: number) => {
    setHours(prev => prev.map((h, idx) => idx === i ? { ...h, active: !h.active } : h));
    setEditing(true);
  };

  const updateHour = (i: number, field: 'from' | 'to', value: string) => {
    setHours(prev => prev.map((h, idx) => idx === i ? { ...h, [field]: value } : h));
    setEditing(true);
  };

  if (authLoading || loading) {
    return (
      <div className="py-24 flex justify-center" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      </div>
    );
  }

  if (!canView('settings')) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border" style={{ direction: "rtl" }}>
        <Shield size={48} className="mx-auto text-slate-300 mb-4" />
        <p className="font-bold text-slate-800">ليس لديك صلاحية الوصول للإعدادات</p>
      </div>
    );
  }

  return (
    <div className="flex gap-5 min-h-[600px]" style={{ direction: "rtl" }}>
      {/* Sidebar */}
      <div className="w-56 shrink-0">
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 8px rgba(15,37,71,0.04)" }}>
          <div className="p-4" style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
            <div className="text-sm font-black" style={{ color: "#0F172A" }}>الإعدادات</div>
            <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>إدارة الحساب والعيادة</div>
          </div>
          <div className="p-2 space-y-0.5">
            {sections.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-right transition-all"
                  style={{
                    background: activeSection === s.id ? "#EFF6FF" : "transparent",
                    color: activeSection === s.id ? "#1D5FBF" : "#64748B",
                  }}
                >
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  <span className="text-sm font-semibold">{s.label}</span>
                  {activeSection === s.id && (
                    <ChevronLeft size={12} className="mr-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl"
            style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}
          >
            {/* Clinic Settings */}
            {activeSection === "clinic" && (
              <>
                <div className="p-6 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                  <div>
                    <h2 className="font-bold" style={{ color: "#0F172A" }}>ملف العيادة</h2>
                    <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>المعلومات الأساسية للعيادة</p>
                  </div>
                  {!editing ? (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-bold border hover:bg-gray-50"
                      style={{ color: "#1D5FBF", borderColor: "#BFDBFE" }}
                    >
                      <Edit2 size={12} />
                      تعديل
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditing(false); loadClinicData(); }}
                        className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-bold hover:bg-gray-50"
                        style={{ color: "#64748B" }}
                      >
                        <X size={12} />
                        إلغاء
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-6">
                  {/* Logo */}
                  <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black"
                      style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                      {clinic.name ? clinic.name[0] : "🦷"}
                    </div>
                    <div>
                      <div className="text-sm font-bold mb-1" style={{ color: "#0F172A" }}>شعار العيادة</div>
                      <button className="flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-bold border hover:bg-gray-50"
                        style={{ color: "#1D5FBF", borderColor: "#BFDBFE" }}>
                        <Upload size={12} />
                        رفع صورة
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>اسم العيادة *</label>
                      <input
                        type="text"
                        value={clinic.name}
                        onChange={e => { setClinic(prev => ({ ...prev, name: e.target.value })); setEditing(true); }}
                        className="w-full px-3 h-10 rounded-xl text-sm outline-none transition-all"
                        style={{ 
                          background: editing ? "#FFF" : "#F0F5FC", 
                          border: editing ? "1.5px solid #1D5FBF" : "1.5px solid transparent", 
                          color: "#0F172A", 
                          fontFamily: "Cairo, sans-serif" 
                        }}
                        disabled={!editing}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>اسم المالك</label>
                      <input
                        type="text"
                        value={clinic.owner_name}
                        onChange={e => { setClinic(prev => ({ ...prev, owner_name: e.target.value })); setEditing(true); }}
                        className="w-full px-3 h-10 rounded-xl text-sm outline-none transition-all"
                        style={{ 
                          background: editing ? "#FFF" : "#F0F5FC", 
                          border: editing ? "1.5px solid #1D5FBF" : "1.5px solid transparent", 
                          color: "#0F172A", 
                          fontFamily: "Cairo, sans-serif" 
                        }}
                        placeholder="اسم الطبيب المسؤول"
                        disabled={!editing}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>رقم الهاتف</label>
                      <input
                        type="text"
                        value={clinic.phone}
                        onChange={e => { setClinic(prev => ({ ...prev, phone: e.target.value })); setEditing(true); }}
                        className="w-full px-3 h-10 rounded-xl text-sm outline-none transition-all"
                        style={{ 
                          background: editing ? "#FFF" : "#F0F5FC", 
                          border: editing ? "1.5px solid #1D5FBF" : "1.5px solid transparent", 
                          color: "#0F172A", 
                          fontFamily: "Cairo, sans-serif" 
                        }}
                        disabled={!editing}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>البريد الإلكتروني</label>
                      <input
                        type="email"
                        value={clinic.email}
                        onChange={e => { setClinic(prev => ({ ...prev, email: e.target.value })); setEditing(true); }}
                        className="w-full px-3 h-10 rounded-xl text-sm outline-none transition-all"
                        style={{ 
                          background: editing ? "#FFF" : "#F0F5FC", 
                          border: editing ? "1.5px solid #1D5FBF" : "1.5px solid transparent", 
                          color: "#0F172A", 
                          fontFamily: "Cairo, sans-serif" 
                        }}
                        disabled={!editing}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>العملة</label>
                      <select
                        value={clinic.currency}
                        onChange={e => { setClinic(prev => ({ ...prev, currency: e.target.value })); setEditing(true); }}
                        className="w-full px-3 h-10 rounded-xl text-sm outline-none transition-all appearance-none"
                        style={{ 
                          background: editing ? "#FFF" : "#F0F5FC", 
                          border: editing ? "1.5px solid #1D5FBF" : "1.5px solid transparent", 
                          color: "#0F172A", 
                          fontFamily: "Cairo, sans-serif" 
                        }}
                        disabled={!editing}
                      >
                        <option value="JOD">دينار أردني (JOD)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="AED">درهم إماراتي (AED)</option>
                        <option value="EGP">جنيه مصري (EGP)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>العنوان</label>
                      <input
                        type="text"
                        value={clinic.address}
                        onChange={e => { setClinic(prev => ({ ...prev, address: e.target.value })); setEditing(true); }}
                        className="w-full px-3 h-10 rounded-xl text-sm outline-none transition-all"
                        style={{ 
                          background: editing ? "#FFF" : "#F0F5FC", 
                          border: editing ? "1.5px solid #1D5FBF" : "1.5px solid transparent", 
                          color: "#0F172A", 
                          fontFamily: "Cairo, sans-serif" 
                        }}
                        disabled={!editing}
                      />
                    </div>
                  </div>

                  {saveMsg && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: saveMsg.includes("خطأ") ? "#FEE2E2" : "#DCFCE7", border: `1px solid ${saveMsg.includes("خطأ") ? "#FECACA" : "#86EFAC"}` }}>
                      <CheckCircle size={14} style={{ color: saveMsg.includes("خطأ") ? "#DC2626" : "#16A34A" }} />
                      <span className="text-sm font-semibold" style={{ color: saveMsg.includes("خطأ") ? "#DC2626" : "#16A34A" }}>{saveMsg}</span>
                    </div>
                  )}

                  {editing && (
                    <button 
                      onClick={handleSaveClinic} 
                      disabled={saving}
                      className="flex items-center gap-2 px-6 h-10 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                      {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Working Hours */}
            {activeSection === "hours" && (
              <>
                <div className="p-6" style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                  <h2 className="font-bold" style={{ color: "#0F172A" }}>ساعات العمل</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>تحديد أوقات استقبال المرضى</p>
                </div>
                <div className="p-6 space-y-3">
                  {hours.map((h, i) => (
                    <div key={h.day} className="flex items-center gap-4 p-4 rounded-xl"
                      style={{ background: h.active ? "#F8FAFC" : "#F1F5F9", border: "1px solid rgba(30,58,111,0.06)" }}>
                      <Toggle active={h.active} onChange={() => toggleHour(i)} />
                      <div className="w-24 font-bold text-sm" style={{ color: h.active ? "#0F172A" : "#94A3B8" }}>
                        {h.day}
                      </div>
                      {h.active ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="time" 
                            value={h.from} 
                            onChange={e => updateHour(i, 'from', e.target.value)}
                            className="px-3 h-9 rounded-lg text-sm outline-none"
                            style={{ background: "white", border: "1px solid rgba(30,58,111,0.1)", fontFamily: "Cairo" }} 
                          />
                          <span style={{ color: "#94A3B8" }}>—</span>
                          <input 
                            type="time" 
                            value={h.to} 
                            onChange={e => updateHour(i, 'to', e.target.value)}
                            className="px-3 h-9 rounded-lg text-sm outline-none"
                            style={{ background: "white", border: "1px solid rgba(30,58,111,0.1)", fontFamily: "Cairo" }} 
                          />
                        </div>
                      ) : (
                        <span className="text-sm" style={{ color: "#94A3B8" }}>مغلق</span>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={handleSaveClinic} 
                    disabled={saving}
                    className="mt-4 flex items-center gap-2 px-6 h-10 rounded-xl text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? "جاري الحفظ..." : "حفظ ساعات العمل"}
                  </button>
                </div>
              </>
            )}

            {/* Notifications */}
            {activeSection === "notifications" && (
              <>
                <div className="p-6" style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                  <h2 className="font-bold" style={{ color: "#0F172A" }}>إعدادات الإشعارات</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-xs font-bold mb-2" style={{ color: "#64748B" }}>قنوات الإشعار</div>
                  {[
                    { key: "whatsapp", label: "واتساب", desc: "تذكيرات وإشعارات عبر واتساب" },
                    { key: "sms", label: "رسائل SMS", desc: "رسائل قصيرة للمرضى" },
                    { key: "email", label: "البريد الإلكتروني", desc: "إشعارات على الإيميل" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: "#F8FAFC", border: "1px solid rgba(30,58,111,0.06)" }}>
                      <div>
                        <div className="text-sm font-bold" style={{ color: "#0F172A" }}>{item.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{item.desc}</div>
                      </div>
                      <Toggle
                        active={notifications[item.key as keyof typeof notifications] as boolean}
                        onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }))}
                      />
                    </div>
                  ))}

                  <div className="text-xs font-bold mt-6 mb-2" style={{ color: "#64748B" }}>أنواع الإشعارات</div>
                  {[
                    { key: "appointment", label: "تذكيرات المواعيد", desc: "قبل 24 ساعة وقبل ساعة من الموعد" },
                    { key: "payment", label: "إشعارات الدفع", desc: "عند تحصيل أو استحقاق مبلغ" },
                    { key: "reminder", label: "المتابعات التلقائية", desc: "متابعة بعد العلاج" },
                    { key: "lowStock", label: "تحذيرات المخزون", desc: "عند انخفاض مستوى الأصناف" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: "#F8FAFC", border: "1px solid rgba(30,58,111,0.06)" }}>
                      <div>
                        <div className="text-sm font-bold" style={{ color: "#0F172A" }}>{item.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{item.desc}</div>
                      </div>
                      <Toggle
                        active={notifications[item.key as keyof typeof notifications] as boolean}
                        onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }))}
                      />
                    </div>
                  ))}
                  <button 
                    onClick={handleSaveClinic} 
                    disabled={saving}
                    className="mt-4 flex items-center gap-2 px-6 h-10 rounded-xl text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
                  </button>
                </div>
              </>
            )}

            {/* Roles */}
            {activeSection === "roles" && (
              <>
                <div className="p-6" style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                  <h2 className="font-bold" style={{ color: "#0F172A" }}>الأدوار والصلاحيات</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>إدارة صلاحيات الوصول لكل دور</p>
                </div>
                <div className="p-6 space-y-3">
                  {roles.map((role, i) => (
                    <div key={role.name} className="p-4 rounded-xl"
                      style={{ background: "#F8FAFC", border: "1px solid rgba(30,58,111,0.06)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: role.color }} />
                          <span className="text-sm font-bold" style={{ color: "#0F172A" }}>{role.name}</span>
                        </div>
                        <button className="flex items-center gap-1 text-xs font-bold opacity-50 cursor-not-allowed"
                          style={{ color: "#1D5FBF" }}>
                          <Edit2 size={11} />
                          تعديل
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions.map(p => (
                          <span key={p} className="px-2 py-0.5 rounded-md text-xs font-semibold"
                            style={{ background: `${role.color}15`, color: role.color }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Automations */}
            {activeSection === "whatsapp" && (
              <>
                <div className="p-6" style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                  <h2 className="font-bold" style={{ color: "#0F172A" }}>أتمتة التواصل مع المرضى</h2>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>إدارة الرسائل التلقائية لتوفير الوقت وتقليل الغياب</p>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { key: "autoReminder24h", label: "تذكير المواعيد (قبل 24 ساعة)", desc: "إرسال رسالة تذكير تلقائية للمريض قبل موعده بيوم لتأكيد الحضور", icon: Calendar },
                    { key: "autoPostOp", label: "تعليمات ما بعد العلاج", desc: "إرسال تعليمات العناية (مثل ما بعد الخلع) تلقائياً بعد انتهاء الموعد", icon: Shield },
                    { key: "autoCheckup", label: "تذكير المراجعات الدورية (6 أشهر)", desc: "تذكير المريض بمراجعة العيادة للتنظيف الدوري بعد 6 أشهر من آخر زيارة", icon: Clock },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.key} className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: "#F8FAFC", border: "1px solid rgba(30,58,111,0.06)" }}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm">
                            <Icon size={18} style={{ color: "#1D5FBF" }} />
                          </div>
                          <div>
                            <div className="text-sm font-bold" style={{ color: "#0F172A" }}>{item.label}</div>
                            <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{item.desc}</div>
                          </div>
                        </div>
                        <Toggle
                          active={notifications[item.key as keyof typeof notifications] as boolean}
                          onChange={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof notifications] }))}
                        />
                      </div>
                    );
                  })}
                  
                  <div className="p-4 rounded-xl mt-4" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <h4 className="text-sm font-bold mb-1" style={{ color: "#1D5FBF" }}>كيف تعمل الأتمتة؟</h4>
                    <p className="text-xs leading-relaxed" style={{ color: "#3B82F6" }}>
                      عند تفعيل هذه الخيارات، سيقوم النظام بتجميع الرسائل المطلوبة يومياً في صفحة <strong>"التواصل"</strong>.
                      يمكن لموظف الاستقبال مراجعتها وإرسالها بضغطة زر عبر تطبيق واتساب المرتبط بجهاز العيادة.
                    </p>
                  </div>

                  <button 
                    onClick={handleSaveClinic} 
                    disabled={saving}
                    className="mt-4 flex items-center gap-2 px-6 h-10 rounded-xl text-sm font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </button>
                </div>
              </>
            )}

            {/* Placeholder sections */}
            {(activeSection === "calendar" || activeSection === "security" || activeSection === "backup") && (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "#EFF6FF" }}>
                  {activeSection === "calendar" && <Calendar size={28} style={{ color: "#1D5FBF" }} />}
                  {activeSection === "security" && <Shield size={28} style={{ color: "#1D5FBF" }} />}
                  {activeSection === "backup" && <Database size={28} style={{ color: "#1D5FBF" }} />}
                </div>
                <div className="font-bold mb-2" style={{ color: "#0F172A" }}>
                  {activeSection === "calendar" && "ربط Google Calendar"}
                  {activeSection === "security" && "إعدادات الأمان"}
                  {activeSection === "backup" && "النسخ الاحتياطي"}
                </div>
                <p className="text-sm text-center max-w-xs" style={{ color: "#64748B" }}>
                  {activeSection === "calendar" && "مزامنة مواعيد الأطباء مع Google Calendar لإدارة أفضل"}
                  {activeSection === "security" && "إدارة كلمات المرور والمصادقة الثنائية وسجل الدخول"}
                  {activeSection === "backup" && "جدولة النسخ الاحتياطي التلقائي لبيانات العيادة"}
                </p>
                <button className="mt-4 px-6 h-10 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                  إعداد الآن
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
