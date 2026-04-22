import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  clinic_id: string | null;
  clinic_name?: string;
  avatar_url?: string;
  is_active: boolean;
}
