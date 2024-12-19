/**
 * @file Core type definitions for the Peeramid SDK
 */

import { Hex, WalletClient } from "viem";
export { LibMultipass, Multipass as MultipassDiamond } from "@peeramid-labs/multipass/types/src/Multipass";

/**
 * Criteria used for searching entities in the system
 */
export enum SearchCriteria {
  id,
  username,
  address,
}

/**
 * Represents a signer's identity in the system
 */
export interface SignerIdentity {
  /** User's display name */
  name: string;
  /** Unique identifier for the user */
  id: string;
  /** Wallet client associated with the signer */
  wallet: WalletClient;
}

/**
 * Message structure for user registration
 */
export interface RegisterMessage {
  /** Hex encoded name */
  name: Hex;
  /** Hex encoded unique identifier */
  id: Hex;
  /** Hex encoded domain name */
  domainName: Hex;
  /** Timestamp until which the registration is valid */
  validUntil: bigint;
  /** Registration nonce */
  nonce: bigint;
}
