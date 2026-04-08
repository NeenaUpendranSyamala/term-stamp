import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import VerifyStamp from "@/components/VerifyStamp";

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="relative flex-1">
        <div className="noise pointer-events-none absolute inset-0 opacity-60" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16">
          <VerifyStamp />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
