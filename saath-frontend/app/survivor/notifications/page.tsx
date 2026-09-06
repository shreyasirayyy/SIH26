"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { notificationService } from "@/services/notifications";
import { useAppStore } from "@/store/useAppStore";

export default function NotificationsPage() {
  const hindi = useAppStore((store) => store.language === "Hindi");
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; createdAt: string; read: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService.getNotifications()
      .then((items: any) => {
        setNotifications(items);
        setLoading(false);
      })
      .catch(() => {
        setNotifications([]);
        setLoading(false);
      });
  }, []);

  async function markAsRead(id: string) {
    await notificationService.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-text-secondary">
        ← {hindi ? "होम पर वापस जाएँ" : "Back to home"}
      </Link>
      <p className="text-xs font-bold uppercase tracking-[.2em] text-text-secondary">
        {hindi ? "सूचना केंद्र" : "Notification centre"}
      </p>
      <h1 className="mt-3 font-display text-4xl text-text-primary md:text-5xl">
        {hindi ? "आपकी सूचनाएँ" : "Your notifications"}
      </h1>

      <div className="mt-10 space-y-4">
        {loading ? (
          <p className="text-text-secondary">{hindi ? "लोड हो रहा है..." : "Loading..."}</p>
        ) : notifications.length === 0 ? (
          <div className="surface rounded-3xl p-8 text-center">
            <p className="text-text-secondary">{hindi ? "कोई नई सूचना नहीं है।" : "No new notifications."}</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              className={`surface rounded-2xl p-5 flex items-start gap-4 ${n.read ? "opacity-70" : "border-l-4 border-deep-teal"}`}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              <Bell className={`shrink-0 ${n.read ? "text-text-secondary" : "text-deep-teal"}`} size={20} />
              <div>
                <p className="font-semibold text-text-primary">{n.title}</p>
                <p className="text-sm text-text-secondary mt-1">{n.message}</p>
                <p className="text-xs text-text-secondary mt-2">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
