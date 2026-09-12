"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAppStore } from "@/store/useAppStore";
import { staffService } from "@/services/case";
import { CounsellorSummary } from "@/types";

const SCOPE_LABEL: Record<string, string> = {
  district: "District Admin",
  state: "State Admin",
  national: "National Admin",
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const role = useAppStore((s) => s.role);
  const logout = useAppStore((s) => s.logout);
  const [counsellors, setCounsellors] = useState<CounsellorSummary[]>([]);
  const [counsellorsLoading, setCounsellorsLoading] = useState(true);
  const [counsellorsError, setCounsellorsError] = useState(false);

  useEffect(() => {
    staffService.getCounsellors()
      .then(setCounsellors)
      .catch(() => setCounsellorsError(true))
      .finally(() => setCounsellorsLoading(false));
  }, []);

  function signOut() {
    logout();
    router.push("/landing");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Your staff account and session.</p>
      </div>

      <Card>
        <CardTitle>Account</CardTitle>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between"><dt className="text-text-secondary">Role</dt><dd className="font-medium">{role ? SCOPE_LABEL[role] ?? role : "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-text-secondary">Access level</dt><dd className="font-medium">Aggregated data only</dd></div>
        </dl>
      </Card>

      <Card>
        <CardTitle>Counsellors in your scope</CardTitle>
        {counsellorsLoading && <p className="mt-2 text-sm text-text-secondary">Loading...</p>}
        {counsellorsError && <p className="mt-2 text-sm text-text-secondary">Counsellor roster isn&apos;t available for this role yet.</p>}
        {!counsellorsLoading && !counsellorsError && (
          <>
            <p className="mt-2 text-2xl font-semibold text-deep-teal">{counsellors.length}</p>
            <div className="mt-4 space-y-2">
              {counsellors.slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-greenish-cream p-3 text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-text-secondary">{c.specialisation ?? "General"}{c.state ? ` · ${c.state}` : ""}</p>
                  </div>
                  <span className="text-xs font-semibold text-text-secondary">{c.casesAssigned ?? 0} cases</span>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card>
        <CardTitle>Session</CardTitle>
        <p className="mt-2 text-sm text-text-secondary">Sign out of this staff session on this device.</p>
        <Button variant="ghost" className="mt-4" onClick={signOut}>Sign out</Button>
      </Card>
    </div>
  );
}
