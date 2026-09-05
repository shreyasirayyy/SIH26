"use client";

import Link from "next/link";
import { Bell, MessageSquare, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { notificationService } from "@/services/notifications";
import { useAppStore } from "@/store/useAppStore";

export default function NotificationsPage() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const hindi = useAppStore((store) => store.language === "Hindi");
  const [, setNotifications] = useState<Array<{ id?: string; read?: boolean }>>([]);

  useEffect(() => {
    notificationService.getNotifications().then(setNotifications).catch(() => setNotifications([]));
  }, []);

  async function sendReminder() {
    if (!phone.trim() || sending) return;
    setSending(true); setStatus(null);
    try { const result = await notificationService.sendSMS(phone, hindi ? "आपका SAATH चेक-इन तैयार है। जब आप तैयार हों, तब वापस आएँ।" : "Your SAATH check-in is ready whenever you are."); setStatus(result.status); }
    catch (error) { setStatus(error instanceof Error ? error.message : (hindi ? "SMS सेवा उपलब्ध नहीं है।" : "SMS provider is unavailable.")); }
    finally { setSending(false); }
  }

  return <div className="px-5 pb-10 md:px-10 xl:px-14"><Link href="/survivor/check-in" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-text-secondary">← {hindi ? "चेक-इन पर वापस जाएँ" : "Back to check-in"}</Link><p className="text-xs font-bold uppercase tracking-[.2em] text-text-secondary">{hindi ? "सूचना केंद्र" : "Notification centre"}</p><h1 className="mt-3 font-display text-4xl text-text-primary md:text-5xl">{hindi ? "धीरे से याद दिलाना" : "A gentle nudge, never pressure."}</h1><p className="mt-4 max-w-2xl text-lg text-text-secondary">{hindi ? "जब आप चाहें, तब SAATH से सूचना पाएँ।" : "Choose whether you want a real reminder sent, and when."}</p><div className="mt-10 grid gap-5 lg:grid-cols-[1fr_.8fr]"><div className="surface rounded-3xl p-6 md:p-8"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-calm-blue/10 text-calm-blue"><MessageSquare size={20} /></span><div><p className="font-bold text-text-primary">SAATH reminder</p><p className="text-xs text-text-secondary">{hindi ? "आपकी अनुमति के बाद ही भेजा जाएगा" : "Sent only with your action"}</p></div></div><div className="mt-7 rounded-2xl bg-greenish-cream p-5 text-sm leading-relaxed text-text-secondary">{hindi ? <>आपका चेक-इन तैयार है।<br />जब आप तैयार हों, तब वापस आएँ।</> : <>Your check-in is ready.<br />No pressure, take a moment when you&apos;re ready.</>}</div></div><div className="surface-soft rounded-3xl p-6"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-text-secondary"><Bell size={15} /> {hindi ? "सूचना भेजें" : "Send a reminder"}</p><p className="mt-5 text-sm leading-relaxed text-text-secondary">{hindi ? "नंबर डालें। SAATH केवल कॉन्फ़िगर की गई SMS सेवा का उपयोग करेगा।" : "Enter a phone number and SAATH will use the configured SMS provider. Nothing is sent automatically."}</p><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={hindi ? "पंजीकृत फ़ोन नंबर" : "Registered phone number"} inputMode="tel" className="mt-5 w-full rounded-xl border border-border-color bg-white px-4 py-3 text-sm outline-none focus:border-deep-teal" /><Button onClick={() => void sendReminder()} disabled={sending || !phone.trim()} className="mt-3 w-full"><Send size={15} />{sending ? (hindi ? "भेज रहे हैं..." : "Sending...") : (hindi ? "सूचना भेजें" : "Send reminder")}</Button>{status && <p className="mt-3 text-sm text-text-secondary" role="status">{status}</p>}</div></div></div>;
}
