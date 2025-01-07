import { type Address, type Hex, stringToHex, zeroAddress, isAddress, type PublicClient } from "viem";
import type { RegisterMessage } from "../types";
import { MultipassAbi } from "../abis";
import { getArtifact } from "../utils";

export type Domain = {
  name: string;
  registrar: Address;
  fee: bigint;
  renewalFee: bigint;
  registerSize: bigint;
  isActive: boolean;
  referrerReward: bigint;
  referralDiscount: bigint;
};

/**
 * Structure representing a name query for Multipass
 * @public
 */
export type NameQuery = {
  /** Hex-encoded name */
  name: Hex;
  /** Hex-encoded ID */
  id: Hex;
  /** Wallet address */
  wallet: Address;
  /** Hex-encoded domain name */
  domainName: Hex;
  /** Hex-encoded target domain */
  targetDomain: Hex;
};

/**
 * Base class for Multipass functionality
 */
export default class MultipassBase {
  /** Chain ID for the network */
  chainId: number;
  /** Public client for reading contracts */
  publicClient: PublicClient;

  /**
   * Creates a new MultipassBase instance
   * @param params - Constructor parameters
   * @param params.chainId - ID of the blockchain network
   * @param params.publicClient - Public client for reading contracts
   */
  constructor({ chainId, publicClient }: { chainId: number; publicClient: PublicClient }) {
    this.chainId = chainId;
    this.publicClient = publicClient;
  }

  /**
   * Generates a URL for a dapp
   * @param message - Message object to be encoded in the URL
   * @param signature - Signature to be encoded in the URL
   * @param basepath - Base path of the URL
   * @param contractAddress - Address of the contract
   * @returns The generated URL
   */
  public getDappURL(message: object, signature: string, basepath: string, contractAddress: string) {
    return (
      basepath +
      "/?message=" +
      Buffer.from(JSON.stringify(message)).toString("base64") +
      "&contractAddress=" +
      contractAddress +
      "&signature=" +
      signature +
      "&chainId=" +
      this.chainId
    );
  }

  public getRegistrarMessage = ({
    username,
    id,
    domainName,
    validUntil,
  }: {
    username: string;
    id: string;
    domainName: string;
    validUntil: number;
  }): RegisterMessage => {
    return {
      name: stringToHex(username, { size: 32 }),
      id: stringToHex(id, { size: 32 }),
      domainName: stringToHex(domainName, { size: 32 }),
      validUntil: BigInt(validUntil),
      nonce: 0n,
    };
  };

  /**
   * Creates a name query by address
   * @param params - Parameters for creating the query
   * @param params.address - Address to be encoded in the query
   * @param params.domainName - Domain name to be encoded in the query
   * @param params.targetDomain - Target domain to be encoded in the query
   * @returns The generated name query
   */
  public formQueryByAddress = ({
    address,
    domainName,
    targetDomain,
  }: {
    address: string;
    domainName: string;
    targetDomain?: string;
  }): NameQuery => {
    if (!isAddress(address)) throw new Error("formQueryByAddress: is not a valid address");
    return {
      name: stringToHex("", { size: 32 }),
      id: stringToHex("", { size: 32 }),
      wallet: address,
      domainName: stringToHex(domainName, { size: 32 }),
      targetDomain: stringToHex(targetDomain ?? "", { size: 32 }),
    };
  };

  /**
   * Creates a name query by ID
   * @param params - Parameters for creating the query
   * @param params.id - ID to be encoded in the query
   * @param params.domainName - Domain name to be encoded in the query
   * @param params.targetDomain - Target domain to be encoded in the query
   * @returns The generated name query
   */
  public formQueryById = ({
    id,
    domainName,
    targetDomain,
  }: {
    id: string;
    domainName: string;
    targetDomain?: string;
  }): NameQuery => {
    return {
      name: stringToHex("", { size: 32 }),
      id: stringToHex(id, { size: 32 }),
      wallet: zeroAddress,
      domainName: stringToHex(domainName, { size: 32 }),
      targetDomain: stringToHex(targetDomain ?? "", { size: 32 }),
    };
  };

  /**
   * Creates a name query by username
   * @param params - Parameters for creating the query
   * @param params.username - Username to be encoded in the query
   * @param params.domainName - Domain name to be encoded in the query
   * @param params.targetDomain - Target domain to be encoded in the query
   * @returns The generated name query
   */
  public formQueryByUsername = ({
    username,
    domainName,
    targetDomain,
  }: {
    username: string;
    domainName: string;
    targetDomain?: string;
  }): NameQuery => {
    return {
      name: stringToHex(username, { size: 32 }),
      id: "0x",
      wallet: zeroAddress,
      domainName: stringToHex(domainName, { size: 32 }),
      targetDomain: stringToHex(targetDomain ?? "", { size: 32 }),
    };
  };

  /**
   * Creates a name query by username and ID
   * @param params - Parameters for creating the query
   * @param params.username - Username to be encoded in the query
   * @param params.id - ID to be encoded in the query
   * @param params.domainName - Domain name to be encoded in the query
   * @param params.targetDomain - Target domain to be encoded in the query
   * @returns The generated name query
   */
  public formQueryByUsernameAndId = ({
    username,
    id,
    domainName,
    targetDomain,
  }: {
    username: string;
    id: string;
    domainName: string;
    targetDomain?: string;
  }): NameQuery => {
    return {
      name: stringToHex(username, { size: 32 }),
      id: stringToHex(id, { size: 32 }),
      wallet: zeroAddress,
      domainName: stringToHex(domainName, { size: 32 }),
      targetDomain: stringToHex(targetDomain ?? "", { size: 32 }),
    };
  };

  /**
   * Creates a name query with full details
   * @param params - Parameters for creating the query
   * @param params.username - Username to be encoded in the query
   * @param params.id - ID to be encoded in the query
   * @param params.domainName - Domain name to be encoded in the query
   * @param params.targetDomain - Target domain to be encoded in the query
   * @param params.address - Address to be encoded in the query
   * @returns The generated name query
   */
  public formQueryByFullDetails = ({
    username,
    id,
    domainName,
    targetDomain,
    address,
  }: {
    username: string;
    id: string;
    domainName: string;
    targetDomain?: string;
    address: string;
  }): NameQuery => {
    if (!isAddress(address)) throw new Error("formQueryByAddress: is not a valid address");
    return {
      name: stringToHex(username, { size: 32 }),
      id: stringToHex(id, { size: 32 }),
      wallet: address,
      domainName: stringToHex(domainName, { size: 32 }),
      targetDomain: stringToHex(targetDomain ?? "", { size: 32 }),
    };
  };
  protected getContractAddress(): Address {
    const artifact = getArtifact(this.chainId, "Multipass");
    return artifact.address as Address;
  }

  protected getAbi() {
    return MultipassAbi;
  }

  /**
   * Get domain state
   * @param domainName Domain name to query
   * @returns Domain state
   */
  public async getDomainState(domainName: `0x${string}`): Promise<Domain> {
    return this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: MultipassAbi,
      functionName: "getDomainState",
      args: [domainName],
    });
  }

  /**
   * Get domain state by ID
   * @param id Domain ID to query
   * @returns Domain state
   */
  public async getDomainStateById(id: bigint): Promise<Domain> {
    return this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: MultipassAbi,
      functionName: "getDomainStateById",
      args: [id],
    });
  }

  /**
   * Get contract state
   * @returns Total number of domains
   */
  public async getContractState(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.getContractAddress(),
      abi: MultipassAbi,
      functionName: "getContractState",
      args: [],
    });
  }
}
