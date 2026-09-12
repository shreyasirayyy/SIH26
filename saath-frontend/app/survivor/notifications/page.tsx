"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronRight,
  Gavel,
  HandCoins,
  HeartHandshake,
  CalendarClock,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  ArrowLeft,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { NotificationItem, NotificationType } from "@/types";

function getCategoryMeta(type: NotificationType) {
  switch (type) {
    case "case_connected":
      return {
        label: "Case Connected",
        labelHi: "मामला जुड़ा",
        icon: ShieldCheck,
        containerStyle: "bg-[color:var(--success-bg)] text-[color:var(--success)]",
        href: "/survivor/case",
        actionText: "View case",
        actionTextHi: "केस देखें",
      };
    case "case_stage_updated":
      return {
        label: "Case Stage",
        labelHi: "केस चरण",
        icon: Scale,
        containerStyle: "bg-[color:var(--primary-teal-dark)] text-[color:var(--primary-teal)]",
        href: "/survivor/case",
        actionText: "Track progress",
        actionTextHi: "प्रगति देखें",
      };
    case "upcoming_hearing":
      return {
        label: "Hearing",
        labelHi: "सुनवाई",
        icon: Gavel,
        containerStyle: "bg-[color:var(--warning-bg)] text-[color:var(--warning)]",
        href: "/survivor/case",
        actionText: "Court details",
        actionTextHi: "अदालत विवरण",
      };
    case "counsellor_assigned":
      return {
        label: "Counsellor",
        labelHi: "परामर्शदाता",
        icon: HeartHandshake,
        containerStyle: "bg-[color:var(--info-bg)] text-[color:var(--info)]",
        href: "/survivor/my-space",
        actionText: "Support team",
        actionTextHi: "सहायता टीम",
      };
    case "counselling_appointment":
      return {
        label: "Counselling",
        labelHi: "परामर्श",
        icon: CalendarClock,
        containerStyle: "bg-[color:var(--info-bg)] text-[color:var(--info)]",
        href: "/survivor/my-space",
        actionText: "Session schedule",
        actionTextHi: "सत्र अनुसूची",
      };
    case "legal_protection_update":
      return {
        label: "Protection & Aid",
        labelHi: "सुरक्षा एवं सहायता",
        icon: ShieldAlert,
        containerStyle: "bg-[#fbe6e0] text-[#a15f4e]",
        href: "/survivor/safety",
        actionText: "Safety services",
        actionTextHi: "सुरक्षा सेवाएं",
      };
    case "financial_relief_update":
      return {
        label: "Financial Relief",
        labelHi: "वित्तीय सहायता",
        icon: HandCoins,
        containerStyle: "bg-[color:var(--warning-bg)] text-[color:var(--warning)]",
        href: "/survivor/case",
        actionText: "Relief details",
        actionTextHi: "राहत विवरण",
      };
    case "daily_checkin":
    default:
      return {
        label: "Daily Check-in",
        labelHi: "दैनिक चेक-इन",
        icon: Sun,
        containerStyle: "bg-[#fff3e0] text-[#d97706]",
        href: "/survivor/check-in",
        actionText: "Start check-in",
        actionTextHi: "चेक-इन शुरू करें",
      };
  }
}

function formatNotificationTime(isoString: string, hindi: boolean): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    const timeStr = date.toLocaleTimeString(hindi ? "hi-IN" : "en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (isToday) {
      return hindi ? `आज, ${timeStr}` : `Today, ${timeStr}`;
    }

    const dateStr = date.toLocaleDateString(hindi ? "hi-IN" : "en-IN", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });

    return `${dateStr} · ${timeStr}`;
  } catch {
    return "";
  }
}

export default function NotificationsPage() {
  const language = useAppStore((state) => state.language);
  const hindi = language === "Hindi";
  const notifications = useAppStore((state) => state.notifications);
  const unreadCount = useAppStore((state) => state.unreadNotificationCount);
  const fetchNotifications = useAppStore((state) => state.fetchNotifications);
  const markNotificationRead = useAppStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useAppStore((state) => state.markAllNotificationsRead);

  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications().finally(() => setLoading(false));
  }, [fetchNotifications]);

  const displayedNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  async function handleMarkAllAsRead() {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    await markAllNotificationsRead();
    setMarkingAll(false);
  }

  return (
    <div className="px-5 pb-12 md:px-10 xl:px-14">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/survivor"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-deep-teal transition-colors"
        >
          <ArrowLeft size={16} />
          {hindi ? "होम पर वापस जाएँ" : "Back to home"}
        </Link>
      </div>

      {/* Header Banner */}
      <div className="surface rounded-3xl p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border-color/70 bg-[color:var(--surface-subtle)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-text-secondary">
              <Bell size={13} className="text-deep-teal" />
              {hindi ? "सूचना केंद्र" : "Notification Centre"}
            </div>
            <h1 className="mt-3 font-editorial text-3xl tracking-tight text-text-primary md:text-5xl">
              {hindi ? (
                <>सूचनाएँ और <span className="italic text-deep-teal">अपडेट</span></>
              ) : (
                <>Notifications <span className="italic text-deep-teal">& Updates</span></>
              )}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary md:text-base">
              {hindi ? (
                <span>आपके मामले, सहायता और <strong className="font-semibold text-text-primary">स्वास्थ्य से जुड़े अद्यतन संदेश</strong></span>
              ) : (
                <span>Updates about your case, support, and <strong className="font-semibold text-text-primary">wellbeing</strong></span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warm-peach/15 px-3 py-1.5 text-xs font-bold text-[#b45309]">
                <span className="h-2 w-2 rounded-full bg-warm-peach animate-pulse" />
                {unreadCount} {hindi ? "अपठित सूचनाएँ" : "unread notifications"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success-bg)] px-3 py-1.5 text-xs font-bold text-[color:var(--success)]">
                <Check size={14} />
                {hindi ? "सभी सूचनाएँ पढ़ी जा चुकी हैं" : "All caught up"}
              </span>
            )}

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={markingAll}
                className="inline-flex items-center gap-2 rounded-xl border border-border-color bg-[color:var(--surface)] px-4 py-2 text-xs font-bold text-text-primary shadow-sm hover:border-[color:var(--primary-teal)] hover:text-deep-teal transition-all disabled:opacity-50"
              >
                <CheckCheck size={16} />
                {markingAll
                  ? hindi
                    ? "चिह्नित हो रहा है..."
                    : "Marking read..."
                  : hindi
                  ? "सभी को पढ़ा हुआ चिह्नित करें"
                  : "Mark all as read"}
              </button>
            )}
          </div>
        </div>

        {/* Filter Navigation */}
        <div className="mt-6 flex items-center gap-2 border-t border-border-color/60 pt-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filter === "all"
                ? "bg-deep-teal text-white shadow-sm"
                : "text-text-secondary hover:bg-[color:var(--surface-subtle)] hover:text-text-primary"
            }`}
          >
            {hindi ? "सभी" : "All"} ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              filter === "unread"
                ? "bg-deep-teal text-white shadow-sm"
                : "text-text-secondary hover:bg-[color:var(--surface-subtle)] hover:text-text-primary"
            }`}
          >
            {hindi ? "अपठित" : "Unread"} ({unreadCount})
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="mt-8">
        {loading ? (
          <div className="surface rounded-3xl p-12 text-center">
            <p className="text-sm font-semibold text-text-secondary">
              {hindi ? "सूचनाएँ लोड हो रही हैं..." : "Loading notifications..."}
            </p>
          </div>
        ) : displayedNotifications.length === 0 ? (
          <div className="surface rounded-3xl p-12 text-center max-w-xl mx-auto my-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--surface-subtle)] text-text-secondary">
              <BellOff size={24} />
            </div>
            <h2 className="mt-4 font-display text-2xl text-text-primary">
              {filter === "unread"
                ? hindi
                  ? "कोई अपठित सूचना नहीं है"
                  : "No unread notifications"
                : hindi
                ? "कोई नई सूचना नहीं है"
                : "No notifications available"}
            </h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              {filter === "unread"
                ? hindi
                  ? "आपने सभी सूचनाएँ देख ली हैं। नई सूचनाएँ आने पर वे यहाँ दिखाई देंगी।"
                  : "You have reviewed all your updates. New case updates or reminders will appear here."
                : hindi
                ? "आपके केस और दैनिक चेक-इन से संबंधित अपडेट उपलब्ध होने पर यहाँ प्रदर्शित किए जाएंगे।"
                : "Updates regarding your case, assigned support, and daily check-ins will appear here as they occur."}
            </p>
            {filter === "unread" && notifications.length > 0 && (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-deep-teal hover:underline"
              >
                {hindi ? "सभी पुरानी सूचनाएँ देखें" : "View all notifications"} →
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {displayedNotifications.map((n) => {
              const meta = getCategoryMeta(n.type);
              const Icon = meta.icon;
              const formattedTime = formatNotificationTime(n.createdAt, hindi);

              return (
                <article
                  key={n.id}
                  onClick={() => !n.read && markNotificationRead(n.id)}
                  className={`group relative rounded-2xl p-5 md:p-6 transition-all duration-200 border ${
                    n.read
                      ? "surface opacity-80 hover:opacity-100 hover:border-border-color"
                      : "surface-raised border-l-4 border-l-deep-teal border-border-color shadow-sm hover:shadow-md cursor-pointer"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Category Icon */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${meta.containerStyle}`}
                    >
                      <Icon size={20} />
                    </div>

                    {/* Notification Body */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border-color/60 bg-[color:var(--surface-subtle)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                          {hindi ? meta.labelHi : meta.label}
                        </span>

                        {n.priority === "high" && (
                          <span className="rounded-full bg-warm-peach/20 px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
                            {hindi ? "प्राथमिकता" : "Priority"}
                          </span>
                        )}

                        {!n.read && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-deep-teal">
                            <span className="h-1.5 w-1.5 rounded-full bg-deep-teal" />
                            {hindi ? "नया" : "New"}
                          </span>
                        )}

                        {formattedTime && (
                          <span className="ml-auto text-[11px] font-medium text-text-secondary/80">
                            {formattedTime}
                          </span>
                        )}
                      </div>

                      <h2
                        className={`mt-2 text-base font-semibold leading-snug md:text-lg ${
                          n.read ? "text-text-primary/90" : "text-text-primary"
                        }`}
                      >
                        {n.title}
                      </h2>

                      <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                        {n.message}
                      </p>

                      {/* Footer Actions */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-color/40 pt-3">
                        <Link
                          href={meta.href}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!n.read) void markNotificationRead(n.id);
                          }}
                          className="group/link inline-flex items-center gap-1 text-xs font-semibold text-deep-teal hover:underline"
                        >
                          <span>{hindi ? meta.actionTextHi : meta.actionText}</span>
                          <ChevronRight size={14} className="transition-transform duration-200 group-hover/link:translate-x-1" />
                        </Link>

                        {!n.read ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void markNotificationRead(n.id);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-deep-teal transition-colors"
                          >
                            <Check size={13} />
                            {hindi ? "पढ़ा हुआ चिह्नित करें" : "Mark as read"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-text-secondary/70">
                            {hindi ? "पढ़ा गया" : "Read"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
