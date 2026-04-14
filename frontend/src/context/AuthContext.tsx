import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser, getMe } from "../api/auth";

interface AuthContextType {
  user: AuthUser | null;
  accessToken: string | null;
  login: (token: string, refreshToken: string, user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On app load, restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("access_token");
    if (storedToken) {
      getMe(storedToken)
        .then((userData) => {
          setUser(userData);
          setAccessToken(storedToken);
        })
        .catch(() => {
          // Token expired or invalid — clear storage
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  function login(token: string, refreshTok: string, userData: AuthUser) {
    localStorage.setItem("access_token", token);
    localStorage.setItem("refresh_token", refreshTok);
    setAccessToken(token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use this in any component: const { user, logout } = useAuth();
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}