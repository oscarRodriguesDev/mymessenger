'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, fullName: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

interface Profile {
  id: string;
  authId: string;
  username: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const syncProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to sync profile:', err);
    }
  }, []);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        await syncProfile();
      }

      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          await syncProfile();
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, syncProfile]);

  const signIn = async (identifier: string, password: string) => {
    const res = await fetch('/api/auth/resolve-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier }),
    });

    if (!res.ok) {
      throw new Error('User not found');
    }

    const { email } = await res.json();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, username: string, fullName: string): Promise<{ requiresEmailConfirmation: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, full_name: fullName },
      },
    });
    if (error) throw error;

    if (data?.session) {
      await syncProfile();
      return { requiresEmailConfirmation: false };
    }

    return { requiresEmailConfirmation: true };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
