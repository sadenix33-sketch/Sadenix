import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X, FileText, Zap } from 'lucide-react';

type ToothCondition = 'healthy' | 'filled' | 'crown' | 'missing' | 'planned' | 'root-canal' | 'decayed';

interface Tooth {
  number: number;
  condition: ToothCondition;
  notes?: string;
}

const conditionConfig: Record<ToothCondition, { color: string; bg: string; label: string; border: string }> = {
  healthy: { color: '#10B981', bg: '#F0FDF4', label: 'سليم', border: '#A7F3D0' },
  filled: { color: '#2563EB', bg: '#EEF2FF', label: 'محشو', border: '#BFDBFE' },
  crown: { color: '#8B5CF6', bg: '#F5F3FF', label: 'تاج', border: '#DDD6FE' },
  missing: { color: '#64748B', bg: '#F1F5F9', label: 'مفقود', border: '#E2E8F0' },
  planned: { color: '#F59E0B', bg: '#FFFBEB', label: 'علاج مخطط', border: '#FDE68A' },
  'root-canal': { color: '#EF4444', bg: '#FEF2F2', label: 'علاج عصب', border: '#FECACA' },
  decayed: { color: '#DC2626', bg: '#FEE2E2', label: 'نخر', border: '#FCA5A5' },
};

const initialTeeth: Tooth[] = [
  // Upper right (18-11)
  { number: 18, condition: 'missing' },
  { number: 17, condition: 'filled', notes: 'حشو أملغم قديم' },
  { number: 16, condition: 'crown', notes: 'تاج خزفي - 2024' },
  { number: 15, condition: 'healthy' },
  { number: 14, condition: 'decayed', notes: 'نخر متوسط - يحتاج حشو' },
  { number: 13, condition: 'healthy' },
  { number: 12, condition: 'healthy' },
  { number: 11, condition: 'healthy' },
  // Upper left (21-28)
  { number: 21, condition: 'healthy' },
  { number: 22, condition: 'healthy' },
  { number: 23, condition: 'filled', notes: 'حشو مركب أمامي' },
  { number: 24, condition: 'healthy' },
  { number: 25, condition: 'planned', notes: 'مخطط لتركيب تاج' },
  { number: 26, condition: 'root-canal', notes: 'علاج عصب مكتمل 2025' },
  { number: 27, condition: 'filled', notes: 'حشو مركب' },
  { number: 28, condition: 'missing' },
  // Lower left (38-31)
  { number: 38, condition: 'missing' },
  { number: 37, condition: 'filled', notes: 'حشو أملغم' },
  { number: 36, condition: 'crown', notes: 'تاج معدني' },
  { number: 35, condition: 'healthy' },
  { number: 34, condition: 'healthy' },
  { number: 33, condition: 'healthy' },
  { number: 32, condition: 'healthy' },
  { number: 31, condition: 'healthy' },
  // Lower right (41-48)
  { number: 41, condition: 'healthy' },
  { number: 42, condition: 'healthy' },
  { number: 43, condition: 'healthy' },
  { number: 44, condition: 'decayed', notes: 'نخر سطحي' },
  { number: 45, condition: 'healthy' },
  { number: 46, condition: 'filled', notes: 'حشو مركب' },
  { number: 47, condition: 'root-canal', notes: 'علاج عصب جاري' },
  { number: 48, condition: 'missing' },
];

interface ToothComponentProps {
  tooth: Tooth;
  isSelected: boolean;
  onClick: () => void;
  isUpper: boolean;
}

function ToothSVG({ condition, isUpper, size = 36 }: { condition: ToothCondition; isUpper: boolean; size?: number }) {
  const config = conditionConfig[condition];
  return (
    <svg width={size} height={size + 8} viewBox="0 0 40 48">
      {/* Root */}
      {isUpper ? (
        <>
          <rect x="15" y="30" width="4" height="12" rx="2" fill={condition === 'missing' ? '#E2E8F0' : config.color} opacity={0.4} />
          <rect x="22" y="30" width="4" height="10" rx="2" fill={condition === 'missing' ? '#E2E8F0' : config.color} opacity={0.4} />
        </>
      ) : (
        <>
          <rect x="15" y="6" width="4" height="12" rx="2" fill={condition === 'missing' ? '#E2E8F0' : config.color} opacity={0.4} />
          <rect x="22" y="8" width="4" height="10" rx="2" fill={condition === 'missing' ? '#E2E8F0' : config.color} opacity={0.4} />
        </>
      )}
      {/* Crown */}
      <rect
        x="6"
        y={isUpper ? 6 : 20}
        width="28"
        height="20"
        rx="6"
        fill={condition === 'missing' ? '#F1F5F9' : config.bg}
        stroke={condition === 'missing' ? '#E2E8F0' : config.color}
        strokeWidth="1.5"
      />
      {/* Condition indicator */}
      {condition !== 'healthy' && condition !== 'missing' && (
        <circle
          cx="20"
          cy={isUpper ? 16 : 30}
          r="5"
          fill={config.color}
          opacity="0.8"
        />
      )}
      {condition === 'missing' && (
        <line x1="12" y1={isUpper ? 12 : 26} x2="28" y2={isUpper ? 20 : 34} stroke="#CBD5E1" strokeWidth="2" />
      )}
    </svg>
  );
}

export function Odontogram() {
  const [teeth, setTeeth] = useState<Tooth[]>(initialTeeth);
  const [selectedTooth, setSelectedTooth] = useState<Tooth | null>(null);
  const [editCondition, setEditCondition] = useState<ToothCondition>('healthy');
  const [editNote, setEditNote] = useState('');
  const [activeMode, setActiveMode] = useState<'view' | 'edit'>('view');
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null);

  const upperRight = teeth.filter(t => t.number >= 11 && t.number <= 18).sort((a, b) => b.number - a.number);
  const upperLeft = teeth.filter(t => t.number >= 21 && t.number <= 28);
  const lowerLeft = teeth.filter(t => t.number >= 31 && t.number <= 38).sort((a, b) => b.number - a.number);
  const lowerRight = teeth.filter(t => t.number >= 41 && t.number <= 48);

  const handleToothClick = (tooth: Tooth) => {
    setSelectedTooth(tooth);
    setEditCondition(tooth.condition);
    setEditNote(tooth.notes || '');
  };

  const handleSaveTooth = () => {
    if (!selectedTooth) return;
    setTeeth(prev => prev.map(t =>
      t.number === selectedTooth.number
        ? { ...t, condition: editCondition, notes: editNote }
        : t
    ));
    setSelectedTooth(null);
  };

  const stats = Object.entries(conditionConfig).map(([cond, config]) => ({
    condition: cond as ToothCondition,
    config,
    count: teeth.filter(t => t.condition === cond).length,
  })).filter(s => s.count > 0);

  const ToothButton = ({ tooth, isUpper }: { tooth: Tooth; isUpper: boolean }) => (
    <motion.div
      whileHover={{ y: isUpper ? -4 : 4, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setHoveredTooth(tooth.number)}
      onHoverEnd={() => setHoveredTooth(null)}
      onClick={() => handleToothClick(tooth)}
      className="relative cursor-pointer flex flex-col items-center"
      style={{ gap: 2 }}
    >
      <div style={{
        fontSize: '0.6rem', color: hoveredTooth === tooth.number ? '#2563EB' : '#94A3B8',
        fontWeight: 600, order: isUpper ? 2 : 0,
      }}>
        {tooth.number}
      </div>
      <div style={{ order: isUpper ? 0 : 1 }}>
        <ToothSVG condition={tooth.condition} isUpper={isUpper} />
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p style={{ color: '#94A3B8', fontSize: '0.82rem', marginTop: 4 }}>أحمد محمود الخالدي · #P001</p>
        </div>
        <div className="flex gap-2">
          {[{ v: 'view', l: 'عرض' }, { v: 'edit', l: 'تعديل' }].map(m => (
            <button key={m.v} onClick={() => setActiveMode(m.v as any)}
              style={{
                padding: '8px 18px', borderRadius: 10, fontSize: '0.84rem', fontWeight: activeMode === m.v ? 600 : 400,
                background: activeMode === m.v ? '#2563EB' : 'white',
                color: activeMode === m.v ? 'white' : '#64748B',
                border: activeMode === m.v ? '1px solid #2563EB' : '1px solid #E2E8F0',
                cursor: 'pointer',
              }}>
              {m.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Main Odontogram */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #F1F5F9' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 style={{ color: '#0F172A', fontWeight: 700, fontSize: '0.95rem' }}>مخطط الأسنان - الدائمة (البالغ)</h3>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: '#EFF6FF' }}>
              <Info size={12} style={{ color: '#2563EB' }} />
              <span style={{ color: '#2563EB', fontSize: '0.75rem' }}>انقر على أي سن لعرض تفاصيله</span>
            </div>
          </div>

          {/* Dividers */}
          <div className="space-y-6">
            {/* Upper Jaw */}
            <div>
              <div className="text-center mb-3" style={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 600 }}>الفك العلوي</div>
              <div className="flex justify-center">
                <div className="flex gap-1">
                  {upperRight.map(tooth => <ToothButton key={tooth.number} tooth={tooth} isUpper={true} />)}
                  <div className="w-6 flex items-center justify-center" style={{ color: '#CBD5E1', fontSize: '0.65rem' }}>|</div>
                  {upperLeft.map(tooth => <ToothButton key={tooth.number} tooth={tooth} isUpper={true} />)}
                </div>
              </div>
            </div>

            {/* Midline */}
            <div className="relative">
              <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, #E2E8F0, transparent)' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="px-3 py-1 rounded-full" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#94A3B8', fontSize: '0.68rem' }}>الفك السفلي</span>
                </div>
              </div>
            </div>

            {/* Lower Jaw */}
            <div>
              <div className="flex justify-center">
                <div className="flex gap-1">
                  {lowerRight.map(tooth => <ToothButton key={tooth.number} tooth={tooth} isUpper={false} />)}
                  <div className="w-6 flex items-center justify-center" style={{ color: '#CBD5E1', fontSize: '0.65rem' }}>|</div>
                  {lowerLeft.map(tooth => <ToothButton key={tooth.number} tooth={tooth} isUpper={false} />)}
                </div>
              </div>
              <div className="text-center mt-3" style={{ color: '#94A3B8', fontSize: '0.72rem', fontWeight: 600 }}>الفك السفلي</div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t" style={{ borderColor: '#F1F5F9' }}>
            {Object.entries(conditionConfig).map(([cond, config]) => (
              <div key={cond} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: config.bg, border: `1.5px solid ${config.color}` }} />
                <span style={{ color: '#64748B', fontSize: '0.72rem' }}>{config.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #F1F5F9' }}>
            <h4 style={{ color: '#0F172A', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>ملخص الحالة</h4>
            <div className="space-y-2.5">
              {stats.map(s => (
                <div key={s.condition} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: s.config.bg, border: `1.5px solid ${s.config.color}` }} />
                    <span style={{ color: '#475569', fontSize: '0.78rem' }}>{s.config.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="px-2 py-0.5 rounded-full" style={{ background: s.config.bg }}>
                      <span style={{ color: s.config.color, fontSize: '0.72rem', fontWeight: 700 }}>{s.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #F1F5F9' }}>
            <h4 style={{ color: '#0F172A', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>ملاحظات سريرية</h4>
            <div className="space-y-2.5">
              {teeth.filter(t => t.notes).map(t => (
                <div key={t.number} className="p-3 rounded-xl" style={{ background: '#F8FAFC' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: conditionConfig[t.condition].color, fontSize: '0.65rem', fontWeight: 700 }}>
                      {t.number}
                    </div>
                    <span style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 600 }}>{conditionConfig[t.condition].label}</span>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.78rem' }}>{t.notes}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooth Detail Modal */}
      <AnimatePresence>
        {selectedTooth && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setSelectedTooth(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm" style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.2)' }}>
                <div className="flex items-center justify-between mb-5">
                  <h3 style={{ color: '#0F172A', fontWeight: 700 }}>سن رقم {selectedTooth.number}</h3>
                  <button onClick={() => setSelectedTooth(null)}><X size={20} style={{ color: '#94A3B8' }} /></button>
                </div>

                <div className="flex justify-center mb-5">
                  <ToothSVG condition={editCondition} isUpper={selectedTooth.number < 30} size={60} />
                </div>

                <div className="mb-4">
                  <label style={{ color: '#374151', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>الحالة</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(conditionConfig).map(([cond, config]) => (
                      <button
                        key={cond}
                        onClick={() => setEditCondition(cond as ToothCondition)}
                        className="p-2 rounded-xl text-right transition-all"
                        style={{
                          border: `1.5px solid ${editCondition === cond ? config.color : '#E2E8F0'}`,
                          background: editCondition === cond ? config.bg : 'white',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ color: config.text || config.color, fontSize: '0.75rem', fontWeight: editCondition === cond ? 700 : 400 }}>
                          {config.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label style={{ color: '#374151', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>ملاحظات سريرية</label>
                  <textarea
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    placeholder="أضف ملاحظة سريرية..."
                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: '0.875rem', outline: 'none', minHeight: 70, resize: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setSelectedTooth(null)}
                    style={{ flex: 1, padding: '11px', border: '1px solid #E2E8F0', borderRadius: 12, color: '#64748B', fontSize: '0.875rem', background: 'white', cursor: 'pointer' }}>
                    إلغاء
                  </button>
                  <button onClick={handleSaveTooth}
                    style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', border: 'none', borderRadius: 12, color: 'white', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}>
                    حفظ
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
