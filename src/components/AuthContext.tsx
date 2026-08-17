import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { User } from '../types';
import { 
  isSupabaseActive, 
  getStorageMode,
  setStorageMode,
  getLocalSession, 
  setLocalSession, 
  fetchAllUsers 
} from '../services/dataService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: User | null;
  loading: boolean;
  isLocalStorageMode: boolean;
  refreshProfile: () => Promise<void>;
  setCurrentSessionUser: (user: User | null) => void;
  toggleStorageMode: (mode: 'local' | 'cloud') => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
  isLocalStorageMode: true,
  refreshProfile: async () => {},
  setCurrentSessionUser: () => {},
  toggleStorageMode: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState<'local' | 'cloud'>(getStorageMode());

  const isLocalStorageMode = currentMode === 'local';

  const loadSession = async () => {
    try {
      const local = getLocalSession();
      if (local) {
        setCurrentUser(local);
        // Always refresh latest user profile from Cloud Supabase to prevent stale mobile cache
        if (isSupabaseActive()) {
          try {
            const users = await fetchAllUsers();
            const found = users.find(u => 
              u.id === local.id || 
              (u.email && local.email && u.email.toLowerCase() === local.email.toLowerCase())
            );
            if (found) {
              setCurrentUser(found);
              setLocalSession(found);
            }
          } catch (e) {
            console.warn("Notice syncing mobile profile from cloud:", e);
          }
        }
        setLoading(false);
        return;
      }

      if (isSupabaseActive()) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const users = await fetchAllUsers();
          const found = users.find(u => u.id === session.user.id);
          if (found) {
            setCurrentUser(found);
            setLocalSession(found);
          } else {
            const newUser: User = {
              id: session.user.id,
              role: 'tnv',
              fullName: session.user.email?.split('@')[0] || 'TNV User',
              email: session.user.email || '',
              phone: '',
              department: 'Hậu cần',
              salaryRate: 50000,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            setCurrentUser(newUser);
            setLocalSession(newUser);
          }
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Session load error:", err);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();

    if (isSupabaseActive()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session && !getLocalSession()) {
          setCurrentUser(null);
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [currentMode]);

  const refreshProfile = async () => {
    await loadSession();
  };

  const setCurrentSessionUser = (user: User | null) => {
    setCurrentUser(user);
    setLocalSession(user);
  };

  const toggleStorageMode = (mode: 'local' | 'cloud') => {
    setStorageMode(mode);
    setCurrentMode(mode);
  };

  const logout = async () => {
    if (isSupabaseActive()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("Supabase signout notice:", e);
      }
    }
    setLocalSession(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile: currentUser,
      loading,
      isLocalStorageMode,
      refreshProfile,
      setCurrentSessionUser,
      toggleStorageMode,
      logout,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
