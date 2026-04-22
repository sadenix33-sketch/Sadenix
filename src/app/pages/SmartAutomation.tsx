import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Zap,
  BarChart3,
  Users,
  Calendar,
  Send,
  MessageSquare,
  Clock,
  CheckCircle,
  X,
  FileText,
  TrendingUp,
  ArrowRight,
  UserCheck,
  Stethoscope,
  Info,
  ChevronDown,
  Loader2,
  Bell,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface DailyStats {
  newPatients: number;
  completedAppts: number;
  cancelledAppts: number;
  totalIncome: number;
  incomeByMethod: { method: string; amount: number }[];
  doctorPerformance: { name: string; count: number; income: number }[];
}

interface Doctor {
  id: string;
  full_name: string;
  appointments_today: number;
}

export function SmartAutomationPage() {
  const { clinicId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [sendingReport, setSendingReport] = useState(false);
  const [sendingBriefing, setSendingBriefing] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchDailyData = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      // 1. Fetch New Patients
      const { count: newPatients, error: pError } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .gte("created_at", start)
        .lte("created_at", end);
      
      if (pError) console.error("Patients fetch error:", pError);

      // 2. Fetch Appointments
      const { data: appts, error: aError } = await supabase
        .from("appointments")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("scheduled_at", start)
        .lte("scheduled_at", end);
      
      if (aError) console.error("Appointments fetch error:", aError);

      const completed = appts?.filter((a) => a.status === "مكتمل" || a.status === "completed").length || 0;
      const cancelled = appts?.filter((a) => a.status === "ملغي" || a.status === "cancelled" || a.status === "لم يحضر").length || 0;

      // 3. Fetch Payments
      const { data: payments, error: payError } = await supabase
        .from("payments")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("created_at", start)
        .lte("created_at", end);
      
      if (payError) console.error("Payments fetch error:", payError);

      const totalIncome = payments?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;

      // Group income by method
      const methods: Record<string, number> = {};
      payments?.forEach((p) => {
        const m = p.method || "نقدي";
        methods[m] = (methods[m] || 0) + (Number(p.amount) || 0);
      });

      // 4. Fetch Invoices Status
      const { data: invoices, error: invError } = await supabase
        .from("invoices")
        .select("*")
        .eq("clinic_id", clinicId)
        .gte("created_at", start)
        .lte("created_at", end);
      
      if (invError) console.error("Invoices fetch error:", invError);

      const openInvoices = invoices?.filter(i => i.status !== 'مدفوعة' && i.status !== 'مكتمل').length || 0;
      const closedInvoices = invoices?.filter(i => i.status === 'مدفوعة' || i.status === 'مكتمل').length || 0;

      // Doctor Performance Aggregation
      const docPerf: Record<string, { count: number; income: number; name: string }> = {};
      
      // From appointments
      appts?.forEach((a) => {
        const name = a.doctor_name || "طبيب غير محدد";
        if (!docPerf[name]) docPerf[name] = { count: 0, income: 0, name };
        if (a.status === "مكتمل" || a.status === "completed") {
          docPerf[name].count++;
        }
      });
      
      // From invoices (for income per doctor)
      invoices?.forEach((inv) => {
        const name = inv.doctor_name || "عام";
        if (!docPerf[name]) docPerf[name] = { count: 0, income: 0, name };
        // Income is actual payments, but we associate payments with doctors via invoices
        // For simplicity, we can also look at payments directly if they have doctor_id
      });

      // Distribute payment income to doctors based on invoice_id
      if (payments && invoices) {
        payments.forEach(p => {
          const inv = invoices.find(i => i.id === p.invoice_id);
          const name = inv?.doctor_name || "عام";
          if (!docPerf[name]) docPerf[name] = { count: 0, income: 0, name };
          docPerf[name].income += Number(p.amount) || 0;
        });
      }

      setStats({
        newPatients: newPatients || 0,
        completedAppts: completed,
        cancelledAppts: cancelled,
        totalIncome,
        incomeByMethod: Object.entries(methods).map(([method, amount]) => ({ method, amount })),
        doctorPerformance: Object.values(docPerf),
        openInvoices,
        closedInvoices
      } as any);

      // 5. Fetch Doctors (Profiles) for Briefings
      const { data: docsData, error: dError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("clinic_id", clinicId)
        .eq("role", "doctor");
      
      if (dError) throw dError;

      const docsWithAppts = (docsData || []).map((d) => ({
        id: d.id,
        full_name: d.full_name,
        appointments_today: appts?.filter((a) => a.doctor_id === d.id || a.doctor_name === d.full_name).length || 0,
      }));
      setDoctors(docsWithAppts as any);
    } catch (err: any) {
      console.error("Critical error in automation page:", err);
      setError(err.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    fetchDailyData();
  }, [fetchDailyData]);

  const sendManagerReport = () => {
    if (!stats) return;
    const s = stats as any;
    setSendingReport(true);
    
    try {
      const todayStr = format(new Date(), "eeee, d MMMM yyyy", { locale: arSA });
      const methodText = (s.incomeByMethod || []).map((m: any) => `- ${m.method}: ${Number(m.amount).toLocaleString()} JOD`).join('\n');
      const perfText = (s.doctorPerformance || []).map((d: any) => `- ${d.name}: ${d.count} حالات (${Number(d.income).toLocaleString()} JOD)`).join('\n');

      const text = `📊 *تقرير نهاية اليوم الإداري - عيادة Sadenix*
📅 التاريخ: ${todayStr}

👥 *ملخص الاستقبال والمرضى:*
- مرضى جدد اليوم: ${s.newPatients}
- مواعيد مكتملة: ${s.completedAppts} ✅
- مواعيد ملغاة/لم يحضر: ${s.cancelledAppts} ❌

💰 *الأداء المالي والتحصيل:*
- إجمالي التحصيل اليومي: ${Number(s.totalIncome).toLocaleString()} JOD
${methodText}

🧾 *حالة الفواتير:*
- فواتير مغلقة (مدفوعة): ${s.closedInvoices}
- فواتير لا تزال مفتوحة: ${s.openInvoices}

👨‍⚕️ *إنتاجية الأطباء:*
${perfText}

✨ تم إنشاء هذا التقرير آلياً لضمان دقة البيانات المالية والإدارية.`;

      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء إنشاء التقرير");
    } finally {
      setSendingReport(false);
    }
  };

  const sendDoctorBriefing = async (doc: any) => {
    setSendingBriefing(doc.id);
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      const { data: appts, error } = await supabase
        .from("appointments")
        .select("*, patients(*)")
        .or(`doctor_id.eq.${doc.id},doctor_name.eq."${doc.full_name}"`)
        .gte("scheduled_at", todayStart)
        .lte("scheduled_at", todayEnd)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;

      if (!appts || appts.length === 0) {
        alert("لا توجد مواعيد لهذا الطبيب اليوم");
        return;
      }

      const todayStr = format(new Date(), "eeee", { locale: arSA });
      let text = `📅 *تذكير صباحي لجدول المواعيد - د. ${doc.full_name}*
صباح الخير دكتور، إليك ملخص حالاتك لليوم (${todayStr}):

`;

      appts.forEach((a: any, i) => {
        try {
          const time = format(parseISO(a.scheduled_at), "hh:mm a", { locale: arSA });
          const treatment = a.treatment_type ? `🔹 العلاج: ${a.treatment_type}` : "🔹 مراجعة عامة";
          const history = a.patients?.medical_history ? `⚠️ تنبيه طبي: ${a.patients.medical_history}` : "";
          const balance = Number(a.patients?.balance) || 0;
          const debt = balance < 0 ? `💰 ملاحظة مالية: المريض عليه ذمم (${Math.abs(balance)} JOD)` : "";
          const note = a.notes ? `📝 ملاحظة: ${a.notes}` : "";

          text += `${i + 1}. *${a.patient_name || a.patients?.first_name || "مريض"}*
   ⏰ الساعة: ${time}
   ${treatment}
   ${history ? history + "\n   " : ""}${debt ? debt + "\n   " : ""}${note ? note + "\n   " : ""}
`;
        } catch (e) { console.error("Error formatting appt", e); }
      });

      text += `\nنتمنى لك يوماً سعيداً ومليئاً بالإنجازات! 🦷✨`;

      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    } catch (error: any) {
      console.error(error);
      alert("خطأ: " + error.message);
    } finally {
      setSendingBriefing(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="py-20 flex justify-center" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center space-y-4" style={{ direction: "rtl" }}>
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4">
          <AlertTriangle size={32} />
        </div>
        <h2 className="text-xl font-black text-slate-900">عذراً، حدث خطأ أثناء تحميل البيانات</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">{error}</p>
        <button 
          onClick={fetchDailyData}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10" style={{ direction: "rtl", fontFamily: "Cairo, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
              <Sparkles size={20} color="white" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">مركز الأتمتة الذكي</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">أتمتة التقارير والرسائل الصباحية لزيادة كفاءة العيادة</p>
        </div>
        <button 
          onClick={fetchDailyData}
          className="p-2 rounded-xl hover:bg-slate-100 transition-all text-slate-400"
          title="تحديث البيانات"
        >
          <Zap size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Summary Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4 text-blue-600">
                <Users size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">{stats?.newPatients}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">مرضى جدد اليوم</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center mb-4 text-green-600">
                <CheckCircle size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">{stats?.completedAppts}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">مواعيد مكتملة</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4 text-amber-600">
                <TrendingUp size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">{stats?.totalIncome.toLocaleString()}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">إجمالي دخل اليوم (JOD)</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4 text-emerald-600">
                <CheckCircle size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">{(stats as any)?.closedInvoices}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">فواتير مغلقة اليوم</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-4 text-rose-600">
                <AlertTriangle size={20} />
              </div>
              <div className="text-2xl font-black text-slate-900">{(stats as any)?.openInvoices}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">فواتير مفتوحة (بانتظار التحصيل)</div>
            </motion.div>
          </div>

          {/* Performance Chart */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-600" />
              توزيع الدخل حسب الطبيب
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.doctorPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="income" radius={[10, 10, 10, 10]} barSize={40}>
                    {(stats?.doctorPerformance || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#1D5FBF" : "#06B6D4"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          {/* Manager Report Card */}
          <div className="bg-slate-900 rounded-3xl p-6 text-white overflow-hidden relative shadow-xl shadow-slate-200">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-[-20%] left-[-20%] w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent" />
            </div>
            
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4 text-blue-300">
                <FileText size={20} />
              </div>
              <h3 className="text-lg font-black mb-1">تقرير المدير الختامي</h3>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                أرسل ملخص الأداء المالي والإنتاجية لليوم مباشرة لمدير العيادة عبر واتساب بنهاية الدوام.
              </p>
              
              <button
                onClick={sendManagerReport}
                disabled={sendingReport || !stats}
                className="w-full h-11 rounded-xl bg-white text-slate-900 text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-slate-100 disabled:opacity-50"
              >
                {sendingReport ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                إرسال التقرير الآن
              </button>
            </div>
          </div>

          {/* Doctor Briefings Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <Bell size={16} className="text-blue-600" />
              تذكيرات الأطباء الصباحية
            </h3>
            <div className="space-y-3">
              {doctors.map((doc) => (
                <div 
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">د. {doc.full_name}</div>
                    <div className="text-[10px] text-slate-500 font-bold">{doc.appointments_today} مواعيد اليوم</div>
                  </div>
                  <button
                    onClick={() => sendDoctorBriefing(doc)}
                    disabled={sendingBriefing === doc.id}
                    className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 transition-all hover:scale-105 disabled:opacity-50"
                  >
                    {sendingBriefing === doc.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <MessageSquare size={12} />
                    )}
                  </button>
                </div>
              ))}
              {doctors.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-400 font-bold">
                  لا يوجد أطباء نشطون حالياً
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Advanced Automation Logic Explanation */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex gap-4 items-start">
        <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
          <Info size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-blue-900 mb-1">كيف تعمل الأتمتة الذكية؟</h4>
          <p className="text-xs text-blue-700 leading-relaxed font-medium">
            يقوم النظام بتحليل البيانات اللحظية من قاعدة البيانات وتجميعها في قوالب احترافية. يمكنك استخدام هذه الميزة يدوياً الآن، ونحن نعمل على تحويلها إلى رسائل تلقائية بالكامل تصل في أوقات محددة يومياً (Cron Jobs) لضمان أعلى مستويات الكفاءة.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SmartAutomationPage;
