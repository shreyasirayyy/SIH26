"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, MessageCircleMore } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { notificationService } from "@/services/notifications";
import { useAppStore } from "@/store/useAppStore";

export default function SmsRemindersPage() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const hindi = useAppStore((store) => store.language === "Hindi");

  async function sendReminder() {
    if (!phone.trim() || sending) return;
    setSending(true);
    setStatus(null);
    try {
      const result = await notificationService.sendSMS(
        phone,
        hindi
          ? "आपका SAATH चेक-इन तैयार है। जब आप तैयार हों, तब वापस आएँ।"
          : "Your SAATH check-in is ready whenever you are."
      );
      setStatus(result.status);
      setSent(true);
    } catch (error) {
      setSent(false);
      setStatus(
        error instanceof Error
          ? error.message
          : hindi
          ? "SMS सेवा उपलब्ध नहीं है।"
          : "SMS provider is unavailable."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link
        href="/survivor/check-in"
        className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary"
      >
        <ArrowLeft size={16} /> {hindi ? "चेक-इन" : "Check-in"}
      </Link>

      <div className="mx-auto mt-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-text-secondary">
          {hindi ? "SMS रिमाइंडर" : "SMS reminders"}
        </p>
        <h1 className="mt-3 font-display text-4xl text-text-primary md:text-5xl">
          {hindi ? "एक छोटा सा याद दिलाना।" : "A gentle nudge, by text."}
        </h1>
        <p className="mt-4 text-lg text-text-secondary">
          {hindi
            ? "यदि आप सहज हैं, तो अपना मोबाइल नंबर दर्ज करें और SMS के ज़रिए चेक-इन रिमाइंडर पाएँ।"
            : "If you're comfortable, add your number to get a text reminder when it's time to check in."}
        </p>

        <div className="surface mt-10 rounded-3xl p-6 text-center md:p-10">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pale-sage text-deep-teal">
            <MessageCircleMore size={25} />
          </span>

          {!sent ? (
            <>
              <h2 className="mt-6 font-display text-3xl text-text-primary">
                {hindi ? "अपना नंबर जोड़ें" : "Add your number"}
              </h2>
              <p className="mt-3 text-sm text-text-secondary">
                {hindi
                  ? "यह पूरी तरह निजी रहता है और कभी भी बदला जा सकता है।"
                  : "This stays private and can be changed anytime."}
              </p>

              <div className="mx-auto mt-6 max-w-sm text-left">
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={hindi ? "पंजीकृत मोबाइल नंबर" : "Registered mobile number"}
                />
                <Button
                  onClick={sendReminder}
                  disabled={sending || !phone.trim()}
                  className="mt-4 w-full"
                >
                  {sending
                    ? hindi
                      ? "भेज रहा है..."
                      : "Sending..."
                    : hindi
                    ? "रिमाइंडर सेट करें"
                    : "Set up reminder"}
                </Button>
              </div>

              {status && (
                <p className="mt-4 text-sm text-warm-peach" role="alert">
                  {status}
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="mt-6 font-display text-3xl text-text-primary">
                {hindi ? "रिमाइंडर सेट हो गया" : "Reminder set"}
              </h2>
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-deep-teal">
                <Check size={16} />
                {hindi
                  ? "हम आपको SMS के ज़रिए याद दिलाएँगे।"
                  : "We'll text you a check-in reminder."}
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setStatus(null);
                  setPhone("");
                }}
                className="mt-6 text-sm font-semibold text-text-secondary underline underline-offset-4"
              >
                {hindi ? "नंबर बदलें" : "Use a different number"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}