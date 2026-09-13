"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { caseService } from "@/services/case";
import { ShieldCheck, Lock, ArrowLeft } from "lucide-react";

export default function ConnectCasePage() {
  const router = useRouter();
  const [docket, setDocket] = useState("NHAA-RJ-2026-004821");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await caseService.verifyDocket(docket);
    setLoading(false);
    if (!result.ok) {
      setError(result.message ?? "Unable to verify this docket reference.");
      return;
    }
    router.push(`/case-found?docket=${encodeURIComponent(docket)}`);
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
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#68c5b9] mb-5">Step 1 of 5</p>
          <h2 className="font-editorial text-[36px] xl:text-[44px] leading-[1.1] text-white mb-5">
            Connect your<br />
            <em className="font-normal not-italic text-[#68c5b9]">registered case</em>
          </h2>
          <p className="text-[14px] text-[#9cc8bb] leading-relaxed max-w-[340px]">
            SAATH links to your official NHAA case record to provide personalised, continuous support — privately and securely.
          </p>
          <div className="mt-10 space-y-4">
            {[
              { icon: ShieldCheck, text: "No real government systems are accessed" },
              { icon: Lock, text: "Your data is encrypted and consent-first" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <Icon size={15} className="text-[#4db3a4] mt-0.5 shrink-0" />
                <span className="text-[13px] text-[#9cc8bb]">{text}</span>
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
          <ProgressDots step={1} total={5} />

          <div className="mt-8 mb-7">
            <h1 className="font-editorial text-[30px] xl:text-[36px] leading-[1.1] text-text-primary">
              Connect your case
            </h1>
            <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
              Enter your NHAA docket or reference number to verify your case.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[12px] font-bold text-text-secondary mb-2 uppercase tracking-[0.14em]" htmlFor="docket">
                NHAA Docket / Reference Number
              </label>
              <Input
                id="docket"
                value={docket}
                onChange={(e) => setDocket(e.target.value)}
                placeholder="NHAA-XX-YYYY-NNNNNN"
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-warm-peach bg-[color:var(--error-bg)] rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <div className="flex items-start gap-2.5 rounded-xl bg-[color:var(--surface-subtle)] border border-border-color/60 px-4 py-3.5">
              <ShieldCheck size={14} className="text-deep-teal mt-0.5 shrink-0" />
              <p className="text-[12px] text-text-secondary leading-relaxed">
                Your case information will be fetched securely after verification. This demo uses a synthetic NHAA case registry — no real government systems are accessed.
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Verifying…" : "Verify my case"}
            </Button>
          </form>

          <p className="mt-5 text-[12px] text-center text-text-secondary">
            Try docket{" "}
            <button
              type="button"
              className="font-mono text-deep-teal underline underline-offset-2 hover:no-underline transition-all"
              onClick={() => setDocket("NHAA-RJ-2026-004821")}
            >
              NHAA-RJ-2026-004821
            </button>{" "}
            for this demo.
          </p>

          <div className="mt-10 pt-6 border-t border-border-color/50">
            <Link href="/landing" className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors w-fit">
              <ArrowLeft size={13} />
              Back to landing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
