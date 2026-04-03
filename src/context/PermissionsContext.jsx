import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getProfile } from '../modules/profile/profile.service';

const PermissionsContext = createContext({
  profile: null,
  permissions: [],
  loading: true,
  refresh: () => {},
});

const readUserFromStorage = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const PermissionsProvider = ({ children }) => {
  const [profile, setProfile] = useState(() => readUserFromStorage());
  const [permissions, setPermissions] = useState(() => readUserFromStorage()?.permissions || []);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setProfile(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
      setPermissions(data.permissions || []);
      // Sync to localStorage so plain-function helpers stay current
      localStorage.setItem('user', JSON.stringify(data));
    } catch {
      // If API fails, fallback to localStorage data
      const stored = readUserFromStorage();
      if (stored) {
        setProfile(stored);
        setPermissions(stored.permissions || []);
      } else {
        setProfile(null);
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return (
    <PermissionsContext.Provider value={{ profile, permissions, loading, refresh: fetchProfile }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => useContext(PermissionsContext);
