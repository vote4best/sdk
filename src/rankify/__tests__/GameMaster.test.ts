import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type TransactionReceipt,
  type GetContractEventsReturnType,
  encodeEventTopics,
  Hex,
} from "viem";
import { GameMaster } from "../GameMaster";
import { RankifyDiamondInstanceAbi } from "../../abis";

// Mock addresses
const MOCK_ADDRESSES = {
  INSTANCE: "0x1234567890123456789012345678901234567890" as Address,
  PLAYER1: "0x1234567890123456789012345678901234567891" as Address,
  PLAYER2: "0x1234567890123456789012345678901234567892" as Address,
  GAME_MASTER: "0x1234567890123456789012345678901234567893" as Address,
};

// Mock hashes
const MOCK_HASHES = {
  TRANSACTION: "0x0000000000000000000000000000000000000000000000000000000000000123" as Hash,
  BLOCK: "0x0000000000000000000000000000000000000000000000000000000000000456" as Hash,
};

// Mock viem
jest.mock("viem", () => ({
  ...(jest.requireActual("viem") as object),
  getContract: jest.fn(),
  createPublicClient: jest.fn(),
  createWalletClient: jest.fn(),
  http: jest.fn(),
  keccak256: jest.fn((input: Hex) => input),
  encodePacked: jest.fn((types: readonly string[], values: readonly unknown[]) => values.join("") as Hex),
}));

// Mock callbacks
const mockEncryptionCallback = jest.fn((data: string) => Promise.resolve("encrypted_" + data));
const mockDecryptionCallback = jest.fn((data: string) => Promise.resolve(data.split("_")[1]));
const mockRandomnessCallback = jest.fn(() => Promise.resolve(0.5));
const mockTurnSaltCallback = jest.fn(() => Promise.resolve("0x123" as Hex));

// Create mock functions with correct return types
const mockReadContract = jest.fn<(args: { functionName: string }) => Promise<unknown>>().mockImplementation((args) => {
  switch (args.functionName) {
    case "getPlayers":
      return Promise.resolve([MOCK_ADDRESSES.PLAYER1, MOCK_ADDRESSES.PLAYER2]);
    case "getTurn":
      return Promise.resolve(2n);
    default:
      return Promise.resolve(undefined);
  }
});
const mockSimulateContract = jest.fn(() => Promise.resolve({ request: {} }));
const mockWaitForTransactionReceipt = jest.fn(() =>
  Promise.resolve({
    blockNumber: BigInt(1),
    blockHash: MOCK_HASHES.BLOCK,
    transactionIndex: 0,
  } as TransactionReceipt)
);

// Define base log type
const baseMockLog = {
  address: MOCK_ADDRESSES.INSTANCE,
  blockHash: MOCK_HASHES.BLOCK,
  blockNumber: 1n,
  data: "0x" as `0x${string}`,
  logIndex: 0,
  removed: false,
  transactionHash: MOCK_HASHES.TRANSACTION,
  transactionIndex: 0,
  topics: ["0x0000000000000000000000000000000000000000000000000000000000000000"] as [`0x${string}`, ...`0x${string}`[]],
} as const;

interface ProposalEvent {
  proposer: Address;
  proposalEncryptedByGM: string;
  gameId: bigint;
  turn: bigint;
}

interface VoteEvent {
  player: Address;
  votesHidden: string;
  gameId: bigint;
  turn: bigint;
}

interface TurnEndedEvent {
  gameId: bigint;
  turn: bigint;
  newProposals: string[];
}

// Mock event creation functions
const createMockProposalEvent = (proposer: Address, proposal: string) => ({
  ...baseMockLog,
  args: {
    proposer,
    proposalEncryptedByGM: proposal,
    gameId: 1n,
    turn: 1n,
  } as ProposalEvent,
  topics: encodeEventTopics({
    abi: RankifyDiamondInstanceAbi,
    eventName: "ProposalSubmitted",
  }) as [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
});

const createMockVoteEvent = (player: Address, votes: string) => ({
  ...baseMockLog,
  args: {
    player,
    votesHidden: votes,
    gameId: 1n,
    turn: 1n,
  } as VoteEvent,
  topics: encodeEventTopics({
    abi: RankifyDiamondInstanceAbi,
    eventName: "VoteSubmitted",
  }) as [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
});

const createMockTurnEndedEvent = (gameId: bigint, turn: bigint, proposals: string[]) => ({
  ...baseMockLog,
  args: {
    gameId,
    turn,
    newProposals: proposals,
  } as TurnEndedEvent,
  topics: encodeEventTopics({
    abi: RankifyDiamondInstanceAbi,
    eventName: "TurnEnded",
  }) as [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
});

const mockGetContractEvents = jest.fn(() => Promise.resolve([] as GetContractEventsReturnType));

// Mock public client
const mockPublicClient = {
  readContract: mockReadContract,
  simulateContract: mockSimulateContract,
  waitForTransactionReceipt: mockWaitForTransactionReceipt,
  getContractEvents: mockGetContractEvents,
} as unknown as PublicClient;

// Mock wallet client
const mockWalletClient = {
  writeContract: jest.fn(() => Promise.resolve(MOCK_HASHES.TRANSACTION)),
  account: {
    address: MOCK_ADDRESSES.GAME_MASTER,
  },
} as unknown as WalletClient;

describe("GameMaster", () => {
  let gameMaster: GameMaster;

  beforeEach(() => {
    jest.clearAllMocks();
    gameMaster = new GameMaster({
      EIP712name: "TestGame",
      EIP712Version: "1.0.0",
      instanceAddress: MOCK_ADDRESSES.INSTANCE,
      walletClient: mockWalletClient,
      publicClient: mockPublicClient,
      chainId: 1,
      encryptionCallback: mockEncryptionCallback,
      decryptionCallback: mockDecryptionCallback,
      randomnessCallback: mockRandomnessCallback,
      turnSaltCallback: mockTurnSaltCallback,
    });
  });

  describe("decryptProposals", () => {
    it("should decrypt proposals for a given game turn", async () => {
      const mockEvents = [createMockProposalEvent(MOCK_ADDRESSES.PLAYER1, "encrypted_proposal1")];
      mockGetContractEvents.mockResolvedValueOnce(mockEvents);

      const result = await gameMaster.decryptProposals(1n, 1n);
      expect(result).toEqual([
        {
          proposer: MOCK_ADDRESSES.PLAYER1,
          proposal: "proposal1",
        },
      ]);
    });
  });

  describe("shuffle", () => {
    it("should shuffle array using randomness callback", async () => {
      const array = [1, 2, 3];
      const result = await gameMaster.shuffle(array);
      expect(mockRandomnessCallback).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result).toContain(3);
    });
  });

  describe("getTurnSalt", () => {
    it("should generate salt for a game turn", async () => {
      const result = await gameMaster.getTurnSalt({ gameId: 1n, turn: 1n });
      expect(mockTurnSaltCallback).toHaveBeenCalledWith({ gameId: 1n, turn: 1n });
      expect(result).toBeDefined();
    });
  });

  describe("getTurnPlayersSalt", () => {
    it("should generate salt for a player in a game turn", async () => {
      const result = await gameMaster.getTurnPlayersSalt({
        gameId: 1n,
        turn: 1n,
        proposer: MOCK_ADDRESSES.PLAYER1,
      });
      expect(mockTurnSaltCallback).toHaveBeenCalledWith({ gameId: 1n, turn: 1n });
      expect(result).toBeDefined();
    });
  });

  describe("findPlayerOngoingProposalIndex", () => {
    it("should find index of player's ongoing proposal", async () => {
      mockReadContract.mockResolvedValueOnce(1n); // getTurn
      mockGetContractEvents.mockResolvedValueOnce([
        createMockProposalEvent(MOCK_ADDRESSES.PLAYER1, "encrypted_proposal1"),
      ]);

      const result = await gameMaster.findPlayerOngoingProposalIndex(1n, MOCK_ADDRESSES.PLAYER1);
      expect(result).toBeDefined();
    });

    it("should return -1 if no proposal found", async () => {
      mockReadContract.mockResolvedValueOnce(0n); // getTurn
      mockGetContractEvents.mockResolvedValueOnce([createMockTurnEndedEvent(1n, 1n, ["proposal1", "proposal2"])]); // TurnEnded events
      const result = await gameMaster.findPlayerOngoingProposalIndex(1n, MOCK_ADDRESSES.PLAYER1);
      expect(result).toBe(-1);
    });
  });

  describe("submitVote", () => {
    it("should submit vote for proposals", async () => {
      const vote = [1n, 0n, 2n];
      mockReadContract.mockResolvedValueOnce(2n); // getTurn for findPlayerOngoingProposalIndex
      mockGetContractEvents
        .mockResolvedValueOnce([createMockTurnEndedEvent(1n, 1n, ["proposal1", "proposal2"])])
        .mockResolvedValueOnce([]); // No proposals for submitVote

      const result = await gameMaster.submitVote(1n, vote, MOCK_ADDRESSES.PLAYER1);
      expect(result).toBe(MOCK_HASHES.TRANSACTION);
      expect(mockEncryptionCallback).toHaveBeenCalled();
    });

    it("should throw error if voting for own proposal", async () => {
      const vote = [1n, 0n, 2n];
      const ownProposal = "my_proposal";
      mockReadContract.mockResolvedValueOnce(1n); // getTurn for findPlayerOngoingProposalIndex
      mockGetContractEvents.mockResolvedValueOnce([
        createMockProposalEvent(MOCK_ADDRESSES.PLAYER1, "encrypted_proposal1"),
      ]); // Proposals for findPlayerOngoingProposalIndex
      mockDecryptionCallback.mockResolvedValueOnce(ownProposal); // Decrypt own proposal
      mockGetContractEvents.mockResolvedValueOnce([
        createMockProposalEvent(MOCK_ADDRESSES.PLAYER1, "encrypted_proposal1"),
      ]); // Proposals for submitVote

      await expect(gameMaster.submitVote(1n, vote, MOCK_ADDRESSES.PLAYER1)).rejects.toThrow();
    });
  });

  describe("submitProposal", () => {
    it("should submit a new proposal", async () => {
      const proposal = "Test proposal";
      mockReadContract.mockResolvedValueOnce(1n); // getTurn

      const result = await gameMaster.submitProposal({
        gameId: 1n,
        commitmentHash: "0x123",
        proposal,
        proposer: MOCK_ADDRESSES.PLAYER1,
      });
      expect(result).toBe(MOCK_HASHES.TRANSACTION);
      expect(mockEncryptionCallback).toHaveBeenCalledWith(proposal);
    });
  });

  describe("decryptVotes", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should decrypt votes for current turn", async () => {
      mockReadContract.mockResolvedValueOnce(1n); // getTurn
      mockGetContractEvents.mockResolvedValueOnce([createMockVoteEvent(MOCK_ADDRESSES.PLAYER1, "encrypted_[1,0,2]")]);
      mockDecryptionCallback.mockResolvedValueOnce("[1,0,2]");

      const result = await gameMaster.decryptVotes(1n);
      if (result === -1) {
        fail("Expected array of votes but got -1");
      }
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toEqual({
        player: MOCK_ADDRESSES.PLAYER1,
        votes: ["1", "0", "2"].map((n) => BigInt(parseInt(n))),
      });
      expect(mockDecryptionCallback).toHaveBeenCalledWith("encrypted_[1,0,2]");
    });

    it("should return -1 if no votes in turn 0", async () => {
      mockReadContract.mockResolvedValueOnce(0n); // getTurn
      mockGetContractEvents.mockResolvedValueOnce([]);
      const result = await gameMaster.decryptVotes(1n);
      expect(result).toBe(-1);
    });
  });

  describe("endTurn", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should end current turn and process votes", async () => {
      const players = [MOCK_ADDRESSES.PLAYER1, MOCK_ADDRESSES.PLAYER2];

      // Mock getTurn and getPlayers
      mockReadContract.mockImplementation((args) => {
        switch (args.functionName) {
          case "getTurn":
            return Promise.resolve(2n);
          case "getPlayers":
            return Promise.resolve(players);
          default:
            return Promise.resolve(undefined);
        }
      });

      // Mock TurnEnded events
      mockGetContractEvents
        .mockResolvedValueOnce([createMockTurnEndedEvent(1n, 1n, ["proposal1", "proposal2"])]) // TurnEnded events
        .mockResolvedValueOnce([
          createMockProposalEvent(MOCK_ADDRESSES.PLAYER1, "encrypted_proposal1"),
          createMockProposalEvent(MOCK_ADDRESSES.PLAYER2, "encrypted_proposal2"),
        ]) // Previous turn proposals
        .mockResolvedValueOnce([
          createMockVoteEvent(MOCK_ADDRESSES.PLAYER1, "encrypted_[1,0]"),
          createMockVoteEvent(MOCK_ADDRESSES.PLAYER2, "encrypted_[0,1]"),
        ]) // Current turn votes
        .mockResolvedValueOnce([
          createMockProposalEvent(MOCK_ADDRESSES.PLAYER1, "encrypted_new_proposal1"),
          createMockProposalEvent(MOCK_ADDRESSES.PLAYER2, "encrypted_new_proposal2"),
        ]); // Current turn proposals

      // Mock decryption callbacks
      mockDecryptionCallback
        .mockResolvedValueOnce("proposal1")
        .mockResolvedValueOnce("proposal2")
        .mockResolvedValueOnce("[1,0]")
        .mockResolvedValueOnce("[0,1]")
        .mockResolvedValueOnce("new_proposal1")
        .mockResolvedValueOnce("new_proposal2");

      // Mock simulateContract
      mockSimulateContract.mockResolvedValueOnce({
        request: {
          abi: RankifyDiamondInstanceAbi,
          address: MOCK_ADDRESSES.INSTANCE,
          functionName: "endTurn",
          args: [
            1n,
            [
              [1n, 0n],
              [0n, 1n],
            ],
            ["new_proposal1", "new_proposal2"],
            [0n, 1n],
          ],
        },
      });

      const result = await gameMaster.endTurn(1n);
      expect(result).toBe(MOCK_HASHES.TRANSACTION);
      expect(mockDecryptionCallback).toHaveBeenCalled();
    });
  });
});
