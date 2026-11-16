import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getMe, loginUser, registerUser } from "../api";
import type { User, LoginParams, RegisterParams } from "../api";
import { useToast } from "./ToastContext";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("recipegenie_token"));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { showToast } = useToast();

  // Restore session on app load
  useEffect(() => {
    const savedToken = localStorage.getItem("recipegenie_token");
    if (!savedToken) {
      setIsLoading(false);
      return;
    }

    getMe()
      .then((userData) => {
        setUser(userData);
        setToken(savedToken);
      })
      .catch(() => {
        // Token was invalid or expired
        localStorage.removeItem("recipegenie_token");
        setUser(null);
        setToken(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Listen to 401 session-ended event triggered by api client
  useEffect(() => {
    const handleSessionEnded = () => {
      setUser(null);
      setToken(null);
      showToast("Session ended. Please sign in again.", "info");
    };

    window.addEventListener("recipegenie:session-ended", handleSessionEnded);
    return () => window.removeEventListener("recipegenie:session-ended", handleSessionEnded);
  }, [showToast]);

  const login = async (params: LoginParams) => {
    const data = await loginUser(params);
    localStorage.setItem("recipegenie_token", data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const register = async (params: RegisterParams) => {
    const data = await registerUser(params);
    localStorage.setItem("recipegenie_token", data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("recipegenie_token");
    setUser(null);
    setToken(null);
    showToast("Signed out. See you in the kitchen soon!", "info");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
