/**
 * @file MAO (Meritocratic Autonomous Organization) Distribution implementation
 * Provides functionality for managing and distributing MAO tokens and instances
 */

import { DistributorClient } from "../eds/Distributor";
import { getArtifact, parseInstantiated } from "../utils";
import { MAOInstances } from "../types/contracts";
import instanceAbi from "../abis/RankifyDiamondInstance";
import rankTokenAbi from "../abis/RankToken";
import govtTokenAbi from "../abis/DistributableGovernanceERC20";
import govtAccessManagerAbi from "../abis/SimpleAccessManager";
import {
  getAddress,
  getContract,
  GetContractReturnType,
  Chain,
  encodeAbiParameters,
  GetAbiItemParameters,
  getAbiItem,
  stringToHex,
  PublicClient,
  WalletClient,
  parseEventLogs,
  Address,
  keccak256,
  Hex,
  erc20Abi,
  maxUint256,
} from "viem";
import MaoDistributionAbi from "../abis/MAODistribution";
import distributorAbi from "../abis/DAODistributor";
import { CodeIndexAbi } from "../abis";

/**
 * Structure defining token-related arguments
 */
export type TokenArgumentsStructOutput = {
  /** Name of the token */
  tokenName: string;
  /** Symbol for the token */
  tokenSymbol: string;
};

/**
 * Configuration settings for Rankify user settings
 */
export type UserRankifySettingsStructOutput = {
  /** Cost of the principal token */
  principalCost: bigint;
  /** Time constant for principal calculations */
  principalTimeConstant: bigint;
  /** Additional metadata for the settings */
  metadata: string;
  /** URI for the rank token */
  rankTokenURI: string;
  /** Contract URI for the rank token */
  rankTokenContractURI: string;
};

/**
 * Combined arguments for new community initialization
 */
export type DistributorArgumentsStruct = {
  /** Token configuration settings */
  tokenSettings: TokenArgumentsStructOutput;
  /** Rankify-specific settings */
  rankifySettings: UserRankifySettingsStructOutput;
};

/**
 * Collection of contract instances for a MAO deployment
 */
export interface MAOInstanceContracts {
  /** Rank token contract instance */
  rankToken: GetContractReturnType<typeof rankTokenAbi>;
  /** Main instance contract */
  instance: GetContractReturnType<typeof instanceAbi>;
  /** Governance token contract */
  govtToken: GetContractReturnType<typeof govtTokenAbi>;
  /** Access manager for governance token */
  govTokenAccessManager: GetContractReturnType<typeof govtAccessManagerAbi>;
  /** Access manager for ACID */
  ACIDAccessManager: GetContractReturnType<typeof govtAccessManagerAbi>;
}

/**
 * Client for managing MAO Distribution operations
 * Handles creation, management and interaction with MAO instances
 */
export class MAODistributorClient extends DistributorClient {
  private static readonly DEFAULT_NAME = "MAO Distribution";
  walletClient?: WalletClient;

  /**
   * Creates a new MAODistributorClient instance
   * @param chainId - ID of the blockchain network
   * @param client - Object containing public and wallet clients
   */
  constructor(chainId: number, client: { publicClient: PublicClient; walletClient?: WalletClient }) {
    const { address, receipt } = getArtifact(chainId, "DAODistributor");
    super({
      address: getAddress(address),
      publicClient: client.publicClient,
      creationBlock: BigInt(receipt.blockNumber),
    });
    this.walletClient = client.walletClient;
  }

  /**
   * Converts MAOInstances addresses to their respective contract instances
   * @param addresses Object containing contract addresses for MAO distribution components
   * @returns Object containing initialized contract instances
   * @throws Error if any of the addresses are invalid
   */
  addressesToContracts(addresses: MAOInstances): MAOInstanceContracts {
    const instance = getContract({
      address: getAddress(addresses.ACIDInstance),
      abi: instanceAbi,
      client: this.walletClient ?? this.publicClient,
    });

    const rankToken = getContract({
      address: getAddress(addresses.rankToken),
      abi: rankTokenAbi,
      client: this.walletClient ?? this.publicClient,
    });

    const govtToken = getContract({
      address: getAddress(addresses.govToken),
      abi: govtTokenAbi,
      client: this.walletClient ?? this.publicClient,
    });

    const govTokenAccessManager = getContract({
      address: getAddress(addresses.govTokenAccessManager),
      abi: govtAccessManagerAbi,
      client: this.walletClient ?? this.publicClient,
    });

    const ACIDAccessManager = getContract({
      address: getAddress(addresses.ACIDAccessManager),
      abi: govtAccessManagerAbi,
      client: this.walletClient ?? this.publicClient,
    });

    return { rankToken, instance, govtToken, govTokenAccessManager, ACIDAccessManager };
  }

  /**
   * Get MAOInstances instances by distribution name
   * @param params.namedDistribution Distribution name (defaults to "MAO Distribution")
   * @param params.fromBlock Block to start searching from (defaults to 1)
   * @returns Array of MAOInstances contract instances
   */
  async getMAOInstances({
    namedDistribution = MAODistributorClient.DEFAULT_NAME,
    fromBlock,
  }: {
    namedDistribution?: string;
    fromBlock?: bigint;
  } = {}): Promise<
    {
      instances: MAOInstanceContracts;
      maoInstanceId: bigint;
    }[]
  > {
    const logs = await this.publicClient.getContractEvents({
      address: this.address,
      abi: distributorAbi,
      eventName: "Instantiated",
      args: {
        distributionId: stringToHex(namedDistribution, { size: 32 }),
      },
      fromBlock: fromBlock ?? this.createdAtBlock ?? (await this.getCreationBlock()),
      toBlock: "latest",
    });

    const instances = logs
      .map((l) => ({
        instances: parseInstantiated(l.args.instances as string[]),
        maoInstanceId: l.args.newInstanceId as bigint,
      }))
      .map((ip) => ({
        instances: this.addressesToContracts(ip.instances),
        maoInstanceId: ip.maoInstanceId,
      }));

    return instances;
  }

  parseToContracts(instances: readonly Address[]) {
    return this.addressesToContracts(parseInstantiated(instances as string[]));
  }

  async getDistributions(): Promise<readonly `0x${string}`[]> {
    return this.publicClient.readContract({
      abi: distributorAbi,
      functionName: "getDistributions",
      address: this.address,
    });
  }

  async addNamedDistribution(
    chain: Chain,
    name: `0x${string}`,
    address: `0x${string}`,
    initializer: `0x${string}` = "0x0000000000000000000000000000000000000000"
  ) {
    if (!this.walletClient) {
      throw new Error("Wallet client is required for this operation");
    }

    const code = await this.publicClient.getCode({ address });
    if (!code) throw new Error(`Code not found on ${address} address`);
    const hashCode = keccak256(code);
    const distrAddress = await this.publicClient.readContract({
      abi: CodeIndexAbi,
      address: getArtifact(chain.id, "CodeIndex").address,
      functionName: "get",
      args: [hashCode],
    });
    const [account] = await this.walletClient.getAddresses();

    if (distrAddress == "0x0000000000000000000000000000000000000000") {
      const { request } = await this.publicClient.simulateContract({
        abi: CodeIndexAbi,
        address: getArtifact(chain.id, "CodeIndex").address,
        functionName: "register",
        args: [address],
        account,
      });

      await this.walletClient
        .writeContract(request)
        .then((h) => this.publicClient.waitForTransactionReceipt({ hash: h }));
    }

    const { request } = await this.publicClient.simulateContract({
      abi: distributorAbi,
      address: this.address,
      functionName: "addNamedDistribution",
      args: [name, hashCode, initializer],
      account,
      chain,
    });

    const receipt = await this.walletClient
      .writeContract(request)
      .then((h) => this.publicClient.waitForTransactionReceipt({ hash: h }));

    const distributionAddedEvent = parseEventLogs({
      abi: distributorAbi,
      logs: receipt.logs,
      eventName: "DistributionAdded",
      // strict: false,
    });

    return { receipt, distributionAddedEvent: distributionAddedEvent[0] };
  }

  async getMAOInstance({
    name = MAODistributorClient.DEFAULT_NAME,
    instanceId,
    fromBlock,
  }: {
    name?: string;
    instanceId: bigint;
    fromBlock?: bigint;
  }): Promise<MAOInstanceContracts> {
    const logs = await this.publicClient.getContractEvents({
      address: this.address,
      abi: distributorAbi,
      eventName: "Instantiated",
      args: {
        distributionId: stringToHex(name, { size: 32 }),
        newInstanceId: instanceId,
      },
      fromBlock: fromBlock ?? this.createdAtBlock ?? (await this.getCreationBlock()),
      toBlock: "latest",
    });

    if (logs.length === 0) {
      console.error("No instance found");
      throw new Error(`No instance found for distribution ${name} and id ${instanceId}`);
    }

    if (logs.length > 1) {
      console.error("Multiple instances found");
      throw new Error(`Multiple instances found for distribution ${name} and id ${instanceId}`);
    }

    const { instances } = logs[0].args;
    if (!instances) throw new Error(`No instances found for distribution ${name} and id ${instanceId}`);
    return this.addressesToContracts(parseInstantiated(instances as string[]));
  }

  async getInstantiatePrice(distributorsId: Hex): Promise<bigint> {
    return this.publicClient.readContract({
      abi: distributorAbi,
      functionName: "instantiationCosts",
      address: this.address,
      args: [distributorsId],
    });
  }

  async setInstantiationAllowance(amount?: bigint) {
    if (!this.walletClient) throw new Error("walletClient is required, use constructor with walletClient");
    if (!this.walletClient.account?.address) throw new Error("No account address found");
    const paymentToken = await this.publicClient.readContract({
      abi: distributorAbi,
      functionName: "paymentToken",
      address: this.address,
    });

    await this.walletClient.writeContract({
      chain: this.walletClient.chain,
      account: this.walletClient.account,
      abi: erc20Abi,
      functionName: "approve",
      address: paymentToken,
      args: [this.address, amount ? amount : maxUint256],
    });
  }

  async needsAllowance(distributorsId: Hex) {
    if (!this.walletClient) throw new Error("walletClient is required, use constructor with walletClient");
    if (!this.walletClient.account?.address) throw new Error("No account address found");
    const paymentToken = await this.publicClient.readContract({
      abi: distributorAbi,
      functionName: "paymentToken",
      address: this.address,
    });
    const allowance = await this.publicClient.readContract({
      abi: erc20Abi,
      functionName: "allowance",
      address: paymentToken,
      args: [this.walletClient.account?.address, this.address],
    });
    return allowance < (await this.getInstantiatePrice(distributorsId));
  }

  /**
   * Create a new MAODistribution instance
   * @param args Distribution arguments (encoded as bytes)
   * @param name Distributor name (defaults to "MAO Distribution")
   * @returns Array of created contract addresses
   */
  async instantiate(
    args: GetAbiItemParameters<typeof MaoDistributionAbi, "distributionSchema">["args"],
    name: string = MAODistributorClient.DEFAULT_NAME,
    chain: Chain
  ): Promise<MAOInstanceContracts> {
    if (!args) throw new Error("args is required");
    if (!this.walletClient) throw new Error("walletClient is required, use constructor with walletClient");
    const abiItem = getAbiItem({ abi: MaoDistributionAbi, name: "distributionSchema" });
    const encodedParams = encodeAbiParameters(abiItem.inputs, args);
    const encodedName = stringToHex(name, { size: 32 });
    if (!this.walletClient.account?.address) throw new Error("No account address found");
    try {
      if (await this.needsAllowance(encodedName)) await this.setInstantiationAllowance();
      const { request } = await this.publicClient.simulateContract({
        abi: distributorAbi,
        address: this.address,
        functionName: "instantiate",
        args: [encodedName, encodedParams],
        account: this.walletClient.account,
        chain: chain,
      });
      const receipt = await this.walletClient
        .writeContract(request)
        .then((h) => this.publicClient.waitForTransactionReceipt({ hash: h }));
      const instantiatedEvent = parseEventLogs({
        abi: distributorAbi,
        logs: receipt.logs,
        eventName: "Instantiated",
        // strict: false,
      });

      if (instantiatedEvent.length == 0) {
        console.error("Transaction receipt:", receipt);
        throw new Error("Instantiated event not found in transaction receipt");
      }
      if (instantiatedEvent.length > 1) {
        console.error("Transaction receipt:", receipt);
        throw new Error("Multiple Instantiated events found in transaction receipt");
      }
      const addresses = parseInstantiated(instantiatedEvent[0].args.instances as string[]);
      return this.addressesToContracts(addresses);
      // eslint-disable-next-line
    } catch (e: any) {
      if (e?.cause?.signature) {
        const remoteAttempt = fetch(
          `https://www.4byte.directory/api/v1/signatures/?hex_signature=${e?.cause?.signature}`
        );
        const response = await remoteAttempt;
        const data = await response.json();
        throw new Error(`error: ${e?.message} | 4byte: ${JSON.stringify(data.results, null, 2)}`);
      } else throw e;
    }
  }
}
