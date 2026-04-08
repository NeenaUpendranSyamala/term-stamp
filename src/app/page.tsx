import CreateStamp from "@/components/CreateStamp";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="relative flex-1">
        <div className="noise pointer-events-none absolute inset-0 opacity-60" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-muted">
              No login required
            </span>
            <span className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-muted">
              User-signed on Solana
            </span>
            <span className="rounded-full border border-black/10 bg-white/80 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-muted">
              Public verification
            </span>
          </div>
          <CreateStamp />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
