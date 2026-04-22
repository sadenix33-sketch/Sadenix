import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Save, RotateCcw, Loader2, X, CheckCircle, Trash2, FileText, Printer } from "lucide-react";
import { supabase } from "../../lib/supabase";

type CK = "healthy" | "cavity" | "filling" | "crown" | "extraction" | "root_canal" | "implant" | "bridge" | "fracture" | "missing";

const C: Record<CK, { label: string; color: string; bg: string; emoji: string; hint: string }> = {
  healthy: { label: "سليم", color: "#22C55E", bg: "#F0FDF4", emoji: "✓", hint: "لا يحتاج علاجاً" },
  cavity: { label: "تسوس", color: "#EF4444", bg: "#FEF2F2", emoji: "🔴", hint: "حشو مركب" },
  filling: { label: "حشو", color: "#3B82F6", bg: "#EFF6FF", emoji: "🔷", hint: "تجديد الحشو" },
  crown: { label: "تاج", color: "#F59E0B", bg: "#FFFBEB", emoji: "👑", hint: "تاج سيراميك" },
  extraction: { label: "خلع", color: "#6B7280", bg: "#F3F4F6", emoji: "✕", hint: "خلع + زراعة/جسر" },
  root_canal: { label: "علاج عصب", color: "#8B5CF6", bg: "#F5F3FF", emoji: "💜", hint: "علاج عصب + تاج" },
  implant: { label: "زرعة", color: "#06B6D4", bg: "#ECFEFF", emoji: "⊞", hint: "زراعة سن" },
  bridge: { label: "جسر", color: "#F97316", bg: "#FFF7ED", emoji: "⊟", hint: "جسر سني" },
  fracture: { label: "كسر", color: "#DC2626", bg: "#FEF2F2", emoji: "⚡", hint: "ترميم/تاج" },
  missing: { label: "مفقود", color: "#9CA3AF", bg: "#F9FAFB", emoji: "○", hint: "زراعة/طقم جزئي" },
};

const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const ALL = [...UPPER, ...LOWER];

interface TD { cond: CK; treatment: string; cost: string; }
type Chart = Record<number, TD>;

interface Props { clinicId: string; patientId: string; patientName?: string; canEdit: boolean; }

export function SmartOdontogram({ clinicId, patientId, patientName = "المريض", canEdit }: Props) {
  const [chart, setChart] = useState<Chart>({});
  const [selCond, setSelCond] = useState<CK | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("dental_chart")
      .select("tooth_number,condition,custom_treatment,custom_cost")
      .eq("patient_id", patientId);
    if (data) {
      const m: Chart = {};
      data.forEach((r: any) => {
        if (r.condition && r.condition !== "healthy") {
          m[r.tooth_number] = {
            cond: r.condition as CK,
            treatment: r.custom_treatment || C[r.condition as CK]?.hint || "",
            cost: r.custom_cost ? String(r.custom_cost) : "",
          };
        }
      });
      setChart(m);
    }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const applyToTooth = (n: number) => {
    if (!selCond || !canEdit) return;
    if (selCond === "healthy") {
      setChart(p => { const c = { ...p }; delete c[n]; return c; });
    } else {
      setChart(p => ({
        ...p, [n]: { cond: selCond, treatment: C[selCond].hint, cost: p[n]?.cost || "" }
      }));
    }
    setActive(n);
  };

  const updateField = (n: number, field: "treatment" | "cost", val: string) => {
    setChart(p => p[n] ? { ...p, [n]: { ...p[n], [field]: val } } : p);
  };

  const clearTooth = (n: number) => {
    setChart(p => { const c = { ...p }; delete c[n]; return c; });
    setActive(null);
  };

  const save = async () => {
    setSaving(true);
    const rows = ALL.filter(n => chart[n]).map(n => ({
      clinic_id: clinicId, patient_id: patientId, tooth_number: n,
      condition: chart[n].cond, surfaces: {},
      custom_treatment: chart[n].treatment || null,
      custom_cost: parseFloat(chart[n].cost) || 0,
      updated_at: new Date().toISOString(),
    }));
    if (rows.length) await supabase.from("dental_chart").upsert(rows, { onConflict: "patient_id,tooth_number" });
    const toDelete = ALL.filter(n => !chart[n]);
    if (toDelete.length) await supabase.from("dental_chart").delete().eq("patient_id", patientId).in("tooth_number", toDelete);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const affected = ALL.filter(n => chart[n]);
  const totalCost = affected.reduce((s, n) => s + (parseFloat(chart[n].cost) || 0), 0);
  const activeTooth = active ? chart[active] : null;
  const byC = (Object.keys(C) as CK[]).filter(k => k !== "healthy" && affected.some(n => chart[n].cond === k));

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={28} /></div>;

  return (
    <div style={{ direction: "rtl", fontFamily: "Cairo, sans-serif" }}>

      {/* ── Stats ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "stretch" }}>
        {[
          { v: affected.length, label: "أسنان مصابة", color: "#EF4444", bg: "#FEF2F2", border: "#FECACA" },
          { v: 32 - affected.length, label: "أسنان سليمة", color: "#16A34A", bg: "#F0FDF4", border: "#86EFAC" },
          { v: totalCost > 0 ? `${totalCost.toLocaleString()} د.أ` : "—", label: "إجمالي التكلفة", color: "#1D5FBF", bg: "#EFF6FF", border: "#BFDBFE" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 90, background: s.bg, borderRadius: 12, padding: "10px 14px", border: `1px solid ${s.border}` }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{s.label}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {canEdit && (
            <motion.button whileTap={{ scale: .97 }} onClick={save} disabled={saving}
              style={{ height: 38, padding: "0 14px", borderRadius: 10, background: "linear-gradient(135deg,#1D5FBF,#06B6D4)", color: "white", fontWeight: "bold", fontSize: 13, display: "flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer" }}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle size={13} /> : <Save size={13} />}
              {saved ? "تم!" : "حفظ"}
            </motion.button>
          )}
          <button onClick={() => setShowReport(r => !r)}
            style={{ height: 38, padding: "0 12px", borderRadius: 10, background: showReport ? "#1D5FBF" : "#EFF6FF", color: showReport ? "white" : "#1D5FBF", fontWeight: "bold", fontSize: 12, display: "flex", alignItems: "center", gap: 6, border: "1px solid #BFDBFE", cursor: "pointer" }}>
            <FileText size={13} /> تقرير المريض
          </button>
          <button onClick={() => { setChart({}); setActive(null); }} title="مسح الكل"
            style={{ height: 38, width: 38, borderRadius: 10, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <RotateCcw size={14} color="#64748B" />
          </button>
        </div>
      </div>

      {/* ── Patient Report Panel ── */}
      <AnimatePresence>
        {showReport && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ marginBottom: 14, background: "white", borderRadius: 16, border: "1px solid #BFDBFE", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#1D5FBF,#06B6D4)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "white", fontWeight: "bold", fontSize: 14 }}>📋 تقرير حالة الأسنان — {patientName}</span>
              <button onClick={() => window.print()} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "4px 10px", color: "white", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Printer size={12} /> طباعة
              </button>
            </div>
            {affected.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#22C55E", fontWeight: "bold" }}>✅ جميع الأسنان سليمة</div>
            ) : (
              <div style={{ padding: 12 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC" }}>
                      {["السن", "الحالة", "الإجراء العلاجي المطلوب", "التكلفة التقديرية"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "right", fontWeight: "bold", color: "#64748B", fontSize: 11, borderBottom: "1px solid #E2E8F0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {affected.map(n => {
                      const d = chart[n];
                      const cd = C[d.cond];
                      return (
                        <tr key={n} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "8px 12px", fontWeight: "bold", color: "#0F172A" }}>🦷 {n}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span style={{ padding: "2px 8px", borderRadius: 99, background: cd.bg, color: cd.color, fontWeight: "bold", fontSize: 11 }}>{cd.emoji} {cd.label}</span>
                          </td>
                          <td style={{ padding: "8px 12px", color: "#374151" }}>{d.treatment || "—"}</td>
                          <td style={{ padding: "8px 12px", fontWeight: "bold", color: d.cost ? "#1D5FBF" : "#94A3B8" }}>
                            {d.cost ? `${parseFloat(d.cost).toLocaleString()} د.أ` : "غير محدد"}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: "#F0FDF4" }}>
                      <td colSpan={3} style={{ padding: "10px 12px", fontWeight: "bold", color: "#16A34A" }}>💰 الإجمالي التقديري</td>
                      <td style={{ padding: "10px 12px", fontWeight: 900, color: "#1D5FBF", fontSize: 15 }}>{totalCost > 0 ? `${totalCost.toLocaleString()} د.أ` : "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Condition Palette ── */}
      {canEdit && (
        <div style={{ background: "white", borderRadius: 14, padding: "10px 14px", border: "1px solid rgba(30,58,111,0.08)", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: "bold", color: "#94A3B8", marginBottom: 8 }}>① اختر الحالة ← ② انقر على السن لتطبيقها</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {(Object.entries(C) as [CK, typeof C[CK]][]).map(([k, v]) => (
              <button key={k} onClick={() => setSelCond(selCond === k ? null : k)}
                style={{
                  padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: "bold", cursor: "pointer", transition: "all .15s",
                  background: selCond === k ? v.color : v.bg, color: selCond === k ? "white" : v.color,
                  border: `1.5px solid ${selCond === k ? v.color : v.color + "55"}`,
                  boxShadow: selCond === k ? `0 4px 12px ${v.color}44` : "none",
                  transform: selCond === k ? "scale(1.06)" : "scale(1)",
                }}>
                {v.emoji} {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Odontogram Grid ── */}
      <div style={{ background: "white", borderRadius: 16, padding: "14px 10px", border: "1px solid rgba(30,58,111,0.08)" }}>
        <div style={{ textAlign: "center", fontSize: 10, color: "#94A3B8", fontWeight: "bold", marginBottom: 8 }}>↑ الفك العلوي (Upper Jaw)</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 3, flexWrap: "wrap", marginBottom: 6 }}>
          {UPPER.map(n => <Tooth key={n} n={n} data={chart[n]} isActive={active === n} selCond={selCond} canEdit={canEdit} onClick={applyToTooth} onSelect={setActive} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", margin: "6px 0" }}>
          <div style={{ flex: 1, height: 2, background: "linear-gradient(to left, transparent, #E2E8F0)" }} />
          <span style={{ padding: "0 12px", fontSize: 10, color: "#CBD5E1", fontWeight: "bold", whiteSpace: "nowrap" }}>◆ خط الوسط ◆</span>
          <div style={{ flex: 1, height: 2, background: "linear-gradient(to right, transparent, #E2E8F0)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 3, flexWrap: "wrap", marginTop: 6 }}>
          {LOWER.map(n => <Tooth key={n} n={n} data={chart[n]} isActive={active === n} selCond={selCond} canEdit={canEdit} onClick={applyToTooth} onSelect={setActive} />)}
        </div>
        <div style={{ textAlign: "center", fontSize: 10, color: "#94A3B8", fontWeight: "bold", marginTop: 8 }}>↓ الفك السفلي (Lower Jaw)</div>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {(Object.entries(C) as [CK, any][]).filter(([k]) => k !== "healthy").map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: v.color }} />
            <span style={{ fontSize: 10, color: "#64748B" }}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* ── Active Tooth Panel (editable) ── */}
      <AnimatePresence>
        {active !== null && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ marginTop: 14, background: "white", borderRadius: 16, border: "1px solid #BFDBFE", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#EFF6FF,#F0F9FF)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #DBEAFE" }}>
              <div style={{ fontWeight: "bold", color: "#1D5FBF", display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                🦷 السن رقم {active}
                {activeTooth && (
                  <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 99, background: C[activeTooth.cond].color + "22", color: C[activeTooth.cond].color, border: `1px solid ${C[activeTooth.cond].color}44` }}>
                    {C[activeTooth.cond].emoji} {C[activeTooth.cond].label}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {canEdit && activeTooth && (
                  <button onClick={() => clearTooth(active)}
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8, background: "#FEF2F2", color: "#EF4444", border: "1px solid #FECACA", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <Trash2 size={12} /> مسح
                  </button>
                )}
                <button onClick={() => setActive(null)} style={{ background: "transparent", border: "none", cursor: "pointer" }}>
                  <X size={16} color="#94A3B8" />
                </button>
              </div>
            </div>

            <div style={{ padding: 16 }}>
              {activeTooth ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: C[activeTooth.cond].bg, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C[activeTooth.cond].color}33`, fontSize: 13, color: "#374151" }}>
                    💡 الاقتراح الافتراضي: <strong>{C[activeTooth.cond].hint}</strong>
                  </div>

                  {/* Editable Treatment */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: "bold", color: "#374151", display: "block", marginBottom: 6 }}>
                      📝 الإجراء العلاجي المطلوب <span style={{ color: "#94A3B8", fontWeight: "normal" }}>(يمكنك تعديله)</span>
                    </label>
                    <input
                      type="text"
                      value={activeTooth.treatment}
                      onChange={e => canEdit && updateField(active, "treatment", e.target.value)}
                      readOnly={!canEdit}
                      placeholder="اكتب الإجراء العلاجي..."
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: "Cairo, sans-serif", background: canEdit ? "white" : "#F8FAFC", boxSizing: "border-box" }}
                    />
                  </div>

                  {/* Editable Cost */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: "bold", color: "#374151", display: "block", marginBottom: 6 }}>
                      💰 التكلفة التقديرية (بالدينار الأردني)
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="number"
                        min="0"
                        value={activeTooth.cost}
                        onChange={e => canEdit && updateField(active, "cost", e.target.value)}
                        readOnly={!canEdit}
                        placeholder="0"
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontSize: 14, fontWeight: "bold", fontFamily: "Cairo, sans-serif", background: canEdit ? "white" : "#F8FAFC" }}
                      />
                      <span style={{ fontSize: 13, color: "#64748B", fontWeight: "bold" }}>د.أ</span>
                      {activeTooth.cost && parseFloat(activeTooth.cost) > 0 && (
                        <div style={{ padding: "8px 14px", borderRadius: 10, background: "#EFF6FF", color: "#1D5FBF", fontWeight: 900, fontSize: 14, border: "1px solid #BFDBFE" }}>
                          {parseFloat(activeTooth.cost).toLocaleString()} د.أ
                        </div>
                      )}
                    </div>
                  </div>

                  {canEdit && (
                    <div style={{ fontSize: 11, color: "#94A3B8", background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}>
                      💾 لا تنسَ الضغط على "حفظ" بعد الانتهاء من تعديل جميع الأسنان
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0", color: "#22C55E" }}>
                  <CheckCircle size={32} style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: "bold" }}>السن سليم ✓</div>
                  {canEdit && <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>اختر حالة من اللوحة أعلاه لتطبيقها على هذا السن</div>}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Tooth Card ── */
function Tooth({ n, data, isActive, selCond, canEdit, onClick, onSelect }: {
  n: number; data: { cond: CK; treatment: string; cost: string } | undefined;
  isActive: boolean; selCond: CK | null; canEdit: boolean;
  onClick: (n: number) => void; onSelect: (n: number) => void;
}) {
  const cd = data ? C[data.cond] : null;
  const isMolar = (n % 10) >= 6;
  const w = isMolar ? 42 : 38;
  const h = isMolar ? 46 : 42;

  return (
    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: .93 }}
      onClick={() => { if (selCond && canEdit) onClick(n); else onSelect(n); }}
      title={`السن ${n}${data ? ` — ${C[data.cond].label}` : " — سليم"}`}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, cursor: selCond && canEdit ? "crosshair" : "pointer" }}>
      <div style={{
        width: w, height: h, borderRadius: isMolar ? 10 : 8,
        background: cd ? `${cd.color}20` : isActive ? "#EFF6FF" : "white",
        border: isActive ? `2px solid #1D5FBF` : `1.5px solid ${cd ? cd.color + "99" : "#E2E8F0"}`,
        boxShadow: isActive ? "0 0 0 3px #BFDBFE55" : cd ? `0 2px 8px ${cd.color}22` : "0 1px 3px rgba(0,0,0,0.04)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", transition: "all .15s",
      }}>
        {data?.cond === "extraction" || data?.cond === "missing" ? (
          <span style={{ fontSize: 16, opacity: .7 }}>{C[data.cond].emoji}</span>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "8px 8px 8px", gridTemplateRows: "8px 8px 8px", gap: 1 }}>
            {[null, cd?.color ?? null, null, cd?.color ?? null, cd?.color ?? null, cd?.color ?? null, null, cd?.color ?? null, null].map((col, i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: col ? col + "bb" : "#E2E8F0" }} />
            ))}
          </div>
        )}
        {cd && (
          <div style={{ position: "absolute", top: -5, right: -5, width: 13, height: 13, borderRadius: "50%", background: cd.color, border: "2px solid white", fontSize: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
            {cd.emoji[0]}
          </div>
        )}
        {/* cost badge */}
        {data?.cost && parseFloat(data.cost) > 0 && (
          <div style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", background: "#1D5FBF", color: "white", fontSize: 7, fontWeight: "bold", borderRadius: 4, padding: "1px 3px", whiteSpace: "nowrap" }}>
            {parseFloat(data.cost)}د
          </div>
        )}
      </div>
      <span style={{ fontSize: 9, fontWeight: "bold", color: isActive ? "#1D5FBF" : cd ? cd.color : "#94A3B8", marginTop: data?.cost ? 10 : 0 }}>{n}</span>
    </motion.div>
  );
}
