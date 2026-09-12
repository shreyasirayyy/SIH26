"use client";
import Link from "next/link";
import { ArrowLeft, Heart, LockKeyhole, ShieldCheck, UsersRound, Send } from "lucide-react";
import { useState } from "react";

type Post = { id: string; body: string; hearts: number; postedAt: string };

const INITIAL_POSTS: Post[] = [
  { id: "p1", body: "Some days are heavier than others, but I showed up for my hearing today. Small win.", hearts: 4, postedAt: "2 days ago" },
  { id: "p2", body: "Grateful for this space. Reading everyone's posts reminds me I'm not the only one going through this.", hearts: 7, postedAt: "5 days ago" },
  { id: "p3", body: "My counsellor helped me plan out what to say at the next hearing. Feeling a little more prepared.", hearts: 3, postedAt: "1 week ago" },
];

export default function CommunityPage() {
  const [enabled, setEnabled] = useState(false);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [draft, setDraft] = useState("");

  function createPost() {
    if (!draft.trim()) return;
    setPosts((prev) => [{ id: `p-${Date.now()}`, body: draft.trim(), hearts: 0, postedAt: "Just now" }, ...prev]);
    setDraft("");
  }

  function likePost(id: string) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, hearts: p.hearts + 1 } : p)));
  }

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/support" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> Support
      </Link>
      <div className="mx-auto mt-9 max-w-3xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eee8f5] text-[#8064a2]">
          <UsersRound size={22} />
        </span>
        <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-[#7e918b]">You Are Not Alone</p>
        <h1 className="mt-3 font-display text-5xl text-[#172326]">A moderated place to feel less alone.</h1>
        <p className="mt-4 text-lg leading-relaxed text-[#63736e]">Anonymous, supportive, and always your choice.</p>

        <div className="surface mt-10 rounded-[28px] p-7 md:p-10">
          {!enabled ? (
            <>
              <div className="flex items-start gap-4">
                <LockKeyhole className="mt-1 text-[#8064a2]" size={22} />
                <div>
                  <h2 className="font-display text-2xl text-[#2d4039]">Community support is currently off.</h2>
                  <p className="mt-3 text-sm leading-relaxed text-[#6b7b75]">If you enable it, you'll see anonymous posts moderated for safety.</p>
                </div>
              </div>
              <button onClick={() => setEnabled(true)} className="mt-8 rounded-full bg-[#8064a2] px-6 py-3 text-sm font-bold text-white">
                Enable community
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-[#4d946b]" />
                <p className="font-bold text-[#385048]">Community is on</p>
              </div>
              <div className="mt-6 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createPost()}
                  placeholder="Share something supportive..."
                  className="flex-1 rounded-full border border-border-color px-4 py-2 text-sm"
                />
                <button onClick={createPost} className="rounded-full bg-[#0f766e] p-3 text-white"><Send size={16} /></button>
              </div>
              <div className="mt-6 space-y-3">
                {posts.map((post) => (
                  <div className="rounded-2xl bg-[#f4f6ec] p-4" key={post.id}>
                    <p className="text-sm text-[#52655b]">{post.body}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-[#89968f]">
                      <span>{post.postedAt}</span>
                      <button onClick={() => likePost(post.id)} className="flex items-center gap-1 hover:text-[#a2542f]">
                        <Heart size={13} /> {post.hearts}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}