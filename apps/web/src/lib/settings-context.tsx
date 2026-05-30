'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface SiteSettings {
  paymentEnabled: boolean;
  razorpayLive: boolean;
  tamilEnabled: boolean;
  bilingualEnabled: boolean;
  maintenanceMode: boolean;
  freeShippingThreshold: number;
  maxPreviewsPerDay: number;
}

const DEFAULT_SETTINGS: SiteSettings = {
  paymentEnabled: false,
  razorpayLive: false,
  tamilEnabled: false,
  bilingualEnabled: false,
  maintenanceMode: false,
  freeShippingThreshold: 0,
  maxPreviewsPerDay: 5,
};

const SettingsContext = createContext<SiteSettings>(DEFAULT_SETTINGS);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

    fetch(`${apiUrl}/settings`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setSettings({ ...DEFAULT_SETTINGS, ...data.data });
        }
      })
      .catch(() => {
        // Use defaults on failure
      });
  }, []);

  const value = useMemo(() => settings, [settings]);

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SiteSettings {
  return useContext(SettingsContext);
}
