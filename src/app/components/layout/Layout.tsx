import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useAuth } from '../../context/AuthContext';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'لوحة التحكم', subtitle: 'مرحباً، هنا نظرة عامة على عيادتك' },
  '/patients': { title: 'المرضى', subtitle: 'إدارة ملفات وسجلات المرضى' },
  '/appointments': { title: 'المواعيد', subtitle: 'جدولة وإدارة المواعيد' },
  '/odontogram': { title: 'مخطط الأسنان', subtitle: 'الخريطة السنية التفاعلية' },
  '/treatments': { title: 'العلاجات والخدمات', subtitle: 'كتالوج الخدمات والإجراءات الطبية' },
  '/prescriptions': { title: 'الوصفات الطبية', subtitle: 'إدارة الوصفات والأدوية' },
  '/billing': { title: 'الفواتير والمدفوعات', subtitle: 'إدارة الفواتير والتحصيل المالي' },
  '/insurance': { title: 'التأمين الصحي', subtitle: 'إدارة بوليصات ومطالبات التأمين' },
  '/inventory': { title: 'المخزون والمستلزمات', subtitle: 'متابعة المخزون والموردين' },
  '/staff': { title: 'الأطباء والطاقم الطبي', subtitle: 'إدارة فريق العمل والجداول' },
  '/files': { title: 'الملفات والأشعة', subtitle: 'مركز الملفات الطبية الرقمية' },
  '/reports': { title: 'التقارير والتحليلات', subtitle: 'تقارير الأداء والإحصاءات التشغيلية' },
  '/communications': { title: 'مركز التواصل', subtitle: 'إدارة الإشعارات والتواصل مع المرضى' },
  '/settings': { title: 'الإعدادات', subtitle: 'إعدادات النظام والعيادة' },
};

export function Layout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const currentPage = pageTitles[location.pathname] || { title: 'Sadenix', subtitle: '' };

  return (
    <div dir="rtl" className="flex h-screen overflow-hidden" style={{ background: '#F1F5F9' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={currentPage.title} subtitle={currentPage.subtitle} />
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="flex-1 overflow-y-auto"
          style={{ padding: '24px' }}
        >
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
