import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Calendar, CreditCard, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle, Plus, MessageSquare, FileText, Package,
  Activity, Zap, Star, ChevronLeft, Loader2,
} from "lucide-react";
import { format, parseISO, startOfDay, endOfDay, startOfMonth, subMonths, isSameDay, startOfWeek, addDays, isBefore } from "date-fns";
import { arSA } from "date-fns/locale";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { canManageBilling } from "../context/PermissionsContext";

// KPI Counter Component
function KpiCounter({ value, prefix = "", suffix = "", duration = 1.5 }: {
  value: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const steps = 60;
    const stepDuration = (duration * 1000) / steps;
    let step = 0;
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return; // Don't tick while hidden
      step++;
      setCount(Math.round(value * (step / steps)));
      if (step >= steps) clearInterval(timer);
    }, stepDuration);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{prefix}{count.toLocaleString("ar-EG")}{suffix}</span>;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  "مؤكد": { bg: "#EFF6FF", text: "#1D5FBF", dot: "#1D5FBF" },
  "تحت العلاج": { bg: "#DCFCE7", text: "#16A34A", dot: "#16A34A" },
  "تم تسجيل الوصول": { bg: "#FEF3C7", text: "#D97706", dot: "#D97706" },
  "محجوز": { bg: "#F1F5F9", text: "#64748B", dot: "#64748B" },
  "مكتمل": { bg: "#DCFCE7", text: "#16A34A", dot: "#16A34A" },
  "ملغي": { bg: "#FEE2E2", text: "#DC2626", dot: "#DC2626" },
  "لم يحضر": { bg: "#FEE2E2", text: "#DC2626", dot: "#DC2626" },
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl p-3 shadow-xl" style={{ background: "white", border: "1px solid rgba(30,58,111,0.1)" }}>
        <p className="text-xs font-bold mb-1" style={{ color: "#0F172A" }}>{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs" style={{ color: entry.color }}>
            {entry.name === "revenue" ? `${entry.value.toLocaleString()} JOD` : `${entry.value} موعد`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

type AlertItem = { type: "warning" | "info" | "success"; text: string; icon: typeof AlertTriangle };
type TodayAppt = { id: string; patient: string; time: string; doctor: string; type: string; status: string; avatar: string };
type RevRow = { month: string; revenue: number; appointments: number };
type TreatSlice = { name: string; value: number; color: string };
type DayBar = { day: string; count: number };

const TREAT_COLORS = ["#1D5FBF", "#06B6D4", "#16A34A", "#D97706", "#DC2626", "#8B5CF6"];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, clinicId, role, loading: authLoading } = useAuth();
  const [bootLoading, setBootLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevRow[]>([]);
  const [dailyData, setDailyData] = useState<DayBar[]>([]);
  const [treatmentData, setTreatmentData] = useState<TreatSlice[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<TodayAppt[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [healthScore, setHealthScore] = useState(72);
  const [attendancePct, setAttendancePct] = useState(0);
  const [stats, setStats] = useState({
    patients: 0,
    todayAppts: 0,
    revenueMonth: 0,
    outstanding: 0,
    newPatientsMonth: 0,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!clinicId) {
      setBootLoading(false);
      return;
    }

    if (document.visibilityState === 'hidden') return;
    
    let cancelled = false;
    (async () => {
      setBootLoading(true);
      try {
      const today = new Date();
      const t0 = startOfDay(today).toISOString();
      const t1 = endOfDay(today).toISOString();
      const monthStart = startOfMonth(today).toISOString();
      const sixMonthsAgo = startOfMonth(subMonths(today, 5)).toISOString();
      const weekStart = startOfWeek(today, { weekStartsOn: 6 });
      const weekEnd = addDays(weekStart, 7).toISOString();

      const [
        patientsRes,
        newPatientsRes,
        paymentsMonthRes,
        payments6mRes,
        appts6mRes,
        apptsWeekRes,
        apptsTodayRes,
        invoicesRes,
        invRes,
      ] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId),
        supabase.from("patients").select("*", { count: "exact", head: true }).eq("clinic_id", clinicId).gte("created_at", monthStart),
        supabase.from("payments").select("amount").eq("clinic_id", clinicId).gte("created_at", monthStart),
        supabase.from("payments").select("amount, created_at").eq("clinic_id", clinicId).gte("created_at", sixMonthsAgo),
        supabase.from("appointments").select("scheduled_at").eq("clinic_id", clinicId).gte("scheduled_at", sixMonthsAgo),
        supabase.from("appointments").select("scheduled_at").eq("clinic_id", clinicId).gte("scheduled_at", weekStart.toISOString()).lt("scheduled_at", weekEnd),
        supabase
          .from("appointments")
          .select("id, patient_name, doctor_name, treatment_type, status, scheduled_at")
          .eq("clinic_id", clinicId)
          .gte("scheduled_at", t0)
          .lt("scheduled_at", t1)
          .order("scheduled_at", { ascending: true }),
        supabase.from("invoices").select("total_amount, paid_amount, due_date").eq("clinic_id", clinicId),
        supabase.from("inventory_items").select("quantity, reorder_point").eq("clinic_id", clinicId),
      ]);

      if (cancelled) return;

      const patientCount = patientsRes.count ?? 0;
      const newPatientsMonth = newPatientsRes.count ?? 0;
      const revenueMonth = (paymentsMonthRes.data || []).reduce((s, r) => s + num(r.amount), 0);

      let outstanding = 0;
      let overdueCount = 0;
      const dueToday = startOfDay(today);
      for (const inv of invoicesRes.data || []) {
        const total = num(inv.total_amount);
        const paid = num(inv.paid_amount);
        outstanding += Math.max(0, total - paid);
        if (paid < total && inv.due_date) {
          try {
            if (isBefore(startOfDay(parseISO(inv.due_date)), dueToday)) overdueCount++;
          } catch {
            /* ignore */
          }
        }
      }

      const monthKeys: string[] = [];
      for (let i = 5; i >= 0; i--) {
        monthKeys.push(format(startOfMonth(subMonths(today, i)), "yyyy-MM"));
      }
      const revByMonth: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
      const apptByMonth: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
      for (const p of payments6mRes.data || []) {
        const k = format(parseISO(p.created_at), "yyyy-MM");
        if (k in revByMonth) revByMonth[k] += num(p.amount);
      }
      for (const a of appts6mRes.data || []) {
        const k = format(parseISO(a.scheduled_at), "yyyy-MM");
        if (k in apptByMonth) apptByMonth[k] += 1;
      }
      const revChart: RevRow[] = monthKeys.map((k) => ({
        month: format(parseISO(`${k}-01`), "MMM", { locale: arSA }),
        revenue: Math.round(revByMonth[k] * 100) / 100,
        appointments: apptByMonth[k],
      }));

      const dayLabels = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
      const weekAppts = apptsWeekRes.data || [];
      const bars: DayBar[] = dayLabels.map((day, i) => {
        const d = addDays(weekStart, i);
        const count = weekAppts.filter((a) => isSameDay(parseISO(a.scheduled_at), d)).length;
        return { day, count };
      });

      const treatRes = await supabase
        .from("appointments")
        .select("treatment_type")
        .eq("clinic_id", clinicId)
        .gte("scheduled_at", subMonths(today, 2).toISOString());
      if (cancelled) return;
      const treatMap: Record<string, number> = {};
      if (!cancelled && !treatRes.error && treatRes.data) {
        for (const row of treatRes.data) {
          const t = (row.treatment_type as string) || "أخرى";
          treatMap[t] = (treatMap[t] || 0) + 1;
        }
      }
      const treatTotal = Object.values(treatMap).reduce((s, n) => s + n, 0);
      const treatSlices: TreatSlice[] =
        treatTotal === 0
          ? [{ name: "لا بيانات", value: 100, color: "#CBD5E1" }]
          : Object.entries(treatMap)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([name, c], i) => ({
                name,
                value: Math.round((c / treatTotal) * 100),
                color: TREAT_COLORS[i % TREAT_COLORS.length],
              }));

      const apptsToday = (apptsTodayRes.data || []) as {
        id: string;
        patient_name: string;
        doctor_name: string | null;
        treatment_type: string | null;
        status: string;
        scheduled_at: string;
      }[];
      const todayList: TodayAppt[] = apptsToday.map((a) => ({
        id: a.id,
        patient: a.patient_name,
        time: format(parseISO(a.scheduled_at), "HH:mm"),
        doctor: a.doctor_name || "—",
        type: a.treatment_type || "—",
        status: a.status,
        avatar: a.patient_name.charAt(0) || "?",
      }));

      const completedToday = apptsToday.filter((a) => a.status === "مكتمل").length;
      const att = apptsToday.length ? Math.round((completedToday / apptsToday.length) * 100) : 0;

      const lowStock = (invRes.data || []).filter((r) => {
        const q = num(r.quantity);
        const min = num(r.reorder_point);
        return q <= min || q <= 0;
      }).length;

      const nextAlerts: AlertItem[] = [];
      if (overdueCount > 0) {
        nextAlerts.push({
          type: "warning",
          text: `${overdueCount} فاتورة متأخرة — راجع الفواتير`,
          icon: AlertTriangle,
        });
      }
      if (lowStock > 0) {
        nextAlerts.push({
          type: "info",
          text: `${lowStock} أصناف مخزون منخفض`,
          icon: Package,
        });
      }
      if (nextAlerts.length === 0) {
        nextAlerts.push({
          type: "success",
          text: "لا تنبيهات حرجة — يوم سلس",
          icon: CheckCircle,
        });
      }

      const score = Math.min(
        100,
        Math.round(38 + att * 0.35 + Math.min(revenueMonth / 8000, 1) * 22 + Math.min(patientCount / 80, 1) * 15)
      );

      setStats({
        patients: patientCount,
        todayAppts: apptsToday.length,
        revenueMonth: Math.round(revenueMonth * 100) / 100,
        outstanding: Math.round(outstanding * 100) / 100,
        newPatientsMonth,
      });
      setRevenueData(revChart);
      setDailyData(bars);
      setTreatmentData(treatSlices);
      setTodayAppointments(todayList);
      setAlerts(nextAlerts);
      setAttendancePct(att);
      setHealthScore(score);
      } catch (e) {
        console.error("Dashboard load:", e);
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, clinicId]);

  const userRole = user?.role;
  const showBilling = canManageBilling(userRole);
  
  const kpis = [
    { label: "إجمالي المرضى", value: stats.patients, change: "—", positive: true, icon: Users, color: "#1D5FBF", bg: "#EFF6FF", prefix: "", suffix: "" },
    { label: "مواعيد اليوم", value: stats.todayAppts, change: "—", positive: true, icon: Calendar, color: "#16A34A", bg: "#DCFCE7", prefix: "", suffix: "" },
    ...(role === 'clinic_admin' ? [
      { label: "إيرادات الشهر", value: Math.round(stats.revenueMonth), change: "—", positive: true, icon: TrendingUp, color: "#D97706", bg: "#FEF3C7", prefix: "", suffix: " JOD" },
      { label: "المستحقات الكلية", value: Math.round(stats.outstanding), change: "—", positive: stats.outstanding <= 0, icon: CreditCard, color: "#DC2626", bg: "#FEE2E2", prefix: "", suffix: " JOD" },
    ] : []),
    { label: "إكمال اليوم", value: attendancePct, change: "—", positive: true, icon: Activity, color: "#06B6D4", bg: "#E0F2FE", prefix: "", suffix: "%" },
    { label: "مرضى جدد (الشهر)", value: stats.newPatientsMonth, change: "—", positive: true, icon: Star, color: "#8B5CF6", bg: "#EDE9FE", prefix: "", suffix: "" },
  ];

  if (authLoading || bootLoading) {
    return (
      <div className="py-24 flex justify-center" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      </div>
    );
  }

  if (!clinicId) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border" style={{ direction: "rtl" }}>
        <AlertTriangle className="mx-auto mb-3 text-amber-500" size={40} />
        <p className="font-bold text-slate-800">لا يوجد معرّف عيادة — لا يمكن تحميل لوحة التحكم.</p>
      </div>
    );
  }

  const headerName = user?.full_name?.split(" ")[0] || "فريق العيادة";
  const subline = `${format(new Date(), "EEEE، d MMMM yyyy", { locale: arSA })}${user?.clinic_name ? ` · ${user.clinic_name}` : ""}`;

  return (
    <div className="space-y-6" style={{ direction: "rtl" }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-black" style={{ color: "#0F172A", fontSize: 22 }}>
            مرحباً، {headerName} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
            {subline}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/appointments")}
            className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}
          >
            <Plus size={15} />
            حجز موعد جديد
          </motion.button>
        </div>
      </motion.div>

      {/* Alerts Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3 overflow-x-auto pb-1"
      >
        {alerts.map((alert, i) => {
          const Icon = alert.icon;
          return (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2 rounded-xl shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              style={{
                background: alert.type === "warning" ? "#FEF3C7" : alert.type === "info" ? "#EFF6FF" : "#DCFCE7",
                border: `1px solid ${alert.type === "warning" ? "#FCD34D" : alert.type === "info" ? "#BFDBFE" : "#86EFAC"}`,
              }}
            >
              <Icon size={13} style={{ color: alert.type === "warning" ? "#D97706" : alert.type === "info" ? "#1D5FBF" : "#16A34A", flexShrink: 0 }} />
              <span className="text-xs font-semibold whitespace-nowrap"
                style={{ color: alert.type === "warning" ? "#92400E" : alert.type === "info" ? "#1E3A6F" : "#14532D" }}>
                {alert.text}
              </span>
            </div>
          );
        })}
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(15,37,71,0.1)" }}
              className="rounded-2xl p-4 cursor-pointer transition-all"
              style={{
                background: "white",
                border: "1px solid rgba(30,58,111,0.06)",
                boxShadow: "0 2px 12px rgba(15,37,71,0.04)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                  <Icon size={16} style={{ color: kpi.color }} />
                </div>
                <span className={`text-xs font-bold flex items-center gap-0.5 ${kpi.positive ? "" : ""}`}
                  style={{ color: kpi.positive ? "#16A34A" : "#DC2626" }}>
                  {kpi.positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {kpi.change}
                </span>
              </div>
              <div className="font-black text-xl" style={{ color: "#0F172A" }}>
                <KpiCounter value={kpi.value} prefix={kpi.prefix} suffix={kpi.suffix} />
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{kpi.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart - Only for Admin */}
        {role === 'clinic_admin' && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl p-5"
          style={{
            background: "white",
            border: "1px solid rgba(30,58,111,0.06)",
            boxShadow: "0 2px 12px rgba(15,37,71,0.04)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold" style={{ color: "#0F172A" }}>إيرادات الأشهر الستة الماضية</h3>
              <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>بالدينار الأردني (JOD)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#1D5FBF" }} />
                <span style={{ color: "#64748B" }}>الإيرادات</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#06B6D4" }} />
                <span style={{ color: "#64748B" }}>المواعيد</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1D5FBF" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1D5FBF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAppt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "Cairo" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#1D5FBF" strokeWidth={2.5} fill="url(#colorRevenue)" name="revenue" dot={false} />
              <Area type="monotone" dataKey="appointments" stroke="#06B6D4" strokeWidth={2} fill="url(#colorAppt)" name="appointments" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
        )}

        {/* Treatment Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-5"
          style={{
            background: "white",
            border: "1px solid rgba(30,58,111,0.06)",
            boxShadow: "0 2px 12px rgba(15,37,71,0.04)",
          }}
        >
          <h3 className="font-bold mb-4" style={{ color: "#0F172A" }}>توزيع العلاجات</h3>
          <div className="flex justify-center mb-4">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie
                  data={treatmentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  dataKey="value"
                  stroke="none"
                >
                  {treatmentData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {treatmentData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs" style={{ color: "#64748B" }}>{item.name}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today Appointments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 rounded-2xl p-5"
          style={{
            background: "white",
            border: "1px solid rgba(30,58,111,0.06)",
            boxShadow: "0 2px 12px rgba(15,37,71,0.04)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold" style={{ color: "#0F172A" }}>مواعيد اليوم</h3>
              <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>{todayAppointments.length} موعد مجدول</p>
            </div>
            <button
              onClick={() => navigate("/appointments")}
              className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity"
              style={{ color: "#1D5FBF" }}
            >
              عرض الكل <ChevronLeft size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {todayAppointments.map((appt, i) => {
              const sc = statusColors[appt.status] || statusColors["محجوز"];
              return (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                    {appt.avatar}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: "#0F172A" }}>{appt.patient}</span>
                      <span className="text-xs" style={{ color: "#64748B" }}>·</span>
                      <span className="text-xs" style={{ color: "#64748B" }}>{appt.type}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{appt.doctor}</div>
                  </div>
                  {/* Time */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: "#0F172A" }}>{appt.time}</span>
                    <span
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: sc.bg, color: sc.text }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                      {appt.status}
                    </span>
                  </div>
                  {/* Quick Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-green-50" title="واتساب">
                      <MessageSquare size={13} style={{ color: "#16A34A" }} />
                    </button>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50" title="فاتورة">
                      <FileText size={13} style={{ color: "#1D5FBF" }} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Daily Appointments Bar Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl p-5"
            style={{
              background: "white",
              border: "1px solid rgba(30,58,111,0.06)",
              boxShadow: "0 2px 12px rgba(15,37,71,0.04)",
            }}
          >
            <h3 className="font-bold mb-3" style={{ color: "#0F172A" }}>المواعيد الأسبوعية</h3>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={dailyData} barSize={12}>
                <XAxis dataKey="day" tick={{ fill: "#94A3B8", fontSize: 10, fontFamily: "Cairo" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "rgba(29,95,191,0.05)", radius: 6 }}
                  content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="rounded-lg p-2 shadow-lg" style={{ background: "white", border: "1px solid rgba(30,58,111,0.1)" }}>
                      <p className="text-xs font-bold" style={{ color: "#0F172A" }}>{label}: {payload[0].value} موعد</p>
                    </div>
                  ) : null}
                />
                <Bar dataKey="count" fill="#1D5FBF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-2xl p-5"
            style={{
              background: "white",
              border: "1px solid rgba(30,58,111,0.06)",
              boxShadow: "0 2px 12px rgba(15,37,71,0.04)",
            }}
          >
            <h3 className="font-bold mb-3" style={{ color: "#0F172A" }}>إجراءات سريعة</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "موعد جديد", icon: Calendar, color: "#1D5FBF", bg: "#EFF6FF", path: "/appointments" },
                { label: "مريض جديد", icon: Users, color: "#16A34A", bg: "#DCFCE7", path: "/patients" },
                { label: "فاتورة جديدة", icon: FileText, color: "#D97706", bg: "#FEF3C7", path: "/billing" },
                { label: "إرسال تذكير", icon: MessageSquare, color: "#8B5CF6", bg: "#EDE9FE", path: "/communication" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.label}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all"
                    style={{ background: action.bg }}
                  >
                    <Icon size={18} style={{ color: action.color }} />
                    <span className="text-xs font-semibold" style={{ color: action.color }}>{action.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Clinic Health Score */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, #0F2547, #1D5FBF)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} style={{ color: "#FCD34D" }} />
              <span className="text-xs font-bold text-white">نبضة العيادة</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-4xl font-black text-white">{healthScore}</div>
              <div>
                <div className="text-xs font-bold" style={{ color: "#93C5FD" }}>
                  {healthScore >= 80 ? "درجة ممتازة" : healthScore >= 60 ? "درجة جيدة" : "يحتاج متابعة"}
                </div>
                <div className="text-xs" style={{ color: "#6EAAFF", marginTop: 2 }}>من 100 نقطة</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${healthScore}%` }}
                transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #60A5FA, #22D3EE)" }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: "#93C5FD" }}>إكمال المواعيد: {attendancePct}%</span>
              <span className="text-xs" style={{ color: "#93C5FD" }}>
                مؤشر عام: {((healthScore / 100) * 5).toFixed(1)}★
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}