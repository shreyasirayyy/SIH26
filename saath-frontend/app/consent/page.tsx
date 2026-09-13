"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { useAppStore } from "@/store/useAppStore";
import { apiRequest } from "@/lib/api";
import { ShieldCheck, Eye, ArrowLeft, CheckCheck } from "lucide-react";

export default function ConsentPage() {
  const router = useRouter();
  const setConsent = useAppStore((s) => s.setConsent);
  const [monitoringConsent, setMonitoringConsent] = useState(false);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setError(null);
    setLoading(true);
    try {
      await apiRequest("/api/v1/consents", {
        method: "POST",
        body: JSON.stringify({ monitoring: monitoringConsent, voice: voiceConsent, text: monitoringConsent, behavioural: false, version: "1.0" }),
      });
      setConsent(monitoringConsent, voiceConsent);
      router.push("/survivor");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save consent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row saath-page-bg">
      {/* ── Left panel ── */}
      <aside className="hidden md:flex flex-col justify-between w-[46%] xl:w-[42%] min-h-screen bg-[#0d3a31] px-12 py-14 xl:px-16">
        <Link href="/landing" className="flex items-center gap-3 group w-fit">
          <span className="text-2xl text-[#e8bd66] transition-transform duration-300 group-hover:rotate-12">✦</span>
          <div>
            <div className="font-editorial text-[28px] font-bold leading-none text-white tracking-tight">SAATH</div>
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9cc8bb]">with you, over time</div>
          </div>
        </Link>

        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#68c5b9] mb-5">Step 4 of 5</p>
          <h2 className="font-editorial text-[36px] xl:text-[44px] leading-[1.1] text-white mb-5">
            Before you<br />
            <em className="font-normal not-italic text-[#68c5b9]">continue</em>
          </h2>
          <p className="text-[14px] text-[#9cc8bb] leading-relaxed max-w-[340px]">
            SAATH uses your data carefully and only with your consent. You are always in control and can change your settings at any time.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: ShieldCheck, text: "Your consent is required at every step" },
              { icon: Eye, text: "You can pause or withdraw at any time from Settings" },
              { icon: CheckCheck, text: "No data is shared without your explicit permission" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#134e43] border border-[#2fa6a0]/40 text-[#68c5b9] shadow-sm shrink-0 mt-0.5">
                  <Icon size={15} className="text-[#81e6d9]" />
                </span>
                <span className="text-[13.5px] text-[#c2e2d9] leading-snug">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-[#4d7a71]">Prototype — synthetic demonstration data only.</p>
      </aside>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-14 xl:px-20">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <span className="text-xl text-[color:var(--accent-gold)]">✦</span>
          <span className="font-editorial text-[22px] font-bold text-deep-teal">SAATH</span>
        </div>

        <div className="w-full max-w-[480px] mx-auto md:mx-0">
          <ProgressDots step={4} total={5} />

          <div className="mt-8 mb-7">
            <h1 className="font-editorial text-[30px] xl:text-[36px] leading-[1.1] text-text-primary">
              Before you continue
            </h1>
            <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
              Please review how SAATH may use your information.
            </p>
          </div>

          {/* Consent summary card */}
          <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border-color/60 bg-[color:var(--surface-subtle)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">SAATH may use</p>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {["your registered case context", "your voluntary check-ins", "your optional voice/text signals", "engagement information"].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-deep-teal shrink-0" />
                  <span className="text-[13px] text-text-primary">{item}</span>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-border-color/60 bg-[color:var(--surface-subtle)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary mb-3">Purpose</p>
              <div className="space-y-2.5">
                {[
                  "understand changes in distress",
                  "support you over time",
                  "recommend appropriate support",
                  "notify authorised professionals when required, according to your consent and safety policy",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[color:var(--sage)] shrink-0" />
                    <span className="text-[13px] text-text-primary">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="mt-6 space-y-4">
            <label className={`flex items-start gap-4 rounded-xl border px-4 py-4 cursor-pointer transition-all ${monitoringConsent ? "border-deep-teal bg-[color:var(--success-bg)]" : "border-border-color bg-[color:var(--surface)]"}`}>
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-deep-teal"
                checked={monitoringConsent}
                onChange={(e) => setMonitoringConsent(e.target.checked)}
              />
              <div>
                <p className="text-[14px] font-semibold text-text-primary leading-snug">I understand and consent to monitoring.</p>
                <p className="mt-1 text-[12px] text-text-secondary">Required to use SAATH&apos;s support features.</p>
              </div>
            </label>

            <label className={`flex items-start gap-4 rounded-xl border px-4 py-4 cursor-pointer transition-all ${voiceConsent ? "border-deep-teal bg-[color:var(--success-bg)]" : "border-border-color bg-[color:var(--surface)]"}`}>
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 shrink-0 accent-deep-teal"
                checked={voiceConsent}
                onChange={(e) => setVoiceConsent(e.target.checked)}
              />
              <div>
                <p className="text-[14px] font-semibold text-text-primary leading-snug">I consent to optional voice-feature analysis.</p>
                <p className="mt-1 text-[12px] text-text-secondary">Optional — you can change this later in Settings.</p>
              </div>
            </label>
          </div>

          <Link
            href="/privacy-notice"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-deep-teal underline underline-offset-2 hover:no-underline transition-all"
          >
            <Eye size={13} />
            View Privacy Notice
          </Link>

          {error && (
            <p role="alert" className="mt-4 text-sm text-warm-peach bg-[color:var(--error-bg)] rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <Button
            size="lg"
            className="w-full mt-6"
            disabled={!monitoringConsent || loading}
            onClick={handleContinue}
          >
            {loading ? "Saving…" : "Continue to SAATH"}
          </Button>

          <p className="mt-3 text-center text-[12px] text-text-secondary">
            You can pause or stop monitoring at any time from Settings.
          </p>

          <div className="mt-8 pt-6 border-t border-border-color/50">
            <Link href="/case-found" className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors w-fit">
              <ArrowLeft size={13} />
              Back to case confirmation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
