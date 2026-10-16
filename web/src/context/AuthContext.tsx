import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { apiRequest, setApiToken } from '../services/api';
import { unregisterNativeFcmToken } from '../services/nativePush';

type NativeAuthBridge = {
  getAuthToken?: () => string;
  setAuthToken?: (token: string) => void;
  clearAuthToken?: () => void;
};

function getNativeAuthBridge(): NativeAuthBridge | null {
  if (typeof window === 'undefined') return null;
  return ((window as any).TimePlusAndroid as NativeAuthBridge | undefined) || null;
}

function restoreNativeAuthToken(): void {
  try {
    const token = getNativeAuthBridge()?.getAuthToken?.()?.trim();
    if (token) setApiToken(token);
  } catch {
    // Browser/PWA mode has no native bridge.
  }
}

function persistNativeAuthToken(token: string): void {
  try {
    getNativeAuthBridge()?.setAuthToken?.(token);
  } catch {
    // Best effort only; the web session still works.
  }
}

function clearNativeAuthToken(): void {
  try {
    getNativeAuthBridge()?.clearAuthToken?.();
  } catch {
    // Best effort only.
  }
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isInitialized: boolean;
  familyName: string;
  publicChildren: { id: string; name: string; avatar: string; color: string }[];
  login: (role: 'parent' | 'child', pin: string, childId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(true);
  const [familyName, setFamilyName] = useState('משפחה');
  const [publicChildren, setPublicChildren] = useState<{ id: string; name: string; avatar: string; color: string }[]>([]);

  const checkStatus = async () => {
    try {
      const res = await apiRequest<{
        initialized: boolean;
        familyName?: string;
        children?: { id: string; name: string; avatar: string; color: string }[];
      }>('/api/setup/status');
      setIsInitialized(res.initialized);
      if (res.familyName) setFamilyName(res.familyName);
      if (res.children) setPublicChildren(res.children);
    } catch (e) {
      console.error('Failed to check setup status', e);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await apiRequest<{ success: boolean; user: AuthUser }>('/api/auth/me');
      if (res.success && res.user) setUser(res.user);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      restoreNativeAuthToken();
      await checkStatus();
      await refreshUser();
    };
    init();
  }, []);

  const login = async (role: 'parent' | 'child', pin: string, childId?: string) => {
    const res = await apiRequest<{ success: boolean; user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, pin, childId }),
    });
    if (res.success && res.user) {
      if (res.token) {
        setApiToken(res.token);
        persistNativeAuthToken(res.token);
      }
      setUser(res.user);
    }
  };

  const logout = async () => {
    try {
      await unregisterNativeFcmToken();
    } catch {
      // Best-effort cleanup; logout must still continue.
    }
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // The local/native credentials are still cleared below.
    }
    setApiToken(null);
    clearNativeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isInitialized, familyName, publicChildren, login, logout, refreshUser, checkStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
