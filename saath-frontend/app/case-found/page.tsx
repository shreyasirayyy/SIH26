"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { caseService } from "@/services/case";
import { CaseRecord } from "@/types";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { CheckCircle2, FileText, ArrowLeft } from "lucide-react";

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4 py-3 border-b border-border-color/50 last:border-0">
      <span className="text-[13px] text-text-secondary shrink-0">{label}</span>
      <span className={`text-[14px] font-semibold text-right ${highlight ? "text-deep-teal" : "text-text-primary"}`}>{value}</span>
    </div>
  );
}

function CaseFoundInner() {
  const router = useRouter();
  const params = useSearchParams();
  const docket = params.get("docket") ?? "";
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setSurvivorSession = useAppStore((s) => s.setSurvivorSession);

  useEffect(() => {
    caseService.connectCase(docket).then(setCaseRecord).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Unable to load your case.");
    });
  }, [docket]);

  function handleConfirm() {
    if (!caseRecord) return;
    setSurvivorSession({
      victimToken: caseRecord.victimToken,
      docket: caseRecord.docket,
      survivorName: caseRecord.survivorName,
      caseRecord,
    });
    router.push("/consent");
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-warm-peach text-center">{error}</p>
      </div>
    );
  }
  if (!caseRecord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-text-secondary">
          <div className="h-8 w-8 rounded-full border-2 border-deep-teal border-t-transparent animate-spin" />
          <span className="text-sm">Loading case…</span>
        </div>
      </div>
    );
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
          <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#68c5b9] mb-5">Step 3 of 5</p>
          <h2 className="font-editorial text-[36px] xl:text-[44px] leading-[1.1] text-white mb-5">
            We found<br />
            <em className="font-normal not-italic text-[#68c5b9]">your case</em>
          </h2>
          <p className="text-[14px] text-[#9cc8bb] leading-relaxed max-w-[340px]">
            Please review the details below and confirm this is your registered case before continuing.
          </p>

          <div className="mt-10 flex items-start gap-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#134e43] border border-[#2fa6a0]/40 text-[#68c5b9] shadow-sm shrink-0 mt-0.5">
              <FileText size={15} className="text-[#81e6d9]" />
            </span>
            <span className="text-[13.5px] text-[#c2e2d9] leading-snug">Only you can see this information. It is never shared without your explicit consent.</span>
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
          <ProgressDots step={3} total={5} />

          <div className="mt-8 mb-7">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 size={22} className="text-deep-teal" />
              <h1 className="font-editorial text-[30px] xl:text-[36px] leading-[1.1] text-text-primary">
                Case found
              </h1>
            </div>
            <span className="inline-flex items-center rounded-full bg-[color:var(--warning-bg)] border border-[color:var(--amber)]/30 px-3 py-1 text-[11px] font-semibold text-[color:var(--amber)] uppercase tracking-[0.12em]">
              Synthetic NHAA Demo Data
            </span>
          </div>

          {/* Case detail card */}
          <div className="rounded-2xl border border-border-color bg-[color:var(--surface)] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border-color/60 bg-[color:var(--surface-subtle)]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-text-secondary">Case Details</p>
            </div>
            <div className="px-5 py-2">
              <Row label="Docket" value={caseRecord.docket} highlight />
              <Row label="Registered" value={formatDate(caseRecord.registrationDate)} />
              <Row label="State" value={caseRecord.state} />
              <Row label="District" value={caseRecord.district} />
              <Row label="Case category" value={caseRecord.caseCategory} />
              <Row label="Current stage" value={caseRecord.currentStage} />
              <Row label="Preferred language" value={caseRecord.preferredLanguage} />
            </div>
          </div>

          <p className="mt-7 text-[15px] font-semibold text-text-primary text-center">Is this your registered case?</p>

          <div className="mt-4 space-y-3">
            <Button size="lg" className="w-full" onClick={handleConfirm}>
              Yes, continue
            </Button>
            <Button size="lg" variant="secondary" className="w-full" onClick={() => router.push("/connect-case")}>
              This is not my case
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border-color/50">
            <Link href="/connect-case" className="flex items-center gap-2 text-[13px] text-text-secondary hover:text-text-primary transition-colors w-fit">
              <ArrowLeft size={13} />
              Back to docket entry
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CaseFoundPage() {
  return (
    <Suspense fallback={null}>
      <CaseFoundInner />
    </Suspense>
  );
}
