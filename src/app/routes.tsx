import { createBrowserRouter, redirect } from "react-router";
import { MainLayout } from "./components/layout/MainLayout";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { PatientsPage } from "./pages/Patients";
import { PatientProfilePage } from "./pages/PatientProfile";
import { AppointmentsPage } from "./pages/Appointments";
import { BillingPage } from "./pages/Billing";
import { DoctorsPage } from "./pages/Doctors";
import { ReportsPage } from "./pages/Reports";
import { CommunicationPage } from "./pages/Communication";
import { TreatmentsPage } from "./pages/Treatments";
import { InventoryPage } from "./pages/Inventory";
import { SettingsPage } from "./pages/Settings";
import { SuperAdminPage } from "./pages/SuperAdmin";
import { supabase } from "../lib/supabase";
import type { UserRole } from "../lib/supabase";
import { Loader2, AlertTriangle } from "lucide-react";

function ErrorPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#F8FAFC',
      direction: 'rtl',
      fontFamily: 'Cairo, sans-serif'
    }}>
      <AlertTriangle size={48} style={{ color: '#DC2626', marginBottom: 16 }} />
      <h2 style={{ color: '#0F172A', marginBottom: 8 }}>حدث خطأ في التحميل</h2>
      <p style={{ color: '#64748B', marginBottom: 16 }}>يرجى تحديث الصفحة أو التواصل مع الدعم</p>
      <button 
        onClick={() => window.location.reload()}
        style={{
          padding: '10px 24px',
          background: 'linear-gradient(135deg, #1D5FBF, #06B6D4)',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          cursor: 'pointer',
          fontWeight: 600
        }}
      >
        تحديث الصفحة
      </button>
    </div>
  );
}

function LoadingPage() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: '#F8FAFC',
      direction: 'rtl'
    }}>
      <div style={{ textAlign: 'center' }}>
        <Loader2 
          size={48} 
          className="animate-spin" 
          style={{ color: '#1D5FBF', margin: '0 auto 16px' }} 
        />
        <p style={{ color: '#64748B', fontFamily: 'Cairo, sans-serif', fontSize: '14px' }}>
          جاري التحميل...
        </p>
      </div>
    </div>
  );
}

const getAuthProfile = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active, clinic_id')
      .eq('id', session.user.id)
      .single();

    return profile;
  } catch (error) {
    console.error("Auth profile error:", error);
    return null;
  }
};

const authLoader = async () => {
  try {
    const profile = await getAuthProfile();
    if (!profile) return redirect('/login');
    if (!profile.is_active) return redirect('/login');
    return null;
  } catch (error) {
    console.error("Auth loader error:", error);
    return redirect('/login');
  }
};

const loginLoader = async () => {
  try {
    const profile = await getAuthProfile();
    if (!profile) return null;
    if (profile.role === 'super_admin') return redirect('/super-admin');
    return redirect('/dashboard');
  } catch {
    return null;
  }
};

const superAdminLoader = async () => {
  try {
    const profile = await getAuthProfile();
    if (!profile) return redirect('/login');
    if (profile.role !== 'super_admin') return redirect('/dashboard');
    return null;
  } catch {
    return redirect('/login');
  }
};

const settingsLoader = async () => {
  try {
    const profile = await getAuthProfile();
    if (!profile) return redirect('/login');
    const blocked: UserRole[] = ['receptionist', 'doctor'];
    if (blocked.includes(profile.role as UserRole)) return redirect('/dashboard');
    return null;
  } catch {
    return redirect('/login');
  }
};

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
    loader: loginLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/super-admin",
    Component: SuperAdminPage,
    loader: superAdminLoader,
    errorElement: <ErrorPage />,
  },
  {
    path: "/",
    Component: MainLayout,
    loader: authLoader,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        loader: async () => {
          const profile = await getAuthProfile();
          if (profile?.role === 'super_admin') return redirect('/super-admin');
          return redirect("/dashboard");
        },
      },
      { path: "dashboard", Component: DashboardPage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "patients", Component: PatientsPage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "patients/:id", Component: PatientProfilePage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "appointments", Component: AppointmentsPage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "billing", Component: BillingPage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "doctors", Component: DoctorsPage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "reports", Component: ReportsPage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "communication", Component: CommunicationPage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "treatments", Component: TreatmentsPage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "inventory", Component: InventoryPage, loader: authLoader, errorElement: <ErrorPage /> },
      { path: "settings", Component: SettingsPage, loader: settingsLoader, errorElement: <ErrorPage /> },
    ],
  },
  {
    path: "*",
    element: (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#F8FAFC',
        direction: 'rtl',
        fontFamily: 'Cairo, sans-serif'
      }}>
        <h2 style={{ color: '#0F172A', marginBottom: 8 }}>الصفحة غير موجودة</h2>
        <button 
          onClick={() => window.location.href = '/dashboard'}
          style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #1D5FBF, #06B6D4)',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          العودة للوحة التحكم
        </button>
      </div>
    ),
  },
]);
