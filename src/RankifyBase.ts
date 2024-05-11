import { ethers, BigNumberish } from "ethers";
import { TurnEndedEventObject } from "rankify-contracts/types/hardhat-diamond-abi/HardhatDiamondABI.sol/RankifyDiamondInstance";
import {
  SupportedChains,
  ArtifactTypes,
  getArtifact,
  ApiError,
  ArtifactContractInterfaces,
} from "./utils/index";
import { RankifyDiamondInstance } from "rankify-contracts/types";
import { deepArrayToObject } from "./utils";
enum gameStatusEnum {
  created = "Game created",
  open = "Registration open",
  started = "In progress",
  lastTurn = "Playing last turn",
  overtime = "PLaying in overtime",
  finished = "Finished",
  notFound = "not found",
}

export default class RankifyBase {
  EIP712name: string;
  EIP712Version: string;
  provider: ethers.providers.JsonRpcProvider;
  verifyingContract: string;
  chainId: string;
  chain: SupportedChains;

  /**
   * Creates a new instance of the Player class.
   * @param {Object} options - The options for initializing the Player.
   * @param {string} options.EIP712name - The name of the EIP712 standard.
   * @param {string} options.EIP712Version - The version of the EIP712 standard.
   * @param {string} options.verifyingContract - The address of the contract being verified.
   * @param {ethers.providers.Web3Provider} options.provider - The Web3 provider used for interacting with the blockchain.
   * @param {string} options.chainId - The chain ID of the blockchain network.
   */
  constructor({
    EIP712name,
    EIP712Version,
    verifyingContract,
    provider,
    chain,
    chainId,
  }: {
    EIP712name: string;
    EIP712Version: string;
    verifyingContract: string;
    provider: ethers.providers.JsonRpcProvider;
    chainId: string;
    chain: SupportedChains;
  }) {
    this.EIP712Version = EIP712Version;
    this.EIP712name = EIP712name;
    this.provider = provider;
    this.chainId = chainId;
    this.chain = chain;
    this.verifyingContract = verifyingContract;
  }

  /**
   * Retrieves the contract instance for the specified chain using the provided provider.
   * @param chain The supported chain for the contract.
   * @param provider The Web3Provider or Signer instance used for interacting with the blockchain.
   * @returns The contract instance.
   */
  getContract = <T extends ArtifactTypes>(artifactName: T) => {
    const artifact = getArtifact(this.chain, artifactName);

    return new ethers.Contract(
      artifact.address,
      artifact.abi,
      this.provider
    ) as ArtifactContractInterfaces[T];
  };

  /**
   * Retrieves the historic turn information for a specific game and turn ID.
   * @param chain - The supported blockchain network.
   * @param provider - The Web3 provider.
   * @returns The historic turn event object.
   * @throws {ApiError} If the game or turn is not found.
   */
  getHistoricTurn = async (gameId: BigNumberish, turnId: BigNumberish) => {
    const contract = this.getContract("RankifyInstance");
    //list all events of gameId that ended turnId.
    const filterTurnEnded = contract.filters.TurnEnded(gameId, turnId);
    const turnEndedEvents = await contract.queryFilter(
      filterTurnEnded,
      0,
      "latest"
    );
    //There shall be only one such event
    if (turnEndedEvents.length !== 1) {
      console.error(
        "getHistoricTurn",
        gameId,
        turnId,
        "failed:",
        turnEndedEvents.length
      );
      const err = new ApiError("Game not found", { status: 404 });
      throw err;
    }
    return { ...turnEndedEvents[turnEndedEvents.length - 1] };
  };

  /**
   * Retrieves the statistics of the previous turn for a specific game.
   * If the current turn is greater than 1, it calls the `getHistoricTurn` function to retrieve the statistics of the previous turn.
   * If the current turn is 1 or less, it returns a default object with "N/A" values.
   *
   * @param chain - The supported chain for the game.
   * @param provider - The Web3 provider.
   * @param gameId - The ID of the game.
   * @returns The statistics of the previous turn.
   */
  getPreviousTurnStats = async (gameId: BigNumberish) => {
    const contract = this.getContract("RankifyInstance");
    const currentTurn = await contract.getTurn(gameId);
    if (currentTurn.gt(1)) {
      return this.getHistoricTurn(gameId, currentTurn.sub(1));
    } else {
      return {
        players: "N/A",
        scores: "N/A",
        turnSalt: "N/A",
        voters: ["N/A"],
        votesRevealed: ["N/A"],
      };
    }
  };

  /**
   * Retrieves the voting information for a specific game and turn.
   * @param chain - The supported chain for the voting.
   * @param signer - The JSON-RPC signer for the voting contract.
   * @returns An object containing the vote events and fixed proposal arguments.
   * @throws Error if gameId or turnId is not set.
   */
  getVoting = async (gameId: BigNumberish, turnId: BigNumberish) => {
    if (!gameId) throw new Error("gameId not set");
    if (!turnId) throw new Error("turnId not set");
    const contract = this.getContract("RankifyInstance");
    const filterVoteEvent = contract.filters.VoteSubmitted(gameId, turnId);
    const filterProposalEvent = contract.filters.ProposalSubmitted(
      gameId,
      turnId,
      null,
      null,
      null
    );
    const proposalEvents = await contract.queryFilter(
      filterProposalEvent,
      0,
      "latest"
    );
    const voteEvents = await contract.queryFilter(filterVoteEvent, 0, "latest");
    const fixedProposalArgs = proposalEvents.map((event) => {
      return {
        ...event,
        args: {
          gameId: event.args[0],
          turn: event.args[1],
          proposer: event.args[2],
          commitmentHash: event.args[3],
          proposalEncryptedByGM: event.args[4],
        },
      };
    });

    // for (const filterProposalEvent in filterProposalEvents.topics) {
    //   if (filterProposalEvent)
    //     proposals.push(contract.interface.parseLog({ log: proposalEvent }));
    // }
    // for (const voteEvent in voteEvents) {
    //   playersVoted.push(voteEvent[2]);
    // }
    return { voteEvents, proposalEvents: fixedProposalArgs };
  };

  /**
   * Retrieves the ongoing voting for a specific game.
   *
   * @param {object} options - The options for retrieving the ongoing voting.
   * @param {SupportedChains} options.chain - The supported chain for the voting.
   * @param {ethers.providers.JsonRpcSigner} options.signer - The signer for the voting.
   * @returns {Promise<ReturnType<typeof getVoting>>} - A promise that resolves to the ongoing voting for the specified game.
   */
  getOngoingVoting = async (gameId: BigNumberish) => {
    return this.getContract("RankifyInstance")
      .getTurn(gameId)
      .then((turn) => this.getVoting(gameId, turn));
  };

  /**
   * Retrieves the ongoing proposals for a specific game on a supported chain.
   *
   * @param chainName - The name of the supported chain.
   * @param provider - The Web3Provider instance.
   * @param gameId - The ID of the game.
   * @returns The ongoing proposals for the specified game.
   */
  getOngoingProposals = async (gameId: BigNumberish) => {
    const contract = this.getContract("RankifyInstance");
    const currentTurn = await contract.getTurn(gameId);
    //list all events of gameId that ended turnId.
    const filter = contract.filters.TurnEnded(gameId, currentTurn.sub(1));
    const TurnEndedEvents = await contract.queryFilter(filter, 0, "latest");
    const args = contract.interface.parseLog(TurnEndedEvents[0])
      .args as any as TurnEndedEventObject;
    return args.newProposals;
  };

  /**
   * Retrieves the registration deadline for a specific game on a supported blockchain.
   * @param chainName - The name of the blockchain.
   * @param provider - The Web3Provider instance.
   * @param gameId - The ID of the game.
   * @param timeToJoin - Optional. The additional time (in seconds) to join the game.
   * @returns A Promise that resolves to the registration deadline timestamp.
   */
  getRegistrationDeadline = async (
    gameId: BigNumberish,
    timeToJoin?: number
  ) => {
    const contract = this.getContract("RankifyInstance");
    const filter = contract.filters.RegistrationOpen(gameId);
    return contract.queryFilter(filter, 0, "latest").then((events) =>
      events[0].getBlock().then(async (block) => {
        if (timeToJoin) return block.timestamp + timeToJoin;
        else
          return contract
            .getContractState()
            .then(
              (cs) => block.timestamp + cs.TBGSEttings.timeToJoin.toNumber()
            );
      })
    );
  };

  /**
   * Resolves the deadline for the current turn.
   * If `timePerTurn` is provided, the deadline is calculated by adding `timePerTurn` to the current block timestamp.
   * Otherwise, the deadline is obtained from the contract state and calculated by adding `timePerTurn` to the current block timestamp.
   * @param block The current block.
   * @param contract The RankifyDiamondInstance contract.
   * @param timePerTurn The time duration per turn (optional).
   * @returns The deadline for the current turn.
   */
  resolveTurnDeadline = async (
    block: ethers.providers.Block,
    contract: RankifyDiamondInstance,
    timePerTurn?: number
  ) => {
    if (timePerTurn) return block.timestamp + timePerTurn;
    return contract
      .getContractState()
      .then((cs) => cs.TBGSEttings.timePerTurn.toNumber() + block.timestamp);
  };

  /**
   * Retrieves the deadline for the current turn in a game.
   *
   * @param chainName - The name of the blockchain network.
   * @param provider - The Web3Provider instance.
   * @param gameId - The ID of the game.
   * @param timePerTurn - Optional. The duration of each turn in seconds.
   * @returns A Promise that resolves to the deadline for the current turn, or 0 if the turn has not started.
   * @throws An error if the gameId is not set.
   */
  getTurnDeadline = async (gameId: BigNumberish, timePerTurn?: number) => {
    if (!gameId) throw new Error("gameId not set");
    const contract = this.getContract("RankifyInstance");

    return contract.getTurn(gameId).then(async (ct) => {
      if (ct.eq(0)) return 0;
      const filter = ct.eq(1)
        ? contract.filters.GameStarted(gameId)
        : contract.filters.TurnEnded(gameId, ct.sub(1));
      return contract
        .queryFilter(filter, 0, "latest")
        .then(async (evts) =>
          evts[0]
            .getBlock()
            .then(async (block) =>
              this.resolveTurnDeadline(block, contract, timePerTurn)
            )
        );
    });
  };
  getContractState = async (
    chain: SupportedChains,
    provider: ethers.providers.Web3Provider
  ) => {
    const contract = this.getContract("RankifyInstance");
    const cs = await contract
      .getContractState()
      .then((x) => deepArrayToObject(x));
    return cs;
  };

  getPlayersGame = async (account: string) => {
    const contract = this.getContract("RankifyInstance");
    return contract.getPlayersGame(account);
  };

  getRankTokenURI = async () => {
    const contract = this.getContract("RankToken");
    return contract.contractURI().then((x) => deepArrayToObject(x));
  };

  getRankTokenBalance = async (tokenId: string, account: string) => {
    const contract = this.getContract("RankToken");
    return contract.balanceOf(account, tokenId);
  };

  /**
   * Retrieves the list of proposal scores for a specific game.
   * @param gameId - The ID of the game.
   * @returns A Promise that resolves to the list of proposal scores.
   * @throws An error if the gameId is not set.
   */
  getProposalScoresList = async (gameId: string) => {
    if (!gameId) throw new Error("gameId not set");
    const contract = this.getContract("RankifyInstance");
    const proposalScoreFilter = contract.filters.ProposalScore(gameId);
    const res = await contract.queryFilter(proposalScoreFilter, 0, "latest");
    return deepArrayToObject(res);
  };

  /**
   * Retrieves the current turn of a game.
   * @param gameId - The ID of the game.
   * @returns A Promise that resolves to the current turn of the game.
   */
  getCurrentTurn = async (gameId: string) => {
    const contract = this.getContract("RankifyInstance");
    const currentTurn = await contract.getTurn(gameId);
    return currentTurn;
  };

  /**
   * Retrieves the game state for a specific game.
   * @param gameId - The ID of the game.
   * @returns A promise that resolves to an object containing the game state.
   */
  getGameState = async (gameId: string) => {
    const contract = this.getContract("RankifyInstance");
    const gameMaster = await contract.getGM(gameId);
    const joinRequirements = await contract.getJoinRequirements(gameId);
    const requirementsPerContract = await Promise.all(
      joinRequirements.contractAddresses.map(async (address, idx) => {
        return contract.getJoinRequirementsByToken(
          gameId,
          address,
          joinRequirements.contractIds[idx],
          joinRequirements.contractTypes[idx]
        );
      })
    );
    const promises = [];

    promises.push(contract.getScores(gameId));
    promises.push(contract.getTurn(gameId));
    promises.push(contract.isGameOver(gameId));
    promises.push(contract.isOvertime(gameId));
    promises.push(contract.isLastTurn(gameId));
    promises.push(contract.isRegistrationOpen(gameId));
    promises.push(contract.gameCreator(gameId));
    promises.push(contract.getGameRank(gameId));
    promises.push(contract.getPlayers(gameId));
    promises.push(contract.canStartGame(gameId));
    return Promise.all(promises).then((values) => {
      const scores = values[0];
      const currentTurn = values[1];
      const isFinished = values[2];
      const isOvertime = values[3];
      const isLastTurn = values[4];
      const isOpen = values[5];
      const createdBy = values[6];
      const gameRank = values[7];
      const players = values[8];
      const canStart = values[9];
      const gamePhase = isFinished
        ? gameStatusEnum["finished"]
        : isOvertime
        ? gameStatusEnum["overtime"]
        : isLastTurn
        ? gameStatusEnum["lastTurn"]
        : currentTurn.gt(0)
        ? gameStatusEnum["started"]
        : isOpen
        ? gameStatusEnum["open"]
        : gameMaster
        ? gameStatusEnum["created"]
        : gameStatusEnum["notFound"];
      return {
        gameMaster,
        joinRequirements,
        requirementsPerContract,
        scores,
        currentTurn,
        isFinished,
        isOvertime,
        isLastTurn,
        isOpen,
        createdBy,
        gameRank,
        players,
        canStart,
        gamePhase,
      };
    });
  };
}
