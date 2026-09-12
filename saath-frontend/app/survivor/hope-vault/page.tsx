"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, BookHeart, ImagePlus, MessageCircleHeart, Plus, Sparkles, Trash2, X } from "lucide-react";
import { hopeVaultService } from "@/services/hope-vault";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function HopeVaultPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ type: string; isOpen: boolean }>({ type: "", isOpen: false });
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hopeVaultService.getItems().then((data: any) => {
      setItems(data || []);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const newItem = await hopeVaultService.createItem({ type: modal.type, title, content });
      setItems([...items, newItem]);
      setModal({ type: "", isOpen: false });
      setTitle("");
      setContent("");
    } catch (e) {
      setError("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteItem(id: string) {
    await hopeVaultService.deleteItem(id);
    setItems(items.filter((i) => i.id !== id));
  }

  async function addItem(type: string, file?: File) {
    setSubmitting(true);
    setError("");
    try {
      let newItem;
      if (type === 'photo' && file) {
        newItem = await hopeVaultService.uploadPhoto(file, 'Photo');
      } else {
        // This part is now handled by the modal for memory/message/achievement
        // But for consistency, we keep the logic here if needed or just use handleSave
        return;
      }
      setItems([...items, newItem]);
    } catch (e) {
      setError("Failed to save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 pb-10 md:px-10 xl:px-14">
      <Link href="/survivor/my-space" className="inline-flex items-center gap-2 text-sm font-semibold text-[#75857f]">
        <ArrowLeft size={16} /> My space
      </Link>

      <div className="relative overflow-hidden rounded-4xl bg-[#fff0e5] p-8 md:p-12 mt-6">
        <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-[#f5c4a7]/35 blur-2xl" />
        <div className="relative max-w-2xl">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-[#b56e4e]"><BookHeart size={23} /></span>
          <h1 className="mt-7 font-display text-5xl leading-none text-[#4a352d] md:text-6xl">Your Hope Vault</h1>
          <p className="mt-5 text-lg leading-relaxed text-[#7a5c4e]">Keep the things that remind you what matters. The little things count.</p>
        </div>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && addItem('photo', e.target.files[0])} />
        <button onClick={() => fileInputRef.current?.click()} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-[22px] border border-[#e9d5ca] bg-white/80 text-sm font-bold text-[#6b4b3d] hover:-translate-y-0.5 hover:bg-white"><ImagePlus size={20} className="text-[#c77d5c]" />Add Photo</button>
        <button onClick={() => setModal({ type: "memory", isOpen: true })} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-[22px] border border-[#e9d5ca] bg-white/80 text-sm font-bold text-[#6b4b3d] hover:-translate-y-0.5 hover:bg-white"><BookHeart size={20} className="text-[#c77d5c]" />Add Memory</button>
        <button onClick={() => setModal({ type: "message", isOpen: true })} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-[22px] border border-[#e9d5ca] bg-white/80 text-sm font-bold text-[#6b4b3d] hover:-translate-y-0.5 hover:bg-white"><MessageCircleHeart size={20} className="text-[#c77d5c]" />Add Message</button>
        <button onClick={() => setModal({ type: "achievement", isOpen: true })} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-[22px] border border-[#e9d5ca] bg-white/80 text-sm font-bold text-[#6b4b3d] hover:-translate-y-0.5 hover:bg-white"><Sparkles size={20} className="text-[#c77d5c]" />Add Achievement</button>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold capitalize">Add {modal.type}</h2>
              <button onClick={() => setModal({ type: "", isOpen: false })}><X size={20} /></button>
            </div>
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-3" />
            <textarea placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} className="w-full rounded-xl border border-border-color p-3 text-sm mb-3" rows={4} />
            {error && <p className="text-sm text-warm-peach mb-3">{error}</p>}
            <Button onClick={handleSave} disabled={submitting} className="w-full">{submitting ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? <p>Loading...</p> : items.length === 0 ? (
          <div className="col-span-full rounded-[26px] border border-dashed border-[#ddbbaa] bg-[#fffaf5] p-12 text-center">
            <h2 className="font-display text-2xl text-[#513b31]">The little things matter.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#856f64]">Your Hope Vault is a gentle place for memories, messages, and moments.</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="surface rounded-2xl p-6 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-[#4a352d]">{item.title}</h3>
                <p className="text-sm text-[#7a5c4e] mt-1">{item.content}</p>
                {item.image_url && <img src={item.image_url} alt={item.title} className="mt-2 max-h-32 rounded-lg" />}
              </div>
              <button onClick={() => deleteItem(item.id)} className="text-[#c77d5c]"><Trash2 size={18} /></button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}