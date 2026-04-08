"use client";

import { useMemo, useState } from "react";
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { useConnection } from "@solana/wallet-adapter-react";
import type { ParsedTransactionWithMeta } from "@solana/web3.js";
import bs58 from "bs58";

export default function VerifyStamp() {
  const [txSignature, setTxSignature] = useState("");
  const [lookupStatus, setLookupStatus] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [proofDetails, setProofDetails] = useState<Record<string, unknown>>({});
  const [blockTime, setBlockTime] = useState<number | null>(null);
  const [anchoredHash, setAnchoredHash] = useState("");
  const [content, setContent] = useState("");
  const [computedHash, setComputedHash] = useState("");
  const { connection } = useConnection();

  const computeHash = () => {
    if (content.trim().length === 0) return;
    const bytes = new TextEncoder().encode(content);
    const digest = blake3(bytes);
    setComputedHash(bytesToHex(digest));
  };

  const matchResult = useMemo(() => {
    if (!anchoredHash || !computedHash) return "pending";
    return anchoredHash.trim() === computedHash.trim() ? "match" : "mismatch";
  }, [anchoredHash, computedHash]);

  const extractMemo = (tx: ParsedTransactionWithMeta): string | null => {
    const instructions = tx.transaction.message.instructions;
    const memoInstruction = instructions.find((ix) => {
      if ("program" in ix) {
        return ix.program === "spl-memo";
      }
      if ("programId" in ix) {
        return ix.programId?.toBase58() === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
      }
      return false;
    });

    if (!memoInstruction) return null;

    if ("parsed" in memoInstruction && memoInstruction.parsed) {
      const parsed = memoInstruction.parsed as
        | string
        | { info?: { memo?: string } };
      if (typeof parsed === "string") {
        return parsed;
      }
      const memo = parsed?.info?.memo;
      return typeof memo === "string" ? memo : null;
    }

    if ("data" in memoInstruction && typeof memoInstruction.data === "string") {
      try {
        return new TextDecoder().decode(bs58.decode(memoInstruction.data));
      } catch {
        return null;
      }
    }

    return null;
  };

  const triggerLookup = async () => {
    if (!txSignature.trim()) return;
    setLookupStatus("loading");
    setLookupError(null);
    setProofDetails({});
    setBlockTime(null);

    try {
      const parsedTx = await connection.getParsedTransaction(txSignature.trim(), {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!parsedTx) {
        throw new Error("Transaction not found.");
      }

      const memo = extractMemo(parsedTx);
      if (!memo) {
        throw new Error("No memo payload found in this transaction.");
      }

      let payload: Record<string, unknown> = { raw_memo: memo };
      try {
        payload = JSON.parse(memo) as Record<string, unknown>;
      } catch {
        // Keep raw memo if JSON parsing fails.
      }

      const feePayer =
        parsedTx.transaction.message.accountKeys?.[0]?.pubkey?.toBase58?.() ??
        "(unknown)";
      const resolvedBlockTime = parsedTx.blockTime ?? null;

      setBlockTime(resolvedBlockTime);
      setProofDetails({
        ...payload,
        wallet_address: payload.wallet_address ?? feePayer,
        transaction_signature: txSignature.trim(),
        timestamp_source: "block time",
      });

      if (typeof payload.hash === "string") {
        setAnchoredHash(payload.hash);
      }

      setLookupStatus("loaded");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Lookup failed.";
      setLookupError(message);
      setLookupStatus("error");
    }
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(20,20,20,0.08)]">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted">
            Verify a TermStamp
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Retrieve public proof data
          </h1>
          <p className="mt-3 text-sm text-muted">
            Enter a Solana transaction signature to pull the anchored proof
            metadata.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <label className="text-sm font-medium">Transaction signature</label>
          <input
            value={txSignature}
            onChange={(event) => setTxSignature(event.target.value)}
            placeholder="Paste the transaction signature."
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm focus:border-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={triggerLookup}
            className="inline-flex w-fit items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-[#17464a] disabled:cursor-not-allowed disabled:bg-black/20"
            disabled={!txSignature.trim()}
          >
            Fetch on-chain proof
          </button>
          {lookupStatus === "loading" ? (
            <p className="text-xs text-muted">Fetching proof data...</p>
          ) : null}
          {lookupStatus === "error" && lookupError ? (
            <p className="text-xs text-accent-2">{lookupError}</p>
          ) : null}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-black/15 bg-surface-2 p-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-medium uppercase tracking-[0.16em] text-muted">
              Proof details
            </span>
            <span className="text-muted">
              {lookupStatus === "loaded" ? "Retrieved" : "Awaiting lookup"}
            </span>
          </div>
          <pre className="mt-3 whitespace-pre-wrap font-mono text-[11px] text-foreground/80">
            {JSON.stringify(
              Object.keys(proofDetails).length
                ? {
                    ...proofDetails,
                    block_time: blockTime
                      ? new Date(blockTime * 1000).toLocaleString()
                      : "Pending confirmation",
                  }
                : {
                    summary: "(returned from chain)",
                    hash: "(returned from chain)",
                    wallet_address: "(returned from chain)",
                    transaction_signature: txSignature || "(signature)",
                    timestamp_source: "block time",
                  },
              null,
              2
            )}
          </pre>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-black/10 bg-white/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Compare evidence
          </p>
          <p className="mt-3 text-sm text-muted">
            If you have the original content, re-hash it locally and compare
            against the anchored hash.
          </p>

          <div className="mt-4 space-y-3">
            <label className="text-sm font-medium">Anchored hash</label>
            <input
              value={anchoredHash}
              onChange={(event) => setAnchoredHash(event.target.value)}
              placeholder="Paste the hash from the TermStamp."
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm focus:border-accent focus:outline-none"
            />
          </div>

          <div className="mt-4 space-y-3">
            <label className="text-sm font-medium">Original content</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={5}
              placeholder="Paste the original content to re-hash."
              className="w-full resize-none rounded-2xl border border-black/10 bg-white p-4 text-sm shadow-sm focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={computeHash}
              className="inline-flex w-fit items-center rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20"
              disabled={!content.trim()}
            >
              Compute BLAKE3 hash
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4 text-sm">
            <p className="text-xs uppercase text-muted">Computed hash</p>
            <p className="mt-2 break-all font-mono text-[11px] text-foreground/80">
              {computedHash || "Pending hash"}
            </p>
            {matchResult === "match" ? (
              <p className="mt-3 text-sm font-medium text-accent">
                Hash matches the anchored proof.
              </p>
            ) : null}
            {matchResult === "mismatch" ? (
              <p className="mt-3 text-sm font-medium text-accent-2">
                Hash does not match the anchored proof.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-black/10 bg-white/70 p-5 text-sm text-muted">
          <p className="font-medium text-foreground">
            Verification is public.
          </p>
          <p className="mt-3">
            Anyone can verify later using the transaction signature and
            on-chain data.
          </p>
        </div>
      </aside>
    </section>
  );
}
