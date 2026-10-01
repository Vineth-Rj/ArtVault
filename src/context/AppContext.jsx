// AppContext.jsx — ArtVault Global State
// Provides auth state (user, login, logout, register) and UI state (wallet, notifications).

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth';
import portfolioService from '../services/portfolioService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);          // null = logged out
  const [authLoading, setAuthLoading] = useState(true); // true until first /me resolves
  const [wallet, setWallet] = useState({ balance: 0 });
  const [ownedUnits, setOwnedUnits] = useState([]);
  const [notification, setNotification] = useState(null);

  // ── Resolve current user on mount ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function boot() {
      const { data } = await authService.getCurrentUser();
      if (cancelled) return;
      if (data) {
        setUser(data);
        // Load wallet balance from backend
        const walletRes = await portfolioService.getWallet();
        if (!cancelled && walletRes.data) {
          const w = walletRes.data;
          setWallet({ balance: Number(w.balance ?? w.walletBalance ?? 0) });
        }
      }
      setAuthLoading(false);
    }
    boot();
    return () => { cancelled = true; };
  }, []);

  // ── Notifications ──────────────────────────────────────────────────────────
  const notify = useCallback((message, type = 'success') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data, error } = await authService.login(email, password);
    if (error) return { error };
    setUser(data.user);
    setWallet({ balance: Number(data.user.walletBalance ?? 0) });
    notify('Welcome back!');
    return { data };
  }, [notify]);

  const register = useCallback(async (name, email, password, role) => {
    const { data, error } = await authService.register(name, email, password, role);
    if (error) return { error };
    setUser(data.user);
    setWallet({ balance: Number(data.user.walletBalance ?? 0) });
    notify('Account created — welcome to ArtVault!');
    return { data };
  }, [notify]);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setWallet({ balance: 0 });
    setOwnedUnits([]);
    notify('Signed out.', 'info');
  }, [notify]);

  // ── Wallet helpers (optimistic update) ────────────────────────────────────
  const addOwnedUnit = useCallback((unit) => {
    setOwnedUnits(prev => [...prev, unit]);
    setWallet(prev => ({ ...prev, balance: prev.balance - unit.purchasePrice }));
  }, []);

  const deductCredits = useCallback((amount) => {
    setWallet(prev => ({ ...prev, balance: prev.balance - amount }));
  }, []);

  const addCredits = useCallback((amount) => {
    setWallet(prev => ({ ...prev, balance: prev.balance + amount }));
  }, []);

  const refreshWallet = useCallback(async () => {
    const { data } = await portfolioService.getWallet();
    if (data) setWallet({ balance: Number(data.balance ?? data.walletBalance ?? 0) });
  }, []);

  return (
    <AppContext.Provider value={{
      // Auth
      user,
      authLoading,
      isAuthenticated: !!user,
      isArtist: user?.role === 'ARTIST',
      login,
      register,
      logout,
      // Wallet
      wallet,
      ownedUnits,
      addOwnedUnit,
      deductCredits,
      addCredits,
      refreshWallet,
      // UI
      notification,
      notify,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
