import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  MessageSquare,
  X,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Trash2,
  Calendar,
  User,
  Stethoscope,
  Bell,
  Filter,
} from "lucide-react";
import {
  format,
  addDays,
  startOfWeek,
  isSameDay,
  setHours,
  setMinutes,
  startOfDay,
  differenceInCalendarDays,
  parseISO,
  isToday,
} from "date-fns";
import { arSA } from "date-fns/locale";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { AddPatientModal, type Patient } from "./Patients";

const WORK_HOURS = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30",
];

const CALENDAR_HOURS = [
  "08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00",
];

const TREATMENT_TYPES = [
  "حشو", "تنظيف", "تقويم", "خلع", "مراجعة", "زراعة", "تبييض",
  "علاج عصب", "تركيب تاج", "جسر أسنان", "أشعة", "استشارة",
];

const DURATIONS = [
  { label: "30 دقيقة", value: 30 },
  { label: "45 دقيقة", value: 45 },
  { label: "ساعة", value: 60 },
  { label: "ساعة ونص", value: 90 },
  { label: "ساعتان", value: 120 },
];

const weekDayLabels = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

const COLOR_PALETTE = ["#1D5FBF", "#16A34A", "#D97706", "#8B5CF6", "#06B6D4", "#EC4899", "#F59E0B"];

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "محجوز":             { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1", dot: "#94A3B8" },
  "مؤكد":              { bg: "#EFF6FF", text: "#1D5FBF", border: "#BFDBFE", dot: "#3B82F6" },
  "تم تسجيل الوصول":  { bg: "#FEF3C7", text: "#D97706", border: "#FCD34D", dot: "#F59E0B" },
  "تحت العلاج":        { bg: "#DCFCE7", text: "#16A34A", border: "#86EFAC", dot: "#22C55E" },
  "مكتمل":             { bg: "#DCFCE7", text: "#16A34A", border: "#86EFAC", dot: "#16A34A" },
  "ملغي":              { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA", dot: "#EF4444" },
  "لم يحضر":           { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA", dot: "#EF4444" },
};

const STATUS_CYCLE = ["محجوز", "مؤكد", "تم تسجيل الوصول", "تحت العلاج", "مكتمل"];

interface AppointmentRow {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_name: string;
  doctor_name: string;
  scheduled_at: string;
  duration_minutes: number;
  treatment_type: string | null;
  status: string;
  chair: string | null;
  color: string | null;
  whatsapp_reminder: boolean;
  notes: string | null;
}

interface ApptDisplay {
  id: string;
  patient: string;
  patientId: string | null;
  patientPhone: string;
  doctor: string;
  time: string;
  duration: number;
  type: string;
  status: string;
  chair: string;
  color: string;
  scheduled_at: string;
  notes: string;
}

function rowToDisplay(row: AppointmentRow, phoneByPatientId: Map<string, string>): ApptDisplay {
  let time = "00:00";
  let d = new Date();
  try {
    if (row.scheduled_at) {
      d = parseISO(row.scheduled_at);
      time = format(d, "HH:mm");
    }
  } catch (e) {
    console.error("Invalid date for appointment:", row.id);
  }
  const phone = (row.patient_id && phoneByPatientId.get(row.patient_id)) || "";
  return {
    id: row.id,
    patient: row.patient_name || "مريض",
    patientId: row.patient_id,
    patientPhone: phone,
    doctor: row.doctor_name || "طبيب",
    time,
    duration: row.duration_minutes || 60,
    type: row.treatment_type || "—",
    status: row.status || "محجوز",
    chair: row.chair || "—",
    color: row.color || COLOR_PALETTE[0],
    scheduled_at: row.scheduled_at || d.toISOString(),
    notes: row.notes || "",
  };
}

function openWhatsApp(phone: string, body: string) {
  if (!phone) { alert("لا يوجد رقم هاتف مسجل لهذا المريض."); return; }
  const cleaned = phone.replace(/^0/, "962").replace(/\D/g, "");
  window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(body)}`, "_blank");
}

type BookingPrefill = {
  appointmentId?: string;
  patientId?: string;
  doctorName?: string;
  time?: string;
  treatmentType?: string;
  dayOffset?: number;
  date?: Date;
};

/* ─── Appointment Detail Modal ───────────────────────────── */
interface ApptDetailModalProps {
  appt: ApptDisplay;
  clinicId: string;
  onClose: () => void;
  onRefresh: () => void;
  onReschedule: (a: ApptDisplay) => void;
}

function ApptDetailModal({ appt, clinicId, onClose, onRefresh, onReschedule }: ApptDetailModalProps) {
  const [saving, setSaving] = useState(false);

  const sc = statusConfig[appt.status] || statusConfig["محجوز"];

  const updateStatus = async (status: string) => {
    setSaving(true);
    await supabase.from("appointments").update({ status }).eq("id", appt.id).eq("clinic_id", clinicId);
    setSaving(false);
    onRefresh();
    onClose();
  };

  const deleteAppt = async () => {
    if (!confirm(`هل تريد حذف موعد ${appt.patient}؟`)) return;
    setSaving(true);
    await supabase.from("appointments").delete().eq("id", appt.id).eq("clinic_id", clinicId);
    setSaving(false);
    onRefresh();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,37,71,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }} transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: "white", boxShadow: "0 25px 60px rgba(15,37,71,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header colored bar */}
        <div className="p-5" style={{ background: `${appt.color}15`, borderBottom: `2px solid ${appt.color}30` }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: appt.color }}>
                  {appt.patient?.[0] || "م"}
                </div>
                <div>
                  <div className="font-black text-slate-800">{appt.patient}</div>
                  <div className="text-xs text-slate-500">{appt.doctor}</div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold mt-1"
                style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                {appt.status}
              </span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/60">
              <X size={15} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          {[
            { icon: Clock, label: "الوقت", value: `${appt.time} · ${appt.duration} دقيقة` },
            { icon: Stethoscope, label: "نوع العلاج", value: appt.type },
            { icon: User, label: "الكرسي", value: appt.chair },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#F8FAFC" }}>
              <item.icon size={16} className="text-blue-500 shrink-0" />
              <div>
                <div className="text-xs text-slate-400">{item.label}</div>
                <div className="text-sm font-bold text-slate-800">{item.value}</div>
              </div>
            </div>
          ))}
          {appt.notes && (
            <div className="p-3 rounded-xl" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <div className="text-xs text-amber-600 font-bold mb-1">ملاحظات</div>
              <div className="text-sm text-amber-800">{appt.notes}</div>
            </div>
          )}
        </div>

        {/* Status Update */}
        <div className="px-5 pb-3">
          <div className="text-xs font-bold text-slate-400 mb-2">تحديث الحالة السريعة</div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_CYCLE.map(s => (
              <button key={s} onClick={() => updateStatus(s)} disabled={saving || appt.status === s}
                className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all border"
                style={{
                  background: appt.status === s ? statusConfig[s]?.bg : "white",
                  color: appt.status === s ? statusConfig[s]?.text : "#64748B",
                  border: appt.status === s ? `1px solid ${statusConfig[s]?.border}` : "1px solid #E2E8F0",
                  opacity: saving ? 0.7 : 1,
                }}>
                {s}
              </button>
            ))}
            <button onClick={() => updateStatus("ملغي")} disabled={saving}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border"
              style={{ background: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA" }}>
              ملغي
            </button>
            <button onClick={() => updateStatus("لم يحضر")} disabled={saving}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border"
              style={{ background: "#FEF3C7", color: "#D97706", border: "1px solid #FCD34D" }}>
              لم يحضر
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 flex gap-2" style={{ borderTop: "1px solid #F1F5F9" }}>
          <button onClick={() => { onReschedule(appt); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold border hover:bg-blue-50 transition-all"
            style={{ borderColor: "#BFDBFE", color: "#1D5FBF" }}>
            <RefreshCw size={12} /> إعادة جدولة
          </button>
          <button onClick={() => openWhatsApp(appt.patientPhone, `مرحباً ${appt.patient}، نذكّرك بموعدك يوم ${appt.scheduled_at ? format(parseISO(appt.scheduled_at), "dd/MM/yyyy", { locale: arSA }) : ""} الساعة ${appt.time}.`)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold border hover:bg-green-50 transition-all"
            style={{ borderColor: "#86EFAC", color: "#16A34A" }}>
            <MessageSquare size={12} /> واتساب
          </button>
          <button onClick={deleteAppt} disabled={saving}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-red-50 border border-transparent hover:border-red-200 transition-all">
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Booking Drawer ─────────────────────────────────────── */
interface BookingDrawerProps {
  onClose: () => void;
  clinicId: string;
  patients: Patient[];
  doctors: string[];
  weekStart: Date;
  calendarSelectedDate: Date;
  prefill: BookingPrefill | null;
  onClearPrefill: () => void;
  onSaved: () => void;
}

function BookingDrawer({
  onClose, clinicId, patients, doctors,
  weekStart, calendarSelectedDate, prefill, onClearPrefill, onSaved,
}: BookingDrawerProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(calendarSelectedDate);
  const [manualDate, setManualDate] = useState(format(calendarSelectedDate, "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [treatmentType, setTreatmentType] = useState("حشو");
  const [duration, setDuration] = useState(60);
  const [chair, setChair] = useState("كرسي 1");
  const [notes, setNotes] = useState("");
  const [whatsappReminder, setWhatsappReminder] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(startOfDay(weekStart), i)),
    [weekStart]
  );

  useEffect(() => {
    const offset = Math.min(6, Math.max(0, differenceInCalendarDays(startOfDay(calendarSelectedDate), startOfDay(weekStart))));
    setSelectedDate(calendarSelectedDate);
    if (!prefill?.date) setManualDate(format(calendarSelectedDate, "yyyy-MM-dd"));
  }, [calendarSelectedDate, weekStart, prefill]);

  useEffect(() => {
    if (doctors.length && !selectedDoctor && !prefill?.doctorName) {
      setSelectedDoctor(doctors[0]!);
    }
  }, [doctors, selectedDoctor, prefill?.doctorName]);

  useEffect(() => {
    if (!prefill) {
      setEditingId(null); setStep(1); setSelectedPatient(null);
      setSelectedTime(""); setSelectedDoctor(doctors[0] || "");
      setTreatmentType("حشو"); setNotes(""); setDuration(60);
      return;
    }
    if (prefill.appointmentId) {
      setEditingId(prefill.appointmentId); setStep(2);
      if (prefill.patientId) { const p = patients.find(x => x.id === prefill.patientId); if (p) setSelectedPatient(p); }
      if (prefill.doctorName) setSelectedDoctor(prefill.doctorName);
      if (prefill.time) setSelectedTime(prefill.time);
      if (prefill.treatmentType) setTreatmentType(prefill.treatmentType);
      if (prefill.date) { setSelectedDate(prefill.date); setManualDate(format(prefill.date, "yyyy-MM-dd")); }
    }
  }, [prefill, patients, doctors]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim();
    if (!q) return patients;
    return patients.filter(p =>
      (p.first_name && p.first_name.includes(q)) ||
      (p.patient_code && p.patient_code.includes(q)) ||
      (p.phone && p.phone.includes(q))
    );
  }, [patients, patientSearch]);

  const summaryDateStr = format(selectedDate, "EEEE، dd/MM/yyyy", { locale: arSA });

  const handleDateChange = (dateStr: string) => {
    setManualDate(dateStr);
    try { setSelectedDate(startOfDay(parseISO(dateStr))); } catch {}
  };

  // Check occupied times for the selected doctor on selected date
  const handleConfirm = async () => {
    if (!selectedPatient) { alert("اختر المريض أولاً."); return; }
    if (!selectedDoctor) { alert("اختر الطبيب."); return; }
    if (!selectedTime) { alert("اختر وقت الموعد."); return; }
    if (!clinicId) { alert("خطأ: لم يتم العثور على معرّف العيادة. يرجى إعادة تسجيل الدخول."); return; }

    const [hh, mm] = selectedTime.split(":").map(Number);
    const scheduled = setMinutes(setHours(startOfDay(selectedDate), hh), mm);

    setSaving(true);
    const basePayload = {
      patient_id: selectedPatient.id,
      patient_name: selectedPatient.first_name,
      doctor_name: selectedDoctor,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: duration,
      treatment_type: treatmentType,
      status: "محجوز",
      chair,
      color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)],
      whatsapp_reminder: whatsappReminder,
      notes: notes.trim() || null,
    };

    try {
      // Check for conflicts
      const { data: conflicts, error: conflictErr } = await supabase
        .from("appointments")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("doctor_name", selectedDoctor)
        .eq("scheduled_at", scheduled.toISOString());

      if (conflictErr) throw conflictErr;

      const isConflict = editingId 
        ? conflicts && conflicts.some(c => c.id !== editingId)
        : conflicts && conflicts.length > 0;

      if (isConflict) {
        alert("عذراً، يوجد موعد محجوز مسبقاً لهذا الطبيب في نفس الوقت. يرجى اختيار وقت آخر.");
        setSaving(false);
        return;
      }

      if (editingId) {
        const { error } = await supabase.from("appointments").update(basePayload).eq("id", editingId).eq("clinic_id", clinicId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("appointments").insert({ clinic_id: clinicId, ...basePayload });
        if (error) throw error;
      }

      if (whatsappReminder) {
        const wa = selectedPatient.whatsapp_number || selectedPatient.phone;
        openWhatsApp(wa, `مرحباً ${selectedPatient.first_name}،\nنذكّرك بموعدك في عيادتنا 🦷\n📅 ${summaryDateStr}\n🕐 الساعة ${selectedTime}\n👨‍⚕️ ${selectedDoctor}\nيسعدنا خدمتك!`);
      }

      onSaved(); onClearPrefill(); onClose();
    } catch (e: any) {
      const msg = e?.message || e?.error_description || (typeof e === "string" ? e : "خطأ غير معروف");
      alert("تعذّر حفظ الموعد: " + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
      style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: -420, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        exit={{ x: -420, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="mr-auto w-full max-w-md h-full overflow-y-auto flex flex-col"
        style={{ background: "white", boxShadow: "-20px 0 60px rgba(15,37,71,0.15)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(30,58,111,0.08)" }}>
          <div>
            <h3 className="font-bold" style={{ color: "#0F172A" }}>
              {editingId ? "إعادة جدولة الموعد" : "حجز موعد جديد"}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${s <= step ? "w-8" : "w-4"}`}
                  style={{ background: s <= step ? "#1D5FBF" : "#E2E8F0" }} />
              ))}
              <span className="text-xs text-slate-400 mr-1">الخطوة {step} من 3</span>
            </div>
          </div>
          <button type="button" onClick={() => { onClearPrefill(); onClose(); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100">
            <X size={15} style={{ color: "#64748B" }} />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5" style={{ direction: "rtl" }}>
          {/* Step 1: Patient */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#1D5FBF" }}>1</div>
                <h4 className="font-bold text-slate-800">اختر المريض</h4>
              </div>
              <div className="flex items-center gap-2 px-3 h-10 rounded-xl" style={{ background: "#F0F5FC" }}>
                <Search size={14} style={{ color: "#64748B" }} />
                <input type="search" placeholder="بحث بالاسم أو الرمز أو الهاتف..."
                  value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                  className="flex-1 outline-none bg-transparent text-sm" style={{ fontFamily: "Cairo, sans-serif" }} />
              </div>
              <div className="max-h-72 overflow-y-auto space-y-2 pl-1">
                {filteredPatients.length === 0 ? (
                  <p className="text-sm text-center py-6 text-slate-400">لا نتائج. جرّب بحثاً آخر.</p>
                ) : (
                  filteredPatients.map(p => (
                    <button type="button" key={p.id}
                      onClick={() => { setSelectedPatient(p); setStep(2); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-blue-50 transition-all text-right"
                      style={{ border: "1px solid rgba(30,58,111,0.08)" }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                        {p.first_name?.[0] || "م"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold truncate text-slate-800">{p.first_name}</div>
                        <div className="text-xs text-slate-400">{p.patient_code} · {p.phone}</div>
                      </div>
                      <ChevronLeft size={14} className="text-slate-300" />
                    </button>
                  ))
                )}
              </div>
              <button type="button" onClick={() => setShowAddPatient(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-dashed text-sm font-semibold"
                style={{ border: "2px dashed #BFDBFE", color: "#1D5FBF" }}>
                <Plus size={14} /> إضافة مريض جديد
              </button>

              <AnimatePresence>
                {showAddPatient && (
                  <AddPatientModal
                    clinicId={clinicId}
                    onClose={() => setShowAddPatient(false)}
                    onCreated={() => {
                      onSaved(); // This will refresh the patients list in parent
                      setShowAddPatient(false);
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Step 2: Date, Time, Doctor */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#1D5FBF" }}>2</div>
                <h4 className="font-bold text-slate-800">التاريخ والوقت والطبيب</h4>
              </div>

              {/* Selected patient badge */}
              {selectedPatient && (
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                  <User size={14} className="text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">{selectedPatient.first_name}</span>
                  <button onClick={() => setStep(1)} className="mr-auto text-xs text-blue-400 hover:text-blue-600">تغيير</button>
                </div>
              )}

              {/* Date picker */}
              <div>
                <label className="text-xs font-bold mb-2 block text-gray-700">التاريخ</label>
                <input type="date" value={manualDate} onChange={e => handleDateChange(e.target.value)}
                  className="w-full px-3 h-10 rounded-xl text-sm outline-none border"
                  style={{ background: "#F0F5FC", fontFamily: "Cairo, sans-serif" }} />
                <div className="grid grid-cols-7 gap-1 mt-2">
                  {weekDayLabels.map((day, i) => {
                    const d = weekDates[i]!;
                    const isSelected = isSameDay(d, selectedDate);
                    return (
                      <button type="button" key={day} onClick={() => { setSelectedDate(d); setManualDate(format(d, "yyyy-MM-dd")); }}
                        className="p-1.5 rounded-xl text-center transition-all"
                        style={{ background: isSelected ? "linear-gradient(135deg, #1D5FBF, #06B6D4)" : isToday(d) ? "#EFF6FF" : "#F8FAFC", color: isSelected ? "white" : isToday(d) ? "#1D5FBF" : "#0F172A" }}>
                        <div className="text-[9px] leading-tight">{day.slice(0, 3)}</div>
                        <div className="font-bold text-xs">{format(d, "d")}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time grid */}
              <div>
                <label className="text-xs font-bold mb-2 block text-gray-700">الوقت</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {WORK_HOURS.map(h => (
                    <button type="button" key={h} onClick={() => setSelectedTime(h)}
                      className="py-2 rounded-xl text-xs font-bold transition-all"
                      style={{
                        background: selectedTime === h ? "#1D5FBF" : "#F0F5FC",
                        color: selectedTime === h ? "white" : "#64748B",
                      }}>
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-bold mb-2 block text-gray-700">مدة الموعد</label>
                <div className="flex gap-2 flex-wrap">
                  {DURATIONS.map(d => (
                    <button type="button" key={d.value} onClick={() => setDuration(d.value)}
                      className="px-3 h-8 rounded-xl text-xs font-bold transition-all"
                      style={{ background: duration === d.value ? "#EFF6FF" : "#F0F5FC", color: duration === d.value ? "#1D5FBF" : "#64748B", border: duration === d.value ? "1.5px solid #BFDBFE" : "1.5px solid transparent" }}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor */}
              <div>
                <label className="text-xs font-bold mb-2 block text-gray-700">الطبيب</label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {doctors.map(doc => (
                    <button type="button" key={doc} onClick={() => setSelectedDoctor(doc)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all text-right"
                      style={{ border: selectedDoctor === doc ? "1.5px solid #1D5FBF" : "1px solid rgba(30,58,111,0.1)", background: selectedDoctor === doc ? "#EFF6FF" : "white" }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                        {doc.replace(/^د\.\s*/, "").charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate text-slate-800">{doc}</div>
                      </div>
                      {selectedDoctor === doc && <CheckCircle size={14} style={{ color: "#1D5FBF" }} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chair */}
              <div>
                <label className="text-xs font-bold mb-2 block text-gray-700">الكرسي</label>
                <div className="flex gap-2">
                  {["كرسي 1", "كرسي 2", "كرسي 3", "كرسي 4"].map(c => (
                    <button type="button" key={c} onClick={() => setChair(c)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: chair === c ? "#EFF6FF" : "#F0F5FC", color: chair === c ? "#1D5FBF" : "#64748B", border: chair === c ? "1.5px solid #BFDBFE" : "1.5px solid transparent" }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={() => setStep(3)} disabled={!selectedPatient || !selectedTime}
                className="w-full h-11 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                التالي ←
              </button>
            </motion.div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#1D5FBF" }}>3</div>
                <h4 className="font-bold text-slate-800">تأكيد الموعد</h4>
              </div>

              {/* Summary card */}
              <div className="rounded-2xl p-4 space-y-3" style={{ background: "linear-gradient(135deg, #EFF6FF, #F0F9FF)", border: "1px solid #BFDBFE" }}>
                <div className="text-xs font-bold text-blue-600 mb-2">ملخص الموعد</div>
                {[
                  { label: "المريض", value: selectedPatient?.first_name || "—", icon: "👤" },
                  { label: "التاريخ", value: summaryDateStr, icon: "📅" },
                  { label: "الوقت", value: selectedTime || "—", icon: "🕐" },
                  { label: "الطبيب", value: selectedDoctor || "—", icon: "👨‍⚕️" },
                  { label: "نوع العلاج", value: treatmentType, icon: "🦷" },
                  { label: "المدة", value: `${duration} دقيقة`, icon: "⏱️" },
                  { label: "الكرسي", value: chair, icon: "🪑" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{item.icon} {item.label}</span>
                    <span className="font-bold text-slate-800">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Treatment type */}
              <div>
                <label className="text-xs font-bold mb-2 block text-gray-700">نوع العلاج</label>
                <select value={treatmentType} onChange={e => setTreatmentType(e.target.value)}
                  className="w-full px-3 h-10 rounded-xl text-sm outline-none border"
                  style={{ background: "#F0F5FC", fontFamily: "Cairo, sans-serif" }}>
                  {TREATMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold mb-2 block text-gray-700">ملاحظات (اختياري)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  placeholder="أي معلومات إضافية عن الموعد..."
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none border resize-none"
                  style={{ background: "#F0F5FC", fontFamily: "Cairo, sans-serif" }} />
              </div>

              {/* WhatsApp toggle */}
              <button type="button" onClick={() => setWhatsappReminder(v => !v)}
                className="w-full flex items-center justify-between p-4 rounded-2xl transition-all"
                style={{ background: whatsappReminder ? "#F0FFF4" : "#F8FAFC", border: `1.5px solid ${whatsappReminder ? "#86EFAC" : "#E2E8F0"}` }}>
                <div className="flex items-center gap-2">
                  <Bell size={16} style={{ color: whatsappReminder ? "#16A34A" : "#94A3B8" }} />
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: whatsappReminder ? "#16A34A" : "#64748B" }}>
                      إرسال تذكير واتساب
                    </div>
                    <div className="text-xs" style={{ color: whatsappReminder ? "#4ADE80" : "#94A3B8" }}>
                      {whatsappReminder ? "سيُفتح واتساب بعد الحفظ" : "لن يُرسَل أي تذكير"}
                    </div>
                  </div>
                </div>
                <div className="w-11 h-6 rounded-full relative transition-all shrink-0"
                  style={{ background: whatsappReminder ? "#16A34A" : "#CBD5E1" }}>
                  <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                    style={{ left: whatsappReminder ? "1.375rem" : "0.125rem" }} />
                </div>
              </button>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setStep(2)}
                  className="flex-1 h-11 rounded-xl text-sm font-bold border"
                  style={{ borderColor: "rgba(30,58,111,0.15)", color: "#64748B" }}>
                  رجوع
                </button>
                <motion.button type="button" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={handleConfirm} disabled={saving}
                  className="flex-[2] h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)", opacity: saving ? 0.85 : 1 }}>
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={16} />}
                  {editingId ? "حفظ التعديل" : "تأكيد الحجز"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Appointments Page ─────────────────────────────── */
export function AppointmentsPage() {
  const { clinicId, loading: authLoading, role } = useAuth();
  const [view, setView] = useState<"day" | "week">("day");
  const [showBooking, setShowBooking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AppointmentRow[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [listSearch, setListSearch] = useState("");
  const [bookingPrefill, setBookingPrefill] = useState<BookingPrefill | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<ApptDisplay | null>(null);
  const [statusFilter, setStatusFilter] = useState("الكل");

  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 6 }), [selectedDate]);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const phoneByPatientId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of patients) m.set(p.id, p.whatsapp_number || p.phone);
    return m;
  }, [patients]);

  const appointments = useMemo(() => rows.map(r => rowToDisplay(r, phoneByPatientId)), [rows, phoneByPatientId]);

  const appointmentsForSelectedDay = useMemo(() =>
    appointments.filter(a => {
      try { return a.scheduled_at && isSameDay(parseISO(a.scheduled_at), selectedDate); } catch { return false; }
    }), [appointments, selectedDate]);

  const fetchAll = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);

    // Fetch ±2 weeks around selected date
    const rangeStart = addDays(startOfDay(weekStart), -7);
    const rangeEnd = addDays(rangeStart, 21);

    const [apRes, patRes, docRes] = await Promise.all([
      supabase.from("appointments").select("*").eq("clinic_id", clinicId)
        .gte("scheduled_at", rangeStart.toISOString())
        .lt("scheduled_at", rangeEnd.toISOString())
        .order("scheduled_at", { ascending: true }),
      supabase.from("patients").select("*").eq("clinic_id", clinicId).order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name").eq("clinic_id", clinicId).eq("role", "doctor"),
    ]);

    if (apRes.error) console.error("Appointments fetch error:", apRes.error);
    else if (apRes.data) setRows(apRes.data as AppointmentRow[]);

    if (!patRes.error && patRes.data) setPatients(patRes.data as Patient[]);

    // Fixed: proper string method call
    const docNames = (docRes.data || []).map(d => {
      const name = d.full_name || "";
      return name.startsWith("د.") ? name : `د. ${name}`;
    });
    setDoctors(docNames.length > 0 ? docNames : ["د. سارة", "د. كريم", "د. أحمد"]);

    setLoading(false);
  }, [clinicId, weekStart]);

  useEffect(() => { if (!authLoading) fetchAll(); }, [authLoading, fetchAll]);

  const headerDateLabel = format(selectedDate, "EEEE، d MMMM yyyy", { locale: arSA });

  const cycleStatus = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row || !clinicId) return;
    const idx = STATUS_CYCLE.indexOf(row.status);
    const nextStatus = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    await supabase.from("appointments").update({ status: nextStatus }).eq("id", id).eq("clinic_id", clinicId);
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: nextStatus } : r));
  };

  const filteredTable = useMemo(() => {
    let list = appointmentsForSelectedDay;
    if (statusFilter !== "الكل") list = list.filter(a => a.status === statusFilter);
    const q = listSearch.trim();
    if (!q) return list;
    return list.filter(a =>
      a.patient.includes(q) || a.doctor.includes(q) || a.type.includes(q) || a.chair.includes(q)
    );
  }, [appointmentsForSelectedDay, listSearch, statusFilter]);

  const stats = useMemo(() => {
    const day = appointmentsForSelectedDay;
    return {
      total: day.length,
      waiting: day.filter(a => a.status === "محجوز" || a.status === "مؤكد" || a.status === "تم تسجيل الوصول").length,
      inProgress: day.filter(a => a.status === "تحت العلاج").length,
      done: day.filter(a => a.status === "مكتمل").length,
      cancelled: day.filter(a => a.status === "ملغي" || a.status === "لم يحضر").length,
    };
  }, [appointmentsForSelectedDay]);

  const openReschedule = (appt: ApptDisplay) => {
    let date = selectedDate;
    try { if (appt.scheduled_at) date = startOfDay(parseISO(appt.scheduled_at)); } catch {}
    setBookingPrefill({
      appointmentId: appt.id, patientId: appt.patientId || undefined,
      doctorName: appt.doctor, time: appt.time,
      treatmentType: appt.type !== "—" ? appt.type : undefined, date,
    });
    setShowBooking(true);
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-24" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10" style={{ color: "#1D5FBF" }} />
      </div>
    );
  }

  if (!clinicId) {
    return (
      <div className="p-8 text-center rounded-2xl bg-white border" style={{ direction: "rtl" }}>
        <AlertTriangle className="mx-auto mb-3 text-amber-500" />
        <p className="font-bold text-slate-800">لا يوجد معرّف عيادة مرتبط بحسابك.</p>
        <p className="text-sm text-slate-500 mt-1">تواصل مع مدير النظام لتفعيل عيادتك.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-black text-xl" style={{ color: "#0F172A" }}>إدارة المواعيد</h1>
          <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: "#64748B" }}>
            <Calendar size={13} />
            {headerDateLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(30,58,111,0.1)", background: "white" }}>
            {[{ id: "day" as const, label: "يومي" }, { id: "week" as const, label: "أسبوعي" }].map(v => (
              <button key={v.id} type="button" onClick={() => setView(v.id)}
                className="px-4 h-9 text-xs font-bold transition-all"
                style={{ background: view === v.id ? "#1D5FBF" : "transparent", color: view === v.id ? "white" : "#64748B" }}>
                {v.label}
              </button>
            ))}
          </div>
          {/* Nav */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setSelectedDate(d => addDays(d, view === "week" ? 7 : 1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100" style={{ background: "white" }}>
              <ChevronRight size={16} style={{ color: "#64748B" }} />
            </button>
            <button type="button" onClick={() => setSelectedDate(startOfDay(new Date()))}
              className="px-3 h-9 rounded-xl text-xs font-bold" style={{ background: "white", color: isToday(selectedDate) ? "#1D5FBF" : "#0F172A" }}>
              اليوم
            </button>
            <button type="button" onClick={() => setSelectedDate(d => addDays(d, view === "week" ? -7 : -1))}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100" style={{ background: "white" }}>
              <ChevronLeft size={16} style={{ color: "#64748B" }} />
            </button>
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button"
            onClick={() => { setBookingPrefill(null); setShowBooking(true); }}
            className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
            <Plus size={15} /> حجز موعد
          </motion.button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "إجمالي اليوم", value: stats.total, color: "#1D5FBF", bg: "#EFF6FF" },
          { label: "في الانتظار", value: stats.waiting, color: "#8B5CF6", bg: "#EDE9FE" },
          { label: "تحت العلاج", value: stats.inProgress, color: "#D97706", bg: "#FEF3C7" },
          { label: "مكتملة", value: stats.done, color: "#16A34A", bg: "#DCFCE7" },
          { label: "ملغاة/لم يحضر", value: stats.cancelled, color: "#DC2626", bg: "#FEE2E2" },
        ].map(s => (
          <motion.div key={s.label} whileHover={{ y: -2 }} className="rounded-2xl p-4 text-center cursor-pointer"
            style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 8px rgba(15,37,71,0.04)" }}>
            <div className="text-2xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: "#64748B" }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Calendar Grid ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 20px rgba(15,37,71,0.06)" }}>
        {/* Column headers */}
        <div className="flex" style={{ borderBottom: "1px solid rgba(30,58,111,0.08)" }}>
          <div className="w-16 shrink-0 p-3 text-xs text-slate-300 text-center font-bold"
            style={{ borderLeft: "1px solid rgba(30,58,111,0.06)" }}>وقت</div>
          {view === "day"
            ? doctors.map((doc, i) => (
                <div key={doc} className="flex-1 p-3 text-center"
                  style={{ borderLeft: i < doctors.length - 1 ? "1px solid rgba(30,58,111,0.06)" : "none" }}>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                      {doc.replace(/^د\.\s*/, "").charAt(0)}
                    </div>
                    <div className="text-right min-w-0">
                      <div className="text-xs font-bold truncate text-slate-800">{doc}</div>
                      <div className="text-xs text-slate-400">
                        {appointmentsForSelectedDay.filter(a => a.doctor === doc).length} مواعيد
                      </div>
                    </div>
                  </div>
                </div>
              ))
            : weekDayLabels.map((day, i) => {
                const d = weekDates[i]!;
                const isSelected = isSameDay(d, selectedDate);
                const dayCount = appointments.filter(a => { try { return isSameDay(parseISO(a.scheduled_at), d); } catch { return false; }}).length;
                return (
                  <button key={day} onClick={() => setSelectedDate(d)}
                    className="flex-1 p-2 text-center transition-all hover:bg-blue-50/30"
                    style={{ borderLeft: i > 0 ? "1px solid rgba(30,58,111,0.06)" : "none" }}>
                    <div className="text-xs font-bold" style={{ color: isSelected ? "#1D5FBF" : isToday(d) ? "#1D5FBF" : "#0F172A" }}>{day}</div>
                    <div className="text-lg font-black" style={{ color: isSelected ? "#1D5FBF" : "#64748B" }}>{format(d, "d")}</div>
                    {dayCount > 0 && (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mx-auto mt-0.5"
                        style={{ background: isSelected ? "#1D5FBF" : "#EFF6FF", color: isSelected ? "white" : "#1D5FBF" }}>
                        {dayCount}
                      </div>
                    )}
                  </button>
                );
              })
          }
        </div>

        {/* Time grid */}
        <div className="flex overflow-auto" style={{ maxHeight: "55vh" }}>
          <div className="w-16 shrink-0" style={{ borderLeft: "1px solid rgba(30,58,111,0.06)" }}>
            {CALENDAR_HOURS.map(h => (
              <div key={h} className="h-16 flex items-start justify-end px-2 pt-1"
                style={{ borderBottom: "1px solid rgba(30,58,111,0.04)" }}>
                <span className="text-xs" style={{ color: "#94A3B8" }}>{h}</span>
              </div>
            ))}
          </div>

          {view === "day"
            ? doctors.map((doc, di) => (
                <div key={doc} className="flex-1 relative"
                  style={{ borderLeft: di < doctors.length - 1 ? "1px solid rgba(30,58,111,0.06)" : "none" }}>
                  {CALENDAR_HOURS.map((h, hi) => (
                    <div key={h} className="h-16 hover:bg-blue-50/20 transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid rgba(30,58,111,0.04)" }}
                      onClick={() => {
                        setBookingPrefill({ date: selectedDate, doctorName: doc, time: h });
                        setShowBooking(true);
                      }}
                    />
                  ))}
                  {appointmentsForSelectedDay.filter(a => a.doctor === doc).map(appt => {
                    const [h, m] = appt.time.split(":").map(Number);
                    const topPx = ((h - 8) * 60 + m) / 60 * 64;
                    const heightPx = Math.max((appt.duration / 60) * 64, 32);
                    const sc = statusConfig[appt.status] || statusConfig["محجوز"];
                    return (
                      <motion.div key={appt.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.02, zIndex: 20 }}
                        onClick={e => { e.stopPropagation(); setSelectedAppt(appt); }}
                        className="absolute left-1 right-1 rounded-xl p-2 cursor-pointer overflow-hidden"
                        style={{ top: topPx, height: heightPx - 4, background: `${appt.color}18`, border: `1.5px solid ${appt.color}50`, borderRight: `3px solid ${appt.color}`, zIndex: 5 }}>
                        <div className="text-xs font-bold truncate" style={{ color: appt.color }}>{appt.patient}</div>
                        {heightPx > 40 && <div className="text-xs truncate text-slate-500">{appt.type}</div>}
                        {heightPx > 56 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-slate-400">{appt.time}</span>
                            <span className="px-1 py-0.5 rounded text-xs" style={{ background: sc.bg, color: sc.text }}>{appt.status}</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))
            : weekDayLabels.map((day, di) => {
                const dayDate = weekDates[di]!;
                const dayAppts = appointments.filter(a => { try { return isSameDay(parseISO(a.scheduled_at), dayDate); } catch { return false; }});
                const isSelected = isSameDay(dayDate, selectedDate);
                return (
                  <div key={day} className="flex-1 relative"
                    style={{ borderLeft: di > 0 ? "1px solid rgba(30,58,111,0.06)" : "none", background: isSelected ? "#FAFCFF" : "transparent" }}>
                    {CALENDAR_HOURS.map(h => (
                      <div key={h} className="h-16 hover:bg-blue-50/20 transition-colors cursor-pointer"
                        style={{ borderBottom: "1px solid rgba(30,58,111,0.04)" }}
                        onClick={() => { setSelectedDate(dayDate); setBookingPrefill({ date: dayDate, time: h }); setShowBooking(true); }}
                      />
                    ))}
                    {dayAppts.map(appt => {
                      const [h, m] = appt.time.split(":").map(Number);
                      const topPx = ((h - 8) * 60 + m) / 60 * 64;
                      const heightPx = Math.max((appt.duration / 60) * 64, 28);
                      return (
                        <motion.div key={appt.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                          onClick={e => { e.stopPropagation(); setSelectedDate(dayDate); setSelectedAppt(appt); }}
                          className="absolute left-0.5 right-0.5 rounded-lg p-1 cursor-pointer overflow-hidden"
                          style={{ top: topPx, height: heightPx - 2, background: `${appt.color}20`, borderRight: `2.5px solid ${appt.color}`, zIndex: 5 }}>
                          <div className="text-xs font-bold truncate" style={{ color: appt.color, fontSize: 10 }}>{appt.patient}</div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ── Appointments List ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 12px rgba(15,37,71,0.04)" }}>
        <div className="flex items-center justify-between px-5 py-4 flex-wrap gap-2"
          style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={16} className="text-blue-500" />
            مواعيد {format(selectedDate, "dd MMMM", { locale: arSA })}
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "#EFF6FF", color: "#1D5FBF" }}>
              {filteredTable.length}
            </span>
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter */}
            <div className="flex items-center gap-1 flex-wrap">
              {["الكل", "محجوز", "مؤكد", "تم تسجيل الوصول", "تحت العلاج", "مكتمل", "ملغي"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-2.5 h-7 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: statusFilter === s ? (statusConfig[s]?.bg || "#EFF6FF") : "transparent",
                    color: statusFilter === s ? (statusConfig[s]?.text || "#1D5FBF") : "#64748B",
                    border: statusFilter === s ? `1px solid ${statusConfig[s]?.border || "#BFDBFE"}` : "1px solid transparent",
                  }}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 px-3 h-8 rounded-xl min-w-[140px]" style={{ background: "#F0F5FC" }}>
              <Search size={13} style={{ color: "#64748B" }} />
              <input type="search" placeholder="بحث..." value={listSearch} onChange={e => setListSearch(e.target.value)}
                className="flex-1 outline-none bg-transparent text-xs min-w-0" style={{ fontFamily: "Cairo, sans-serif" }} />
              {listSearch && <button type="button" onClick={() => setListSearch("")}><X size={12} style={{ color: "#94A3B8" }} /></button>}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                {["المريض", "الوقت", "نوع العلاج", "الطبيب", "الكرسي", "الحالة", ""].map(h => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-bold" style={{ color: "#64748B" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTable.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Calendar size={40} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-sm font-semibold text-slate-400">لا مواعيد لهذا اليوم</p>
                    <button onClick={() => setShowBooking(true)}
                      className="mt-3 px-4 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                      حجز موعد الآن
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTable.map((appt, i) => {
                  const sc = statusConfig[appt.status] || statusConfig["محجوز"];
                  return (
                    <motion.tr key={appt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="group hover:bg-blue-50/40 transition-all cursor-pointer"
                      style={{ borderBottom: "1px solid rgba(30,58,111,0.04)" }}
                      onClick={() => setSelectedAppt(appt)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ background: appt.color }}>
                            {appt.patient?.[0] || "م"}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{appt.patient}</div>
                            {appt.notes && <div className="text-xs text-amber-600 truncate max-w-[120px]">{appt.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-bold text-slate-800">{appt.time}</div>
                        <div className="text-xs text-slate-400">{appt.duration} د</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{appt.type}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{appt.doctor}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{appt.chair}</td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold w-fit"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: sc.dot }} />
                          {appt.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={e => { e.stopPropagation(); openWhatsApp(appt.patientPhone, `مرحباً ${appt.patient}، نذكّرك بموعدك في العيادة.`); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-green-100" title="واتساب">
                            <MessageSquare size={12} style={{ color: "#16A34A" }} />
                          </button>
                          <button type="button" onClick={e => { e.stopPropagation(); openReschedule(appt); }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-100" title="إعادة جدولة">
                            <RefreshCw size={12} style={{ color: "#1D5FBF" }} />
                          </button>
                          <button type="button" onClick={e => { e.stopPropagation(); cycleStatus(appt.id); }}
                            className="px-2 py-0.5 rounded-lg text-xs font-bold" style={{ background: "#EFF6FF", color: "#1D5FBF" }}>
                            تحديث
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

      {/* ── Modals ── */}
      <AnimatePresence>
        {selectedAppt && (
          <ApptDetailModal
            appt={selectedAppt} clinicId={clinicId}
            onClose={() => setSelectedAppt(null)}
            onRefresh={fetchAll}
            onReschedule={openReschedule}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBooking && (
          <BookingDrawer
            onClose={() => { setShowBooking(false); setBookingPrefill(null); }}
            clinicId={clinicId} patients={patients} doctors={doctors}
            weekStart={weekStart} calendarSelectedDate={selectedDate}
            prefill={bookingPrefill} onClearPrefill={() => setBookingPrefill(null)}
            onSaved={fetchAll}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
