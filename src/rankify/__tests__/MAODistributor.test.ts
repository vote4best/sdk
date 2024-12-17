import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type TransactionReceipt,
  type Log,
  GetContractEventsReturnType,
  encodeAbiParameters,
  stringToHex,
  encodeEventTopics,
} from "viem";
// Mock addresses for different contracts and actors
export const MOCK_ADDRESSES = {
  DISTRIBUTOR: "0x1234567890123456789012345678901234567890" as Address,
  RANK_TOKEN: "0x1234567890123456789012345678901234567891" as Address,
  GOVT_TOKEN: "0x1234567890123456789012345678901234567892" as Address,
  GOVT_ACCESS_MANAGER: "0x1234567890123456789012345678901234567893" as Address,
  ACID_ACCESS_MANAGER: "0x1234567890123456789012345678901234567894" as Address,
  ACID_INSTANCE: "0x1234567890123456789012345678901234567895" as Address,
  OWNER: "0x1234567890123456789012345678901234567896" as Address,
  PLAYER: "0x1234567890123456789012345678901234567897" as Address,
};

import { MAODistributorClient } from "../MAODistributor";
import { MAOInstances } from "../../types/contracts";
import distributorAbi from "../../abis/IDistributor";

// Mock viem
jest.mock("viem", () => ({
  ...(jest.requireActual("viem") as object),
  getContract: jest.fn(),
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
  http: jest.fn(),
}));

// Mock utils
jest.mock("../../utils", () => ({
  getArtifact: jest.fn().mockImplementation((chainId: unknown, artifactName: unknown) => {
    if (artifactName === "DAODistributor") {
      return {
        abi: distributorAbi,
        address: MOCK_ADDRESSES.DISTRIBUTOR,
        execute: {
          args: ["TestDistributor", "1.0.0"],
        },
      };
    }
    return {
      abi: [],
      address: "0x0000000000000000000000000000000000000000",
      execute: {
        args: [],
      },
    };
  }),
}));

// Error.stackTraceLimit = 3;

const mockChainId = 31337; // localhost
const mockChain = {
  id: mockChainId,
  name: "Arbitrum One",
  network: "arbitrum",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://arb1.arbitrum.io/rpc"] },
  },
} as const;

// Mock transaction hashes and block hashes
const MOCK_HASHES = {
  BLOCK: "0x1234567890123456789012345678901234567890123456789012345678901234" as Hash,
  TRANSACTION: "0x1234567890123456789012345678901234567890123456789012345678901235" as Hash,
} as const;

// Create mock functions with correct return types
const mockGetContractEvents = jest
  .fn<() => Promise<GetContractEventsReturnType<typeof distributorAbi, "Instantiated">>>()
  .mockResolvedValue([
    {
      address: MOCK_ADDRESSES.DISTRIBUTOR,
      blockHash: MOCK_HASHES.BLOCK,
      blockNumber: BigInt(1),
      data: encodeAbiParameters(
        [{ type: "string" }, { type: "address[]" }],
        [
          "test",
          [
            MOCK_ADDRESSES.GOVT_TOKEN,
            MOCK_ADDRESSES.GOVT_ACCESS_MANAGER,
            MOCK_ADDRESSES.ACID_INSTANCE,
            MOCK_ADDRESSES.ACID_ACCESS_MANAGER,
            MOCK_ADDRESSES.RANK_TOKEN,
            "0x0000000000000000000000000000000000000000", // padding for indices 5-9
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            MOCK_ADDRESSES.ACID_ACCESS_MANAGER, // index 10
            MOCK_ADDRESSES.RANK_TOKEN, // index 11
          ],
        ]
      ),
      logIndex: 0,
      transactionHash: MOCK_HASHES.TRANSACTION,
      transactionIndex: 0,
      removed: false,
      topics: encodeEventTopics({
        abi: distributorAbi,
        eventName: "Instantiated",
      }) as [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
      eventName: "Instantiated",
      args: {
        distributionId: stringToHex("test", { size: 32 }),
        instances: [
          MOCK_ADDRESSES.GOVT_TOKEN,
          MOCK_ADDRESSES.GOVT_ACCESS_MANAGER,
          MOCK_ADDRESSES.ACID_INSTANCE,
          MOCK_ADDRESSES.ACID_ACCESS_MANAGER,
          MOCK_ADDRESSES.RANK_TOKEN,
          "0x0000000000000000000000000000000000000000", // padding for indices 5-9
          "0x0000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000",
          MOCK_ADDRESSES.ACID_ACCESS_MANAGER, // index 10
          MOCK_ADDRESSES.RANK_TOKEN, // index 11
        ],
      },
    },
  ]);

const mockSimulateContract = jest.fn(() => Promise.resolve({ request: {} }));
const mockWaitForTransactionReceipt = jest.fn(() =>
  Promise.resolve({
    blockNumber: BigInt(1),
    blockHash: MOCK_HASHES.BLOCK,
    transactionIndex: 0,
    status: "success",
    contractAddress: MOCK_ADDRESSES.DISTRIBUTOR,
    from: MOCK_ADDRESSES.OWNER,
    to: MOCK_ADDRESSES.DISTRIBUTOR,
    logs: [
      {
        address: MOCK_ADDRESSES.DISTRIBUTOR,
        blockHash: MOCK_HASHES.BLOCK,
        blockNumber: BigInt(1),
        data: encodeAbiParameters(
          [{ type: "address[]" }],
          [
            [
              MOCK_ADDRESSES.GOVT_TOKEN,
              MOCK_ADDRESSES.GOVT_ACCESS_MANAGER,
              MOCK_ADDRESSES.ACID_INSTANCE,
              MOCK_ADDRESSES.ACID_ACCESS_MANAGER,
              MOCK_ADDRESSES.RANK_TOKEN,
              "0x0000000000000000000000000000000000000000", // padding for indices 5-9
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              MOCK_ADDRESSES.ACID_ACCESS_MANAGER, // index 10
              MOCK_ADDRESSES.RANK_TOKEN, // index 11
            ],
          ]
        ),
        logIndex: 0,
        transactionHash: MOCK_HASHES.TRANSACTION,
        transactionIndex: 0,
        removed: false,
        topics: [
          // keccak256("Instantiated(address[])") - you can replace this with the actual event signature hash
          "0x0000000000000000000000000000000000000000000000000000000000000001",
        ],
      },
    ] as Log<bigint, number, false>[],
    logsBloom: "0x",
    gasUsed: BigInt(1000),
    cumulativeGasUsed: BigInt(1000),
    effectiveGasPrice: BigInt(1000),
    transactionHash: MOCK_HASHES.TRANSACTION,
    type: "eip1559",
  } as TransactionReceipt)
);

const mockWriteContract = jest.fn(() => Promise.resolve("0xabc" as Hash));

const mockPublicClient = {
  account: undefined,
  batch: undefined,
  cacheTime: 0,
  chain: mockChain,
  key: "public",
  name: "Public Client",
  pollingInterval: 4000,
  request: jest.fn(),
  transport: { type: "http" },
  type: "publicClient",
  uid: "test",
  extend: jest.fn(),
  getContractEvents: mockGetContractEvents,
  simulateContract: mockSimulateContract,
  waitForTransactionReceipt: mockWaitForTransactionReceipt,
} as unknown as PublicClient;

const mockWalletClient = {
  account: {
    address: MOCK_ADDRESSES.OWNER,
    type: "json-rpc",
    source: "local",
    signMessage: async () => "0x" as Hash,
    signTransaction: async () => "0x" as Hash,
    signTypedData: async () => "0x" as Hash,
  },
  chain: mockChain,
  key: "wallet",
  name: "Wallet Client",
  pollingInterval: 4000,
  request: jest.fn(),
  transport: { type: "http" },
  type: "walletClient",
  uid: "test",
  extend: jest.fn(),
  writeContract: mockWriteContract,
} as unknown as WalletClient;

describe("MAODistributorClient", () => {
  let distributor: MAODistributorClient;

  beforeEach(() => {
    jest.clearAllMocks();
    distributor = new MAODistributorClient(mockChainId, {
      publicClient: mockPublicClient,
      walletClient: mockWalletClient,
    });
  });

  describe("addressesToContracts", () => {
    it("should convert valid addresses to contract instances", async () => {
      const mockInstances: MAOInstances = {
        rankToken: MOCK_ADDRESSES.RANK_TOKEN,
        govToken: MOCK_ADDRESSES.GOVT_TOKEN,
        govTokenAccessManager: MOCK_ADDRESSES.GOVT_ACCESS_MANAGER,
        ACIDAccessManager: MOCK_ADDRESSES.ACID_ACCESS_MANAGER,
        ACIDInstance: MOCK_ADDRESSES.ACID_INSTANCE,
      };

      const mockLog = [
        {
          address: MOCK_ADDRESSES.DISTRIBUTOR,
          blockHash: MOCK_HASHES.BLOCK,
          blockNumber: BigInt(1),
          data: "0x",
          logIndex: 0,
          transactionHash: MOCK_HASHES.TRANSACTION,
          transactionIndex: 0,
          removed: false,
          eventName: "Instantiated",
          topics: ["0x0", "0x1", "0x01", "0x2"],
          args: {
            distributionId: "0x12334",
            instances: [
              MOCK_ADDRESSES.GOVT_TOKEN,
              MOCK_ADDRESSES.GOVT_ACCESS_MANAGER,
              MOCK_ADDRESSES.ACID_INSTANCE,
              MOCK_ADDRESSES.ACID_ACCESS_MANAGER,
              MOCK_ADDRESSES.RANK_TOKEN,
              "0x0000000000000000000000000000000000000000", // padding for indices 5-9
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              MOCK_ADDRESSES.ACID_ACCESS_MANAGER, // index 10
              MOCK_ADDRESSES.RANK_TOKEN, // index 11
            ],
          },
        },
      ] as GetContractEventsReturnType<typeof distributorAbi, "Instantiated">;

      mockGetContractEvents.mockResolvedValue(mockLog);

      const contracts = distributor.addressesToContracts(mockInstances);
      expect(contracts).toHaveProperty("rankToken");
      expect(contracts).toHaveProperty("instance");
      expect(contracts).toHaveProperty("govtToken");
      expect(contracts).toHaveProperty("govTokenAccessManager");
      expect(contracts).toHaveProperty("ACIDAccessManager");
    });

    it("should throw error for invalid addresses", () => {
      const mockInstances = {
        rankToken: "invalid" as Address,
        govToken: "invalid" as Address,
        govTokenAccessManager: "invalid" as Address,
        ACIDAccessManager: "invalid" as Address,
        ACIDInstance: "invalid" as Address,
      };

      expect(() => distributor.addressesToContracts(mockInstances)).toThrow();
    });
  });

  describe("getMAOInstances", () => {
    it("should return instances for valid distribution name", async () => {
      const mockLog = [
        {
          address: MOCK_ADDRESSES.DISTRIBUTOR,
          blockHash: MOCK_HASHES.BLOCK,
          blockNumber: BigInt(1),
          data: "0x",
          logIndex: 0,
          transactionHash: MOCK_HASHES.TRANSACTION,
          transactionIndex: 0,
          removed: false,
          eventName: "Instantiated",
          topics: ["0x0", "0x1", "0x01", "0x2"],
          args: {
            distributionId: "0x12334",
            instances: [
              MOCK_ADDRESSES.GOVT_TOKEN,
              MOCK_ADDRESSES.GOVT_ACCESS_MANAGER,
              MOCK_ADDRESSES.ACID_INSTANCE,
              MOCK_ADDRESSES.ACID_ACCESS_MANAGER,
              MOCK_ADDRESSES.RANK_TOKEN,
              "0x0000000000000000000000000000000000000000", // padding for indices 5-9
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              MOCK_ADDRESSES.ACID_ACCESS_MANAGER, // index 10
              MOCK_ADDRESSES.RANK_TOKEN, // index 11
            ],
          },
        },
      ] as GetContractEventsReturnType<typeof distributorAbi, "Instantiated">;

      mockGetContractEvents.mockResolvedValue(mockLog);

      const instances = await distributor.getMAOInstances("test");
      expect(instances).toBeDefined();
      expect(instances.length).toBeGreaterThan(0);
      expect(instances[0]).toHaveProperty("rankToken");
    });

    it("should return empty array when no instances found", async () => {
      mockGetContractEvents.mockResolvedValue([]);

      const instances = await distributor.getMAOInstances("test");
      expect(instances).toHaveLength(0);
    });
  });

  describe("getMAOInstance", () => {
    it("should throw error when multiple instances found", async () => {
      const t = encodeEventTopics({
        abi: distributorAbi,
        eventName: "Instantiated",
      })[0];
      const mockLog = [
        {
          address: MOCK_ADDRESSES.DISTRIBUTOR,
          blockHash: MOCK_HASHES.BLOCK,
          blockNumber: BigInt(1),
          data: "0x",
          logIndex: 0,
          transactionHash: MOCK_HASHES.TRANSACTION,
          transactionIndex: 0,
          removed: false,
          eventName: "Instantiated",
          topics: [t, "0x1", "0x01", "0x2"],
          args: {
            distributionId: "0x12334",
            instances: [
              MOCK_ADDRESSES.GOVT_TOKEN,
              MOCK_ADDRESSES.GOVT_ACCESS_MANAGER,
              MOCK_ADDRESSES.ACID_INSTANCE,
              MOCK_ADDRESSES.ACID_ACCESS_MANAGER,
              MOCK_ADDRESSES.RANK_TOKEN,
              "0x0000000000000000000000000000000000000000", // padding for indices 5-9
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              "0x0000000000000000000000000000000000000000",
              MOCK_ADDRESSES.ACID_ACCESS_MANAGER, // index 10
              MOCK_ADDRESSES.RANK_TOKEN, // index 11
            ],
          },
        },
      ] as GetContractEventsReturnType<typeof distributorAbi, "Instantiated">;

      mockGetContractEvents.mockResolvedValue([...mockLog, ...mockLog]);

      await expect(distributor.getMAOInstance("test", BigInt(1))).rejects.toThrow("Multiple instances found");
    });

    it("should throw error when no instances found", async () => {
      mockGetContractEvents.mockResolvedValue([]);

      await expect(distributor.getMAOInstance("test", BigInt(1))).rejects.toThrow(
        "No instance found for distribution test and id 1"
      );
    });
  });

  describe("instantiate", () => {
    it("should create a new MAO distribution instance", async () => {
      const mockArgs = [
        {
          tokenSettings: {
            tokenName: "Test Token",
            tokenSymbol: "TEST",
          },
          rankifySettings: {
            principalCost: BigInt(1000),
            principalTimeConstant: BigInt(1000),
            metadata: "test",
            rankTokenURI: "test",
            rankTokenContractURI: "test",
          },
        },
      ] as const;

      const mockHash = "0xabc" as Hash;

      const mockReceipt = {
        blockNumber: BigInt(1),
        blockHash: MOCK_HASHES.BLOCK,
        transactionIndex: 0,
        status: "success",
        contractAddress: MOCK_ADDRESSES.DISTRIBUTOR,
        from: MOCK_ADDRESSES.OWNER,
        to: MOCK_ADDRESSES.DISTRIBUTOR,
        logs: [
          {
            address: MOCK_ADDRESSES.DISTRIBUTOR,
            blockHash: MOCK_HASHES.BLOCK,
            blockNumber: BigInt(1),
            data: encodeAbiParameters(
              [{ type: "address[]" }, { type: "bytes" }],
              [
                [
                  MOCK_ADDRESSES.GOVT_TOKEN as Address,
                  MOCK_ADDRESSES.GOVT_ACCESS_MANAGER as Address,
                  MOCK_ADDRESSES.ACID_INSTANCE as Address,
                  MOCK_ADDRESSES.ACID_ACCESS_MANAGER as Address,
                  MOCK_ADDRESSES.RANK_TOKEN as Address,
                  "0x0000000000000000000000000000000000000000" as Address, // padding for indices 5-9
                  "0x0000000000000000000000000000000000000000" as Address,
                  "0x0000000000000000000000000000000000000000" as Address,
                  "0x0000000000000000000000000000000000000000" as Address,
                  "0x0000000000000000000000000000000000000000" as Address,
                  MOCK_ADDRESSES.ACID_ACCESS_MANAGER as Address, // index 10
                  MOCK_ADDRESSES.RANK_TOKEN as Address, // index 11
                ],
                "0x", // The bytes parameter
              ]
            ),
            logIndex: 0,
            transactionHash: MOCK_HASHES.TRANSACTION,
            transactionIndex: 0,
            removed: false,
            topics: [
              encodeEventTopics({
                abi: distributorAbi,
                eventName: "Instantiated",
              })[0],
              stringToHex("0x01", { size: 32 }),
              stringToHex("0x02", { size: 32 }),
              stringToHex("0x03", { size: 32 }),
            ],
            // eventName: "Instantiated",
          },
        ] as Log<bigint, number, false>[],
        logsBloom: "0x",
        gasUsed: BigInt(1000),
        cumulativeGasUsed: BigInt(1000),
        effectiveGasPrice: BigInt(1000),
        transactionHash: MOCK_HASHES.TRANSACTION,
        type: "eip1559",
      } as TransactionReceipt;
      mockWriteContract.mockResolvedValue(mockHash);
      mockWaitForTransactionReceipt.mockResolvedValue(mockReceipt);

      await expect(distributor.instantiate(mockArgs, "test", mockChain)).resolves.not.toThrow();
    });
  });
});
