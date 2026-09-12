"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, HeartHandshake, Phone, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";

type TrustedContact = {
  id: string;
  name: string;
  relation: string;
  phone: string;
};

const INITIAL_CONTACTS: TrustedContact[] = [
  { id: "c1", name: "Radha Devi", relation: "Mother", phone: "+91 98220 11445" },
  { id: "c2", name: "Meena Kumari", relation: "Neighbour & friend", phone: "+91 90210 33871" },
];

export default function SafeCirclePage() {
  const [contacts, setContacts] = useState<TrustedContact[]>(INITIAL_CONTACTS);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("");
  const [phone, setPhone] = useState("");

  const addContact = () => {
    if (!name.trim() || !phone.trim()) return;
    setContacts((prev) => [
      ...prev,
      { id: `c${prev.length + 1}-${Date.now()}`, name: name.trim(), relation: relation.trim() || "Trusted contact", phone: phone.trim() },
    ]);
    setName("");
    setRelation("");
    setPhone("");
    setShowForm(false);
  };

  const removeContact = (id: string) => setContacts((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/support" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> Back to Support
      </Link>

      <div className="mx-auto mt-10 max-w-2xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0e5] text-[#b56e4e]"><HeartHandshake size={24} /></span>
        <h1 className="mt-6 font-display text-4xl text-[#172326]">Safe Circle</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6b7b75]">
          Keep a short list of people you trust. If you ever feel unsafe, you can reach them in one tap, and
          they can be notified to check in on you.
        </p>

        <div className="surface mt-8 rounded-[28px] p-6 md:p-8">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-[#7e918b]">Your trusted people</p>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-[#b56e4e] px-4 py-2 text-xs font-bold text-white"
            >
              <Plus size={14} /> Add contact
            </button>
          </div>

          {showForm && (
            <div className="mt-5 rounded-2xl border border-dashed border-border-color p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  className="rounded-xl border border-border-color px-3.5 py-2.5 text-sm"
                />
                <input
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  placeholder="Relationship (e.g. Sister)"
                  className="rounded-xl border border-border-color px-3.5 py-2.5 text-sm"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="rounded-xl border border-border-color px-3.5 py-2.5 text-sm sm:col-span-2"
                />
              </div>
              <button onClick={addContact} className="mt-3 rounded-full bg-[#0f766e] px-5 py-2 text-sm font-bold text-white">
                Save contact
              </button>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {contacts.length === 0 && (
              <p className="rounded-2xl border border-dashed border-border-color p-6 text-center text-sm text-[#6b7b75]">
                No trusted contacts yet. Add someone you feel safe with.
              </p>
            )}
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between gap-3 rounded-2xl bg-[#f7f5ed] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0e5] text-[#b56e4e]">
                    <UserRound size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#263c35]">{contact.name}</p>
                    <p className="text-xs text-[#7e918b]">{contact.relation} · {contact.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f766e] text-white">
                    <Phone size={15} />
                  </a>
                  <button onClick={() => removeContact(contact.id)} className="flex h-9 w-9 items-center justify-center rounded-full border border-border-color text-[#a2542f] hover:bg-[#fbe6e0]">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f4f6ec] p-4 text-sm text-[#5c6d66]">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#0f766e]" />
          Only you can see and edit this list. Your trusted contacts are never shared with SAATH staff or
          your case file.
        </div>
      </div>
    </div>
  );
}