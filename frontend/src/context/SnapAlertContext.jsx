import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAlerts, getSnapAlertSettings } from '../api/client';

const SnapAlertContext = createContext(null);

export function SnapAlertProvider({ children }) {
  const [userId, setUserId] = useState(() => {
    const stored = localStorage.getItem('snapalert_user_id');
    return stored ? parseInt(stored) : null;
  });
  const [enabled, setEnabled] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshAlerts = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getAlerts(userId, 20);
      const prev = alerts.length;
      setAlerts(data);
      if (data.length > prev) {
        setUnreadCount(c => c + (data.length - prev));
      }
    } catch (e) {
      console.error('Failed to fetch alerts', e);
    }
  }, [userId, alerts.length]);

  const refreshSettings = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getSnapAlertSettings(userId);
      setSettings(data);
      setEnabled(data.enabled);
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  }, [userId]);

  // Save userId to localStorage
  useEffect(() => {
    if (userId) localStorage.setItem('snapalert_user_id', userId.toString());
  }, [userId]);

  // Initial load
  useEffect(() => {
    if (userId) {
      refreshSettings();
      refreshAlerts();
    }
  }, [userId]);

  // Poll every 30s for new alerts
  useEffect(() => {
    if (!userId || !enabled) return;
    const interval = setInterval(refreshAlerts, 30_000);
    return () => clearInterval(interval);
  }, [userId, enabled, refreshAlerts]);

  const markAllRead = () => setUnreadCount(0);

  return (
    <SnapAlertContext.Provider value={{
      userId, setUserId,
      enabled, setEnabled,
      alerts, setAlerts,
      unreadCount, markAllRead,
      settings, setSettings,
      loading, setLoading,
      refreshAlerts, refreshSettings,
    }}>
      {children}
    </SnapAlertContext.Provider>
  );
}

export function useSnapAlert() {
  const ctx = useContext(SnapAlertContext);
  if (!ctx) throw new Error('useSnapAlert must be used within SnapAlertProvider');
  return ctx;
}
