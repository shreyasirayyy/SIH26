"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  HeartHandshake,
  MessageCircle,
  Phone,
  PhoneCall,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const FALLBACK_COUNSELLOR = {
  name: "Dr. Neha Sharma",
  specialisation: "Trauma & Rehabilitation Counsellor",
  phone: "+91 80000 22110",
};

export default function CounsellorPage() {
  const {
    currentCase,
    survivorName,
    victimToken,
    docket,
    language,
    followUps,
    addFollowUp,
    counsellorMessages,
    addCounsellorMessage,
  } = useAppStore();

  const counsellor =
    currentCase?.assignedCounsellor ??
    (currentCase?.counsellorAssigned && currentCase.counsellorAssigned !== "Not assigned"
      ? { name: currentCase.counsellorAssigned, specialisation: undefined, phone: undefined }
      : null) ??
    FALLBACK_COUNSELLOR;

  const hindi = language === "Hindi";

  // Modal / drawer states
  const [modalMode, setModalMode] = useState<"none" | "follow-up" | "message">("none");

  // Follow-up form state
  const [followUpDate, setFollowUpDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [followUpTimeSlot, setFollowUpTimeSlot] = useState<string>("morning");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpSuccess, setFollowUpSuccess] = useState(false);
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

  // Message form state
  const [messageSubject, setMessageSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [messageUrgency, setMessageUrgency] = useState<"routine" | "soon" | "urgent">("routine");
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);

  // Filter requests/messages relevant to this survivor session
  const currentToken = victimToken ?? "mock-victim-token";
  const myFollowUps = followUps.filter(
    (f) => f.victimToken === currentToken || (docket && f.docket === docket)
  );
  const myMessages = counsellorMessages.filter(
    (m) => m.victimToken === currentToken || (docket && m.docket === docket)
  );

  const handleFollowUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate) return;

    setIsSubmittingFollowUp(true);

    const timeSlotLabel =
      followUpTimeSlot === "morning"
        ? "Morning (10:00 AM - 1:00 PM)"
        : followUpTimeSlot === "afternoon"
        ? "Afternoon (2:00 PM - 5:00 PM)"
        : "Evening (5:00 PM - 7:30 PM)";

    const newFollowUp = {
      id: crypto.randomUUID(),
      caseId: currentCase?.id ?? "case-demo-1",
      victimToken: currentToken,
      survivorName: survivorName || currentCase?.survivorName || "Sunita Kumari",
      docket: docket || currentCase?.docket || "SC-2024-8891",
      date: new Date(followUpDate).toISOString(),
      notes: followUpNotes.trim()
        ? `[Survivor Request · ${timeSlotLabel}] ${followUpNotes.trim()}`
        : `[Survivor Request · ${timeSlotLabel}] Requested follow-up session.`,
      status: "SCHEDULED" as const,
      createdAt: new Date().toISOString(),
      requestedBy: "survivor" as const,
      preferredTime: timeSlotLabel,
    };

    setTimeout(() => {
      addFollowUp(newFollowUp);
      setIsSubmittingFollowUp(false);
      setFollowUpSuccess(true);
      setTimeout(() => {
        setFollowUpSuccess(false);
        setModalMode("none");
        setFollowUpNotes("");
      }, 1600);
    }, 450);
  };

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    setIsSubmittingMessage(true);

    const newMessage = {
      id: crypto.randomUUID(),
      caseId: currentCase?.id ?? "case-demo-1",
      victimToken: currentToken,
      survivorName: survivorName || currentCase?.survivorName || "Sunita Kumari",
      docket: docket || currentCase?.docket || "SC-2024-8891",
      message: messageContent.trim(),
      subject: messageSubject.trim() || undefined,
      urgency: messageUrgency,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setTimeout(() => {
      addCounsellorMessage(newMessage);
      setIsSubmittingMessage(false);
      setMessageSuccess(true);
      setTimeout(() => {
        setMessageSuccess(false);
        setModalMode("none");
        setMessageContent("");
        setMessageSubject("");
      }, 1600);
    }, 450);
  };

  return (
    <div className="px-5 pb-16 md:px-10 xl:px-14">
      <Link
        href="/survivor/support"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f] hover:text-deep-teal transition-colors"
      >
        <ArrowLeft size={16} /> {hindi ? "सहायता पर वापस जाएँ" : "Back to Support"}
      </Link>

      <div className="mx-auto mt-8 max-w-3xl">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5f2ec] text-[#327d70] shadow-sm">
          <PhoneCall size={24} />
        </span>
        <h1 className="mt-6 font-display text-4xl text-[#172326]">
          {hindi ? "अपने काउंसलर से संपर्क करें" : "Talk to a counsellor"}
        </h1>
        <p className="mt-2 text-sm text-[#6b7b75]">
          {hindi
            ? "गोपनीय, सुरक्षित और संवेदनशील सहायता। आपका संदेश सीधे आपके काउंसलर तक पहुँचता है।"
            : "Confidential, trauma-informed support. Your requests reach your dedicated counsellor directly."}
        </p>

        {/* Counsellor Profile Card */}
        <div className="surface mt-8 rounded-[28px] p-7 md:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#7e918b]">
                {hindi ? "आपके नियुक्त काउंसलर" : "Your assigned counsellor"}
              </p>
              <h2 className="mt-2 font-display text-3xl text-[#263c35]">{counsellor.name}</h2>
              {counsellor.specialisation && (
                <p className="mt-1 text-sm text-[#7e918b]">{counsellor.specialisation}</p>
              )}
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f6f3] text-deep-teal border border-border-color">
              <HeartHandshake size={24} />
            </div>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-[#6b7b75]">
            {hindi
              ? "आपके काउंसलर आपकी सहायता के लिए सदैव उपलब्ध हैं। आप सीधे कॉल कर सकते हैं, आगामी फॉलो-अप सत्र का अनुरोध कर सकते हैं या कोई भी संदेश भेज सकते हैं।"
              : "Your counsellor is here to support your journey. You can request a follow-up call, choose your preferred timing, or send a secure note directly to them."}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={`tel:${(counsellor.phone ?? FALLBACK_COUNSELLOR.phone).replace(/[^\d+]/g, "")}`}
              className="flex items-center gap-2 rounded-full bg-[#0f766e] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0d655e] transition-colors"
            >
              <Phone size={15} /> {hindi ? "कॉल करें" : "Call"} {counsellor.phone ?? FALLBACK_COUNSELLOR.phone}
            </a>
            <button
              type="button"
              onClick={() => setModalMode("follow-up")}
              className="flex items-center gap-2 rounded-full border border-border-color bg-white px-5 py-2.5 text-sm font-bold text-[#263c35] hover:border-deep-teal hover:bg-[#f8fbf9] transition-colors shadow-2xs"
            >
              <CalendarClock size={15} className="text-deep-teal" />
              {hindi ? "फॉलो-अप का अनुरोध करें" : "Request a follow-up"}
            </button>
            <button
              type="button"
              onClick={() => setModalMode("message")}
              className="flex items-center gap-2 rounded-full border border-border-color bg-white px-5 py-2.5 text-sm font-bold text-[#263c35] hover:border-deep-teal hover:bg-[#f8fbf9] transition-colors shadow-2xs"
            >
              <MessageCircle size={15} className="text-deep-teal" />
              {hindi ? "संदेश भेजें" : "Send a message"}
            </button>
          </div>
        </div>

        {/* Reassurance Banner */}
        <div className="mt-5 rounded-2xl bg-[#f4f6ec] border border-[#e3ead6] p-4 text-xs md:text-sm text-[#5c6d66] flex items-center gap-3">
          <Sparkles size={18} className="shrink-0 text-[#678053]" />
          <span>
            {hindi
              ? "सहायता सेवाएँ आपके केस रिकॉर्ड को बिना प्रभावित किए हमेशा सक्रिय रहती हैं। आप अपनी गति और सुविधा से कभी भी संपर्क कर सकते हैं।"
              : "Support stays available even if you pause or stop monitoring. Reaching out here never negatively affects your legal case."}
          </span>
        </div>

        {/* History: Active Requests & Sent Messages */}
        {(myFollowUps.length > 0 || myMessages.length > 0) && (
          <div className="mt-10 space-y-6">
            <h3 className="font-display text-2xl text-[#172326]">
              {hindi ? "हाल के अनुरोध और संदेश" : "Recent requests & messages"}
            </h3>

            {/* Follow-up requests */}
            {myFollowUps.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#7e918b]">
                  {hindi ? "फॉलो-अप सत्र" : "Follow-up requests"}
                </p>
                <div className="grid gap-3">
                  {myFollowUps.map((item) => (
                    <div
                      key={item.id}
                      className="surface rounded-2xl p-4 border border-border-color flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarClock size={16} className="text-deep-teal shrink-0" />
                          <p className="text-sm font-semibold text-text-primary">
                            {new Date(item.date).toLocaleDateString(hindi ? "hi-IN" : "en-IN", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              item.status === "COMPLETED"
                                ? "bg-[#dcfce7] text-[#15803d]"
                                : "bg-[#e5f2ec] text-[#0f766e]"
                            }`}
                          >
                            {item.status === "COMPLETED"
                              ? hindi ? "पूर्ण हुआ" : "Completed"
                              : hindi ? "काउंसलर समीक्षा में" : "Pending Counsellor"}
                          </span>
                        </div>
                        {item.preferredTime && (
                          <p className="text-xs text-text-secondary flex items-center gap-1.5 pt-0.5">
                            <Clock size={13} /> {item.preferredTime}
                          </p>
                        )}
                        {item.notes && (
                          <p className="text-xs text-[#5c6d66] pt-1 italic line-clamp-2">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-text-secondary shrink-0">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {myMessages.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-[#7e918b]">
                  {hindi ? "काउंसलर को भेजे गए संदेश" : "Direct messages"}
                </p>
                <div className="grid gap-3">
                  {myMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="surface rounded-2xl p-4 border border-border-color space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <MessageCircle size={15} className="text-deep-teal" />
                          <span className="text-xs font-semibold text-text-primary">
                            {msg.subject || (hindi ? "परामर्श संदेश" : "Counselling message")}
                          </span>
                          {msg.urgency === "urgent" && (
                            <span className="rounded-full bg-warm-peach/15 px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
                              {hindi ? "जरूरी" : "Urgent"}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-text-secondary">
                          {new Date(msg.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-text-secondary bg-[#fbfdfc] p-3 rounded-xl border border-border-color/60">
                        &ldquo;{msg.message}&rdquo;
                      </p>
                      {msg.replyText ? (
                        <div className="mt-2 rounded-xl bg-[#eef7f4] border border-[#cfdfd8] p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-deep-teal">
                            {hindi ? "काउंसलर का उत्तर" : "Reply from Counsellor"}
                          </p>
                          <p className="mt-1 text-xs text-[#283e37]">{msg.replyText}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#7e918b]">
                          <CheckCircle2 size={13} className="text-[#0f766e]" />
                          <span>
                            {hindi
                              ? "काउंसलर को सुरक्षित रूप से पहुँचा दिया गया है"
                              : "Delivered securely to your counsellor"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Request a Follow-up */}
      {modalMode === "follow-up" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-border-color bg-[color:var(--surface)] p-6 sm:p-7 shadow-2xl">
            <button
              type="button"
              onClick={() => setModalMode("none")}
              className="absolute right-5 top-5 rounded-full p-1.5 text-text-secondary hover:bg-[#f0f4f2] transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pale-sage text-deep-teal">
                <CalendarClock size={20} />
              </span>
              <div>
                <h3 className="font-display text-2xl text-text-primary">
                  {hindi ? "फॉलो-अप कॉल का अनुरोध" : "Request a follow-up"}
                </h3>
                <p className="text-xs text-text-secondary">
                  {hindi
                    ? "अपनी पसंद की तारीख और समय स्लॉट चुनें"
                    : "Choose your preferred day and time slot"}
                </p>
              </div>
            </div>

            {followUpSuccess ? (
              <div className="my-8 flex flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7] text-[#15803d]">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="mt-4 font-display text-xl text-text-primary">
                  {hindi ? "अनुरोध सफलतापूर्वक भेजा गया!" : "Follow-up requested!"}
                </h4>
                <p className="mt-1 text-xs text-text-secondary max-w-xs">
                  {hindi
                    ? "आपके काउंसलर को यह जानकारी मिल गई है और वे जल्द ही आपसे संपर्क करेंगे।"
                    : "Your request has been delivered to your counsellor portal."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleFollowUpSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    {hindi ? "पसंदीदा तारीख" : "Preferred date"}
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full rounded-xl border border-border-color bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-deep-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    {hindi ? "समय की प्राथमिकता" : "Preferred time slot"}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "morning", labelEn: "Morning", labelHi: "सुबह", time: "10am - 1pm" },
                      { id: "afternoon", labelEn: "Afternoon", labelHi: "दोपहर", time: "2pm - 5pm" },
                      { id: "evening", labelEn: "Evening", labelHi: "शाम", time: "5pm - 7:30pm" },
                    ].map((slot) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setFollowUpTimeSlot(slot.id)}
                        className={`rounded-xl border p-2.5 text-center text-xs transition-all ${
                          followUpTimeSlot === slot.id
                            ? "border-deep-teal bg-deep-teal/10 font-bold text-deep-teal shadow-xs"
                            : "border-border-color bg-white text-text-secondary hover:border-deep-teal/50"
                        }`}
                      >
                        <div>{hindi ? slot.labelHi : slot.labelEn}</div>
                        <div className="mt-0.5 text-[10px] opacity-80">{slot.time}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    {hindi ? "कोई विशेष बात (वैकल्पिक)" : "Topic or notes (optional)"}
                  </label>
                  <textarea
                    rows={3}
                    placeholder={
                      hindi
                        ? "आप किस विषय पर चर्चा करना चाहते हैं? (जैसे: नींद, आगामी गवाही, तनाव...)"
                        : "What would you like to focus on? (e.g., anxiety before hearing, coping strategies...)"
                    }
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    className="w-full rounded-xl border border-border-color bg-white p-3 text-sm text-text-primary placeholder:text-[#9bb0a7] outline-none focus:border-deep-teal resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalMode("none")}
                    className="rounded-full px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-[#f0f4f2]"
                  >
                    {hindi ? "रद्द करें" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingFollowUp}
                    className="flex items-center gap-2 rounded-full bg-deep-teal px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0d655e] disabled:opacity-50 transition-colors"
                  >
                    <CalendarClock size={14} />
                    {isSubmittingFollowUp
                      ? hindi ? "भेज रहे हैं..." : "Sending..."
                      : hindi ? "अनुरोध सबमिट करें" : "Confirm request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Send a Message */}
      {modalMode === "message" && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-border-color bg-[color:var(--surface)] p-6 sm:p-7 shadow-2xl">
            <button
              type="button"
              onClick={() => setModalMode("none")}
              className="absolute right-5 top-5 rounded-full p-1.5 text-text-secondary hover:bg-[#f0f4f2] transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pale-sage text-deep-teal">
                <MessageCircle size={20} />
              </span>
              <div>
                <h3 className="font-display text-2xl text-text-primary">
                  {hindi ? "काउंसलर को संदेश" : "Send a message"}
                </h3>
                <p className="text-xs text-text-secondary">
                  {hindi ? "सीधा और सुरक्षित संदेश" : "Direct & confidential message"}
                </p>
              </div>
            </div>

            {messageSuccess ? (
              <div className="my-8 flex flex-col items-center justify-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dcfce7] text-[#15803d]">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="mt-4 font-display text-xl text-text-primary">
                  {hindi ? "संदेश सफलतापूर्वक भेजा गया!" : "Message sent!"}
                </h4>
                <p className="mt-1 text-xs text-text-secondary max-w-xs">
                  {hindi
                    ? "आपका संदेश काउंसलर डैशबोर्ड में दर्ज हो गया है।"
                    : "Your counsellor will receive this on their case portal."}
                </p>
              </div>
            ) : (
              <form onSubmit={handleMessageSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    {hindi ? "विषय (वैकल्पिक)" : "Subject / Topic (optional)"}
                  </label>
                  <input
                    type="text"
                    placeholder={hindi ? "जैसे: आज बहुत घबराहट महसूस हो रही है" : "e.g. Feeling overwhelmed today"}
                    value={messageSubject}
                    onChange={(e) => setMessageSubject(e.target.value)}
                    className="w-full rounded-xl border border-border-color bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none focus:border-deep-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    {hindi ? "आपका संदेश *" : "Your message *"}
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder={
                      hindi
                        ? "अपनी बात यहाँ लिखें। आप जो भी साझा करेंगे वह पूरी तरह गोपनीय रहेगा..."
                        : "Type what you'd like to share. You can write as much or as little as you feel comfortable with..."
                    }
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="w-full rounded-xl border border-border-color bg-white p-3 text-sm text-text-primary placeholder:text-[#9bb0a7] outline-none focus:border-deep-teal resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    {hindi ? "प्राथमिकता" : "Priority / Urgency"}
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: "routine", label: hindi ? "सामान्य (1-2 दिन)" : "Routine (1-2 days)" },
                      { id: "soon", label: hindi ? "आज/कल में" : "Soon (Within 24h)" },
                      { id: "urgent", label: hindi ? "अत्यावश्यक" : "Urgent" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setMessageUrgency(item.id as any)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                          messageUrgency === item.id
                            ? "border-deep-teal bg-deep-teal/10 text-deep-teal"
                            : "border-border-color bg-white text-text-secondary hover:border-deep-teal/50"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalMode("none")}
                    className="rounded-full px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-[#f0f4f2]"
                  >
                    {hindi ? "रद्द करें" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMessage || !messageContent.trim()}
                    className="flex items-center gap-2 rounded-full bg-deep-teal px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0d655e] disabled:opacity-50 transition-colors"
                  >
                    <Send size={14} />
                    {isSubmittingMessage
                      ? hindi ? "भेज रहे हैं..." : "Sending..."
                      : hindi ? "संदेश भेजें" : "Send message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}