# TermStamp

TermStamp is a no-login, non-custodial platform for creating publicly verifiable evidence on Solana by anchoring a user-provided hash or a BLAKE3 hash of pasted content in a wallet-signed transaction.

TermStamp provides publicly verifiable blockchain evidence of existence and timestamping. It is not legal proof or legal advice.

## MVP scope

- Paste content and hash locally with BLAKE3.
- Provide your own hash (accepted as-is).
- Mandatory summary for every proof (multi-line, 250 chars max).
- Wallet-signed Solana transaction flow (memo-based).
- Public verification by transaction signature (Helius RPC + memo decoding).

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploy to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the repository in Vercel as a new project.
3. In `Settings -> Environment Variables`, add:
   - `NEXT_PUBLIC_HELIUS_RPC_URL` (set for `Preview` and `Production`)
4. Deploy.

Vercel will auto-detect this as a Next.js project and run `npm run build`.

## Environment

Create a local env file:

```
NEXT_PUBLIC_HELIUS_RPC_URL=YOUR_HELIUS_RPC_URL
```

## Notes

- The platform does not store user history or TermStamps.
- Users must retain their transaction signature, hash, and summary.
- Client-side hashing uses @noble/hashes (BLAKE3).
- Solana wallet adapters are wired for Phantom and Solflare.
