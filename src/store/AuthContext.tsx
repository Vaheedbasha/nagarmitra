import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getToken, setToken } from "@/lib/api";
import type { SessionUser } from "@/types";
import { useToast } from "@/store/ToastContext";

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  area?: string;
  language: "en" | "hi" | "te";
}

interface OfficialInput extends RegisterInput {
  department: string;
  designation: string;
  ward: string;
  organisation: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<{ pendingApproval: boolean; user: SessionUser }>;
  register: (input: RegisterInput) => Promise<void>;
  registerOfficial: (input: OfficialInput) => Promise<{ status: string; message: string }>;
  logout: () => Promise<void>;
  updateProfile: (patch: Partial<Record<string, unknown>>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const CACHED_USER_KEY = "nagarmitra_cached_user";

function getCachedUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function setCachedUser(user: SessionUser | null) {
  try {
    if (user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
    }
  } catch {
    // ignore
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(() => {
    if (getToken()) {
      return getCachedUser();
    }
    return null;
  });
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(() => !getToken() ? false : !getCachedUser());
  const { toast } = useToast();

  const setUser = useCallback((nextUser: SessionUser | null) => {
    setUserState(nextUser);
    setCachedUser(nextUser);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ user: SessionUser }>("/api/auth/me");
      setUser(data.user);
    } catch (err: any) {
      if (err?.status === 401) {
        // Retry once after 350ms in case serverless cold-start synchronization is completing
        try {
          await new Promise((r) => setTimeout(r, 350));
          const retryData = await api<{ user: SessionUser }>("/api/auth/me");
          setUser(retryData.user);
          return;
        } catch {
          setToken(null);
          setTokenState(null);
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (identifier: string, password: string) => {
    const data = await api<{ token: string; user: SessionUser; pendingApproval?: boolean }>(
      "/api/auth/login",
      { method: "POST", body: { identifier, password }, anonymous: true }
    );
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    return { pendingApproval: Boolean(data.pendingApproval), user: data.user };
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const data = await api<{ token: string; user: SessionUser }>("/api/auth/register", {
      method: "POST",
      body: input,
      anonymous: true,
    });
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
  }, []);

  const registerOfficial = useCallback(async (input: OfficialInput) => {
    return api<{ status: string; message: string }>("/api/auth/register-official", {
      method: "POST",
      body: input,
      anonymous: true,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* the local session is cleared regardless */
    }
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Record<string, unknown>>) => {
      const data = await api<{ user: SessionUser }>("/api/auth/me", { method: "PATCH", body: patch });
      setUser(data.user);
      toast({ title: "Profile updated", variant: "success" });
    },
    [toast]
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const data = await api<{ token: string }>("/api/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setToken(data.token);
      setTokenState(data.token);
      toast({ title: "Password changed", description: "Other sessions were signed out.", variant: "success" });
    },
    [toast]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isStaff: Boolean(user && (user.role === "admin" || (user.role === "official" && user.officialStatus === "approved"))),
      isAdmin: user?.role === "admin",
      login,
      register,
      registerOfficial,
      logout,
      updateProfile,
      changePassword,
      refreshUser,
    }),
    [user, token, loading, login, register, registerOfficial, logout, updateProfile, changePassword, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
