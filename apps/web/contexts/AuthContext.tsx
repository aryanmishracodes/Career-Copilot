"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
  oauth_provider?: string | null;
  created_at?: string | null;
  streak_days?: number;
  xp_total?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/v1`;

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  updateUser: () => {},
  refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async (t: string) => {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });

    if (res.ok) return res.json() as Promise<User>;
    return null;
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const userData = await fetchUser(storedToken);
          if (userData) {
            setUser(userData);
            setToken(storedToken);
          } else {
            localStorage.removeItem("token");
          }
        } catch {
          localStorage.removeItem("token");
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    router.push("/login");
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const refreshUser = async () => {
    const t = localStorage.getItem("token");
    if (!t) return;
    const userData = await fetchUser(t);
    if (userData) setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
