"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BriefcaseMedical, Building2, FileText, HeartPulse, MapPinned, Phone, Scale, Shield } from "lucide-react";

const resources = [
  { name: "Sakhi Counselling Centre", cat: "Counselling", icon: HeartPulse, desc: "Trauma-informed counselling and follow-up support.", loc: "Jaipur · 2.4 km", avail: "Open today", phone: "+91 1800 000 1122" },
  { name: "Swasthya Medical Desk", cat: "Medical", icon: BriefcaseMedical, desc: "A confidential referral point for medical support.", loc: "Jaipur · 3.1 km", avail: "Open today", phone: "+91 1800 000 1166" },
  { name: "Protection Support Cell", cat: "Witness Protection", icon: Shield, desc: "Safety planning and protection support.", loc: "Rajasthan · confidential", avail: "24 / 7 helpline", phone: "+91 112" },
  { name: "Udaan Relocation Cell", cat: "Relocation", icon: MapPinned, desc: "Practical relocation planning with protection partners.", loc: "Rajasthan · by appointment", avail: "Response in 24 hours", phone: "+91 1800 000 1144" },
  { name: "Sahara Financial Support", cat: "Financial Assistance", icon: FileText, desc: "Guidance for compensation and emergency assistance.", loc: "Jaipur collectorate", avail: "Appointments available", phone: "+91 1800 000 1177" },
  { name: "District Legal Aid Desk", cat: "Legal Aid", icon: Scale, desc: "Free legal guidance and case accompaniment.", loc: "Jaipur District Court", avail: "Appointments available", phone: "+91 1800 000 1188" },
  { name: "Sahara Rehabilitation Network", cat: "Rehabilitation", icon: Building2, desc: "Rehabilitation, livelihood, and recovery support.", loc: "Jaipur · 5.1 km", avail: "Open tomorrow", phone: "+91 1800 000 1199" },
];

export default function NavigatorPage() {
  const [filter, setFilter] = useState("All");
  const cats = ["All", "Counselling", "Medical", "Witness Protection", "Relocation", "Financial Assistance", "Legal Aid", "Rehabilitation"];
  const visible = resources.filter((resource) => filter === "All" || resource.cat === filter);

  return <div className="px-5 pb-10 md:px-10 xl:px-14">
    <Link href="/survivor/support" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]"><ArrowLeft size={16} /> Support</Link>
    <div className="mt-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">Support Navigator</p><h1 className="mt-3 font-display text-5xl text-[#172326] md:text-6xl">Find the right kind of support.</h1><p className="mt-4 max-w-2xl text-lg text-[#63736e]">Synthetic resource directory for the Jaipur demonstration case.</p></div>
    <div className="mt-8 flex gap-2 overflow-x-auto pb-2">{cats.map((cat) => <button onClick={() => setFilter(cat)} key={cat} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${filter === cat ? "bg-[#0f766e] text-white" : "bg-white text-[#63736e] ring-1 ring-[#c8d3d0]"}`}>{cat}</button>)}</div>
    <div className="mt-6 grid gap-4 xl:grid-cols-2">{visible.map(({ name, cat, icon: Icon, desc, loc, avail, phone }) => <article className="surface rounded-[25px] p-6" key={name}><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8eef5] text-[#5b8db8]"><Icon size={20} /></span><span className="rounded-full bg-[#e5f2ec] px-3 py-1 text-xs font-bold text-[#327d70]">{avail}</span></div><p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9b94]">{cat}</p><h2 className="mt-2 font-display text-2xl text-[#2d4039]">{name}</h2><p className="mt-2 text-sm leading-relaxed text-[#6b7b75]">{desc}</p><div className="mt-5 flex flex-wrap gap-3 text-xs text-[#71817b]"><span className="flex items-center gap-1"><MapPinned size={13} />{loc}</span><span className="flex items-center gap-1"><Phone size={13} />{phone}</span></div><div className="mt-5 flex gap-2"><a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 rounded-full bg-[#0f766e] px-4 py-2 text-xs font-bold text-white"><Phone size={13} /> Call</a><button className="flex items-center gap-2 rounded-full bg-[#f4f6ec] px-4 py-2 text-xs font-bold text-[#56715d]"><ArrowRight size={13} /> Navigate</button></div></article>)}</div>
  </div>;
}
