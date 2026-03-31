import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        enrichUser(session.user, session.access_token);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        enrichUser(session.user, session.access_token);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const enrichUser = async (supabaseUser, token) => {
    try {
      const role = supabaseUser.user_metadata?.role || 'user';
      const table = role === 'vendor' ? 'vendors' : 'profiles';

      const { data: profile } = await supabase
        .from(table)
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: profile?.name || supabaseUser.user_metadata?.name || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        role,
        isAvailable: profile?.is_available,
        rating: profile?.rating,
        token,
      });
    } catch {
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || '',
        role: supabaseUser.user_metadata?.role || 'user',
        token,
      });
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ name, email, password, phone = '', address = '', role = 'user' }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role, phone, address },
      },
    });
    if (error) throw error;

    // Insert profile/vendor row via backend
    const endpoint = role === 'vendor' ? '/vendors/register' : '/users/register';
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Backend handles profile creation via admin SDK
    await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, address }),
    });

    return data;
  };

  const loginWithEmail = async ({ email, password, role }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const endpoint = role === 'vendor' ? '/vendors/login' : '/users/login';

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // Set session using Supabase (sign in directly)
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const getToken = () => session?.access_token || '';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isLoggedIn: !!user,
      register,
      loginWithEmail,
      logout,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
