import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Star, Calendar, Users, CheckCircle2, Phone, Mail, Clock, Loader2, Shield } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";

const roleColors: Record<string, { bg: string; text: string }> = {
  "طبيب تقويم": { bg: "#EEF2FF", text: "#4338CA" },
  "طبيبة عامة": { bg: "#ECFEFF", text: "#0891B2" },
  "جراح أسنان": { bg: "#FEF2F2", text: "#DC2626" },
  "طبيبة أطفال": { bg: "#F0FDF4", text: "#059669" },
  "مسؤولة استقبال": { bg: "#FFFBEB", text: "#D97706" },
  "مساعدة طبية": { bg: "#F5F3FF", text: "#7C3AED" },
  "محاسب": { bg: "#F0F9FF", text: "#0369A1" },
};

interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  specialty: string | null;
  status: string;
  created_at: string;
}

export function StaffPage() {
  const { clinicId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffProfile[]>([]);

  const fetchStaff = useCallback(async () => {
    if (!clinicId) {
      setStaff([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("clinic_id", clinicId);

      if (error) throw error;
      setStaff((data || []) as StaffProfile[]);
    } catch (e) {
      console.error("Error fetching staff:", e);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    if (!authLoading) {
      fetchStaff();
    }
  }, [authLoading, fetchStaff]);

  if (authLoading || loading) {
    return (
      <div className="py-20 flex justify-center" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      </div>
    );
  }

  if (!clinicId) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border" style={{ direction: "rtl" }}>
        <p className="font-bold text-slate-800">لا يوجد معرّف عيادة مرتبط بحسابك.</p>
      </div>
    );
  }

  const doctors = staff.filter(s => s.role?.includes("doctor") || s.specialty?.includes("طبيب"));
  const nonDoctors = staff.filter(s => !s.role?.includes("doctor") && !s.specialty?.includes("طبيب"));

  return (
    <div className="space-y-6">
      <div>
        <h3 style={{ color: "#0F172A", fontWeight: 700, fontSize: "1rem", marginBottom: 16 }}>الأطباء</h3>
        {doctors.length === 0 ? (
          <p className="text-slate-500 text-center py-8">لا يوجد أطباء مسجلين.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {doctors.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(0,0,0,0.1)" }}
                className="bg-white rounded-2xl p-5 cursor-pointer"
                style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
                    style={{ background: `hsl(${i * 80 + 200}, 60%, 55%)` }}>
                    {member.full_name?.charAt(0) || "د"}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "#F0FDF4" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#10B981" }} />
                    <span style={{ color: "#059669", fontSize: "0.65rem", fontWeight: 600 }}>
                      {member.status === "active" ? "متزامن" : "غير متزامن"}
                    </span>
                  </div>
                </div>
                <div style={{ color: "#1E293B", fontWeight: 700, fontSize: "0.9rem" }}>
                  {member.full_name || "—"}{!member.full_name?.startsWith("د.") && " د."}
                </div>
                <div className="mt-1">
                  <span style={{ background: roleColors[member.role as keyof typeof roleColors]?.bg || "#F8FAFC", color: roleColors[member.role as keyof typeof roleColors]?.text || "#64748B", fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99 }}>
                    {member.specialty || member.role || "طبيب"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Clock size={12} style={{ color: "#94A3B8" }} />
                  <span style={{ color: "#64748B", fontSize: "0.72rem" }}>{member.email || "—"}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Phone size={12} style={{ color: "#94A3B8" }} />
                  <span style={{ color: "#64748B", fontSize: "0.72rem" }}>{member.phone || "—"}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 style={{ color: "#0F172A", fontWeight: 700, fontSize: "1rem", marginBottom: 16 }}>الطاقم الطبي والإداري</h3>
        {nonDoctors.length === 0 ? (
          <p className="text-slate-500 text-center py-8">لا يوجد موظفون مسجلون.</p>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}>
            {nonDoctors.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer border-t"
                style={{ borderColor: "#F8FAFC" }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: `hsl(${i * 120 + 300}, 50%, 60%)` }}>
                  {member.full_name?.charAt(0) || "م"}
                </div>
                <div className="flex-1">
                  <div style={{ color: "#1E293B", fontWeight: 600, fontSize: "0.875rem" }}>{member.full_name || "—"}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span style={{ background: roleColors[member.role as keyof typeof roleColors]?.bg || "#F8FAFC", color: roleColors[member.role as keyof typeof roleColors]?.text || "#64748B", fontSize: "0.7rem", fontWeight: 600, padding: "1px 7px", borderRadius: 99 }}>
                      {member.role || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div style={{ color: "#64748B", fontSize: "0.72rem" }}>{member.email || "—"}</div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: member.status === "active" ? "#F0FDF4" : "#FEF3C7" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: member.status === "active" ? "#10B981" : "#F59E0B" }} />
                    <span style={{ color: member.status === "active" ? "#059669" : "#D97706", fontSize: "0.7rem", fontWeight: 600 }}>
                      {member.status === "active" ? "نشط" : "غير نشط"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50">
                      <Phone size={13} style={{ color: "#2563EB" }} />
                    </button>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50">
                      <Mail size={13} style={{ color: "#2563EB" }} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}>
        <h3 style={{ color: "#0F172A", fontWeight: 700, fontSize: "0.95rem", marginBottom: 16 }}>ملخص الفريق</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl" style={{ background: "#EFF6FF" }}>
            <div className="text-2xl font-black" style={{ color: "#1D5FBF" }}>{doctors.length}</div>
            <div className="text-xs" style={{ color: "#64748B" }}>الأطباء</div>
          </div>
          <div className="text-center p-4 rounded-xl" style={{ background: "#F0FDF4" }}>
            <div className="text-2xl font-black" style={{ color: "#16A34A" }}>{nonDoctors.length}</div>
            <div className="text-xs" style={{ color: "#64748B" }}>الموظفون</div>
          </div>
          <div className="text-center p-4 rounded-xl" style={{ background: "#F5F3FF" }}>
            <div className="text-2xl font-black" style={{ color: "#7C3AED" }}>{staff.length}</div>
            <div className="text-xs" style={{ color: "#64748B" }}>الإجمالي</div>
          </div>
        </div>
      </div>
    </div>
  );
}
