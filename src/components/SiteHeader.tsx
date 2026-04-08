"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

const navLinks = [
  { href: "/", label: "Create" },
  { href: "/verify", label: "Verify" },
];

export default function SiteHeader() {
  const { connected, disconnect, select } = useWallet();
  const { setVisible } = useWalletModal();
  const [disconnecting, setDisconnecting] = useState(false);

  const onChangeWallet = () => setVisible(true);

  const onDisconnect = async () => {
    try {
      setDisconnecting(true);
      await disconnect();
      // Clear selected wallet so reconnect is fully opt-in.
      select(null);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <header className="w-full border-b border-black/10 bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white font-mono text-sm tracking-tight">
            TS
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight">TermStamp</p>
            <p className="text-xs text-muted">
              Public evidence on Solana
            </p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/80 transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <WalletMultiButton
            className={`!rounded-full !bg-foreground !text-white !text-sm !font-medium hover:!bg-black/80 ${
              connected ? "!pointer-events-none" : ""
            }`}
          />
          {connected ? (
            <>
              <button
                type="button"
                onClick={onChangeWallet}
                className="rounded-full border border-black/20 px-3 py-2 text-xs font-medium text-foreground/80 transition hover:border-black/35 hover:text-foreground"
              >
                Change wallet
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                disabled={disconnecting}
                className="rounded-full border border-black/20 px-3 py-2 text-xs font-medium text-foreground/80 transition hover:border-black/35 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </>
          ) : null}
        </div>
      </div>
      <div className="border-t border-black/10 md:hidden">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-4 overflow-x-auto px-6 py-3 text-sm">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/70 transition hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
