import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, Plus, Filter, ChevronDown, MoreHorizontal,
  Calendar, MessageSquare, FileText, User, Phone,
  Heart, Star, Shield, ChevronLeft, X, Download,
  SlidersHorizontal, Users, Loader2, AlertTriangle, Trash2
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { usePermissions, canDelete } from "../context/PermissionsContext";

export interface Patient {
  id: string;
  clinic_id: string;
  patient_code: string;
  first_name: string;
  gender?: string;
  date_of_birth?: string;
  phone: string;
  whatsapp_number?: string;
  email?: string;
  address?: string;
  doctor_name?: string;
  medical_notes?: string;
  allergies?: string;
  chronic_diseases?: string;
  insurance_provider?: string;
  insurance_number?: string;
  insurance_coverage?: string;
  insurance_expiry?: string;
  balance: number;
  status: string;
  tag?: string;
  created_at: string;
}

const statusConfig: Record<string, { bg: string; text: string }> = {
  "نشط": { bg: "#DCFCE7", text: "#16A34A" },
  "متأخر": { bg: "#FEE2E2", text: "#DC2626" },
  "غير نشط": { bg: "#F1F5F9", text: "#64748B" },
};

const tagConfig: Record<string, { bg: string; text: string; icon: any }> = {
  "VIP": { bg: "#FEF3C7", text: "#D97706", icon: Star },
  "جديد": { bg: "#EDE9FE", text: "#8B5CF6", icon: User },
};

const avatarColors = [
  "linear-gradient(135deg, #1D5FBF, #06B6D4)",
  "linear-gradient(135deg, #16A34A, #22D3EE)",
  "linear-gradient(135deg, #D97706, #EF4444)",
  "linear-gradient(135deg, #8B5CF6, #EC4899)",
  "linear-gradient(135deg, #06B6D4, #3B82F6)",
];

function calculateAge(dateOfBirth: string | undefined): number {
  if (!dateOfBirth) return 0;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      }
    );
  });
}

export function AddPatientModal({ clinicId, onClose, onCreated }: { clinicId: string; onClose: () => void; onCreated: () => void }) {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    gender: "ذكر",
    date_of_birth: "",
    phone: "",
    address: "",
    doctor_name: "",
    medical_notes: "",
    allergies: "",
    chronic_diseases: "",
  });

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('clinic_id', clinicId).eq('role', 'doctor');
      if (data) setDoctors(data);
    };
    fetchDoctors();
  }, [clinicId]);

  const handleSubmit = async () => {
    if (!formData.first_name || !formData.phone) return alert("الاسم ورقم الهاتف مطلوبان");

    setLoading(true);
    try {
      const newPatientCode = `P${Math.floor(1000 + Math.random() * 9000)}`;
      const emptyToNull = (v: string) => (v.trim() === "" ? null : v.trim());

      const { error } = await withTimeout(
        supabase.from("patients").insert({
          clinic_id: clinicId,
          patient_code: newPatientCode,
          first_name: formData.first_name.trim(),
          gender: formData.gender,
          date_of_birth: formData.date_of_birth || null,
          phone: formData.phone.trim(),
          whatsapp_number: formData.phone.trim(),
          address: emptyToNull(formData.address),
          doctor_name: formData.doctor_name?.trim(),
          medical_notes: emptyToNull(formData.medical_notes),
          allergies: emptyToNull(formData.allergies),
          chronic_diseases: emptyToNull(formData.chronic_diseases),
          status: "نشط",
          tag: "جديد",
          balance: 0,
        }),
        25000,
        "انتهت مهلة الاتصال"
      );

      if (error) {
        alert("تعذر حفظ بيانات المريض: " + (error.message || "خطأ غير معروف"));
      } else {
        onCreated();
        onClose();
      }
    } catch (e: any) {
      alert("خطأ في الاتصال: " + (e?.message || e?.error_description || "خطأ غير معروف"));
    } finally {
      setLoading(false);
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
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "white", boxShadow: "0 20px 60px rgba(15,37,71,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white z-10 border-b">
          <div>
            <h3 className="font-bold" style={{ color: "#0F172A" }}>إضافة مريض جديد</h3>
            <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>أدخل بيانات المريض الأساسية</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100">
            <X size={15} style={{ color: "#64748B" }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#374151" }}>الاسم الكامل *</label>
            <input type="text" placeholder="مثال: أحمد محمد" value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} 
              className="w-full px-3 h-10 rounded-xl text-sm bg-gray-50 border" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#374151" }}>الجنس</label>
              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full px-3 h-10 rounded-xl text-sm bg-gray-50 border">
                <option>ذكر</option>
                <option>أنثى</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#374151" }}>تاريخ الميلاد</label>
              <input type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} className="w-full px-3 h-10 rounded-xl text-sm bg-gray-50 border" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#374151" }}>رقم الهاتف (واتساب) *</label>
            <input type="text" placeholder="07X XXX XXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} 
              className="w-full px-3 h-10 rounded-xl text-sm bg-gray-50 border" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#374151" }}>العنوان</label>
            <input type="text" placeholder="عمّان، الأردن" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} 
              className="w-full px-3 h-10 rounded-xl text-sm bg-gray-50 border" />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">الطبيب المعالج</label>
            <select value={formData.doctor_name} onChange={e => setFormData({ ...formData, doctor_name: e.target.value })} 
              className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm outline-none">
              <option value="">— اختر الطبيب —</option>
              {doctors.map((doc, idx) => (
                <option key={idx} value={doc.full_name}>{doc.full_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-red-600">الحساسية (تنبيهات طبية)</label>
            <input type="text" placeholder="مثال: حساسية البنسلين" value={formData.allergies} onChange={e => setFormData({...formData, allergies: e.target.value})} 
              className="w-full px-3 h-10 rounded-xl text-sm bg-red-50 border border-red-100" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#374151" }}>أمراض مزمنة</label>
            <input type="text" placeholder="مثال: ضغط، سكري" value={formData.chronic_diseases} onChange={e => setFormData({...formData, chronic_diseases: e.target.value})} 
              className="w-full px-3 h-10 rounded-xl text-sm bg-orange-50 border border-orange-100" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5" style={{ color: "#374151" }}>ملاحظات</label>
            <textarea rows={2} placeholder="أي معلومات إضافية..." value={formData.medical_notes} onChange={e => setFormData({...formData, medical_notes: e.target.value})} 
              className="w-full px-3 py-2 rounded-xl text-sm resize-none bg-gray-50 border" />
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 justify-end border-t bg-white">
          <button onClick={onClose} className="px-4 h-10 rounded-xl text-sm font-bold hover:bg-gray-100" style={{ color: "#64748B" }}>
            إلغاء
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 h-10 rounded-xl text-sm font-bold text-white flex items-center justify-center"
            style={{ background: loading ? "#94A3B8" : "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : "حفظ المريض"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export { calculateAge };

export function PatientsPage() {
  const navigate = useNavigate();
  const { user, clinicId, role, profile, loading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const fetchPatients = async (opts?: { silent?: boolean }) => {
    if (!clinicId) {
      setPatients([]);
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase
          .from("patients")
          .select("*")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false }),
        20000,
        "انتهت مهلة تحميل المرضى"
      );

      if (error) {
        console.error(error);
        if (!opts?.silent) {
          alert("تعذر تحميل المرضى: " + error.message);
        }
      } else if (data) {
        setPatients(data);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "خطأ في الاتصال";
      console.error(e);
      if (opts?.silent) {
        throw e;
      }
      alert("تعذر تحميل المرضى: " + msg);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [clinicId]);

  const handleExportCSV = () => {
    const headers = ["المعرف,الاسم,العمر,الهاتف,الرصيد,الطبيب,الحالة"];
    const rows = patients.map(p => 
      `${p.patient_code},${p.first_name},${p.age||""},${p.phone},${p.balance},${p.doctor_name},${p.status}`
    );
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "patients_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openWhatsApp = (phone: string) => {
    if(!phone) return;
    // Replace leading zero with 962 (assumed Jordan logic for demonstration)
    const cleaned = phone.replace(/^0/, '962').replace(/\D/g,'');
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent("مرحباً، من عيادة العناية بك...")}`, '_blank');
  };

  const handleDeletePatient = async (e: React.MouseEvent, patientId: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`هل أنت متأكد من حذف المريض "${name}"؟ سيتم حذف جميع الفواتير والمواعيد الخاصة به نهائياً.`)) return;
    
    try {
      const { error } = await supabase.from("patients").delete().eq("id", patientId);
      if (error) throw error;
      await fetchPatients({ silent: true });
    } catch (err: any) {
      alert("تعذر حذف المريض: " + err.message);
    }
  };

  const filtered = patients.filter(p =>
    (statusFilter === "الكل" || p.status === statusFilter) &&
    (!search || 
      (p.first_name?.toLowerCase().includes(search.toLowerCase())) || 
      (p.patient_code?.toLowerCase().includes(search.toLowerCase())) || 
      (p.phone?.includes(search)))
  );

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
        <p className="text-sm text-slate-500 mt-1">تواصل مع مدير النظام لربط حسابك بعيادة في Supabase (حقل clinic_id في جدول profiles).</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black" style={{ color: "#0F172A", fontSize: 20 }}>إدارة المرضى</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
            {loading ? "جاري تحميل المرضى..." : `${patients.length} مريض مسجل في النظام`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-bold border transition-all hover:bg-gray-50"
            style={{ color: "#64748B", borderColor: "rgba(30,58,111,0.12)" }}
          >
            <Download size={13} />
            تصدير
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
                if(!clinicId) {
                    alert("يجب تخصيص عيادة لك قبل إضافة مرضى.");
                    return;
                }
                setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
          >
            <Plus size={15} />
            مريض جديد
          </motion.button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin" style={{ color: "#1D5FBF" }} /></div>
      ) : patients.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
            <Users size={48} className="mb-4 opacity-20" />
            <h3 className="text-lg font-bold mb-2">لا يوجد مرضى مسجلين بعد</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">قم بإضافة المريض الأول في عيادتك لتبدأ بإدارة المواعيد والخطط العلاجية المتطورة.</p>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "المرضى النشطون", value: patients.filter(p=>p.status==="نشط").length, color: "#16A34A", bg: "#DCFCE7" },
              { label: "المرضى الجدد", value: patients.filter(p=>p.tag==="جديد").length, color: "#8B5CF6", bg: "#EDE9FE" },
              { label: "مرضى VIP", value: patients.filter(p=>p.tag==="VIP").length, color: "#D97706", bg: "#FEF3C7" },
              { label: "إجمالي المرضى", value: patients.length, color: "#1D5FBF", bg: "#EFF6FF" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-4"
                style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 8px rgba(15,37,71,0.04)" }}
              >
                <div className="text-2xl font-black mb-1" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs" style={{ color: "#64748B" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Table Card */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
            
            {/* Toolbar */}
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
              <div className="flex items-center gap-2 flex-1 max-w-sm px-3 h-9 rounded-xl"
                style={{ background: "#F0F5FC" }}>
                <Search size={14} style={{ color: "#64748B", flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="بحث باسم المريض أو رقم الهاتف..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 outline-none bg-transparent text-xs"
                />
                {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: "#94A3B8" }} /></button>}
              </div>

              <div className="flex items-center gap-1">
                {["الكل", "نشط", "متأخر", "غير نشط"].map((s) => (
                  <button
                    key={s}
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

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                    {["المريض", "رقم الهاتف", "الرصيد", "الطبيب", "الحالة", ""].map((h) => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-bold" style={{ color: "#64748B" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((patient, i) => {
                    const sc = statusConfig[patient.status] || statusConfig["نشط"];
                    const tc = patient.tag ? tagConfig[patient.tag] : null;
                    const TagIcon = tc?.icon;
                    return (
                      <motion.tr
                        key={patient.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="group cursor-pointer hover:bg-blue-50/50 transition-all"
                        style={{ borderBottom: "1px solid rgba(30,58,111,0.04)" }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                              style={{ background: avatarColors[i % avatarColors.length] }}>
                              {patient.first_name[0] || 'م'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold" style={{ color: "#0F172A" }}>{patient.first_name}</span>
                                {tc && TagIcon && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold"
                                    style={{ background: tc.bg, color: tc.text }}>
                                    <TagIcon size={9} />
                                    {patient.tag}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs" style={{ color: "#94A3B8" }}>{patient.patient_code} · {calculateAge(patient.date_of_birth) || '-'} سنة</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: "#64748B" }}>{patient.phone}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold"
                            style={{ color: (role === 'clinic_admin' || (patient.doctor_name?.trim().toLowerCase() === profile?.full_name?.trim().toLowerCase())) ? (patient.balance < 0 ? "#DC2626" : patient.balance > 0 ? "#16A34A" : "#64748B") : "#94A3B8" }}>
                            {(role === 'clinic_admin' || (patient.doctor_name?.trim().toLowerCase() === profile?.full_name?.trim().toLowerCase())) ? (
                              patient.balance < 0 ? `-${Math.abs(patient.balance)} JOD` : patient.balance > 0 ? `+${patient.balance} JOD` : "مسوّى"
                            ) : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: "#64748B" }}>{patient.doctor_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold"
                            style={{ background: sc.bg, color: sc.text }}>
                            {patient.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors"
                              onClick={e => { e.stopPropagation(); openWhatsApp(patient.whatsapp_number || patient.phone); }}
                              title="واتساب"
                            >
                              <MessageSquare size={13} style={{ color: "#16A34A" }} />
                            </button>
                            {canDelete(role) && (
                              <button
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
                                onClick={e => handleDeletePatient(e, patient.id, patient.first_name)}
                                title="حذف المريض"
                              >
                                <Trash2 size={13} style={{ color: "#DC2626" }} />
                              </button>
                            )}
                            <button
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <MoreHorizontal size={13} style={{ color: "#94A3B8" }} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {showAddModal && clinicId && (
            <AddPatientModal
                clinicId={clinicId}
                onClose={() => setShowAddModal(false)}
                onCreated={async () => {
                  await fetchPatients({ silent: true });
                }}
            />
        )}
      </AnimatePresence>
    </div>
  );
}
