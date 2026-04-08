export type HashSource = "TermStamp";

export type TermStampPayload = {
  summary: string;
  hash: string;
  hash_source: HashSource;
  schema_version: "ts-1";
  wallet_address?: string;
  timestamp_source?: "block time";
};

export const SCHEMA_VERSION = "ts-1" as const;

export function buildTermStampPayload(
  summary: string,
  hash: string,
  walletAddress?: string
): TermStampPayload {
  return {
    summary,
    hash,
    hash_source: "TermStamp",
    schema_version: SCHEMA_VERSION,
    wallet_address: walletAddress,
    timestamp_source: "block time",
  };
}
