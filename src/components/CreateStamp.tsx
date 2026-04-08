"use client";

import { useMemo, useState } from "react";
import { blake3 } from "@noble/hashes/blake3.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { Buffer } from "buffer";
import { Transaction, TransactionInstruction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { buildTermStampPayload } from "@/lib/proof";
import { MEMO_PROGRAM_ID } from "@/lib/solana";

type InputMode = "content" | "hash";

export default function CreateStamp() {
  const [mode, setMode] = useState<InputMode>("content");
  const [content, setContent] = useState("");
  const [providedHash, setProvidedHash] = useState("");
  const [summary, setSummary] = useState("");
  const [computedHash, setComputedHash] = useState("");
  const summaryLimit = 250;
  const summaryLength = summary.length;
  const summaryRemaining = Math.max(0, summaryLimit - summaryLength);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "signing" | "confirming" | "confirmed" | "error"
  >("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState("");
  const [blockTime, setBlockTime] = useState<number | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const hasSummary = summary.trim().length > 0;
  const canCompute = mode === "content" && content.trim().length > 0;
  const activeHash = mode === "content" ? computedHash : providedHash;
  const inputModeLabel =
    mode === "content" ? "BLAKE3 from content" : "Provided hash";

  const hashWarning =
    mode === "hash" &&
    providedHash.trim().length > 0 &&
    !/^[a-fA-F0-9]+$/.test(providedHash.trim());

  const proofPayload = useMemo(() => {
    return buildTermStampPayload(
      summary.trim() || "(required)",
      activeHash || "(required)",
      publicKey?.toBase58()
    );
  }, [summary, activeHash, publicKey]);

  const payloadJson = useMemo(
    () => JSON.stringify(proofPayload),
    [proofPayload]
  );
  const payloadBytes = useMemo(
    () => new TextEncoder().encode(payloadJson),
    [payloadJson]
  );
  const payloadSize = payloadBytes.length;
  const payloadTooLarge = payloadSize > 900;

  const computeHash = () => {
    if (!canCompute) return;
    const bytes = new TextEncoder().encode(content);
    const digest = blake3(bytes);
    setComputedHash(bytesToHex(digest));
  };

  const submitStamp = async () => {
    if (!publicKey) {
      setSubmitError("Connect a wallet to sign the transaction.");
      return;
    }
    if (!hasSummary || !activeHash) {
      setSubmitError("Summary and hash are required.");
      return;
    }
    if (payloadTooLarge) {
      setSubmitError("Payload is too large for a Solana memo.");
      return;
    }

    try {
      setSubmitError(null);
      setSubmitStatus("signing");
      const memoIx = new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(payloadBytes),
      });
      const transaction = new Transaction().add(memoIx);
      transaction.feePayer = publicKey;
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;

      const signature = await sendTransaction(transaction, connection);
      setTxSignature(signature);
      setSubmitStatus("confirming");

      const confirmation = await connection.confirmTransaction(
        {
          signature,
          ...latestBlockhash,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error("Transaction failed to confirm.");
      }

      const confirmedTx = await connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      setBlockTime(confirmedTx?.blockTime ?? null);
      setSubmitStatus("confirmed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Transaction failed.";
      setSubmitError(message);
      setSubmitStatus("error");
    }
  };

  const receiptTimestamp = blockTime
    ? new Date(blockTime * 1000).toLocaleString()
    : "After confirmation";

  const receiptText = useMemo(() => {
    return [
      "TermStamp Receipt",
      "-----------------",
      `Hash: ${activeHash || "Pending hash"}`,
      `Summary: ${summary || "Pending summary"}`,
      `Wallet: ${publicKey?.toBase58() ?? "Not connected"}`,
      `Timestamp: ${receiptTimestamp}`,
      `Transaction: ${txSignature || "Will appear after signing"}`,
      "Hash source: TermStamp",
      `Input mode: ${inputModeLabel}`,
    ].join("\n");
  }, [
    activeHash,
    summary,
    publicKey,
    receiptTimestamp,
    txSignature,
    inputModeLabel,
  ]);

  const downloadReceipt = () => {
    const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "termstamp-receipt.txt";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_rgba(20,20,20,0.08)]">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-muted">
              Create a TermStamp
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Anchor your proof on Solana
            </h1>
            <p className="mt-3 text-sm text-muted">
              No login, no custody, no platform fee. You sign and pay directly
              with your wallet.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("content")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "content"
                  ? "bg-accent text-white"
                  : "border border-black/20 text-foreground/70 hover:border-black/40"
              }`}
            >
              Paste content
            </button>
            <button
              type="button"
              onClick={() => setMode("hash")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === "hash"
                  ? "bg-accent text-white"
                  : "border border-black/20 text-foreground/70 hover:border-black/40"
              }`}
            >
              Bring your own hash
            </button>
          </div>

          {mode === "content" ? (
            <div className="space-y-3">
              <label className="text-sm font-medium">Content to hash</label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={6}
                placeholder="Paste your text or document excerpt here."
                className="w-full resize-none rounded-2xl border border-black/10 bg-white p-4 text-sm shadow-sm focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={computeHash}
                className="inline-flex w-fit items-center rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-[#17464a] disabled:cursor-not-allowed disabled:bg-black/20"
                disabled={!canCompute}
              >
                Compute BLAKE3 hash
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium">Provided hash</label>
              <input
                value={providedHash}
                onChange={(event) => setProvidedHash(event.target.value)}
                placeholder="Paste the hash exactly as provided."
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm focus:border-accent focus:outline-none"
              />
              {hashWarning ? (
                <p className="text-xs text-accent-2">
                  This doesn&apos;t look like a hex string. We will accept it
                  as-is.
                </p>
              ) : null}
            </div>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium">
              Summary (required, 250 characters max)
            </label>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={summaryLimit}
              rows={3}
              placeholder="Add a concise summary."
              className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-sm focus:border-accent focus:outline-none"
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <span>
                {!hasSummary
                  ? "Summary is mandatory for every TermStamp."
                  : "Saved in the on-chain payload."}
              </span>
              <span>{summaryRemaining} characters left</span>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-black/15 bg-surface-2 p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium uppercase tracking-[0.16em] text-muted">
                Proof payload preview
              </span>
              <span className="text-muted">{inputModeLabel}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
              <span>Payload size</span>
              <span>{payloadSize} bytes</span>
            </div>
            {payloadTooLarge ? (
              <p className="mt-2 text-[11px] text-accent-2">
                Payload exceeds the memo size comfort zone. Shorten the summary.
              </p>
            ) : null}
            <pre className="mt-3 whitespace-pre-wrap font-mono text-[11px] text-foreground/80">
              {JSON.stringify(proofPayload, null, 2)}
            </pre>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Ready to anchor</p>
                <p className="text-xs text-muted">
                  {publicKey
                    ? "Wallet connected. Sign to submit your memo."
                    : "Connect your Solana wallet to sign and pay."}
                </p>
              </div>
              <button
                type="button"
                onClick={submitStamp}
                className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/20"
                disabled={
                  !publicKey ||
                  !hasSummary ||
                  !activeHash ||
                  payloadTooLarge ||
                  submitStatus === "signing" ||
                  submitStatus === "confirming"
                }
              >
                {submitStatus === "signing"
                  ? "Awaiting wallet..."
                  : submitStatus === "confirming"
                  ? "Confirming..."
                  : "Sign & Submit"}
              </button>
            </div>
            {submitError ? (
              <p className="mt-3 text-xs text-accent-2">{submitError}</p>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-black/10 bg-white/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">
              Receipt preview
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowReceipt(true)}
                className="rounded-full border border-black/15 px-3 py-1 text-[11px] font-medium text-foreground/80 transition hover:border-black/30"
              >
                View receipt
              </button>
              <button
                type="button"
                onClick={downloadReceipt}
                className="rounded-full bg-foreground px-3 py-1 text-[11px] font-medium text-white transition hover:bg-black/80"
              >
                Download
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm text-muted">
            <div>
              <p className="text-xs uppercase text-muted">Hash</p>
              <p className="break-all font-mono text-[11px]">
                {activeHash || "Pending hash"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted">Summary</p>
              <p className="whitespace-pre-wrap">
                {summary || "Pending summary"}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase text-muted">Wallet</p>
                <p className="font-mono text-[11px]">
                  {publicKey?.toBase58() ?? "Not connected"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted">Timestamp</p>
                <p>
                  {receiptTimestamp}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-muted">Transaction</p>
              <p className="font-mono text-[11px]">
                {txSignature || "Will appear after signing"}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-black/10 bg-white/70 p-5 text-sm text-muted">
          <p className="font-medium text-foreground">What is TermStamp?</p>
          <p className="mt-3">
            TermStamp helps you create a timestamped proof that something
            existed at a specific time.
          </p>

          <p className="mt-4 font-medium text-foreground">You can use it for:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Project ideas and drafts</li>
            <li>Agreements or terms</li>
            <li>Written content or artwork</li>
          </ul>

          <p className="mt-4 font-medium text-foreground">
            What does this prove?
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your content existed at a certain time</li>
            <li>The record is publicly verifiable</li>
          </ul>

          <p className="mt-4 font-medium text-foreground">
            What this does NOT prove
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>It does not prove ownership</li>
            <li>It is not a legal certification</li>
            <li>It does not guarantee authorship</li>
          </ul>

          <p className="mt-4 font-medium text-foreground">
            Make sure you keep:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Your transaction signature</li>
            <li>Your hash</li>
          </ul>
          <p className="mt-3">
            You will need these later to verify your proof here or on Solscan.
          </p>
        </div>
      </aside>

      {showReceipt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6 py-10">
          <div className="relative w-full max-w-xl rounded-3xl border border-black/10 bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  TermStamp receipt
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Save this proof data
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowReceipt(false)}
                className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium text-foreground/80 transition hover:border-black/30"
              >
                Close
              </button>
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-black/15 bg-surface-2 p-4">
              <pre className="whitespace-pre-wrap font-mono text-[12px] text-foreground/80">
                {receiptText}
              </pre>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={downloadReceipt}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:bg-black/80"
              >
                Download text
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
