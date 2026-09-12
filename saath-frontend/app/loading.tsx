export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f5f1] px-6">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 animate-spin rounded-full border-[5px] border-[#dfe9e5] border-t-[#1d776f] border-r-[#1d776f]" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4d5c5a]">
          Loading
        </p>
      </div>
    </div>
  );
}
