export default function SiteFooter() {
  return (
    <footer className="w-full border-t border-black/10 bg-white/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-muted">
        <p className="max-w-3xl">
          TermStamp provides publicly verifiable blockchain evidence of existence
          and timestamping. It is not legal proof or legal advice.
        </p>
        <p>
          We do not store your TermStamp. Save your transaction signature,
          hash, and summary yourself.
        </p>
      </div>
    </footer>
  );
}
