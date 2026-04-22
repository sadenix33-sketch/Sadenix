import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, Phone, MessageSquare, Calendar, FileText,
  Plus, Edit2, Star, Shield, Clock, CheckCircle,
  AlertTriangle, Pill, Image as ImageIcon, StickyNote, CreditCard,
  Activity, User, Heart, ChevronLeft, Loader2, FilePlus, UserCheck, CheckSquare,
  Stethoscope, Syringe, ClipboardList, X, Trash2, Eye, Upload, Image
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Patient, calculateAge } from "./Patients";
import { useAuth } from "../context/AuthContext";
import { usePermissions, canEdit, canDelete, canManageBilling } from "../context/PermissionsContext";
import { format, parseISO } from "date-fns";
import { SmartOdontogram } from "../components/SmartOdontogram";
import { arSA } from "date-fns/locale";

const tabs = [
  { id: "overview", label: "نظرة عامة" },
  { id: "odontogram", label: "🦷 خريطة الأسنان" },
  { id: "medical", label: "التاريخ الطبي" },
  { id: "appointments", label: "المواعيد" },
  { id: "treatments", label: "العلاجات" },
  { id: "billing", label: "الفواتير" },
  { id: "files", label: "الأشعة والملفات" },
  { id: "notes", label: "الملاحظات" },
];

function NewMedicalRecordModal({ clinicId, patientId, onClose, onCreated }: any) {
  const { profile } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorName, setDoctorName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data } = await supabase.from('profiles').select('full_name').eq('clinic_id', clinicId).eq('role', 'doctor');
      if (data) setDoctors(data);
    };
    fetchDoctors();
  }, [clinicId]);

  const handleCreate = async () => {
    if (!diagnosis || !doctorName) {
      alert("التشخيص واسم الطبيب حقول مطلوبة.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('medical_records').insert({
      clinic_id: clinicId, patient_id: patientId, doctor_name: doctorName,
      diagnosis, prescription: prescription || null, notes: notes || null,
      created_by_name: profile?.full_name || 'System'
    });
    setSaving(false);
    if (error) alert("خطأ: " + error.message);
    else { onCreated(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} style={{ direction: 'rtl' }}>
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-slate-800">إضافة سجل طبي جديد</h3>
          <button onClick={onClose}><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">الطبيب المعالج *</label>
            <select value={doctorName} onChange={e => setDoctorName(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm outline-none">
              <option value="">— اختر الطبيب —</option>
              {doctors.map((doc, idx) => (
                <option key={idx} value={doc.full_name}>{doc.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">التشخيص الطبي *</label>
            <input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm" placeholder="التشخيص الشامل للحالة" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">الوصفة الطبية (الأدوية)</label>
            <textarea value={prescription} onChange={e => setPrescription(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm" placeholder="اكتب أسماء الأدوية والجرعات" rows={3} />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">ملاحظات إضافية</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm" />
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full h-10 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />} حفظ السجل
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTreatmentModal({ clinicId, patientId, onClose, onCreated }: any) {
  const { profile } = useAuth();
  const [treatmentName, setTreatmentName] = useState("");
  const [cost, setCost] = useState("0");
  const [status, setStatus] = useState("مخطط");
  const [toothNumber, setToothNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!treatmentName) {
      alert("اسم الإجراء العلاجي مطلوب."); return;
    }
    setSaving(true);
    const { error } = await supabase.from('treatments').insert({
      clinic_id: clinicId, patient_id: patientId, treatment_name: treatmentName,
      cost: Number(cost) || 0, status, tooth_number: toothNumber || null,
      created_by_name: profile?.full_name || 'System'
    });
    setSaving(false);
    if (error) alert("خطأ: " + error.message);
    else { onCreated(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} style={{ direction: 'rtl' }}>
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-slate-800">إضافة خطوة علاجية</h3>
          <button onClick={onClose}><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">الإجراء العلاجي *</label>
            <input value={treatmentName} onChange={e => setTreatmentName(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm" placeholder="مثال: حشو ليزر" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">رقم السن / المكان</label>
              <input value={toothNumber} onChange={e => setToothNumber(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm" placeholder="مثال: 14" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">التكلفة المتوقعة (JOD) *</label>
              <input type="number" min="0" value={cost} onChange={e => setCost(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">حالة العلاج</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm outline-none">
              <option value="مخطط">مخطط</option>
              <option value="قيد التنفيذ">قيد التنفيذ</option>
              <option value="مكتمل">مكتمل</option>
              <option value="ملغي">ملغي</option>
            </select>
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full h-10 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 mt-4">
            {saving && <Loader2 size={16} className="animate-spin" />} حفظ الإجراء
          </button>
        </div>
      </div>
    </div>
  );
}

function NewInvoiceModal({ clinicId, patient, onClose, onCreated }: any) {
  const { profile } = useAuth();
  const [total, setTotal] = useState("");
  const [dueDate, setDueDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const totalN = Number(total);
    if (!Number.isFinite(totalN) || totalN <= 0) {
      alert("أدخل مبلغاً صالحاً الفاتورة.");
      return;
    }
    setSaving(true);
    const code = `INV-${Date.now().toString(36).toUpperCase()}`;
    const issue = format(new Date(), "yyyy-MM-dd");

    try {
      const { error: invErr } = await supabase.from("invoices").insert({
        clinic_id: clinicId,
        patient_id: patient.id,
        patient_name: patient.first_name,
        invoice_code: code,
        issue_date: issue,
        due_date: dueDate,
        total_amount: totalN,
        paid_amount: 0,
        tax_rate: 0,
        tax_amount: 0,
        status: "غير مدفوعة",
        doctor_name: patient.doctor_name || null,
        notes: notes || null,
        created_by_name: profile?.full_name || 'System'
      });
      if (invErr) throw invErr;

      const { data: pData } = await supabase.from("patients").select("balance").eq("id", patient.id).single();
      const bal = pData?.balance ? Number(pData.balance) : 0;
      const newBal = Math.round((bal - totalN + Number.EPSILON) * 100) / 100;
      await supabase.from("patients").update({ balance: newBal }).eq("id", patient.id);

      onCreated();
      onClose();
    } catch (e: any) {
      alert("خطأ أثناء إنشاء الفاتورة: " + e.message);
    } finally {
      setSaving(false);
    }
  };
}

function FilePreviewModal({ file, onClose }: { file: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose} style={{ direction: 'rtl' }}>
      <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 left-0 text-white flex items-center gap-2">
          <X size={20} /> إغلاق
        </button>
        {file.file_type?.startsWith("image/") ? (
          <img src={file.file_url} alt={file.file_name} className="w-full max-h-[80vh] object-contain rounded-xl" />
        ) : (
          <div className="flex flex-col items-center justify-center bg-white rounded-xl p-20">
            <FileText size={80} className="text-slate-300 mb-4" />
            <div className="text-lg font-bold text-slate-700">{file.file_name}</div>
            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
              تحميل الملف
            </a>
          </div>
        )}
        <div className="mt-4 text-center text-white text-sm">
          <div className="font-bold">{file.file_name}</div>
          <div className="text-slate-300">{file.category} · {file.created_at ? new Date(file.created_at).toLocaleDateString('ar-JO') : ''}</div>
          {file.description && <div className="text-slate-400 mt-1">{file.description}</div>}
        </div>
      </div>
    </div>
  );
}

function AddFileModal({ clinicId, patientId, onClose, onCreated }: { clinicId: string; patientId: string; onClose: () => void; onCreated: () => void }) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [preview, setPreview] = useState<string>("");
  const [category, setCategory] = useState("أشعة سينية");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      if (f.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(f);
      } else {
        setPreview("");
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { alert("اختر ملفاً أولاً"); return; }
    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${clinicId}/${patientId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("patient-files").upload(path, selectedFile);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("patient-files").getPublicUrl(path);
      if (!urlData?.publicUrl) throw new Error("لم يتم العثور على رابط الملف");

      const { error: dbError } = await supabase.from("patient_files").insert({
        clinic_id: clinicId, patient_id: patientId,
        file_name: selectedFile.name, file_type: selectedFile.type, file_url: urlData.publicUrl,
        file_size: selectedFile.size, description: description || null, category
      });
      if (dbError) throw dbError;
      onCreated(); onClose();
    } catch (e: any) { alert("خطأ: " + e.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} style={{ direction: 'rtl' }}>
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-slate-800">رفع ملف للمريض</h3>
          <button onClick={onClose}><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="p-4 space-y-4">
          <label className="block">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 transition-colors">
              {preview ? (
                <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-lg" />
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-slate-300 mb-2" />
                  <div className="text-sm text-slate-500">اضغط لاختيار صورة أو ملف</div>
                </>
              )}
              <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
            </div>
          </label>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">نوع الملف</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm">
              <option value="أشعة سينية">أشعة سينية</option>
              <option value="صور فوتوغرافية">صور فوتوغرافية</option>
              <option value="وثائق">وثائق</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">وصف (اختياري)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm" rows={2} placeholder="مثال: أشعة بانوراما للفك العلوي" />
          </div>
          <button onClick={handleUpload} disabled={uploading} className="w-full h-10 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            {uploading && <Loader2 size={16} className="animate-spin" />} {uploading ? "جاري الرفع..." : "رفع الملف"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddNoteModal({ clinicId, patientId, note, onClose, onCreated }: { clinicId: string; patientId: string; note?: any; onClose: () => void; onCreated: () => void }) {
  const [content, setContent] = useState(note?.content || "");
  const [noteType, setNoteType] = useState(note?.note_type || "عام");
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) { alert("اكتب الملاحظة أولاً"); return; }
    setSaving(true);
    try {
      if (note) {
        const { error } = await supabase.from("patient_notes").update({ content, note_type: noteType, is_pinned: isPinned, updated_at: new Date().toISOString() }).eq("id", note.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("patient_notes").insert({ clinic_id: clinicId, patient_id: patientId, content, note_type: noteType, is_pinned: isPinned });
        if (error) throw error;
      }
      onCreated(); onClose();
    } catch (e: any) { alert("خطأ: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} style={{ direction: 'rtl' }}>
      <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-slate-800">{note ? "تعديل الملاحظة" : "إضافة ملاحظة جديدة"}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-500" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">نوع الملاحظة</label>
            <select value={noteType} onChange={e => setNoteType(e.target.value)} className="w-full h-10 px-3 bg-slate-50 border rounded-xl text-sm">
              <option value="عام">عام</option>
              <option value="ملاحظة طبية">ملاحظة طبية</option>
              <option value="تعليق">تعليق</option>
              <option value="تذكير">تذكير</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 mb-1 block">نص الملاحظة *</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm" rows={4} placeholder="اكتب ملاحظاتك هنا..." />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="w-4 h-4 accent-amber-500" />
            <span className="text-sm text-slate-600">تثبيت الملاحظة</span>
          </label>
          <button onClick={handleSave} disabled={saving} className="w-full h-10 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
            {saving && <Loader2 size={16} className="animate-spin" />} {note ? "حفظ التعديلات" : "إضافة الملاحظة"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PatientProfilePage() {
  const { clinicId, profile, role, loading: authLoading } = useAuth();
  const { hasPermission } = usePermissions();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authReadyRef = useRef(false);

  // Tab Data States
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [patientFiles, setPatientFiles] = useState<any[]>([]);
  const [patientNotes, setPatientNotes] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Modals
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    if (!authLoading) {
      authReadyRef.current = true;
    }
  }, [authLoading]);

  const safeDate = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      return format(parseISO(isoString), "d MMMM yyyy", { locale: arSA });
    } catch {
      return "-";
    }
  };

  const getStatusColor = (status: string) => {
    if (["مكتمل", "مدفوعة"].includes(status)) return "bg-green-100 text-green-700 border-green-200";
    if (["مستحقة", "ملغي", "لم يحضر"].includes(status)) return "bg-red-100 text-red-700 border-red-200";
    if (["قيد التنفيذ", "مدفوعة جزئياً", "تم تسجيل الوصول", "تحت العلاج"].includes(status)) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const openWhatsApp = () => {
    if (!patient) return;
    const p = patient.whatsapp_number || patient.phone;
    if (p) {
      const cleaned = p.replace(/^0/, '962').replace(/\D/g, '');
      window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent('مرحباً ' + patient.first_name + '، معنا عيادة الرعاية الخاصة بك...')}`, '_blank');
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الملاحظة؟")) return;
    const { error } = await supabase.from("patient_notes").delete().eq("id", noteId);
    if (error) alert("خطأ: " + error.message);
    else fetchTabData();
  };

  const togglePinNote = async (note: any) => {
    const { error } = await supabase.from("patient_notes").update({ is_pinned: !note.is_pinned }).eq("id", note.id);
    if (error) alert("خطأ: " + error.message);
    else fetchTabData();
  };

  const handleDeletePatient = async () => {
    if (!patient) return;
    if (!confirm(`تحذير: هل أنت متأكد من حذف المريض "${patient.first_name}"؟ سيتم حذف جميع الفواتير والمواعيد والسجلات الطبية التابعة له نهائياً ولا يمكن استعادتها.`)) return;

    try {
      setLoading(true);
      const { error } = await supabase.from("patients").delete().eq("id", patient.id);
      if (error) throw error;
      navigate("/patients");
    } catch (err: any) {
      alert("تعذر حذف المريض: " + err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchPatient = async () => {
      if (!authReadyRef.current && authLoading) return;
      if (!id) { setLoading(false); return; }
      try {
        const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
        if (error) { setError(error.message); setPatient(null); }
        else if (data) {
          if (clinicId && data.clinic_id !== clinicId) { setError("لا تملك صلاحية الوصول لهذا المريض"); setPatient(null); }
          else { setPatient(data); setError(null); }
        } else { setPatient(null); setError("المريض غير موجود"); }
      } catch (err) { setError("حدث خطأ أثناء تحميل البيانات"); setPatient(null); }
      setLoading(false);
    };
    fetchPatient();
  }, [id, clinicId, authLoading]);

  const fetchTabData = async () => {
    if (!id || !clinicId) return;
    setTabLoading(true);
    if (activeTab === "medical") {
      setMedicalRecords([]);
      const { data } = await supabase.from('medical_records').select('*').eq('patient_id', id).order('visit_date', { ascending: false });
      if (data) setMedicalRecords(data);
    } else if (activeTab === "appointments") {
      setAppointments([]);
      const { data } = await supabase.from('appointments').select('*').eq('patient_id', id).order('scheduled_at', { ascending: false });
      if (data) setAppointments(data);
    } else if (activeTab === "treatments") {
      setTreatments([]);
      const { data } = await supabase.from('treatments').select('*').eq('patient_id', id).order('created_at', { ascending: false });
      if (data) setTreatments(data);
    } else if (activeTab === "billing") {
      setInvoices([]);
      setPayments([]);
      const { data: invData } = await supabase.from("invoices").select("*").eq("patient_id", id).order("issue_date", { ascending: false });
      if (invData) setInvoices(invData);
      const { data: payData } = await supabase.from("payments").select("*").eq("patient_id", id).order("created_at", { ascending: false });
      if (payData) setPayments(payData);
    } else if (activeTab === "files") {
      setPatientFiles([]);
      const { data } = await supabase.from("patient_files").select("*").eq("patient_id", id).order("created_at", { ascending: false });
      if (data) setPatientFiles(data);
    } else if (activeTab === "notes") {
      setPatientNotes([]);
      const { data } = await supabase.from("patient_notes").select("*").eq("patient_id", id).order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
      if (data) setPatientNotes(data);
    }
    setTabLoading(false);
  };

  useEffect(() => {
    if (activeTab !== "overview") fetchTabData();
  }, [activeTab, id, clinicId]);

  if (loading || authLoading) return (
    <div className="py-20 flex justify-center" style={{ direction: "rtl" }}>
      <Loader2 className="animate-spin text-blue-600" />
    </div>
  );

  if (!patient) return (
    <div className="py-20 text-center font-bold text-slate-700" style={{ direction: "rtl" }}>
      <div className="mb-4"><AlertTriangle size={48} className="mx-auto text-amber-500" /></div>
      <h3 className="text-lg mb-2">لم يتم العثور على المريض</h3>
      <p className="text-sm text-slate-500 mb-4">{error || "لا تملك صلاحية الوصول إليه أو تم حذفه"}</p>
      <button onClick={() => navigate("/patients")} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">العودة لقائمة المرضى</button>
    </div>
  );

  return (
    <div className="space-y-5 h-full" style={{ direction: "rtl" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => navigate("/patients")} className="font-semibold hover:underline text-blue-600">
          المرضى
        </button>
        <ChevronLeft size={13} className="text-gray-400" />
        <span className="text-gray-500">ملف المريض {patient.patient_code}</span>
      </div>

      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 relative overflow-hidden bg-white shadow-sm border border-gray-100">
        <div className="absolute inset-0 opacity-5" style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }} />

        <div className="flex items-start gap-5 relative z-10 w-full flex-wrap lg:flex-nowrap">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black shrink-0"
            style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
            {patient.first_name ? patient.first_name[0] : 'م'}
          </div>

          <div className="flex-1 min-w-[250px]">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="font-black text-2xl text-slate-900">{patient.first_name}</h2>
              {patient.tag && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  <Star size={10} /> {patient.tag}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">{patient.status}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 flex-wrap text-slate-500">
              <span className="text-sm flex items-center gap-1.5"><User size={13} /> {patient.patient_code} · {calculateAge(patient.date_of_birth) || '-'} سنة</span>
              <span className="text-sm flex items-center gap-1.5"><Phone size={13} /> {patient.phone}</span>
              <span className="text-sm flex items-center gap-1.5"><Calendar size={13} /> إضافة: {safeDate(patient.created_at)}</span>
            </div>
          </div>

          {canManageBilling(role) && (role === 'clinic_admin' || patient.doctor_name === profile?.full_name) && (
            <div className="rounded-2xl p-4 shrink-0 text-center bg-red-50 border border-red-100 min-w-[140px]">
              <div className="text-xs font-semibold mb-1 text-red-600">رصيد مستحق</div>
              <div className="text-2xl font-black text-red-600">{patient.balance} JOD</div>
              <button onClick={() => navigate('/billing')} className="mt-2 w-full py-1.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 transition-colors text-white">إلى الفواتير</button>
            </div>
          )}

          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => navigate('/appointments')}
              className="flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-90 transition-opacity">
              <Calendar size={13} /> حجز موعد
            </button>
            <button onClick={openWhatsApp} className="flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
              <MessageSquare size={13} /> إرسال واتساب
            </button>
            {canDelete(role) && (
              <button
                onClick={handleDeletePatient}
                className="flex items-center gap-2 px-4 h-9 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100">
                <Trash2 size={13} /> حذف المريض
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 h-9 rounded-xl text-sm font-bold whitespace-nowrap transition-all shrink-0 ${activeTab === tab.id ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm' : 'bg-white text-slate-500 border border-gray-100 hover:bg-gray-50'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.main key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserCheck size={16} className="text-blue-500" /> المعلومات الشخصية</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><div className="text-xs text-slate-400 mb-1.5">الاسم الكامل</div><div className="text-sm font-semibold text-slate-800">{patient.first_name}</div></div>
                    <div><div className="text-xs text-slate-400 mb-1.5">الرصيد</div>
                      <p className="text-sm font-bold mt-1" style={{ color: (role === 'clinic_admin' || (patient.doctor_name?.trim().toLowerCase() === profile?.full_name?.trim().toLowerCase())) ? (patient.balance < 0 ? "#DC2626" : patient.balance > 0 ? "#16A34A" : "#64748B") : "#94A3B8" }}>
                        {(role === 'clinic_admin' || (patient.doctor_name?.trim().toLowerCase() === profile?.full_name?.trim().toLowerCase())) ? `${patient.balance} JOD` : "المبلغ محجوب"}
                      </p>
                    </div>
                    <div><div className="text-xs text-slate-400 mb-1.5">الرقم المرجعي (ID)</div><div className="text-sm font-semibold text-slate-800">{patient.patient_code}</div></div>
                    <div><div className="text-xs text-slate-400 mb-1.5">الجنس</div><div className="text-sm font-semibold text-slate-800">{patient.gender || '-'}</div></div>
                    <div><div className="text-xs text-slate-400 mb-1.5">تاريخ الميلاد</div><div className="text-sm font-semibold text-slate-800">{patient.date_of_birth || '-'}</div></div>
                    <div><div className="text-xs text-slate-400 mb-1.5">رقم الهاتف (واتساب)</div><div className="text-sm font-semibold text-slate-800">{patient.phone}</div></div>
                    <div><div className="text-xs text-slate-400 mb-1.5">العنوان</div><div className="text-sm font-semibold text-slate-800">{patient.address || '-'}</div></div>
                  </div>
                </div>

                <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2"><Stethoscope size={16} className="text-blue-500" /> ملف طبي مصغر</h3>
                  </div>
                  <p className="text-sm text-slate-600 loading-relaxed">{patient.medical_notes || 'لا توجد ملاحظات طبية أولية مسجلة.'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm">
                  <h3 className="font-bold mb-4 text-slate-900 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> التنبيهات الطبية</h3>
                  <div className="space-y-3">
                    {patient.allergies ? (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                        <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                        <div><div className="text-xs font-bold text-red-700 mb-0.5">تنبيه حساسية</div><div className="text-sm text-red-900">{patient.allergies}</div></div>
                      </div>
                    ) : null}
                    {patient.chronic_diseases ? (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <Heart size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <div><div className="text-xs font-bold text-amber-700 mb-0.5">أمراض مزمنة</div><div className="text-sm text-amber-900">{patient.chronic_diseases}</div></div>
                      </div>
                    ) : (!patient.allergies && <div className="text-sm text-gray-500 text-center py-4">المريض لا يعاني من أي أمراض أو حساسيات مسجلة.</div>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "odontogram" && clinicId && (
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  🦷 خريطة الأسنان التفاعلية (Odontogram)
                </h3>
                <span className="text-xs text-slate-400 bg-blue-50 px-2 py-1 rounded-lg">ي</span>
              </div>
              <div className="p-4">
                <SmartOdontogram
                  clinicId={clinicId}
                  patientId={patient.id}
                  canEdit={canEdit(role)}
                />
              </div>
            </div>
          )}

          {activeTab === "medical" && (
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm min-h-[400px]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={16} className="text-blue-500" /> السجل الطبي للزيارات</h3>
                {canEdit(role) && (
                  <button onClick={() => setShowMedicalModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <Plus size={14} /> إضافة سجل طبي
                  </button>
                )}
              </div>
              {tabLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div> :
                medicalRecords.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center text-center">
                    <ClipboardList size={48} className="text-slate-200 mb-4" />
                    <div className="text-sm font-bold text-slate-500">لا يوجد سجل تاريخي طبي للزيارات</div>
                  </div>
                ) : (
                  <div className="p-5 space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {medicalRecords.map((record, index) => (
                      <div key={record.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-blue-50 text-blue-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          <Activity size={12} />
                        </div>
                        <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-blue-600">{safeDate(record.visit_date)}</span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">د. {record.doctor_name}</span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-800 mb-2">التشخيص: {record.diagnosis}</h4>
                          {record.prescription && (
                            <div className="flex items-start gap-2 mt-3 p-2 bg-blue-50/50 rounded-lg">
                              <Pill size={14} className="text-blue-500 mt-0.5 shrink-0" />
                              <p className="text-xs text-slate-700 leading-relaxed font-semibold">الوصفة: {record.prescription}</p>
                            </div>
                          )}
                          {record.notes && <p className="text-xs text-slate-500 mt-3 border-t border-slate-50 pt-2">{record.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {activeTab === "appointments" && (
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm min-h-[400px]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={16} className="text-blue-500" /> تاريخ المواعيد</h3>
                <button onClick={() => navigate('/appointments')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  <Calendar size={14} /> حجز موعد للمريض عبر التقويم
                </button>
              </div>
              {tabLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div> :
                appointments.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center text-center">
                    <Calendar size={48} className="text-slate-200 mb-4" />
                    <div className="text-sm font-bold text-slate-500">لا يوجد مواعيد سابقة للمريض</div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">التاريخ والوقت</th>
                          <th className="px-6 py-4">الطبيب المعالج</th>
                          <th className="px-6 py-4">نوع العلاج</th>
                          <th className="px-6 py-4">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {appointments.map((appt) => {
                          let time = "";
                          try { time = format(parseISO(appt.scheduled_at), "HH:mm"); } catch (e) { }
                          return (
                            <tr key={appt.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{safeDate(appt.scheduled_at)}</div>
                                <div className="text-xs text-slate-500 mt-1">{time}</div>
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-700">{appt.doctor_name || '-'}</td>
                              <td className="px-6 py-4">{appt.treatment_type || 'مراجعة'}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(appt.status)}`}>
                                  {appt.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          )}

          {activeTab === "treatments" && (
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm min-h-[400px]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Syringe size={16} className="text-blue-500" /> خطة العلاج</h3>
                {canEdit(role) && (
                  <button onClick={() => setShowTreatmentModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                    <Plus size={14} /> إضافة إجراء علاجي
                  </button>
                )}
              </div>
              {tabLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div> :
                treatments.length === 0 ? (
                  <div className="py-24 flex flex-col items-center justify-center text-center">
                    <CheckSquare size={48} className="text-slate-200 mb-4" />
                    <div className="text-sm font-bold text-slate-500">لا توجد خطة علاجية حالياً</div>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {treatments.map((tr) => (
                      <div key={tr.id} className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                            {tr.tooth_number || <Syringe size={18} />}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-800">{tr.treatment_name}</div>
                            <div className="text-xs text-slate-500 mt-1">{safeDate(tr.created_at)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm font-black text-slate-700">{tr.cost} JOD</div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border w-24 text-center ${getStatusColor(tr.status)}`}>
                            {tr.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {activeTab === "billing" && canManageBilling(role) && (
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm min-h-[400px]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard size={16} className="text-blue-500" /> فواتير {patient.first_name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => {
                    const w = window.open("", "_blank", "width=800,height=900");
                    if (!w) return alert("اسمح بالنوافذ المنبثقة");
                    const now = new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
                    w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8"/><title>كشف حساب - ${patient.first_name}</title>
<style>
  body{font-family:'Segoe UI',sans-serif;background:#fff;padding:40px;color:#0f172a}
  .header{display:flex;justify-content:space-between;border-bottom:2px solid #1D5FBF;padding-bottom:16px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;margin-bottom:24px;font-size:0.9rem}
  th,td{border:1px solid #e2e8f0;padding:10px;text-align:right}
  th{background:#f0f5fc;color:#1D5FBF;font-weight:bold}
  .totals{background:#f8fafc;padding:20px;border-radius:12px;display:flex;gap:40px;margin-bottom:30px}
  .tot-box .val{font-size:1.4rem;font-weight:900;color:#1D5FBF}
  @media print { @page { margin: 1.5cm; } button { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="color:#1D5FBF;margin:0 0 8px">كشف حساب مريض</h1>
      <div style="font-weight:bold;font-size:1.1rem">${patient.first_name}</div>
      <div style="color:#64748B;font-size:0.9rem">الهاتف: ${patient.phone || '-'} | الكود: ${patient.patient_code}</div>
    </div>
    <div style="text-align:left">
      <div style="font-weight:bold;margin-bottom:4px">عيادة Sadenix</div>
      <div style="color:#64748B;font-size:0.85rem">تاريخ الكشف:<br/>${now}</div>
    </div>
  </div>
  
  <div class="totals">
    <div class="tot-box">
      <div style="font-size:0.8rem;color:#64748B;font-weight:bold">الرصيد المعلق (للعيادة)</div>
      <div class="val" style="color:#DC2626">${Math.abs(Number(patient.balance || 0))} JOD</div>
    </div>
  </div>

  <h3 style="margin-bottom:12px">الفواتير المستحقة والمدفوعة</h3>
  <table>
    <tr><th>رقم الفاتورة</th><th>التاريخ</th><th>المبلغ الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>طبيب</th></tr>
    ${invoices.map((inv: any) => {
                      const tot = Number(inv.total_amount || 0);
                      const pd = Number(inv.paid_amount || 0);
                      const rem = Math.max(0, tot - pd);
                      return `<tr>
        <td>${inv.invoice_code}</td>
        <td>${inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("ar-EG") : '-'}</td>
        <td style="font-weight:bold">${tot} JOD</td>
        <td style="color:#16A34A">${pd} JOD</td>
        <td style="color:${rem > 0 ? '#DC2626' : '#16A34A'}">${rem} JOD</td>
        <td>${inv.doctor_name || '-'}</td>
      </tr>`;
                    }).join("")}
  </table>

  <button onclick="window.print()" style="background:#1D5FBF;color:white;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:bold">🖨️ طباعة كشف الحساب</button>
</body></html>`);
                    w.document.close();
                    setTimeout(() => w.focus(), 300);
                  }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border text-blue-600 hover:bg-blue-50 transition-colors">
                    طباعة كشف الحساب
                  </button>
                  <button onClick={() => navigate("/billing")} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border text-slate-600 hover:bg-slate-50 transition-colors">
                    الذهاب للفواتير العامة
                  </button>
                  {hasPermission('add_billing') && (
                    <button onClick={() => setShowInvoiceModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                      <FilePlus size={14} /> إضافة فاتورة
                    </button>
                  )}
                </div>
              </div>
              {tabLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
              ) : (
                <div className="space-y-6">
                  {/* Invoices Section */}
                  <div className="p-4 border-b bg-slate-50/30">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">قائمة الفواتير المضافة</h4>
                    {invoices.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm italic">لا توجد فواتير</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-right">
                          <thead className="text-slate-500 font-semibold border-b border-slate-100">
                            <tr>
                              <th className="px-4 py-2">رقم الفاتورة</th>
                              <th className="px-4 py-2">التاريخ والوقت</th>
                              <th className="px-4 py-2 text-left">المبلغ / المتبقي</th>
                              {(role === 'clinic_admin' || role === 'super_admin') && (
                                <th className="px-4 py-2">أضيفت بواسطة</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {invoices.map((inv) => {
                              const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0);
                              return (
                                <tr key={inv.id} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3">
                                    <div className="font-bold text-slate-800">{inv.invoice_code}</div>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(inv.status)}`}>{inv.status}</span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-500 text-xs">
                                    <div className="font-semibold text-slate-600">{safeDate(inv.issue_date)}</div>
                                    <div className="text-slate-400 mt-0.5">
                                      {inv.created_at ? (() => { try { return format(parseISO(inv.created_at), "HH:mm", { locale: arSA }); } catch { return ''; } })() : ''}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-left">
                                    <div className="font-black text-slate-800">{inv.total_amount} JOD</div>
                                    <div className="text-[10px] font-bold" style={{ color: remaining > 0 ? "#DC2626" : "#16A34A" }}>متبقي: {remaining} JOD</div>
                                  </td>
                                  {(role === 'clinic_admin' || role === 'super_admin') && (
                                    <td className="px-4 py-3">
                                      <div className="text-xs font-bold text-blue-700 flex items-center gap-1">
                                        <User size={10} className="text-blue-400" />
                                        {inv.created_by_name || 'System'}
                                      </div>
                                      <div className="text-[10px] text-slate-400">مُنشئ الفاتورة</div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Payments Section - detailed with time, who paid, who settled */}
                  <div className="p-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">سجل الدفعات والتحصيل</h4>
                    {payments.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm italic">لا توجد دفعات مسجلة</div>
                    ) : (
                      <div className="space-y-2">
                        {payments.map((pay) => (
                          <div key={pay.id} className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-200 bg-green-50/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle size={14} />
                              </div>
                              <div>
                                <div className="text-sm font-black text-slate-800">تحصيل مبلغ {pay.amount} JOD</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Clock size={10} /> {pay.created_at ? format(parseISO(pay.created_at), "d MMMM yyyy · HH:mm", { locale: arSA }) : '-'}
                                </div>
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-bold text-slate-700">المستلم: {pay.created_by_name || 'System'}</div>
                              <div className="text-[10px] text-slate-400">طريقة الدفع: {pay.method}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "files" && (
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm min-h-[400px]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><ImageIcon size={16} className="text-blue-500" /> الأشعة والملفات</h3>
                <button onClick={() => setShowFileModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  <Plus size={14} /> رفع ملف
                </button>
              </div>
              {tabLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
              ) : patientFiles.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                  <ImageIcon size={48} className="text-slate-200 mb-4" />
                  <div className="text-sm font-bold text-slate-500 mb-2">لا توجد ملفات مرفوعة</div>
                  <p className="text-xs text-slate-400 mb-4">قم برفع صور الأشعة أو صور فوتوغرافية للمريض</p>
                  <button onClick={() => setShowFileModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
                    رفع أول ملف
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                  {patientFiles.map((file) => (
                    <div key={file.id} onClick={() => setSelectedFile(file)} className="group cursor-pointer rounded-xl overflow-hidden border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                      <div className="aspect-square bg-slate-50 flex items-center justify-center relative">
                        {file.file_type?.startsWith("image/") ? (
                          <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover" />
                        ) : (
                          <FileText size={40} className="text-slate-300" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye size={24} className="text-white" />
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-bold text-slate-700 truncate">{file.file_name}</div>
                        <div className="text-xs text-slate-400">{file.category}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm min-h-[400px]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><StickyNote size={16} className="text-blue-500" /> الملاحظات</h3>
                <button onClick={() => { setEditingNote(null); setShowNoteModal(true); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  <Plus size={14} /> إضافة ملاحظة
                </button>
              </div>
              {tabLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
              ) : patientNotes.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center">
                  <StickyNote size={48} className="text-slate-200 mb-4" />
                  <div className="text-sm font-bold text-slate-500 mb-2">لا توجد ملاحظات</div>
                  <p className="text-xs text-slate-400 mb-4">قم بإضافة ملاحظات ومعلومات مهمة عن المريض</p>
                  <button onClick={() => { setEditingNote(null); setShowNoteModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
                    إضافة أول ملاحظة
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {patientNotes.map((note) => (
                    <div key={note.id} className={`group p-4 rounded-xl border ${note.is_pinned ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${note.note_type === 'ملاحظة طبية' ? 'bg-red-100 text-red-700' : note.note_type === 'تذكير' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                              {note.note_type}
                            </span>
                            {note.is_pinned && <Star size={12} className="text-amber-500 fill-amber-500" />}
                            <span className="text-xs text-slate-400">{safeDate(note.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => { setEditingNote(note); setShowNoteModal(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100">
                            <Edit2 size={12} className="text-slate-400" />
                          </button>
                          <button onClick={() => togglePinNote(note)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100">
                            <Star size={12} className={note.is_pinned ? "text-amber-500 fill-amber-500" : "text-slate-400"} />
                          </button>
                          <button onClick={() => deleteNote(note.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50">
                            <Trash2 size={12} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.main>
      </AnimatePresence>

      <AnimatePresence>
        {showMedicalModal && clinicId && id && (
          <NewMedicalRecordModal clinicId={clinicId} patientId={id} onClose={() => setShowMedicalModal(false)} onCreated={fetchTabData} />
        )}
        {showTreatmentModal && clinicId && id && (
          <NewTreatmentModal clinicId={clinicId} patientId={id} onClose={() => setShowTreatmentModal(false)} onCreated={fetchTabData} />
        )}
        {showInvoiceModal && clinicId && patient && (
          <NewInvoiceModal clinicId={clinicId} patient={patient} onClose={() => setShowInvoiceModal(false)} onCreated={fetchTabData} />
        )}
        {showFileModal && clinicId && id && (
          <AddFileModal clinicId={clinicId} patientId={id} onClose={() => setShowFileModal(false)} onCreated={fetchTabData} />
        )}
        {showNoteModal && clinicId && id && (
          <AddNoteModal clinicId={clinicId} patientId={id} note={editingNote} onClose={() => { setShowNoteModal(false); setEditingNote(null); }} onCreated={fetchTabData} />
        )}
        {selectedFile && (
          <FilePreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />
        )}
      </AnimatePresence>

    </div>
  );
}
