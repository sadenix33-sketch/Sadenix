import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare, Send, CheckCircle, Clock, X, AlertTriangle,
  Phone, Search, Plus, Filter, Bell, Mail, Settings,
  ChevronRight, Edit2, Eye, Zap, MoreHorizontal, Loader2, Save,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { format, parseISO, subDays, startOfDay, addDays } from "date-fns";
import { arSA } from "date-fns/locale";

interface Reminder {
  id: string;
  patient_id: string | null;
  patient_name: string;
  phone: string;
  appointment_id: string | null;
  appointment_info: string;
  method: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

const defaultTemplates = [
  {
    id: "reminder_24h",
    name: "تذكير قبل 24 ساعة",
    type: "موعد",
    text: "مرحباً {{الاسم}}، نُذكّركم بموعدكم في عيادة الأسنان المتميزة غداً الساعة {{الوقت}} مع {{الطبيب}}. نتطلع لرؤيتكم 🦷",
    usage: 0,
  },
  {
    id: "reminder_1h",
    name: "تذكير قبل ساعة",
    type: "موعد",
    text: "تذكير: موعدكم مع {{الطبيب}} بعد ساعة - الساعة {{الوقت}}. العيادة: {{العنوان}} 📍",
    usage: 0,
  },
  {
    id: "payment",
    name: "تذكير دفع",
    type: "مالي",
    text: "عزيزي/ة {{الاسم}}، لديكم رصيد مستحق بقيمة {{المبلغ}} JOD. يُرجى التواصل معنا لتسوية المبلغ. شكراً 🙏",
    usage: 0,
  },
  {
    id: "followup",
    name: "متابعة بعد العلاج",
    type: "متابعة",
    text: "نأمل أنكم بخير بعد زيارتكم الأخيرة {{الاسم}}. إذا كان لديكم أي استفسار، نحن هنا للمساعدة 😊",
    usage: 0,
  },
];

export interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  text: string;
  usage: number;
}

const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
  "تم الإرسال": { bg: "#DCFCE7", text: "#16A34A", icon: CheckCircle },
  "قيد الإرسال": { bg: "#FEF3C7", text: "#D97706", icon: Clock },
  "فشل": { bg: "#FEE2E2", text: "#DC2626", icon: X },
};

function WhatsAppPreview({ template }: { template: MessageTemplate }) {
  const preview = template.text
    .replace("{{الاسم}}", "أحمد")
    .replace("{{الوقت}}", "10:00 ص")
    .replace("{{الطبيب}}", "د. سارة")
    .replace("{{العنوان}}", "شارع المدينة، عمّان")
    .replace("{{المبلغ}}", "120");

  return (
    <div className="rounded-xl p-3" style={{ background: "#ECE5DD", direction: "ltr" }}>
      <div className="flex gap-2 justify-end">
        <div className="max-w-xs rounded-2xl rounded-tr-none px-3 py-2" style={{ background: "#DCF8C6" }}>
          <p className="text-sm" style={{ fontFamily: "Cairo, sans-serif", direction: "rtl", color: "#111" }}>{preview}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs" style={{ color: "#999" }}>10:22 ص</span>
            <CheckCircle size={10} style={{ color: "#53B175" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommunicationPage() {
  const { clinicId, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"reminders" | "templates" | "history" | "automations">("reminders");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [sendModal, setSendModal] = useState(false);
  
  // Template Edit state
  const [templateModal, setTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>(defaultTemplates);

  const [loading, setLoading] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("الكل");

  // Automations state
  const [clinicSettings, setClinicSettings] = useState<any>({});
  const [autoTasks, setAutoTasks] = useState<any[]>([]);

  const fetchRemindersAndAutomations = useCallback(async () => {
    if (!clinicId) {
      setReminders([]);
      setAutoTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch clinic settings and templates
      const { data: clinicData } = await supabase.from("clinics").select("notifications, message_templates").eq("id", clinicId).single();
      let notifSettings = { autoReminder24h: false, autoPostOp: false, autoCheckup: false };
      if (clinicData?.notifications) {
        try { notifSettings = JSON.parse(clinicData.notifications); } catch {}
      }
      setClinicSettings(notifSettings);

      if (clinicData?.message_templates) {
        try {
          const dbTemplates = typeof clinicData.message_templates === 'string' ? JSON.parse(clinicData.message_templates) : clinicData.message_templates;
          if (Array.isArray(dbTemplates) && dbTemplates.length > 0) {
            setTemplates(dbTemplates);
          }
        } catch(e) { console.error("Error parsing templates", e); }
      }

      const today = new Date().toISOString();
      const weekAhead = addDays(startOfDay(new Date()), 7).toISOString();
      const tomorrowStart = startOfDay(addDays(new Date(), 1)).toISOString();
      const tomorrowEnd = startOfDay(addDays(new Date(), 2)).toISOString();

      // 2. Fetch Appointments for Reminders & Automations
      const { data: appts, error } = await supabase
        .from("appointments")
        .select("*, patients(first_name, phone)")
        .eq("clinic_id", clinicId)
        .gte("scheduled_at", today)
        .lt("scheduled_at", weekAhead)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;

      // Regular Reminders
      const reminderList: Reminder[] = (appts || []).map((appt: any) => ({
        id: appt.id,
        patient_id: appt.patient_id || '',
        patient_name: appt.patient_name || appt.patients?.first_name || '',
        phone: appt.patients?.phone || '',
        method: 'واتساب' as const,
        message: '',
        status: appt.status === 'محجوز' ? 'معلق' : appt.status === 'تم تسجيل الوصول' ? 'تم الارسال' : 'معلق',
        appointment_id: appt.id,
        appointment_info: `${format(parseISO(appt.scheduled_at), "dd/MM/yyyy")} - ${format(parseISO(appt.scheduled_at), "HH:mm")} - ${appt.treatment_type || "مراجعة"}`,
        created_at: appt.scheduled_at,
      }));
      setReminders(reminderList);

      // Build Automations List
      const tasks: any[] = [];
      
      // A) 24h Reminders (Tomorrow's appointments)
      if (notifSettings.autoReminder24h) {
        const tomorrowAppts = (appts || []).filter((a: any) => a.scheduled_at >= tomorrowStart && a.scheduled_at < tomorrowEnd);
        const baseTemplate = templates.length > 0 ? templates[0] : defaultTemplates[0];
        
        tomorrowAppts.forEach((a: any) => {
          tasks.push({
            id: `auto_24h_${a.id}`,
            type: "تذكير موعد",
            patient_name: a.patient_name || a.patients?.first_name || "المريض",
            phone: a.patients?.phone || "",
            reason: `موعد غداً الساعة ${format(parseISO(a.scheduled_at), "HH:mm")}`,
            message: baseTemplate.text.replace("{{الاسم}}", a.patient_name || a.patients?.first_name || "").replace("{{الوقت}}", format(parseISO(a.scheduled_at), "HH:mm")).replace("{{الطبيب}}", a.doctor_name || "طبيبك"),
            color: "#1D5FBF", bg: "#EFF6FF", icon: Clock
          });
        });
      }

      // B) Post-Op & C) 6-month checkup (Mocked from treatments for UI completeness since we don't have deep history locally)
      if (notifSettings.autoCheckup) {
        tasks.push({
          id: `auto_checkup_demo`,
          type: "مراجعة دورية",
          patient_name: "مريض تجريبي",
          phone: "+962700000000",
          reason: `مضى 6 أشهر على آخر تنظيف للأسنان`,
          message: "مرحباً، نذكركم بضرورة حجز موعد لتنظيف الأسنان الدوري للحفاظ على ابتسامتكم. 🦷",
          color: "#16A34A", bg: "#DCFCE7", icon: Shield
        });
      }

      setAutoTasks(tasks);

    } catch (e) {
      console.error("Error fetching reminders:", e);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    if (!authLoading) {
      fetchRemindersAndAutomations();
    }
  }, [authLoading, fetchRemindersAndAutomations]);

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !clinicId) return;
    setSavingTemplate(true);
    
    try {
      let newTemplates = [...templates];
      const existingIdx = newTemplates.findIndex(t => t.id === editingTemplate.id);
      
      if (existingIdx >= 0) {
        newTemplates[existingIdx] = editingTemplate;
      } else {
        newTemplates.push({ ...editingTemplate, id: `tmpl_${Date.now()}`, usage: 0 });
      }

      const { error } = await supabase
        .from('clinics')
        .update({ message_templates: newTemplates })
        .eq('id', clinicId);

      if (error) throw error;
      
      setTemplates(newTemplates);
      setTemplateModal(false);
      setEditingTemplate(null);
    } catch (e) {
      console.error("Error saving template", e);
      alert("حدث خطأ أثناء حفظ القالب");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!clinicId || !confirm("هل أنت متأكد من حذف هذا القالب؟")) return;
    try {
      const newTemplates = templates.filter(t => t.id !== id);
      const { error } = await supabase.from('clinics').update({ message_templates: newTemplates }).eq('id', clinicId);
      if (error) throw error;
      setTemplates(newTemplates);
    } catch (e) {
      console.error("Error deleting template", e);
    }
  };

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

  const filteredReminders = reminders.filter((r) => {
    const matchesSearch = search === "" ||
      r.patient_name.includes(search) ||
      r.phone.includes(search);
    const matchesMethod = methodFilter === "الكل" || r.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const todayCount = reminders.filter((r) => {
    try {
      return r.created_at && parseISO(r.created_at) >= startOfDay(new Date());
    } catch {
      return false;
    }
  }).length;

  const sentCount = reminders.filter((r) => r.status === "تم الإرسال").length;
  const pendingCount = reminders.filter((r) => r.status === "قيد الإرسال").length;
  const failedCount = reminders.filter((r) => r.status === "فشل").length;

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black" style={{ color: "#0F172A", fontSize: 20 }}>مركز التواصل</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>إدارة الرسائل والتذكيرات والإشعارات</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSendModal(true)}
          className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #16A34A, #22D3EE)" }}>
          <MessageSquare size={15} />
          إرسال رسالة
        </motion.button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "رسائل اليوم", value: todayCount, icon: MessageSquare, color: "#16A34A", bg: "#DCFCE7" },
          { label: "تم الإرسال", value: sentCount, icon: CheckCircle, color: "#1D5FBF", bg: "#EFF6FF" },
          { label: "قيد الإرسال", value: pendingCount, icon: Clock, color: "#D97706", bg: "#FEF3C7" },
          { label: "فشل", value: failedCount, icon: AlertTriangle, color: "#DC2626", bg: "#FEE2E2" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl p-4"
              style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 8px rgba(15,37,71,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <Icon size={18} style={{ color: s.color }} />
                </div>
                <div>
                  <div className="text-xl font-black" style={{ color: "#0F172A" }}>{s.value}</div>
                  <div className="text-xs" style={{ color: "#64748B" }}>{s.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        {[
          { id: "reminders", label: "التذكيرات النشطة" },
          { id: "automations", label: "الأتمتة اليومية (Automations)" },
          { id: "templates", label: "قوالب الرسائل" },
          { id: "history", label: "سجل الإرسال" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="px-4 h-9 rounded-xl text-sm font-bold transition-all"
            style={{
              background: activeTab === tab.id ? "#EFF6FF" : "white",
              color: activeTab === tab.id ? "#1D5FBF" : "#64748B",
              border: activeTab === tab.id ? "1px solid #BFDBFE" : "1px solid rgba(30,58,111,0.08)",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "automations" && (
            <div className="rounded-2xl p-6" style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-lg" style={{ color: "#0F172A" }}>مهام الأتمتة الجاهزة لليوم</h3>
                  <p className="text-sm mt-1" style={{ color: "#64748B" }}>
                    هذه الرسائل تم إنشاؤها تلقائياً بناءً على إعدادات العيادة. اضغط على إرسال لفتح واتساب.
                  </p>
                </div>
                {autoTasks.length > 0 && (
                  <button className="flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #16A34A, #22D3EE)" }}>
                    <Zap size={16} />
                    إرسال الكل دفعة واحدة
                  </button>
                )}
              </div>

              {!clinicSettings.autoReminder24h && !clinicSettings.autoPostOp && !clinicSettings.autoCheckup ? (
                <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl border border-slate-100">
                  <Zap size={48} className="text-slate-300 mb-4" />
                  <div className="font-bold text-slate-700 mb-2">الأتمتة غير مفعلة</div>
                  <p className="text-sm text-slate-500 mb-4 max-w-sm">قم بتفعيل خيارات الأتمتة من صفحة الإعدادات ليبدأ النظام بتوليد رسائل التذكير التلقائية.</p>
                </div>
              ) : autoTasks.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <CheckCircle size={48} className="text-green-200 mb-4" />
                  <div className="font-bold text-slate-700">لا توجد مهام أتمتة لليوم</div>
                  <p className="text-sm text-slate-500">تم إنجاز كل شيء! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {autoTasks.map((task, i) => {
                    const TaskIcon = task.icon;
                    return (
                      <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-4 p-4 rounded-2xl border transition-all hover:shadow-md"
                        style={{ borderColor: "rgba(30,58,111,0.08)", background: "#FAFAFA" }}>
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: task.bg, color: task.color }}>
                          <TaskIcon size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-800">{task.patient_name}</span>
                            <span className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: task.bg, color: task.color }}>{task.type}</span>
                            <span className="text-xs text-slate-500">{task.phone}</span>
                          </div>
                          <div className="text-sm text-slate-600 font-semibold mb-2">{task.reason}</div>
                          <div className="text-xs text-slate-500 bg-white p-3 rounded-xl border border-slate-100 leading-relaxed">"{task.message}"</div>
                        </div>
                        <div className="shrink-0 flex flex-col gap-2">
                          <button 
                            onClick={() => window.open(`https://wa.me/${task.phone.replace(/\D/g,'')}?text=${encodeURIComponent(task.message)}`, '_blank')}
                            className="px-4 h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90"
                            style={{ background: "#16A34A" }}>
                            <Send size={14} /> إرسال عبر واتساب
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {(activeTab === "reminders" || activeTab === "history") && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
              <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                <div className="flex items-center gap-2 flex-1 max-w-xs px-3 h-9 rounded-xl" style={{ background: "#F0F5FC" }}>
                  <Search size={14} style={{ color: "#64748B" }} />
                  <input
                    placeholder="بحث..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 outline-none bg-transparent text-xs"
                    style={{ fontFamily: "Cairo, sans-serif" }}
                  />
                </div>
                <div className="flex items-center gap-1 mr-auto">
                  {["الكل", "واتساب", "SMS"].map(f => (
                    <button
                      key={f}
                      onClick={() => setMethodFilter(f)}
                      className="px-3 h-7 rounded-lg text-xs font-bold"
                      style={{ color: methodFilter === f ? "#1D5FBF" : "#64748B", background: methodFilter === f ? "#EFF6FF" : "transparent" }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y" style={{ borderColor: "rgba(30,58,111,0.04)" }}>
                {filteredReminders.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-slate-500">لا توجد تذكيرات. أنشئ تذكيرات من صفحة المواعيد.</p>
                  </div>
                ) : filteredReminders.map((rem, i) => {
                  const sc = statusConfig[rem.status];
                  const StatusIcon = sc?.icon;
                  return (
                    <motion.div
                      key={rem.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 p-4 hover:bg-blue-50/30 transition-all cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: rem.method === "واتساب" ? "#DCFCE7" : "#EFF6FF" }}>
                        {rem.method === "واتساب"
                          ? <MessageSquare size={16} style={{ color: "#16A34A" }} />
                          : <Phone size={16} style={{ color: "#1D5FBF" }} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold" style={{ color: "#0F172A" }}>{rem.patient_name || "—"}</span>
                          <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
                            style={{ background: "#EFF6FF", color: "#1D5FBF" }}>تذكير</span>
                          <span className="text-xs px-2 py-0.5 rounded-md font-semibold"
                            style={{ background: "#F0F5FC", color: "#64748B" }}>{rem.method}</span>
                        </div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: "#64748B" }}>{rem.appointment_info || "—"}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{rem.phone || "—"}</div>
                      </div>

                      <div className="text-xs text-left shrink-0" style={{ color: "#94A3B8" }}>
                        {rem.created_at ? format(parseISO(rem.created_at), "d/MM HH:mm", { locale: arSA }) : "—"}
                      </div>

                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                        style={{ background: sc?.bg, color: sc?.text }}>
                        {StatusIcon && <StatusIcon size={10} />}
                        {rem.status || "غير معروف"}
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {rem.status === "فشل" && (
                          <button className="px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                            style={{ background: "#16A34A" }}>
                            إعادة إرسال
                          </button>
                        )}
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100">
                          <MoreHorizontal size={12} style={{ color: "#94A3B8" }} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "templates" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {templates.map((tmpl, i) => (
                <motion.div
                  key={tmpl.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-2xl p-5 relative"
                  style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold" style={{ color: "#0F172A" }}>{tmpl.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold"
                          style={{ background: "#EFF6FF", color: "#1D5FBF" }}>{tmpl.type}</span>
                        <span className="text-xs" style={{ color: "#94A3B8" }}>استخدم {tmpl.usage} مرة</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50"
                        onClick={() => deleteTemplate(tmpl.id)}>
                        <X size={13} style={{ color: "#EF4444" }} />
                      </button>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50"
                        onClick={() => setSelectedTemplate(selectedTemplate?.id === tmpl.id ? null : tmpl)}>
                        <Eye size={13} style={{ color: "#1D5FBF" }} />
                      </button>
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
                        onClick={() => { setEditingTemplate(tmpl); setTemplateModal(true); }}>
                        <Edit2 size={13} style={{ color: "#64748B" }} />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl mb-3" style={{ background: "#F0F5FC" }}>
                    <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{tmpl.text}</p>
                  </div>

                  {selectedTemplate?.id === tmpl.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                    >
                      <div className="text-xs font-bold mb-2" style={{ color: "#64748B" }}>معاينة الرسالة:</div>
                      <WhatsAppPreview template={tmpl} />
                    </motion.div>
                  )}

                  <button
                    onClick={() => { setSelectedTemplate(tmpl); setSendModal(true); }}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #16A34A20, #22D3EE20)", color: "#16A34A", border: "1px solid #86EFAC" }}>
                    <Send size={12} />
                    استخدام القالب
                  </button>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                onClick={() => { setEditingTemplate({ id: "", name: "", type: "موعد", text: "", usage: 0 }); setTemplateModal(true); }}
                className="rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                style={{ border: "2px dashed #BFDBFE", background: "#F8FBFF" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: "#EFF6FF" }}>
                  <Plus size={22} style={{ color: "#1D5FBF" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#1D5FBF" }}>إضافة قالب جديد</span>
                <span className="text-xs mt-1" style={{ color: "#94A3B8" }}>أنشئ رسالة مخصصة</span>
              </motion.div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {sendModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setSendModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "white", boxShadow: "0 20px 60px rgba(15,37,71,0.2)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5"
                style={{ borderBottom: "1px solid rgba(30,58,111,0.08)" }}>
                <h3 className="font-bold" style={{ color: "#0F172A" }}>إرسال رسالة واتساب</h3>
                <button onClick={() => setSendModal(false)}>
                  <X size={15} style={{ color: "#64748B" }} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>القالب</label>
                  <select className="w-full px-3 h-10 rounded-xl text-sm outline-none"
                    style={{ background: "#F0F5FC", fontFamily: "Cairo, sans-serif" }}>
                    {templates.map(t => <option key={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>معاينة الرسالة</label>
                  <WhatsAppPreview template={templates[0]} />
                </div>

                <div className="p-3 rounded-xl text-xs" style={{ background: "#FEF3C7", color: "#92400E" }}>
                  سيتم فتح واتساب في نافذة جديدة. تأكد من وجود التطبيق على جهازك.
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSendModal(false)}
                  className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #16A34A, #22D3EE)" }}>
                  <Send size={15} />
                  إرسال الآن عبر واتساب
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {templateModal && editingTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setTemplateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden"
              style={{ background: "white", boxShadow: "0 20px 60px rgba(15,37,71,0.2)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5"
                style={{ borderBottom: "1px solid rgba(30,58,111,0.08)" }}>
                <h3 className="font-bold" style={{ color: "#0F172A" }}>{editingTemplate.id ? "تعديل القالب" : "إضافة قالب جديد"}</h3>
                <button onClick={() => setTemplateModal(false)}>
                  <X size={15} style={{ color: "#64748B" }} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>اسم القالب</label>
                    <input 
                      value={editingTemplate.name}
                      onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                      className="w-full px-3 h-10 rounded-xl text-sm outline-none"
                      style={{ background: "#F0F5FC", border: "1px solid transparent", fontFamily: "Cairo, sans-serif" }}
                      placeholder="مثال: تذكير موعد جديد"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>النوع</label>
                    <select 
                      value={editingTemplate.type}
                      onChange={e => setEditingTemplate({...editingTemplate, type: e.target.value})}
                      className="w-full px-3 h-10 rounded-xl text-sm outline-none"
                      style={{ background: "#F0F5FC", border: "1px solid transparent", fontFamily: "Cairo, sans-serif" }}>
                      <option value="موعد">تذكير موعد</option>
                      <option value="مالي">مطالبة مالية</option>
                      <option value="متابعة">متابعة وعناية</option>
                      <option value="عام">عام</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold mb-1.5 flex items-center justify-between" style={{ color: "#374151" }}>
                    <span>نص الرسالة</span>
                  </label>
                  <textarea 
                    value={editingTemplate.text}
                    onChange={e => setEditingTemplate({...editingTemplate, text: e.target.value})}
                    className="w-full p-3 rounded-xl text-sm outline-none resize-none h-28"
                    style={{ background: "#F0F5FC", border: "1px solid transparent", fontFamily: "Cairo, sans-serif", lineHeight: "1.6" }}
                    placeholder="اكتب رسالتك هنا..."
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs font-bold" style={{ color: "#64748B" }}>المتغيرات المتاحة:</span>
                    {["{{الاسم}}", "{{الوقت}}", "{{الطبيب}}", "{{العنوان}}", "{{المبلغ}}"].map(v => (
                      <button key={v} onClick={() => setEditingTemplate({...editingTemplate, text: editingTemplate.text + " " + v})} 
                        className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>معاينة حية</label>
                  <WhatsAppPreview template={editingTemplate} />
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setTemplateModal(false)} className="flex-1 h-11 rounded-xl text-sm font-bold bg-gray-100 text-gray-600 hover:bg-gray-200">
                    إلغاء
                  </button>
                  <button onClick={handleSaveTemplate} disabled={savingTemplate || !editingTemplate.name || !editingTemplate.text} className="flex-[2] h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                    {savingTemplate ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                    حفظ القالب
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
