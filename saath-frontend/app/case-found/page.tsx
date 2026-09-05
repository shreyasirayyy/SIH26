"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { caseService } from "@/services/case";
import { CaseRecord } from "@/types";
import { formatDate } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

function CaseFoundInner() {
  const router = useRouter();
  const params = useSearchParams();
  const docket = params.get("docket") ?? "";
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const setSurvivorSession = useAppStore((s) => s.setSurvivorSession);

  useEffect(() => {
    caseService.getCaseByDocket(docket).then(setCaseRecord);
  }, [docket]);

  function handleConfirm() {
    if (!caseRecord) return;
    setSurvivorSession({
      victimToken: caseRecord.victimToken,
      docket: caseRecord.docket,
      survivorName: caseRecord.survivorName,
    });
    router.push("/consent");
  }

  if (!caseRecord) {
    return <div className="flex-1 flex items-center justify-center text-text-secondary">Loading case...</div>;
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
      <ProgressDots step={3} total={5} />
      <h1 className="mt-6 text-xl font-semibold">Case found ✓</h1>
      <p className="mt-1 text-xs text-amber font-medium">Synthetic NHAA Integration Data (demo)</p>

      <Card className="mt-5 space-y-3">
        <Row label="Docket" value={caseRecord.docket} />
        <Row label="Registered" value={formatDate(caseRecord.registrationDate)} />
        <Row label="State" value={caseRecord.state} />
        <Row label="District" value={caseRecord.district} />
        <Row label="Case category" value={caseRecord.caseCategory} />
        <Row label="Current stage" value={caseRecord.currentStage} />
        <Row label="Preferred language" value={caseRecord.preferredLanguage} />
      </Card>

      <p className="mt-6 text-center font-medium">Is this your registered case?</p>

      <div className="mt-4 space-y-3">
        <Button size="lg" className="w-full" onClick={handleConfirm}>
          Yes, continue
        </Button>
        <Button size="lg" variant="secondary" className="w-full" onClick={() => router.push("/connect-case")}>
          This is not my case
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm gap-4">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-right">{value}</span>
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
