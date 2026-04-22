import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, Search, Edit2, MoreHorizontal, Clock, DollarSign,
  Tag, ChevronDown, Stethoscope, Zap, Star, X, Save, RotateCcw, Loader2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { usePermissions, canEdit } from "../context/PermissionsContext";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  popular?: boolean;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  bg: string;
  services: Service[];
}

const defaultCategories: Category[] = [
  { id: "restorative", name: "العلاجات التحفظية", icon: "🦷", color: "#1D5FBF", bg: "#EFF6FF", services: [] },
  { id: "orthodontics", name: "تقويم الأسنان", icon: "😁", color: "#8B5CF6", bg: "#EDE9FE", services: [] },
  { id: "cosmetic", name: "التجميل", icon: "✨", color: "#D97706", bg: "#FEF3C7", services: [] },
  { id: "implants", name: "الزراعة", icon: "🔬", color: "#16A34A", bg: "#DCFCE7", services: [] },
  { id: "preventive", name: "الوقاية والتنظيف", icon: "🧹", color: "#06B6D4", bg: "#E0F2FE", services: [] },
  { id: "surgery", name: "الجراحة", icon: "⚕️", color: "#DC2626", bg: "#FEE2E2", services: [] },
];

const defaultServices: Omit<Service, 'id' | 'category_id'>[] = [
  { name: "حشو أبيض (كومبوزيت)", duration: 45, price: 0, popular: true },
  { name: "حشو أملغم", duration: 30, price: 0, popular: false },
  { name: "علاج جذر - قناة واحدة", duration: 60, price: 0, popular: false },
  { name: "علاج جذر - ثلاثة قنوات", duration: 90, price: 0, popular: true },
  { name: "تقويم ثابت معدني", duration: 60, price: 0, popular: true },
  { name: "تقويم شفاف (إنفيزالاين)", duration: 45, price: 0, popular: true },
  { name: "تقويم سيراميك", duration: 60, price: 0, popular: false },
  { name: "مراجعة تقويم شهرية", duration: 30, price: 0, popular: false },
  { name: "تبييض بالليزر", duration: 90, price: 0, popular: true },
  { name: "تبييض منزلي", duration: 30, price: 0, popular: false },
  { name: "فينير بورسلين (لكل سن)", duration: 120, price: 0, popular: true },
  { name: "ابتسامة هوليود (10 أسنان)", duration: 180, price: 0, popular: false },
  { name: "زراعة سن واحدة", duration: 120, price: 0, popular: true },
  { name: "جسر ثابت (3 أسنان)", duration: 90, price: 0, popular: false },
  { name: "طقم أسنان متحرك", duration: 60, price: 0, popular: false },
  { name: "تنظيف احترافي", duration: 45, price: 0, popular: true },
  { name: "فلورايد للأطفال", duration: 20, price: 0, popular: false },
  { name: "صور شعاعية كاملة", duration: 15, price: 0, popular: false },
  { name: "خلع بسيط", duration: 20, price: 0, popular: false },
  { name: "خلع ضرس العقل", duration: 45, price: 0, popular: true },
  { name: "جراحة اللثة", duration: 60, price: 0, popular: false },
];

const categoryServiceMap: Record<string, string[]> = {
  restorative: ["حشو أبيض (كومبوزيت)", "حشو أملغم", "علاج جذر - قناة واحدة", "علاج جذر - ثلاثة قنوات"],
  orthodontics: ["تقويم ثابت معدني", "تقويم شفاف (إنفيزالاين)", "تقويم سيراميك", "مراجعة تقويم شهرية"],
  cosmetic: ["تبييض بالليزر", "تبييض منزلي", "فينير بورسلين (لكل سن)", "ابتسامة هوليود (10 أسنان)"],
  implants: ["زراعة سن واحدة", "جسر ثابت (3 أسنان)", "طقم أسنان متحرك"],
  preventive: ["تنظيف احترافي", "فلورايد للأطفال", "صور شعاعية كاملة"],
  surgery: ["خلع بسيط", "خلع ضرس العقل", "جراحة اللثة"],
};

export function TreatmentsPage() {
  const { clinicId, loading: authLoading } = useAuth();
  const { role } = usePermissions();
  const canUserEdit = canEdit(role);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>("restorative");
  const [showAddService, setShowAddService] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // New service form
  const [newService, setNewService] = useState({
    name: "",
    category: "restorative",
    duration: "45",
    price: "0",
  });

  useEffect(() => {
    loadServices();
  }, [clinicId]);

  const loadServices = async () => {
    if (!clinicId) {
      // Initialize with defaults
      const cats = defaultCategories.map(cat => ({
        ...cat,
        services: defaultServices
          .filter((_, i) => categoryServiceMap[cat.id]?.includes(defaultServices[i].name))
          .map(s => ({ ...s, id: crypto.randomUUID(), category_id: cat.id }))
      }));
      setCategories(cats);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("clinic_id", clinicId);

      if (error) throw error;

      if (data && data.length > 0) {
        // Build categories from database
        const cats = defaultCategories.map(cat => ({
          ...cat,
          services: data
            .filter(s => s.category_id === cat.id)
            .map(s => ({
              id: s.id,
              name: s.name,
              duration: s.duration || 0,
              price: s.price || 0,
              popular: s.popular || false,
              category_id: s.category_id,
            }))
        }));
        setCategories(cats);
      } else {
        // Initialize with defaults
        const cats = defaultCategories.map(cat => ({
          ...cat,
          services: defaultServices
            .filter((_, i) => categoryServiceMap[cat.id]?.includes(defaultServices[i].name))
            .map(s => ({ ...s, id: crypto.randomUUID(), category_id: cat.id }))
        }));
        setCategories(cats);
      }
    } catch (e) {
      console.error("Error loading services:", e);
      // Fallback to defaults
      const cats = defaultCategories.map(cat => ({
        ...cat,
        services: defaultServices
          .filter((_, i) => categoryServiceMap[cat.id]?.includes(defaultServices[i].name))
          .map(s => ({ ...s, id: crypto.randomUUID(), category_id: cat.id }))
      }));
      setCategories(cats);
    }
    setLoading(false);
  };

  const saveServices = async () => {
    if (!clinicId) {
      alert("لا يمكن الحفظ - لا يوجد معرف عيادة");
      return;
    }

    setSaving(true);
    try {
      // Delete existing
      await supabase.from("services").delete().eq("clinic_id", clinicId);

      // Insert all services
      const allServices = categories.flatMap(cat => 
        cat.services.map(s => ({
          clinic_id: clinicId,
          category_id: cat.id,
          name: s.name,
          duration: s.duration,
          price: s.price,
          popular: s.popular || false,
        }))
      );

      const { error } = await supabase.from("services").insert(allServices);
      if (error) throw error;

      setHasChanges(false);
      alert("تم حفظ الأسعار بنجاح!");
    } catch (e: any) {
      alert("خطأ: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const resetPrices = () => {
    if (!confirm("هل أنت متأكد من تصفير جميع الأسعار؟")) return;
    
    const updated = categories.map(cat => ({
      ...cat,
      services: cat.services.map(s => ({ ...s, price: 0 }))
    }));
    setCategories(updated);
    setHasChanges(true);
  };

  const updatePrice = (serviceId: string, newPrice: number) => {
    const updated = categories.map(cat => ({
      ...cat,
      services: cat.services.map(s => 
        s.id === serviceId ? { ...s, price: newPrice } : s
      )
    }));
    setCategories(updated);
    setHasChanges(true);
    setEditingPrice(null);
  };

  const handleAddService = () => {
    if (!newService.name.trim()) {
      alert("اكتب اسم الخدمة");
      return;
    }

    const cat = categories.find(c => c.id === newService.category);
    if (!cat) return;

    const service: Service = {
      id: crypto.randomUUID(),
      name: newService.name.trim(),
      duration: parseInt(newService.duration) || 45,
      price: parseFloat(newService.price) || 0,
      popular: false,
      category_id: newService.category,
    };

    const updated = categories.map(c => 
      c.id === newService.category 
        ? { ...c, services: [...c.services, service] }
        : c
    );
    setCategories(updated);
    setHasChanges(true);
    setShowAddService(false);
    setNewService({ name: "", category: "restorative", duration: "45", price: "0" });
  };

  const deleteService = (catId: string, serviceId: string) => {
    if (!confirm("حذف هذه الخدمة؟")) return;
    
    const updated = categories.map(c => 
      c.id === catId 
        ? { ...c, services: c.services.filter(s => s.id !== serviceId) }
        : c
    );
    setCategories(updated);
    setHasChanges(true);
  };

  const allServices = categories.flatMap(c => c.services);
  const filteredCats = categories.filter(cat =>
    search === "" ||
    cat.name.includes(search) ||
    cat.services.some(s => s.name.includes(search))
  );

  if (authLoading || loading) {
    return (
      <div className="py-24 flex justify-center" style={{ direction: "rtl" }}>
        <Loader2 className="animate-spin w-10 h-10 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ direction: "rtl" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-black" style={{ color: "#0F172A", fontSize: 20 }}>العلاجات والخدمات</h1>
          <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
            {categories.length} فئة · {allServices.length} خدمة
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && canUserEdit && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={saveServices}
              disabled={saving}
              className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold text-white"
              style={{ background: "#16A34A" }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              حفظ الأسعار
            </motion.button>
          )}
          {canUserEdit && (
            <button
              onClick={resetPrices}
              className="flex items-center gap-2 px-3 h-9 rounded-xl text-sm font-bold border"
              style={{ borderColor: "rgba(30,58,111,0.12)", color: "#64748B" }}>
              <RotateCcw size={14} />
              تصفير الأسعار
            </button>
          )}
          {canUserEdit && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddService(true)}
              className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
              <Plus size={15} />
              إضافة خدمة
            </motion.button>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {categories.map((cat) => (
          <motion.div
            key={cat.id}
            whileHover={{ y: -2 }}
            onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
            className="rounded-2xl p-4 cursor-pointer transition-all"
            style={{
              background: expandedCat === cat.id ? cat.bg : "white",
              border: expandedCat === cat.id ? `1.5px solid ${cat.color}30` : "1px solid rgba(30,58,111,0.08)",
              boxShadow: "0 2px 8px rgba(15,37,71,0.04)",
            }}
          >
            <div className="text-2xl mb-2">{cat.icon}</div>
            <div className="text-xs font-bold mb-1 leading-tight" style={{ color: cat.color }}>{cat.name}</div>
            <div className="text-xs" style={{ color: "#94A3B8" }}>{cat.services.length} خدمة</div>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 h-10 rounded-xl max-w-sm"
        style={{ background: "white", border: "1px solid rgba(30,58,111,0.08)" }}>
        <Search size={14} style={{ color: "#64748B" }} />
        <input type="text" placeholder="بحث عن خدمة أو علاج..." value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 outline-none bg-transparent text-sm"
          style={{ fontFamily: "Cairo, sans-serif", color: "#0F172A" }} />
        {search && <button onClick={() => setSearch("")}><X size={12} style={{ color: "#94A3B8" }} /></button>}
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {filteredCats.map((cat, ci) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.05 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: "white", border: "1px solid rgba(30,58,111,0.06)", boxShadow: "0 2px 8px rgba(15,37,71,0.04)" }}
          >
            {/* Category Header */}
            <button
              onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-all"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: cat.bg }}>
                {cat.icon}
              </div>
              <div className="flex-1 text-right">
                <div className="font-bold" style={{ color: "#0F172A" }}>{cat.name}</div>
                <div className="text-xs" style={{ color: "#64748B" }}>{cat.services.length} خدمة متاحة</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: cat.bg, color: cat.color }}>
                  من 0 JOD
                </span>
                <motion.div
                  animate={{ rotate: expandedCat === cat.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={16} style={{ color: "#64748B" }} />
                </motion.div>
              </div>
            </button>

            {/* Services Table */}
            <AnimatePresence>
              {expandedCat === cat.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: "hidden" }}
                >
                  <div style={{ borderTop: "1px solid rgba(30,58,111,0.06)" }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: "#F8FAFC" }}>
                          <th className="text-right px-5 py-2 text-xs font-bold" style={{ color: "#64748B" }}>الخدمة</th>
                          <th className="text-right px-4 py-2 text-xs font-bold" style={{ color: "#64748B" }}>المدة</th>
                          <th className="text-right px-4 py-2 text-xs font-bold" style={{ color: "#64748B" }}>السعر (JOD)</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {cat.services
                          .filter(s => search === "" || s.name.includes(search))
                          .map((service) => (
                            <motion.tr
                              key={service.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="group hover:bg-blue-50/30 transition-all"
                              style={{ borderTop: "1px solid rgba(30,58,111,0.04)" }}
                            >
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold" style={{ color: "#0F172A" }}>{service.name}</span>
                                  {service.popular && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                                      style={{ background: "#FEF3C7", color: "#D97706" }}>
                                      <Star size={8} />
                                      شائع
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-sm" style={{ color: "#64748B" }}>
                                  <Clock size={12} />
                                  {service.duration} دقيقة
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {canUserEdit && editingPrice === service.id ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onKeyDown={e => {
                                        if (e.key === "Enter") updatePrice(service.id, parseFloat(editValue) || 0);
                                        if (e.key === "Escape") setEditingPrice(null);
                                      }}
                                      className="w-20 px-2 py-1 rounded-lg border text-sm font-bold text-center"
                                      style={{ borderColor: cat.color, color: cat.color }}
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => updatePrice(service.id, parseFloat(editValue) || 0)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                                      style={{ background: cat.color }}
                                    >
                                      <Save size={12} color="white" />
                                    </button>
                                  </div>
                                ) : (
                                  <span 
                                    onClick={() => {
                                      if (canUserEdit) {
                                        setEditingPrice(service.id);
                                        setEditValue(String(service.price));
                                      }
                                    }}
                                    className={`text-sm font-black cursor-pointer hover:opacity-70 ${canUserEdit ? 'cursor-pointer' : ''}`}
                                    style={{ color: cat.color }}
                                  >
                                    {service.price} JOD
                                    {canUserEdit && <Edit2 size={10} className="inline mr-1" />}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                {canUserEdit && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => deleteService(cat.id, service.id)}
                                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50"
                                    >
                                      <X size={12} style={{ color: "#DC2626" }} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                      </tbody>
                    </table>
                    {canUserEdit && (
                      <div className="p-3">
                        <button 
                          onClick={() => {
                            setNewService(prev => ({ ...prev, category: cat.id }));
                            setShowAddService(true);
                          }}
                          className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-50 transition-all"
                          style={{ color: "#1D5FBF" }}>
                          <Plus size={12} />
                          إضافة خدمة لهذه الفئة
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Add Service Modal */}
      <AnimatePresence>
        {showAddService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(15,37,71,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowAddService(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: "white", boxShadow: "0 20px 60px rgba(15,37,71,0.2)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-5"
                style={{ borderBottom: "1px solid rgba(30,58,111,0.08)" }}>
                <h3 className="font-bold" style={{ color: "#0F172A" }}>إضافة خدمة جديدة</h3>
                <button onClick={() => setShowAddService(false)}>
                  <X size={15} style={{ color: "#64748B" }} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>اسم الخدمة</label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="مثال: حشو بورسلين"
                    className="w-full px-3 h-10 rounded-xl text-sm outline-none"
                    style={{ background: "#F0F5FC", fontFamily: "Cairo, sans-serif" }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>الفئة</label>
                  <select
                    value={newService.category}
                    onChange={e => setNewService(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 h-10 rounded-xl text-sm outline-none"
                    style={{ background: "#F0F5FC", fontFamily: "Cairo, sans-serif" }}
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>المدة (دقيقة)</label>
                    <input
                      type="number"
                      value={newService.duration}
                      onChange={e => setNewService(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full px-3 h-10 rounded-xl text-sm outline-none"
                      style={{ background: "#F0F5FC", fontFamily: "Cairo, sans-serif" }}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold mb-1.5 block" style={{ color: "#374151" }}>السعر (JOD)</label>
                    <input
                      type="number"
                      value={newService.price}
                      onChange={e => setNewService(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full px-3 h-10 rounded-xl text-sm outline-none"
                      style={{ background: "#F0F5FC", fontFamily: "Cairo, sans-serif" }}
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleAddService}
                  className="w-full h-10 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                  إضافة الخدمة
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
