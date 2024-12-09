// This file is auto-generated. Do not edit manually.
import { type Chain } from "viem";

export type ChainMapping = Record<number, string>;

export const chainToPath: ChainMapping = {
  "42161": "localhost",
  "97113": "anvil",
} as const;

export function getChainPath(chain: Chain): string {
  const path = chainToPath[chain.id];
  if (!path) {
    throw new Error(`Chain ${chain.name} (ID: ${chain.id}) is not supported`);
  }
  return path;
}
