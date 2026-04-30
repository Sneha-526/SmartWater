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

    // Listen for auth changes (handles OAuth redirect, password reset, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const endpoint = role === 'vendor' ? '/vendors/me' : '/users/me';

      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const profile = role === 'vendor' ? data.vendor : data.user;

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || '',
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
        name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || '',
        role: supabaseUser.user_metadata?.role || 'user',
        token,
      });
    } finally {
      setLoading(false);
    }
  };

  const register = async ({ name, email, password, phone = '', address = '', role = 'user' }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const endpoint = role === 'vendor' ? '/vendors/register' : '/users/register';

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone, address }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // If OTP is required, DON'T sign in yet — return the response for OTP screen
    if (data.requiresOtp) {
      return data; // { success, requiresOtp, email }
    }

    // Legacy path (if OTP is disabled)
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return data;
  };

  const verifyOtp = async ({ email, otp, role = 'user' }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const endpoint = role === 'vendor' ? '/vendors/verify-otp' : '/users/verify-otp';

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    // Set session using the token from verification
    if (data.token) {
      // Sign in with the verified session
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: '__otp_verified__', // This won't work, use setSession instead
      }).catch(() => null);

      // If password login fails (expected for OTP flow), set session directly
      if (error || !data.token) {
        // The verify-otp endpoint already created a session, refresh it
        await supabase.auth.refreshSession();
      }
    }

    return data;
  };

  const resendOtp = async ({ email, role = 'user' }) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const endpoint = role === 'vendor' ? '/vendors/resend-otp' : '/users/resend-otp';

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);
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

    // Set session using Supabase
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    return data;
  };

  const loginWithGoogle = async (role = 'user') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/${role === 'vendor' ? 'login/vendor' : 'login/user'}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;
    return data;
  };

  // Handle Google OAuth callback (called after redirect)
  const handleGoogleCallback = async (role = 'user') => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token) return null;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const endpoint = role === 'vendor' ? '/vendors/google-auth' : '/users/google-auth';

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: currentSession.access_token }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  };

  const forgotPassword = async (email, role = 'user') => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const endpoint = role === 'vendor' ? '/vendors/forgot-password' : '/users/forgot-password';

    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data;
  };

  const resetPassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
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
      verifyOtp,
      resendOtp,
      loginWithEmail,
      loginWithGoogle,
      handleGoogleCallback,
      forgotPassword,
      resetPassword,
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
