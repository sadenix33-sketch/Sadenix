import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, UserProfile, UserRole } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null; // alias for user, for semantic clarity
  session: Session | null;
  isAuthenticated: boolean;
  role: UserRole | null;
  clinicId: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper with timeout
  const withTimeout = (promise: Promise<any>, ms: number) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
    ]);
  };

  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, clinics(name)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error("Fetch profile error details:", error);
      // We store the error in a global way or throw it so login can catch it
      throw new Error(`Profile Error: ${error.message} (Code: ${error.code})`);
    }
    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      full_name: data.full_name,
      role: data.role as UserRole,
      clinic_id: data.clinic_id,
      clinic_name: data.clinics?.[0]?.name || data.clinics?.name, // handle variations
      avatar_url: data.avatar_url,
      is_active: data.is_active,
    };
  };

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isMounted) {
          setSession(session);
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            if (isMounted) setUser(profile);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth context initialization error:", error);
        if (isMounted) setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // If session is null, clear user and stop loading
      if (!session) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      // Only fetch profile if user changed or session is new
      setSession(session);
      if (session.user && (!user || user.id !== session.user.id)) {
        try {
          const profile = await withTimeout(fetchProfile(session.user.id), 2500);
          if (isMounted) setUser(profile);
        } catch (err) {
          console.warn("Auth profile fetch timed out or failed:", err);
          // Don't clear user if it's just a timeout, keep previous session
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { success: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
      }

      if (data.user) {
        const profile = await fetchProfile(data.user.id);
        if (!profile) {
          return { success: false, error: 'لم يتم العثور على بيانات المستخدم.' };
        }
        if (!profile.is_active) {
          await supabase.auth.signOut();
          return { success: false, error: 'حسابك غير مفعّل. تواصل مع مدير النظام.' };
        }
        setUser(profile);
        return { success: true };
      }

      return { success: false, error: 'حدث خطأ غير متوقع.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile: user, // profile is same as user object
      session,
      isAuthenticated: !!session,
      role: user?.role ?? null,
      clinicId: user?.clinic_id ?? null,
      login,
      logout,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
