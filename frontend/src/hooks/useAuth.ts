import { useState, useEffect } from 'react';
import { User } from '../types';
import authService from '../services/authService';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const stored = localStorage.getItem('auth_user');

    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        authService.logout();
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return { user, loading, logout };
}
