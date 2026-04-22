import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Printer, X, FileText, Loader2 } from 'lucide-react';
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { format, parseISO } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface Prescription {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_name: string;
  doctor_name: string | null;
  prescription_code: string;
  visit_date: string;
  diagnosis: string | null;
  medications: { name: string; dosage: string; duration: string }[];
  notes: string | null;
  created_at: string;
}

interface Patient {
  id: string;
  first_name: string;
  patient_code: string;
}

const commonMedications = [
  "أموكسيسيلين 500mg",
  "إيبوبروفين 400mg",
  "باراسيتامول 500mg",
  "ميترونيدازول 500mg",
  "ديكلوفيناك 50mg",
  "أوميزيب 20mg",
];

function safeDate(isoString?: string) {
  if (!isoString) return "—";
  try {
    return format(parseISO(isoString), "d MMMM yyyy", { locale: arSA });
  } catch {
    return "—";
  }
}

export function PrescriptionsPage() {
  const { clinicId, loading: authLoading } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [newRx, setNewRx] = useState({
    patientId: "",
    doctorName: "",
    diagnosis: "",
    notes: "",
    medications: [{ name: "", dosage: "", duration: "" }],
  });

  const fetchPrescriptions = useCallback(async () => {
    if (!clinicId) {
      setPrescriptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("prescriptions")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rxList = (data || []) as Prescription[];
      const parsed = rxList.map((rx) => ({
        ...rx,
        medications: typeof rx.medications === "string" ? JSON.parse(rx.medications as any) : (rx.medications || []),
      }));
      setPrescriptions(parsed);
    } catch (e) {
      console.error("Error fetching prescriptions:", e);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  const fetchPatients = useCallback(async () => {
    if (!clinicId) return;
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, patient_code")
        .eq("clinic_id", clinicId)
        .order("first_name");

      if (error) throw error;
      setPatients((data || []) as Patient[]);
    } catch (e) {
      console.error("Error fetching patients:", e);
    }
  }, [clinicId]);

  useEffect(() => {
    if (!authLoading) {
      fetchPrescriptions();
      fetchPatients();
    }
  }, [authLoading, fetchPrescriptions, fetchPatients]);

  const handleCreatePrescription = async () => {
    if (!clinicId || !newRx.patientId) {
      alert("اختر المريض.");
      return;
    }

    const patient = patients.find((p) => p.id === newRx.patientId);
    if (!patient) return;

    setLoading(true);
    try {
      const code = `RX-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("prescriptions").insert({
        clinic_id: clinicId,
        patient_id: newRx.patientId,
        patient_name: patient.first_name,
        doctor_name: newRx.doctorName || null,
        prescription_code: code,
        visit_date: new Date().toISOString(),
        diagnosis: newRx.diagnosis || null,
        medications: newRx.medications.filter((m) => m.name),
        notes: newRx.notes || null,
      });

      if (error) throw error;
      setShowCreateModal(false);
      setNewRx({ patientId: "", doctorName: "", diagnosis: "", notes: "", medications: [{ name: "", dosage: "", duration: "" }] });
      fetchPrescriptions();
    } catch (e) {
      alert("حدث خطأ: " + (e instanceof Error ? e.message : ""));
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black" style={{ color: "#0F172A", fontSize: 20 }}>الوصفات الطبية</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
            {prescriptions.length} وصفة مسجلة
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white"
          style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 }}
        >
          <Plus size={16} />
          وصفة جديدة
        </motion.button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="py-16 text-center">
          <FileText size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="text-slate-500">لا توجد وصفات طبية.</p>
          <p className="text-sm text-slate-400">قم بإنشاء وصفة جديدة من زر "وصفة جديدة"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx, i) => (
            <motion.div
              key={rx.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3, boxShadow: "0 12px 40px rgba(0,0,0,0.1)" }}
              className="bg-white rounded-2xl p-5 cursor-pointer"
              style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #F1F5F9" }}
              onClick={() => setSelectedRx(rx)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div style={{ color: "#2563EB", fontSize: "0.78rem", fontWeight: 700 }}>{rx.prescription_code}</div>
                  <div style={{ color: "#1E293B", fontSize: "1rem", fontWeight: 700, marginTop: 2 }}>{rx.patient_name || "—"}</div>
                  <div style={{ color: "#94A3B8", fontSize: "0.78rem", marginTop: 2 }}>
                    {safeDate(rx.visit_date)} · {rx.doctor_name || "—"}
                  </div>
                </div>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EEF2FF" }}>
                  <Printer size={15} style={{ color: "#2563EB" }} />
                </button>
              </div>
              {rx.diagnosis && (
                <div className="mb-3 p-2 rounded-lg" style={{ background: "#EFF6FF" }}>
                  <span style={{ color: "#1D5FBF", fontSize: "0.75rem", fontWeight: 600 }}>التشخيص: </span>
                  <span style={{ color: "#64748B", fontSize: "0.78rem" }}>{rx.diagnosis}</span>
                </div>
              )}
              <div className="space-y-2.5">
                {rx.medications.map((med, j) => (
                  <div key={j} className="p-3 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                    <div style={{ color: "#1E293B", fontWeight: 600, fontSize: "0.85rem" }}>{med.name}</div>
                    <div style={{ color: "#64748B", fontSize: "0.78rem", marginTop: 2 }}>{med.dosage}</div>
                    {med.duration && <div style={{ color: "#94A3B8", fontSize: "0.72rem", marginTop: 1 }}>{med.duration}</div>}
                  </div>
                ))}
              </div>
              {rx.notes && (
                <div className="mt-3 p-3 rounded-xl" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                  <p style={{ color: "#92400E", fontSize: "0.78rem" }}>ملاحظة: {rx.notes}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl p-8 w-full max-w-lg" style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.2)" }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 style={{ color: "#0F172A", fontSize: "1.1rem", fontWeight: 700 }}>وصفة طبية جديدة</h2>
                  <button onClick={() => setShowCreateModal(false)}>
                    <X size={20} style={{ color: "#94A3B8" }} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>المريض *</label>
                    <select
                      value={newRx.patientId}
                      onChange={(e) => setNewRx({ ...newRx, patientId: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: "0.875rem", outline: "none" }}
                    >
                      <option value="">— اختر المريض —</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} ({p.patient_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>الطبيب</label>
                    <input
                      value={newRx.doctorName}
                      onChange={(e) => setNewRx({ ...newRx, doctorName: e.target.value })}
                      placeholder="اسم الطبيب"
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>التشخيص</label>
                    <input
                      value={newRx.diagnosis}
                      onChange={(e) => setNewRx({ ...newRx, diagnosis: e.target.value })}
                      placeholder="التشخيص أو الملاحظات"
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>الأدوية</label>
                    {newRx.medications.map((med, i) => (
                      <div key={i} className="mb-2">
                        <select
                          value={med.name}
                          onChange={(e) => {
                            const meds = [...newRx.medications];
                            meds[i].name = e.target.value;
                            setNewRx({ ...newRx, medications: meds });
                          }}
                          style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: "0.8rem", outline: "none", marginBottom: 4 }}
                        >
                          <option value="">— اختر الدواء —</option>
                          {commonMedications.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            placeholder="الجرعة"
                            value={med.dosage}
                            onChange={(e) => {
                              const meds = [...newRx.medications];
                              meds[i].dosage = e.target.value;
                              setNewRx({ ...newRx, medications: meds });
                            }}
                            style={{ padding: "8px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: "0.8rem", outline: "none" }}
                          />
                          <input
                            placeholder="المدة"
                            value={med.duration}
                            onChange={(e) => {
                              const meds = [...newRx.medications];
                              meds[i].duration = e.target.value;
                              setNewRx({ ...newRx, medications: meds });
                            }}
                            style={{ padding: "8px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: "0.8rem", outline: "none" }}
                          />
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setNewRx({ ...newRx, medications: [...newRx.medications, { name: "", dosage: "", duration: "" }] })}
                      className="text-xs text-blue-600 font-bold mt-1"
                    >
                      + إضافة دواء آخر
                    </button>
                  </div>
                  <div>
                    <label style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 600, display: "block", marginBottom: 6 }}>ملاحظات</label>
                    <textarea
                      value={newRx.notes}
                      onChange={(e) => setNewRx({ ...newRx, notes: e.target.value })}
                      placeholder="تعليمات إضافية..."
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: "0.875rem", outline: "none", minHeight: 70, resize: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    style={{ flex: 1, padding: "12px", border: "1px solid #E2E8F0", borderRadius: 12, color: "#64748B", fontSize: "0.875rem", background: "white", cursor: "pointer" }}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleCreatePrescription}
                    style={{ flex: 2, padding: "12px", background: "linear-gradient(135deg, #2563EB, #1D4ED8)", border: "none", borderRadius: 12, color: "white", fontSize: "0.875rem", cursor: "pointer", fontWeight: 600 }}
                  >
                    حفظ الوصفة
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRx && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setSelectedRx(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl p-8 w-full max-w-md" style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.2)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ color: "#0F172A", fontSize: "1.1rem", fontWeight: 700 }}>{selectedRx.prescription_code}</h2>
                  <button onClick={() => setSelectedRx(null)}>
                    <X size={20} style={{ color: "#94A3B8" }} />
                  </button>
                </div>
                <div style={{ color: "#1E293B", fontWeight: 700, fontSize: "1rem" }}>{selectedRx.patient_name}</div>
                <div style={{ color: "#94A3B8", fontSize: "0.78rem", marginTop: 4 }}>
                  {safeDate(selectedRx.visit_date)} · {selectedRx.doctor_name || "—"}
                </div>
                {selectedRx.diagnosis && (
                  <div className="mt-3 p-2 rounded-lg" style={{ background: "#EFF6FF" }}>
                    <span style={{ color: "#1D5FBF", fontSize: "0.75rem", fontWeight: 600 }}>التشخيص: </span>
                    <span style={{ color: "#64748B", fontSize: "0.78rem" }}>{selectedRx.diagnosis}</span>
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {selectedRx.medications.map((med, i) => (
                    <div key={i} className="p-3 rounded-xl" style={{ background: "#F8FAFC" }}>
                      <div style={{ color: "#1E293B", fontWeight: 600, fontSize: "0.85rem" }}>{med.name}</div>
                      <div style={{ color: "#64748B", fontSize: "0.78rem" }}>{med.dosage}</div>
                      {med.duration && <div style={{ color: "#94A3B8", fontSize: "0.72rem" }}>{med.duration}</div>}
                    </div>
                  ))}
                </div>
                {selectedRx.notes && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: "#FFFBEB" }}>
                    <p style={{ color: "#92400E", fontSize: "0.78rem" }}>{selectedRx.notes}</p>
                  </div>
                )}
                <button
                  onClick={() => setSelectedRx(null)}
                  className="w-full mt-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: "#EFF6FF", color: "#1D5FBF" }}
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
