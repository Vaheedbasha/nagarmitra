import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { COMPLAINTS, advanceComplaint } from "@/data/complaints";
import type { Complaint, StatusId } from "@/types";

interface ComplaintsContextValue {
  complaints: Complaint[];
  addComplaint: (complaint: Complaint) => void;
  updateStatus: (id: string, status: StatusId, note?: string) => Complaint | undefined;
  upvote: (id: string) => void;
}

const ComplaintsContext = createContext<ComplaintsContextValue | null>(null);

export function ComplaintsProvider({ children }: { children: ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>(COMPLAINTS);

  const addComplaint = useCallback((complaint: Complaint) => {
    setComplaints((current) => [complaint, ...current]);
  }, []);

  const updateStatus = useCallback(
    (id: string, status: StatusId, note?: string) => {
      let updated: Complaint | undefined;
      setComplaints((current) =>
        current.map((complaint) => {
          if (complaint.id !== id) return complaint;
          updated = advanceComplaint(complaint, status, note);
          return updated;
        })
      );
      return updated;
    },
    []
  );

  const upvote = useCallback((id: string) => {
    setComplaints((current) =>
      current.map((complaint) =>
        complaint.id === id
          ? { ...complaint, upvotes: complaint.upvotes + 1 }
          : complaint
      )
    );
  }, []);

  const value = useMemo(
    () => ({ complaints, addComplaint, updateStatus, upvote }),
    [complaints, addComplaint, updateStatus, upvote]
  );

  return (
    <ComplaintsContext.Provider value={value}>
      {children}
    </ComplaintsContext.Provider>
  );
}

export function useComplaints() {
  const context = useContext(ComplaintsContext);
  if (!context) {
    throw new Error("useComplaints must be used inside ComplaintsProvider");
  }
  return context;
}

export function useComplaint(id: string | undefined) {
  const { complaints } = useComplaints();
  return complaints.find((complaint) => complaint.id === id);
}
