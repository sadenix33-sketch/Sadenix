import { useAuth } from './AuthContext';

export type Permission = 
  | 'view_patients' | 'add_patients' | 'edit_patients' | 'delete_patients'
  | 'view_appointments' | 'add_appointments' | 'edit_appointments' | 'delete_appointments'
  | 'view_billing' | 'add_billing' | 'edit_billing' | 'delete_billing'
  | 'view_reports' | 'view_staff' | 'add_staff' | 'edit_staff' | 'delete_staff'
  | 'manage_settings' | 'view_xrays' | 'add_xrays';

export const rolePermissions: Record<string, Permission[]> = {
  super_admin: [
    'view_patients', 'add_patients', 'edit_patients', 'delete_patients',
    'view_appointments', 'add_appointments', 'edit_appointments', 'delete_appointments',
    'view_billing', 'add_billing', 'edit_billing', 'delete_billing',
    'view_reports', 'view_staff', 'add_staff', 'edit_staff', 'delete_staff',
    'manage_settings', 'view_xrays', 'add_xrays'
  ],
  clinic_admin: [
    'view_patients', 'add_patients', 'edit_patients', 'delete_patients',
    'view_appointments', 'add_appointments', 'edit_appointments', 'delete_appointments',
    'view_billing', 'add_billing', 'edit_billing', 'delete_billing',
    'view_reports', 'view_staff', 'add_staff', 'edit_staff', 'delete_staff',
    'manage_settings', 'view_xrays', 'add_xrays'
  ],
  doctor: [
    'view_patients', 'add_patients', 'edit_patients', 'delete_patients',
    'view_appointments', 'add_appointments', 'edit_appointments', 'delete_appointments',
    'view_billing', 'add_billing', 'delete_billing',
    'view_xrays', 'add_xrays'
  ],
  receptionist: [
    'view_patients', 'add_patients',
    'view_appointments', 'add_appointments',
    'view_xrays', 'add_xrays'
  ],
};

export function usePermissions() {
  const { role } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!role) return false;
    return rolePermissions[role]?.includes(permission) ?? false;
  };

  const canView = (section: string): boolean => {
    if (!role) return false;
    
    switch (section) {
      case 'patients':
        return hasPermission('view_patients');
      case 'appointments':
        return hasPermission('view_appointments');
      case 'billing':
        return hasPermission('view_billing');
      case 'reports':
        return hasPermission('view_reports');
      case 'staff':
        return hasPermission('view_staff');
      case 'settings':
        return hasPermission('manage_settings');
      case 'doctors':
        return hasPermission('view_staff');
      default:
        return false;
    }
  };

  return { hasPermission, canView, role };
}

export const canEdit = (role: string | null): boolean => {
  if (!role) return false;
  return ['super_admin', 'clinic_admin', 'doctor'].includes(role);
};

export const canDelete = (role: string | null): boolean => {
  if (!role) return false;
  return ['super_admin', 'clinic_admin', 'doctor'].includes(role);
};

export const canManageBilling = (role: string | null): boolean => {
  if (!role) return false;
  return ['super_admin', 'clinic_admin'].includes(role);
};
