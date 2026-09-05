"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressDots } from "@/components/ui/ProgressDots";
import { caseService } from "@/services/case";

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
      setError(result.message ?? "Something went wrong. Please try again.");
      return;
    }
    router.push(`/case-found?docket=${encodeURIComponent(docket)}`);
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 max-w-md mx-auto w-full">
      <ProgressDots step={1} total={5} />
      <h1 className="mt-6 text-xl font-semibold">Connect your registered case</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Enter the NHAA docket ID linked to your registered grievance.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-text-secondary" htmlFor="docket">
            NHAA Docket / Reference Number
          </label>
          <Input
            id="docket"
            className="mt-1.5"
            value={docket}
            onChange={(e) => setDocket(e.target.value)}
            placeholder="NHAA-XX-YYYY-NNNNNN"
            required
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-warm-peach">
            {error}
          </p>
        )}

        <p className="text-xs text-text-secondary">
          Your case information will be fetched securely after verification. This demo uses a
          synthetic NHAA case registry — no real government systems are accessed.
        </p>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? "Checking..." : "Find my case"}
        </Button>
      </form>

      <p className="mt-4 text-xs text-center text-text-secondary">
        Try docket <span className="font-mono">NHAA-RJ-2026-004821</span> for this demo.
      </p>
    </div>
  );
}
