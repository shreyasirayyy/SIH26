"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BriefcaseMedical, Building2, FileText, HeartPulse, MapPinned, Phone, Scale, Shield } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const iconMap: Record<string, any> = { HeartPulse, BriefcaseMedical, Shield, MapPinned, FileText, Scale, Building2 };

const RESOURCES = [
  {
    id: "res-1",
    serviceType: "Counselling",
    icon: "HeartPulse",
    name: "Sakhi Counselling Centre",
    description: "Trauma-informed counselling.",
    district: "Jaipur",
    state: "Rajasthan",
    phone: "+91 18000 001122",
    availability: "Open today",
  },
  {
    id: "res-2",
    serviceType: "Medical",
    icon: "BriefcaseMedical",
    name: "SMS District Hospital — One Stop Centre",
    description: "Free medical exams and referrals for survivors.",
    district: "Jaipur",
    state: "Rajasthan",
    phone: "+91 18000 002233",
    availability: "24x7",
  },
  {
    id: "res-3",
    serviceType: "Witness Protection",
    icon: "Shield",
    name: "District Witness Protection Cell",
    description: "Safety assessment and protection measures for witnesses.",
    district: "Jaipur",
    state: "Rajasthan",
    phone: "+91 18000 003344",
    availability: "Mon–Sat, 9am–6pm",
  },
  {
    id: "res-4",
    serviceType: "Relocation",
    icon: "MapPinned",
    name: "State Relocation Assistance Cell",
    description: "Temporary shelter and relocation support for at-risk survivors.",
    district: "Jaipur",
    state: "Rajasthan",
    phone: "+91 18000 004455",
    availability: "By appointment",
  },
  {
    id: "res-5",
    serviceType: "Financial Assistance",
    icon: "FileText",
    name: "SC/ST Victim Compensation Cell",
    description: "Guidance on compensation claims and disbursement status.",
    district: "Jaipur",
    state: "Rajasthan",
    phone: "+91 18000 005566",
    availability: "Mon–Fri, 10am–5pm",
  },
  {
    id: "res-6",
    serviceType: "Legal Aid",
    icon: "Scale",
    name: "District Legal Services Authority",
    description: "Free legal aid and case representation.",
    district: "Jaipur",
    state: "Rajasthan",
    phone: "+91 18000 006677",
    availability: "Mon–Sat, 9am–5pm",
  },
  {
    id: "res-7",
    serviceType: "Rehabilitation",
    icon: "Building2",
    name: "Rajasthan Rehabilitation & Livelihood Mission",
    description: "Skill training and livelihood support for survivors.",
    district: "Jaipur",
    state: "Rajasthan",
    phone: "+91 18000 007788",
    availability: "Mon–Fri, 10am–5pm",
  },
];

export default function NavigatorPage() {
  const { currentCase } = useAppStore();
  const [filter, setFilter] = useState("All");

  const cats = ["All", "Counselling", "Medical", "Witness Protection", "Relocation", "Financial Assistance", "Legal Aid", "Rehabilitation"];
  const visible = useMemo(
    () => RESOURCES.filter((resource) => filter === "All" || resource.serviceType === filter),
    [filter]
  );

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/support" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> Support
      </Link>
      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">Support Navigator</p>
        <h1 className="mt-3 font-display text-5xl text-[#172326] md:text-6xl">Find the right kind of support.</h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#63736e]">
          {currentCase ? `Resources prioritized for your case in ${currentCase.district}.` : "Find support resources in your area."}
        </p>
      </div>
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {cats.map((cat) => (
          <button
            onClick={() => setFilter(cat)}
            key={cat}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${filter === cat ? "bg-[#0f766e] text-white" : "bg-white text-[#63736e] ring-1 ring-[#c8d3d0]"}`}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {visible.map((resource) => {
          const Icon = iconMap[resource.icon] || Building2;
          return (
            <article className="surface rounded-[25px] p-6" key={resource.id}>
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8eef5] text-[#5b8db8]"><Icon size={20} /></span>
                <span className="rounded-full bg-[#e5f2ec] px-3 py-1 text-xs font-bold text-[#327d70]">{resource.availability}</span>
              </div>
              <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#8a9b94]">{resource.serviceType}</p>
              <h2 className="mt-2 font-display text-2xl text-[#2d4039]">{resource.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6b7b75]">{resource.description}</p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-[#71817b]">
                <span className="flex items-center gap-1"><MapPinned size={13} />{resource.district}, {resource.state}</span>
                <span className="flex items-center gap-1"><Phone size={13} />{resource.phone}</span>
              </div>
              <div className="mt-5 flex gap-2">
                <a href={`tel:${resource.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 rounded-full bg-[#0f766e] px-4 py-2 text-xs font-bold text-white">
                  <Phone size={13} /> Call
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}