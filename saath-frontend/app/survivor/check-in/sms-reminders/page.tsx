"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { notificationService } from "@/services/notifications";
import { useAppStore } from "@/store/useAppStore";

export default function SmsRemindersPage() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const hindi = useAppStore((store) => store.language === "Hindi");

  async function sendReminder() {
    if (!phone.trim() || sending) return;
    setSending(true); setStatus(null);
    try { 
      const result = await notificationService.sendSMS(phone, hindi ? "आपका SAATH चेक-इन तैयार है। जब आप तैयार हों, तब वापस आएँ।" : "Your SAATH check-in is ready whenever you are."); 
      setStatus(result.status); 
    }
    catch (error) { 
      setStatus(error instanceof Error ? error.message : (hindi ? "SMS सेवा उपलब्ध नहीं है।" : "SMS provider is unavailable.")); 
    }
    finally { setSending(false); }
  }

  return (
    <div className="px-6 py-8 max-w-md mx-auto">
      <Link href="/survivor/check-in" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-text-secondary">
        ← {hindi ? "चेक-इन पर वापस जाएँ" : "Back to check-in"}
      </Link>
      <h1 className="text-xl font-semibold">{hindi ? "SMS रिमाइंडर" : "SMS reminders"}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        {hindi ? "यदि आप सहज हैं, तो आप SMS के माध्यम से चेक-इन रिमाइंडर प्राप्त करने के लिए अपना मोबाइल नंबर दर्ज कर सकते हैं।" : "If you are comfortable, you can enter your mobile number to receive check-in reminders via SMS."}
      </p>
      <div className="mt-6">
        <Input 
          value={phone} 
          onChange={(e) => setPhone(e.target.value)} 
          placeholder={hindi ? "पंजीकृत मोबाइल नंबर" : "Registered mobile number"} 
        />
        <Button onClick={sendReminder} disabled={sending} className="mt-4 w-full">
          {sending ? (hindi ? "भेज रहा है..." : "Sending...") : (hindi ? "रिमाइंडर भेजें" : "Send reminder")}
        </Button>
        {status && <p className="mt-4 text-sm text-text-secondary">{status}</p>}
      </div>
    </div>
  );
}