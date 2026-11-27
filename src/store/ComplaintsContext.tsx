import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/AuthContext";
import { useToast } from "@/store/ToastContext";
import type {
  Complaint,
  ComplaintStats,
  CreateComplaintInput,
  StatusId,
  VerificationDecision,
} from "@/types";
import type { Language } from "@/lib/translations";

interface ComplaintList {
  items: Complaint[];
  total: number;
}

interface StaffUpdate {
  status?: StatusId;
  resolutionNote?: string;
  assignedDepartment?: string;
  assignedOfficial?: string;
  slaDays?: number;
  escalateTo?: string;
  escalationSla?: string;
  escalationNote?: string;
  note?: string;
  [key: string]: unknown;
}

interface ComplaintsContextValue {
  complaints: Complaint[];
  myComplaints: Complaint[];
  stats: ComplaintStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createComplaint: (input: CreateComplaintInput) => Promise<Complaint>;
  updateStatus: (id: string, status: StatusId, note?: string) => Promise<void>;
  updateComplaint: (id: string, updates: StaffUpdate) => Promise<void>;
  escalateComplaint: (id: string, authorityTag: string, sla?: string, note?: string) => Promise<void>;
  decideVerification: (id: string, decision: VerificationDecision, note?: string) => Promise<void>;
  upvote: (id: string) => Promise<void>;
  addComment: (complaintId: string, text: string, author?: string) => Promise<void>;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  clearError: () => void;
}

const EMPTY_STATS: ComplaintStats = {
  total: 0,
  resolved: 0,
  inProgress: 0,
  highPriority: 0,
  submitted: 0,
  confirmations: 0,
};

const ComplaintsContext = createContext<ComplaintsContextValue | null>(null);
const CITY_KEY = "nagarmitra.city";
const LANGUAGE_KEY = "nagarmitra.language";

export const CITIES = ["Riverton", "Metro Heights", "Bay City"] as const;

export function ComplaintsProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [myComplaints, setMyComplaints] = useState<Complaint[]>([]);
  const [stats, setStats] = useState<ComplaintStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [selectedCity, setSelectedCityState] = useState<string>(
    () => window.localStorage.getItem(CITY_KEY) ?? "Riverton"
  );
  const [language, setLanguageState] = useState<Language>(
    () => ((user?.language as Language) ?? (window.localStorage.getItem(LANGUAGE_KEY) as Language) ?? "en")
  );

  useEffect(() => {
    if (user?.language) setLanguageState(user.language);
  }, [user?.language]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
      document.documentElement.lang = language;
    } catch {
      /* ignore storage errors */
    }
  }, [language]);

  const setSelectedCity = useCallback((city: string) => {
    setSelectedCityState(city);
    try {
      window.localStorage.setItem(CITY_KEY, city);
    } catch {
      /* ignore */
    }
  }, []);

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      if (user) {
        void api("/api/auth/me", { method: "PATCH", body: { language: next } }).catch(() => undefined);
      }
    },
    [user]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ city: selectedCity, pageSize: "100" });
      const [list, cityStats] = await Promise.all([
        api<ComplaintList>(`/api/complaints?${query.toString()}`),
        api<ComplaintStats>(`/api/complaints/stats?city=${encodeURIComponent(selectedCity)}`),
      ]);
      setComplaints(list.items);
      setStats(cityStats);
      if (user) {
        const mine = await api<ComplaintList>("/api/complaints?mine=true&pageSize=100");
        setMyComplaints(mine.items);
      } else {
        setMyComplaints([]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load complaints.");
    } finally {
      setLoading(false);
    }
  }, [selectedCity, user]);

  useEffect(() => {
    void refresh();
  }, [refresh, version]);

  const bump = useCallback(() => setVersion((value) => value + 1), []);

  const createComplaint = useCallback(
    async (input: CreateComplaintInput) => {
      const data = await api<{ complaint: Complaint }>("/api/complaints", {
        method: "POST",
        body: {
          ...input,
          city: input.city || selectedCity,
          area: input.area || input.location.split(",")[0]?.trim(),
        },
      });
      bump();
      void refreshUser();
      return data.complaint;
    },
    [bump, refreshUser, selectedCity]
  );

  const updateStatus = useCallback(
    async (id: string, status: StatusId, note?: string) => {
      await api(`/api/admin/complaints/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { status, note, resolutionNote: note },
      });
      bump();
      toast({ title: `Status updated to ${status}`, variant: "success" });
    },
    [bump, toast]
  );

  const updateComplaint = useCallback(
    async (id: string, updates: StaffUpdate) => {
      await api(`/api/admin/complaints/${encodeURIComponent(id)}`, { method: "PATCH", body: updates });
      bump();
      toast({ title: "Complaint updated", variant: "success" });
    },
    [bump, toast]
  );

  const escalateComplaint = useCallback(
    async (id: string, authorityTag: string, sla = "Urgent 24hr", note = "") => {
      await api(`/api/admin/complaints/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: { escalateTo: authorityTag, escalationSla: sla, escalationNote: note },
      });
      bump();
      toast({
        title: "Escalation recorded",
        description: `Dispatched to ${authorityTag} (${sla}).`,
        variant: "success",
      });
    },
    [bump, toast]
  );

  const decideVerification = useCallback(
    async (id: string, decision: VerificationDecision, note = "") => {
      await api(`/api/admin/complaints/${encodeURIComponent(id)}/verification`, {
        method: "POST",
        body: { decision, note },
      });
      bump();
    },
    [bump]
  );

  const upvote = useCallback(
    async (id: string) => {
      try {
        await api(`/api/complaints/${encodeURIComponent(id)}/confirm`, { method: "POST" });
        bump();
      } catch (caught) {
        toast({
          title: caught instanceof Error ? caught.message : "Could not confirm this report",
          variant: "error",
        });
      }
    },
    [bump, toast]
  );

  const addComment = useCallback(
    async (complaintId: string, text: string) => {
      if (text.trim().length < 2) return;
      await api(`/api/complaints/${encodeURIComponent(complaintId)}/comments`, {
        method: "POST",
        body: { text },
      });
      bump();
      toast({ title: "Comment posted", variant: "success" });
    },
    [bump, toast]
  );

  const value = useMemo<ComplaintsContextValue>(
    () => ({
      complaints,
      myComplaints,
      stats,
      loading,
      error,
      refresh,
      createComplaint,
      updateStatus,
      updateComplaint,
      escalateComplaint,
      decideVerification,
      upvote,
      addComment,
      selectedCity,
      setSelectedCity,
      language,
      setLanguage,
      clearError: () => setError(null),
    }),
    [
      complaints,
      myComplaints,
      stats,
      loading,
      error,
      refresh,
      createComplaint,
      updateStatus,
      updateComplaint,
      escalateComplaint,
      decideVerification,
      upvote,
      addComment,
      selectedCity,
      setSelectedCity,
      language,
      setLanguage,
    ]
  );

  return <ComplaintsContext.Provider value={value}>{children}</ComplaintsContext.Provider>;
}

export function useComplaints() {
  const context = useContext(ComplaintsContext);
  if (!context) throw new Error("useComplaints must be used inside ComplaintsProvider");
  return context;
}

export function useComplaint(id: string | undefined) {
  const { complaints, myComplaints } = useComplaints();
  return complaints.find((complaint) => complaint.id === id) ?? myComplaints.find((c) => c.id === id);
}
