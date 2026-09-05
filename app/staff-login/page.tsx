"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useAppStore } from "@/store/useAppStore";
import { Role } from "@/types";

const DEMO_ACCOUNTS: { role: Role; label: string; id: string }[] = [
  { role: "counsellor", label: "Dr. Neha — Counsellor", id: "counsellor@demo.saath" },
  { role: "district", label: "Demo District Admin", id: "district@demo.saath" },
  { role: "state", label: "Demo State Admin", id: "state@demo.saath" },
  { role: "national", label: "Demo National Admin", id: "national@demo.saath" },
];

export default function StaffLoginPage() {
  const router = useRouter();
  const setStaffRole = useAppStore((s) => s.setStaffRole);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");

  function loginAs(role: Role) {
    setStaffRole(role);
    router.push(role === "counsellor" ? "/counsellor" : "/admin");
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-10 max-w-md mx-auto w-full">
      <p className="text-xs font-semibold text-amber uppercase tracking-wide">Demo environment</p>
      <h1 className="mt-1 text-xl font-semibold">Staff sign in</h1>

      <div className="mt-6 space-y-3">
        <Input placeholder="Staff ID or email" value={id} onChange={(e) => setId(e.target.value)} />
        <Input
          placeholder="Password / OTP"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button className="w-full" onClick={() => loginAs("counsellor")}>
          Sign in
        </Button>
      </div>

      <p className="mt-8 text-sm font-medium text-text-secondary">Or continue with a demo account</p>
      <div className="mt-3 space-y-2">
        {DEMO_ACCOUNTS.map((acc) => (
          <Card
            key={acc.id}
            className="cursor-pointer hover:border-deep-teal"
            onClick={() => loginAs(acc.role)}
          >
            <p className="text-sm font-medium">{acc.label}</p>
            <p className="text-xs text-text-secondary">{acc.id}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
