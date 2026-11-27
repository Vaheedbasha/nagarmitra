import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

interface NotificationItem {
  id: string;
  complaintId: string | null;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export function NotificationsBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: NotificationItem[]; unread: number }>("/api/notifications");
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* the bell simply stays empty when offline */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    // Polling keeps the badge current without a persistent socket.
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const markRead = async (id: string) => {
    try {
      const data = await api<{ unread: number }>(`/api/notifications/${id}/read`, { method: "POST" });
      setItems((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setUnread(data.unread);
    } catch {
      /* ignore */
    }
  };

  const markAll = async () => {
    try {
      await api("/api/notifications/read-all", { method: "POST" });
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0);
    } catch {
      /* ignore */
    }
  };

  const openItem = async (item: NotificationItem) => {
    if (!item.read) await markRead(item.id);
    setOpen(false);
    if (item.complaintId) navigate(`/admin/complaints/${item.complaintId}`);
    else if (item.type === "official_request") navigate("/admin/settings");
  };

  return (
    <div className="relative" ref={panel}>
      <button
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
        className="relative rounded-lg border border-line bg-white p-2 text-slate-500 transition hover:text-slate-800"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
      >
        <Bell size={16} />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-[330px] overflow-hidden rounded-xl border border-line bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <p className="text-[12px] font-bold text-slate-800">Notifications</p>
            <button
              onClick={markAll}
              disabled={unread === 0}
              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand-600 disabled:text-slate-300"
            >
              <CheckCheck size={12} /> Mark all read
            </button>
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="flex items-center gap-2 px-3 py-4 text-[11px] text-slate-400">
                <Loader2 size={12} className="animate-spin" /> Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-[11.5px] text-slate-400">
                You're all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => void openItem(item)}
                      className={cn(
                        "flex w-full gap-2 px-3 py-2.5 text-left transition hover:bg-slate-50",
                        !item.read && "bg-brand-50/40"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                          item.read ? "bg-slate-200" : "bg-brand-500"
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11.5px] font-semibold leading-snug text-slate-800">
                          {item.title}
                        </span>
                        {item.body ? (
                          <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-500">{item.body}</span>
                        ) : null}
                        <span className="mt-0.5 block text-[9.5px] text-slate-400">{timeAgo(item.createdAt.slice(0, 10))}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
