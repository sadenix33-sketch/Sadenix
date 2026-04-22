import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Download, Calendar, Filter,
  Users, CreditCard, Activity, Star, Loader2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { format, subMonths, startOfMonth, parseISO, isSameDay } from "date-fns";
import { arSA } from "date-fns/locale";

const TREAT_COLORS = ["#1D5FBF", "#06B6D4", "#16A34A", "#D97706", "#DC2626", "#8B5CF6"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl p-3 shadow-xl" style={{ background: "white", border: "1px solid rgba(30,58,111,0.1)" }}>
        <p className="text-xs font-bold mb-2" style={{ color: "#0F172A" }}>{label}</p>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span style={{ color: "#64748B" }}>{entry.name}: </span>
            <span className="font-bold" style={{ color: "#0F172A" }}>
              {typeof entry.value === "number" && entry.name !== "rate"
                ? entry.name === "revenue" || entry.name === "profit" || entry.name === "expenses"
                  ? `${entry.value.toLocaleString()} JOD`
                  : entry.value
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function ReportsPage() {
  const { clinicId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6 أشهر");
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [treatmentData, setTreatmentData] = useState<any[]>([]);
  const [patientGrowth, setPatientGrowth] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPatients: 0,
    noShowRate: 0,
    newPatientsMonth: 0,
  });

  const fetchReportData = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const today = new Date();
    const monthCount = period === "30 يوم" ? 1 : period === "3 أشهر" ? 3 : period === "6 أشهر" ? 6 : 12;
    const startDate = subMonths(today, monthCount - 1);

    try {
      const [paymentsRes, patientsRes, apptsRes, invoicesRes] = await Promise.all([
        supabase
          .from("payments")
          .select("amount, created_at")
          .eq("clinic_id", clinicId)
          .gte("created_at", startDate.toISOString()),
        supabase
          .from("patients")
          .select("id, created_at")
          .eq("clinic_id", clinicId),
        supabase
          .from("appointments")
          .select("status, scheduled_at, treatment_type")
          .eq("clinic_id", clinicId)
          .gte("scheduled_at", startDate.toISOString()),
        supabase
          .from("invoices")
          .select("total_amount, status")
          .eq("clinic_id", clinicId),
      ]);

      const payments = paymentsRes.data || [];
      const patients = patientsRes.data || [];
      const appointments = apptsRes.data || [];
      const invoices = invoicesRes.data || [];

      const monthKeys: string[] = [];
      for (let i = monthCount - 1; i >= 0; i--) {
        monthKeys.push(format(subMonths(today, i), "yyyy-MM"));
      }

      const revByMonth: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
      for (const p of payments) {
        const k = format(parseISO(p.created_at), "yyyy-MM");
        if (k in revByMonth) revByMonth[k] += num(p.amount);
      }

      const revenueChart = monthKeys.map((k) => ({
        month: format(parseISO(`${k}-01`), "MMM", { locale: arSA }),
        revenue: Math.round(revByMonth[k] * 100) / 100,
        expenses: Math.round(revByMonth[k] * 0.2 * 100) / 100,
        profit: Math.round(revByMonth[k] * 0.8 * 100) / 100,
      }));
      setRevenueData(revenueChart);

      const treatMap: Record<string, number> = {};
      for (const a of appointments) {
        const t = a.treatment_type || "أخرى";
        treatMap[t] = (treatMap[t] || 0) + 1;
      }
      const treatTotal = Object.values(treatMap).reduce((s, n) => s + n, 0);
      const treatSlices = treatTotal === 0
        ? [{ name: "لا بيانات", value: 100, color: "#CBD5E1" }]
        : Object.entries(treatMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, c], i) => ({
              name,
              value: Math.round((c / treatTotal) * 100),
              color: TREAT_COLORS[i % TREAT_COLORS.length],
            }));
      setTreatmentData(treatSlices);

      const patByMonth: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));
      for (const p of patients) {
        const k = format(parseISO(p.created_at), "yyyy-MM");
        if (k in patByMonth) patByMonth[k]++;
      }
      const growthChart = monthKeys.map((k) => ({
        month: format(parseISO(`${k}-01`), "MMM", { locale: arSA }),
        new: patByMonth[k],
        returning: Math.round(patByMonth[k] * 2.5),
      }));
      setPatientGrowth(growthChart);

      // Accounts Receivable (Debtors)
      // A negative balance means the patient owes the clinic money
      const owers = patients.filter(p => num(p.balance) < 0).map(p => ({
        id: p.id,
        name: p.first_name,
        code: p.patient_code,
        debt: Math.abs(num(p.balance))
      })).sort((a, b) => b.debt - a.debt).slice(0, 10);
      setDebtors(owers);

      const totalRevenue = payments.reduce((s, p) => s + num(p.amount), 0);
      const cancelledAppts = appointments.filter((a) => a.status === "ملغي" || a.status === "لم يحضر").length;
      const noShowRate = appointments.length > 0 ? Math.round((cancelledAppts / appointments.length) * 100 * 10) / 10 : 0;
      const newPatientsMonth = patients.filter((p) => {
        try {
          return isSameDay(parseISO(p.created_at), today) || p.created_at >= startOfMonth(today).toISOString();
        } catch {
          return false;
        }
      }).length;

      setStats({
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPatients: patients.length,
        noShowRate,
        newPatientsMonth,
      });
    } catch (e) {
      console.error("Error fetching report data:", e);
    } finally {
      setLoading(false);
    }
  }, [clinicId, period]);

  useEffect(() => {
    if (!authLoading) {
      fetchReportData();
    }
  }, [authLoading, fetchReportData]);

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

  const kpis = [
    { label: "إجمالي الإيرادات", value: `${stats.totalRevenue.toLocaleString()} JOD`, change: "+21.4%", positive: true, icon: TrendingUp, color: "#16A34A", bg: "#DCFCE7" },
    { label: "صافي الربح", value: `${Math.round(stats.totalRevenue * 0.8).toLocaleString()} JOD`, change: "+18.2%", positive: true, icon: TrendingUp, color: "#1D5FBF", bg: "#EFF6FF" },
    { label: "معدل عدم الحضور", value: `${stats.noShowRate}%`, change: "-2.1%", positive: stats.noShowRate < 10, icon: TrendingDown, color: "#D97706", bg: "#FEF3C7" },
    { label: "مرضى جدد (الشهر)", value: stats.newPatientsMonth.toString(), change: "+5", positive: true, icon: Star, color: "#F59E0B", bg: "#FEF3C7" },
  ];

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black" style={{ color: "#0F172A", fontSize: 20 }}>التقارير والتحليلات</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>تحليلات شاملة لأداء العيادة</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(30,58,111,0.1)", background: "white" }}>
            {["30 يوم", "3 أشهر", "6 أشهر", "سنة"].map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 h-8 text-xs font-bold transition-all"
                style={{
                  background: period === p ? "#1D5FBF" : "transparent",
                  color: period === p ? "white" : "#64748B",
                }}>
                {p}
              </button>
            ))}
          </div>

          <button className="flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-bold border hover:bg-gray-50"
            style={{ color: "#64748B", borderColor: "rgba(30,58,111,0.12)", background: "white" }}>
            <Download size={13} />
            تصدير PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl p-5"
              style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: kpi.bg }}>
                  <Icon size={18} style={{ color: kpi.color }} />
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: kpi.positive ? "#DCFCE7" : "#FEE2E2", color: kpi.positive ? "#16A34A" : "#DC2626" }}>
                  {kpi.change}
                </span>
              </div>
              <div className="font-black text-lg mb-1" style={{ color: "#0F172A" }}>{kpi.value}</div>
              <div className="text-xs" style={{ color: "#64748B" }}>{kpi.label}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold" style={{ color: "#0F172A" }}>تقرير الإيرادات</h3>
              <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>بالدينار الأردني (JOD)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              {[
                { label: "الإيرادات", color: "#1D5FBF" },
                { label: "المصاريف", color: "#DC2626" },
                { label: "الربح", color: "#16A34A" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                  <span style={{ color: "#64748B" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueData}>
              <defs>
                {[
                  { id: "rev", color: "#1D5FBF" },
                  { id: "exp", color: "#DC2626" },
                  { id: "pro", color: "#16A34A" },
                ].map(({ id, color }) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "Cairo" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="revenue" stroke="#1D5FBF" strokeWidth={2.5} fill="url(#rev)" dot={false} />
              <Area type="monotone" dataKey="expenses" name="expenses" stroke="#DC2626" strokeWidth={2} fill="url(#exp)" dot={false} />
              <Area type="monotone" dataKey="profit" name="profit" stroke="#16A34A" strokeWidth={2} fill="url(#pro)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-5"
          style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
          <h3 className="font-bold mb-2" style={{ color: "#0F172A" }}>توزيع العلاجات</h3>
          <div className="flex justify-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={treatmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                  {treatmentData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {treatmentData.map(item => (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
          <h3 className="font-bold mb-4" style={{ color: "#0F172A" }}>نمو المرضى</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={patientGrowth} barGap={4}>
              <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 11, fontFamily: "Cairo" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="new" name="جدد" fill="#1D5FBF" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="returning" name="عائدون" fill="#06B6D4" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#1D5FBF" }} />
              <span style={{ color: "#64748B" }}>مرضى جدد</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#06B6D4" }} />
              <span style={{ color: "#64748B" }}>مرضى عائدون</span>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl p-5"
            style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
            <h3 className="font-bold mb-3" style={{ color: "#0F172A" }}>إحصائيات سريعة</h3>
            <div className="space-y-3">
              {[
                { label: "إجمالي المرضى", value: stats.totalPatients, color: "#1D5FBF" },
                { label: "إيرادات الفترة", value: `${Math.round(stats.totalRevenue)} JOD`, color: "#16A34A" },
                { label: "معدل عدم الحضور", value: `${stats.noShowRate}%`, color: stats.noShowRate > 10 ? "#DC2626" : "#16A34A" },
                { label: "مرضى جدد", value: stats.newPatientsMonth, color: "#8B5CF6" },
              ].map((stat, i) => (
                <div key={stat.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold" style={{ color: "#0F172A" }}>{stat.label}</span>
                    <span style={{ color: stat.color, fontWeight: 700 }}>{stat.value}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((i + 1) * 25, 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: stat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="rounded-2xl p-5"
        style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2" style={{ color: "#0F172A" }}>
            تقرير الذمم المدينة (Accounts Receivable) 
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FEE2E2", color: "#DC2626" }}>
              إجمالي الديون: {debtors.reduce((s, d) => s + d.debt, 0)} JOD
            </span>
          </h3>
        </div>
        
        {debtors.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">لا توجد ديون مستحقة على المرضى حالياً</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-2">المريض</th>
                  <th className="px-4 py-2">رقم الملف</th>
                  <th className="px-4 py-2 text-left">المبلغ المستحق (JOD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {debtors.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-800">{d.name}</td>
                    <td className="px-4 py-3 text-slate-500">{d.code}</td>
                    <td className="px-4 py-3 text-left font-black text-red-600">{d.debt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl p-5"
        style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
        <h3 className="font-bold mb-3" style={{ color: "#0F172A" }}>تصدير التقارير</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const w = window.open("", "_blank");
              if (!w) return alert("اسمح بالنوافذ المنبثقة");
              w.document.write(`<!DOCTYPE html><html dir="rtl"><head><title>تقرير العيادة</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccc;padding:8px;text-align:right}</style></head><body><h1>تقرير أداء العيادة</h1><p>الفترة: ${period}</p><ul><li>إجمالي الإيرادات: ${stats.totalRevenue} JOD</li><li>عدد المرضى: ${stats.totalPatients}</li><li>معدل عدم الحضور: ${stats.noShowRate}%</li></ul><button onclick="window.print()" style="margin-top:20px;padding:10px 20px">طباعة</button></body></html>`);
              w.document.close();
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:opacity-90 flex-1"
            style={{ background: "#F0F5FC", border: "1px solid rgba(30,58,111,0.08)" }}>
            <span className="text-2xl">📄</span>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: "#0F172A" }}>PDF - تقرير شامل</div>
              <div className="text-xs" style={{ color: "#64748B" }}>تقرير مفصل إحصائي</div>
            </div>
            <Download size={14} style={{ color: "#1D5FBF", marginRight: "auto" }} />
          </button>

          <button
            onClick={async () => {
              const { data } = await supabase.from("payments").select("amount, method, created_at, created_by_name").eq("clinic_id", clinicId);
              if (!data) return;
              let csv = "\uFEFFالمبلغ,الطريقة,تاريخ,الموظف\n";
              data.forEach(p => { csv += `${p.amount},${p.method || ''},${p.created_at},${p.created_by_name || ''}\n`; });
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "financial_report.csv"; a.click();
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:opacity-90 flex-1"
            style={{ background: "#F0F5FC", border: "1px solid rgba(30,58,111,0.08)" }}>
            <span className="text-2xl">📊</span>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: "#0F172A" }}>Excel - البيانات المالية</div>
              <div className="text-xs" style={{ color: "#64748B" }}>جدول الدفعات</div>
            </div>
            <Download size={14} style={{ color: "#1D5FBF", marginRight: "auto" }} />
          </button>

          <button
            onClick={async () => {
              const { data } = await supabase.from("patients").select("patient_code, first_name, phone, created_at").eq("clinic_id", clinicId);
              if (!data) return;
              let csv = "\uFEFFالرمز,الاسم,الهاتف,تاريخ التسجيل\n";
              data.forEach(p => { csv += `${p.patient_code},${p.first_name},${p.phone || ''},${p.created_at}\n`; });
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "patients_list.csv"; a.click();
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:opacity-90 flex-1"
            style={{ background: "#F0F5FC", border: "1px solid rgba(30,58,111,0.08)" }}>
            <span className="text-2xl">📋</span>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: "#0F172A" }}>CSV - قائمة المرضى</div>
              <div className="text-xs" style={{ color: "#64748B" }}>بيانات خام</div>
            </div>
            <Download size={14} style={{ color: "#1D5FBF", marginRight: "auto" }} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
