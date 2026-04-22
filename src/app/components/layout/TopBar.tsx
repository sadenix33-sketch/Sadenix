import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Bell,
  ChevronDown,
  MapPin,
  CheckCircle,
  AlertCircle,
  Calendar,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../../lib/supabase";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { arSA } from "date-fns/locale";

const pageLabels: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/appointments": "المواعيد",
  "/patients": "المرضى",
  "/treatments": "العلاجات والخدمات",
  "/billing": "الفواتير والمدفوعات",
  "/doctors": "الأطباء والموظفون",
  "/communication": "مركز التواصل",
  "/inventory": "المخزون والمواد",
  "/reports": "التقارير والتحليلات",
  "/settings": "الإعدادات",
};

export interface Notification {
  id: string | number;
  type: string;
  text: string;
  time: string;
  read: boolean;
}

interface TopBarProps {
  sidebarCollapsed: boolean;
}

export function TopBar({ sidebarCollapsed }: TopBarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clinicId } = useAuth();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("الفرع الرئيسي");
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (clinicId) {
      loadNotifications();
    }
  }, [clinicId]);

  const loadNotifications = async () => {
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, scheduled_at, patient_name, patients(first_name)')
        .eq('clinic_id', clinicId)
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', todayEnd)
        .order('scheduled_at', { ascending: true })
        .limit(5);

      const notifs: Notification[] = (appts || []).map((a: any) => ({
        id: a.id,
        type: "appointment",
        text: `موعد اليوم: ${a.patient_name || a.patients?.first_name || 'مريض'} - الساعة ${format(parseISO(a.scheduled_at), 'hh:mm a', { locale: arSA })}`,
        time: "اليوم",
        read: false
      }));

      // Add a welcome notification
      if (notifs.length === 0) {
        notifs.push({
          id: 'welcome',
          type: 'reminder',
          text: 'مرحباً بك في نظام العيادة الذكي',
          time: 'الآن',
          read: false
        });
      }

      setNotifications(notifs);
    } catch (e) {
      console.error(e);
    }
  };

  const markAsRead = (id: string | number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const pageLabel = pageLabels[location.pathname] ||
    (location.pathname.startsWith("/patients/") ? "ملف المريض" : "");
  const unreadCount = notifications.filter(n => !n.read).length;

  const branches = [
    { name: "الفرع الرئيسي", location: "المركز", active: true },
  ];

  const firstName = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "مستخدم";
  const firstLetter = firstName.charAt(0).toUpperCase();

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 flex items-center gap-4 px-6 h-16"
      style={{
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(30,58,111,0.08)",
        marginRight: sidebarCollapsed ? 72 : 260,
        transition: "margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 1px 20px rgba(15,37,71,0.05)",
      }}
    >
      {/* Page Title */}
      <div className="flex-1">
        <h1 className="font-bold" style={{ color: "#0F172A", fontSize: 17 }}>{pageLabel}</h1>
      </div>

      {/* Search Bar */}
      <motion.div
        animate={{ width: searchFocused ? 320 : 220 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        <div
          className="flex items-center gap-2 px-3 h-9 rounded-xl transition-all"
          style={{
            background: searchFocused ? "white" : "#F0F5FC",
            border: searchFocused ? "1.5px solid #1D5FBF" : "1.5px solid transparent",
            boxShadow: searchFocused ? "0 0 0 3px rgba(29,95,191,0.08)" : "none",
          }}
        >
          <Search size={14} style={{ color: "#64748B", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="بحث عن مريض، موعد، فاتورة..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            className="flex-1 outline-none bg-transparent text-xs w-full"
            style={{ color: "#0F172A", fontFamily: "Cairo, sans-serif" }}
          />
          {searchValue && (
            <button onClick={() => setSearchValue("")}>
              <X size={12} style={{ color: "#94A3B8" }} />
            </button>
          )}
        </div>
      </motion.div>

      {/* Branch Selector */}
      <div className="relative">
        <button
          onClick={() => setShowBranchSelector(!showBranchSelector)}
          className="flex items-center gap-2 px-3 h-9 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: "#EFF6FF", color: "#1D5FBF", border: "1px solid #BFDBFE" }}
        >
          <MapPin size={12} />
          <span>{selectedBranch}</span>
          <ChevronDown size={12} />
        </button>
        <AnimatePresence>
          {showBranchSelector && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-11 left-0 w-52 rounded-xl overflow-hidden shadow-xl"
              style={{ background: "white", border: "1px solid rgba(30,58,111,0.1)", zIndex: 100 }}
            >
              <div className="p-2">
                <div className="text-xs font-bold px-2 py-1 mb-1" style={{ color: "#64748B" }}>اختر الفرع</div>
                {branches.map((branch) => (
                  <button
                    key={branch.name}
                    onClick={() => { setSelectedBranch(branch.name); setShowBranchSelector(false); }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-right transition-all hover:bg-blue-50"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${branch.active ? "bg-green-500" : "bg-gray-300"}`} />
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "#0F172A" }}>{branch.name}</div>
                      <div className="text-xs" style={{ color: "#64748B" }}>{branch.location}</div>
                    </div>
                    {selectedBranch === branch.name && (
                      <CheckCircle size={12} className="mr-auto" style={{ color: "#1D5FBF" }} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-90"
          style={{ background: "#F0F5FC" }}
        >
          <Bell size={16} style={{ color: "#1D5FBF" }} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold text-white"
              style={{ background: "#DC2626", fontSize: 10 }}>
              {unreadCount}
            </span>
          )}
        </button>
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-11 left-0 w-80 rounded-xl shadow-xl overflow-hidden"
              style={{ background: "white", border: "1px solid rgba(30,58,111,0.1)", zIndex: 100 }}
            >
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: "1px solid rgba(30,58,111,0.06)" }}>
                <span className="text-sm font-bold" style={{ color: "#0F172A" }}>الإشعارات</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:underline">
                      تحديد كقروء
                    </button>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "#FEE2E2", color: "#DC2626" }}>{unreadCount} جديد</span>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-all cursor-pointer"
                    style={{ borderBottom: "1px solid rgba(30,58,111,0.04)", background: notif.read ? "white" : "#F0F5FC" }}
                  >
                    <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center"
                      style={{
                        background: notif.type === "appointment" ? "#DBEAFE" : notif.type === "payment" ? "#DCFCE7" : notif.type === "alert" ? "#FEE2E2" : "#FEF3C7"
                      }}>
                      {notif.type === "appointment" && <Calendar size={14} style={{ color: "#1D5FBF" }} />}
                      {notif.type === "payment" && <CheckCircle size={14} style={{ color: "#16A34A" }} />}
                      {notif.type === "alert" && <AlertCircle size={14} style={{ color: "#DC2626" }} />}
                      {notif.type === "reminder" && <Bell size={14} style={{ color: "#D97706" }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium" style={{ color: "#0F172A", fontWeight: notif.read ? 500 : 700 }}>{notif.text}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{notif.time}</p>
                    </div>
                    {!notif.read && (
                      <div className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: "#1D5FBF" }} />
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Avatar */}
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-2 px-3 h-9 rounded-xl transition-all hover:opacity-90"
        style={{ background: "#F0F5FC" }}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
          {firstLetter}
        </div>
        <span className="text-xs font-semibold" style={{ color: "#0F172A" }}>{firstName}</span>
        <ChevronDown size={12} style={{ color: "#64748B" }} />
      </button>
    </header>
  );
}
