import { useState, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  UserCog,
  BarChart3,
  MessageSquare,
  Stethoscope,
  Package,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  LogOut,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionsContext";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { canView } = usePermissions();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Filter nav items based on user role
  const navItems = useMemo(() => {
    const items = [
      { path: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, show: true },
      { path: "/appointments", label: "المواعيد", icon: Calendar, show: canView('appointments') },
      { path: "/patients", label: "المرضى", icon: Users, show: canView('patients') },
      { path: "/treatments", label: "العلاجات والخدمات", icon: Stethoscope, show: true },
      { path: "/billing", label: "الفواتير", icon: CreditCard, show: canView('billing') },
      { path: "/doctors", label: "الأطباء والموظفون", icon: UserCog, show: canView('doctors') },
      { path: "/communication", label: "مركز التواصل", icon: MessageSquare, show: canView('appointments') },
      { path: "/smart-automation", label: "الأتمتة الذكية", icon: Sparkles, show: user?.role === 'clinic_admin' || user?.role === 'super_admin' },
      { path: "/inventory", label: "المخزون", icon: Package, show: canView('settings') },
      { path: "/reports", label: "التقارير", icon: BarChart3, show: canView('reports') },
    ];

    // Settings for admins
    if (user?.role === 'clinic_admin' || user?.role === 'super_admin') {
      items.push({ path: "/settings", label: "الإعدادات", icon: Settings, show: true });
    }

    return items.filter(item => item.show);
  }, [user?.role, canView]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-0 right-0 h-screen flex flex-col z-40 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0F2547 0%, #0A1929 100%)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
                <Stethoscope size={16} color="white" />
              </div>
              <div>
                <span className="text-white font-bold tracking-wide" style={{ fontSize: 18 }}>Sadenix</span>
                <div className="text-xs" style={{ color: "#64B5F6", marginTop: -2 }}>إدارة العيادات</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
            style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
            <Stethoscope size={16} color="white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-90 shrink-0"
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "#93C5FD",
            marginRight: collapsed ? "auto" : 0,
            marginLeft: collapsed ? "auto" : 0,
          }}
        >
          {collapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Workspace Switcher */}
      <AnimatePresence>
        {!collapsed && user?.clinic_name && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-3 mt-4 rounded-xl overflow-hidden shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/5 transition-all">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, #1D5FBF40, #06B6D440)" }}>
                <Building2 size={14} color="#93C5FD" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-bold truncate">{user?.clinic_name}</div>
                <div className="text-xs truncate" style={{ color: "#64B5F6" }}>الفرع الرئيسي</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path !== "/" && location.pathname.startsWith(item.path));

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="block"
            >
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer relative"
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, rgba(29,95,191,0.6), rgba(6,182,212,0.3))"
                    : "transparent",
                  border: isActive ? "1px solid rgba(96,165,250,0.2)" : "1px solid transparent",
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "linear-gradient(135deg, rgba(29,95,191,0.4), rgba(6,182,212,0.2))" }}
                    transition={{ duration: 0.2 }}
                  />
                )}
                <div className={`shrink-0 relative z-10 transition-all ${isActive ? "" : "opacity-60"}`}
                  style={{ color: isActive ? "#60A5FA" : "#94A3B8" }}>
                  <Icon size={18} />
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-semibold truncate relative z-10"
                      style={{ color: isActive ? "#E2E8F0" : "#94A3B8" }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* Upgrade Banner */}
      <AnimatePresence>
        {!collapsed && user?.role === 'clinic_admin' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-3 mb-3 rounded-xl p-3 shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(29,95,191,0.3), rgba(6,182,212,0.2))", border: "1px solid rgba(96,165,250,0.2)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} style={{ color: "#FCD34D" }} />
              <span className="text-xs font-bold" style={{ color: "#FCD34D" }}>الخطة الاحترافية</span>
            </div>
            <p className="text-xs mb-2" style={{ color: "#93C5FD" }}>أضف فروعًا غير محدودة وخصائص متقدمة</p>
            <button className="w-full py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)", color: "white" }}>
              ترقية الخطة
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Profile */}
      <div
        className="flex items-center gap-3 px-4 py-4 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-white text-sm font-bold"
          style={{ background: "linear-gradient(135deg, #1D5FBF, #06B6D4)" }}>
          {user?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "?"}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 min-w-0"
            >
              <div className="text-white text-xs font-bold truncate">{user?.full_name || user?.email}</div>
              <div className="text-xs truncate" style={{ color: "#64B5F6" }}>
                {user?.role === 'clinic_admin' ? "مدير العيادة" :
                 user?.role === 'doctor' ? "طبيب" :
                 user?.role === 'receptionist' ? "استقبال" : "موظف"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!collapsed && (
          <button onClick={handleLogout} className="opacity-60 hover:opacity-100 transition-opacity" title="تسجيل الخروج">
            <LogOut size={14} style={{ color: "#94A3B8" }} />
          </button>
        )}
      </div>
    </motion.aside>
  );
}