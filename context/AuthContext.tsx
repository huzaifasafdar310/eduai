import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  ReactNode, 
  useCallback, 
  useMemo 
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 🔐 AuthProvider: Single Source of Truth for Authentication
 * Listens to Supabase auth events and synchronizes state throughout the app.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Fetch
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('[Auth Service] Initial session check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // 2. Subscribe to Auth State Changes
    // Handles LOGIN, LOGOUT, TOKEN_REFRESHED, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[Auth Event]: ${event}`);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(() => ({
    session,
    user,
    loading,
    isAuthenticated: !!session,
    signOut
  }), [session, user, loading, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
