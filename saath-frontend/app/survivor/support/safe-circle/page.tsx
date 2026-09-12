"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, HeartHandshake } from "lucide-react";
import { aiService } from "@/services/ai";

export default function SafeCirclePage() {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("Sister");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim() && relation.trim() && consent && email.trim();

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await aiService.createSafeCircleItem({
        name: name.trim(),
        relation: relation.trim(),
        email: email.trim(),
        consentToContact: consent,
      });
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't save this contact. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/support" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> Support
      </Link>
      <div className="mx-auto mt-9 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">Safe Circle</p>
        <h1 className="mt-3 font-display text-5xl text-[#172326]">Choose someone who can be there.</h1>
        <p className="mt-4 text-lg text-[#63736e]">
          If SAATH ever detects a real crisis signal, this person will be emailed automatically so they can be there for you.
        </p>

        <div className="surface mt-10 rounded-[28px] p-7 md:p-10">
          {sent ? (
            <div className="py-10 text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#dcebdd] text-[#3d8561]">
                <Check size={28} />
              </span>
              <h2 className="mt-6 font-display text-3xl text-[#2b473b]">Your Safe Circle is ready.</h2>
              <p className="mt-3 text-sm text-[#6b7b75]">You can pause, revoke, or change this person any time.</p>
            </div>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0e5] text-[#b56e4e]">
                <HeartHandshake size={22} />
              </span>
              <h2 className="mt-6 font-display text-3xl text-[#263c35]">Add a trusted person</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[#51635b]">
                  Name
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#c8d3d0] bg-white px-4 py-3 font-normal outline-none focus:border-[#0f766e]"
                    placeholder="e.g. Asha"
                  />
                </label>
                <label className="text-sm font-semibold text-[#51635b]">
                  Relationship
                  <select
                    value={relation}
                    onChange={(e) => setRelation(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#c8d3d0] bg-white px-4 py-3 font-normal outline-none focus:border-[#0f766e]"
                  >
                    <option>Sister</option>
                    <option>Friend</option>
                    <option>Parent</option>
                    <option>Other trusted person</option>
                  </select>
                </label>
                <label className="text-sm font-semibold text-[#51635b] sm:col-span-2">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#c8d3d0] bg-white px-4 py-3 font-normal outline-none focus:border-[#0f766e]"
                    placeholder="asha@example.com"
                  />
                </label>
              </div>

              <label className="mt-6 flex items-start gap-3 text-sm text-[#51635b]">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                <span>
                  I understand {name.trim() || "this person"} may be emailed automatically, without asking me again each time, if SAATH detects a genuine crisis signal.
                </span>
              </label>

              {error && <p className="mt-4 text-sm font-semibold text-[#b5473f]">{error}</p>}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || loading}
                  className="rounded-full bg-[#0f766e] px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save trusted person"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}