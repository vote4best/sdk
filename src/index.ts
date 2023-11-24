/**
 * This file contains functions related to the SDK for the rankify.it .
 * It includes functions for interacting with smart contracts on different chains,
 * retrieving game state and proposal scores, and creating games.
 */
import { LibCoinVending } from "rankify-contracts/types/hardhat-diamond-abi/HardhatDiamondABI.sol/RankifyDiamondInstance";
import {
  RankToken,
  RankifyDiamondInstance,
  Rankify,
} from "rankify-contracts/types";
import { BigNumberish, Bytes, BytesLike, ethers, Wallet } from "ethers";
import { JsonFragment } from "@ethersproject/abi";
import _ from "lodash";
export type SupportedChains =
  | "anvil"
  | "localhost"
  | "mumbai"
  | "polygon"
  | "ethereum"
  | "goerli";
enum gameStatusEnum {
  created = "Game created",
  open = "Registration open",
  started = "In progress",
  lastTurn = "Playing last turn",
  overtime = "PLaying in overtime",
  finished = "Finished",
  notFound = "not found",
}

export const chainIds = {
  anvil: 97113,
};

/**
 * Retrieves the artifact for a given chain.
 * @param chain The chain identifier.
 * @returns An object containing the ABI and address of the artifact.
 * @throws Error if the contract deployment is not found.
 */
export const getArtifact = (
  chain: string
): { abi: JsonFragment[]; address: string } => {
  const deployment = require(`rankify-contracts/deployments/${chain}/RankifyInstance.json`);
  const chainId = chainIds[chain];
  const artifact = { chainId, ...deployment };
  if (!artifact) throw new Error("Contract deployment not found");
  return artifact;
};

/**
 * Retrieves the rank artifact for a given chain.
 * @param chain The chain identifier.
 * @returns The rank artifact containing the ABI and address.
 * @throws Error if the contract deployment is not found.
 */
const getRankArtifact = (
  chain: string
): { abi: JsonFragment[]; address: string } => {
  const deployment = require(`rankify-contracts/deployments/${chain}/RankToken.json`);
  const chainId = chainIds[chain];
  // console.debug("deployments", deployments);
  console.debug("chainId", chainId);
  const artifact = { chainId, ...deployment };
  if (!artifact) throw new Error("Contract deployment not found");
  return artifact;
};

/**
 * Retrieves the Rankify artifact for the specified chain.
 * @param chain The chain identifier.
 * @returns The Rankify artifact containing the ABI and address.
 * @throws Error if the contract deployment is not found.
 */
const getRankifyArtifact = (
  chain: string
): { abi: JsonFragment[]; address: string } => {
  const deployment = require(`rankify-contracts/deployments/${chain}/Rankify.json`);
  const chainId = chainIds[chain];
  // console.debug("deployments", deployments);
  console.debug("chainId", chainId);
  const artifact = { chainId, ...deployment };
  if (!artifact) throw new Error("Contract deployment not found");
  return artifact;
};

/**
 * Retrieves the contract instance for the specified chain using the provided provider.
 * @param chain The supported chain for the contract.
 * @param provider The Web3Provider or Signer instance used for interacting with the blockchain.
 * @returns The contract instance.
 */
export const getContract = (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider | ethers.Signer
) => {
  const artifact = getArtifact(chain);
  return new ethers.Contract(
    artifact.address,
    artifact.abi,
    provider
  ) as RankifyDiamondInstance;
};

/**
 * Retrieves the RankToken contract instance for the specified chain and provider.
 * @param chain The supported chain for the contract.
 * @param provider The Web3Provider or Signer instance used to interact with the blockchain.
 * @returns The RankToken contract instance.
 */
export const getRankTokenContract = (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider | ethers.Signer
) => {
  const artifact = getRankArtifact(chain);
  const contract = new ethers.Contract(
    artifact.address,
    artifact.abi,
    provider
  ) as RankToken;
  return contract;
};

/**
 * Retrieves the Rankify token contract instance.
 *
 * @param chain - The supported blockchain network.
 * @param provider - The Web3 provider or signer instance.
 * @returns The Rankify token contract instance.
 */
export const getRankifyTokenContract = (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider | ethers.Signer
) => {
  const artifact = getRankifyArtifact(chain);
  const contract = new ethers.Contract(
    artifact.address,
    artifact.abi,
    provider
  ) as Rankify;
  return contract;
};

/**
 * Ethers.js returns a proxy object of mixed arrays and objects. This proxy breaks when using hardcopy.
 * Im still in progress of solving this issue. For now, this function is a workaround that converts the proxy to a deep copy.
 * it might produce unexpected results still.
 * @param object The object to convert.
 * @returns The converted object.
 */
const deepArrayToObject = <T>(object: T) => {
  console.log("deepArrayToObject", typeof object);
  let result = Array.isArray(object) ? [] : {};
  Object.keys(object).forEach((key) => {
    if (typeof object[key] === "string")
      result[key] = (" " + object[key]).slice(1);
    else if (typeof object[key] === "number") result[key] = Number(object[key]);
    else if (typeof object[key] === "boolean")
      result[key] = Boolean(object[key]);
    else if (object[key] === null) result[key] = null;
    else if (object[key] === undefined) result[key] = undefined;
    else if (object[key]?._isBigNumber)
      result[key] = ethers.BigNumber.from(
        (" " + object[key].toString()).slice(1)
      );
    else result[key] = deepArrayToObject(object[key]);
  });
  return result as T;
};

export const getContractState = async (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider
) => {
  const contract = getContract(chain, provider);
  const cs = await contract
    .getContractState()
    .then((x) => deepArrayToObject(x));
  console.log("cscscs", cs);
  return cs;
};

export const getPlayersGame =
  (chain: SupportedChains, provider: ethers.providers.Web3Provider) =>
  async (account: string) => {
    const contract = getContract(chain, provider);
    return contract.getPlayersGame(account);
  };

export const getRankTokenURI = async (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider
) => {
  const artifact = getRankArtifact(chain);
  const contract = new ethers.Contract(
    artifact.address,
    artifact.abi,
    provider
  ) as RankToken;
  return contract.contractURI().then((x) => deepArrayToObject(x));
};

export const getRankTokenBalance =
  (chain: SupportedChains, provider: ethers.providers.Web3Provider) =>
  async (tokenId: string, account: string) => {
    const artifact = getRankArtifact(chain);
    const contract = new ethers.Contract(
      artifact.address,
      artifact.abi,
      provider
    ) as RankToken;
    return contract.balanceOf(account, tokenId);
  };

/**
 * Retrieves the list of proposal scores for a specific game.
 *
 * @param chain - The supported chain.
 * @param provider - The Web3 provider.
 * @param gameId - The ID of the game.
 * @param from - Optional. The starting turn number. Defaults to 1.
 * @param to - Optional. The ending turn number. Defaults to the latest turn number of the game.
 * @returns A Promise that resolves to the list of proposal scores.
 * @throws An error if the gameId is not set.
 */
export const getProposalScoresList = async (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: string,
  from?: number,
  to?: number
) => {
  if (!gameId) throw new Error("gameId not set");
  const contract = getContract(chain, provider);
  const _from = from ?? 1;
  const _to = to ?? (await contract.getTurn(gameId)).toNumber();
  console.log("getProposalScore result", gameId, _from, _to);
  const proposalScoreFilter = contract.filters.ProposalScore(gameId);
  const res = await contract.queryFilter(proposalScoreFilter, 0, "latest");
  console.log("resres", res);
  return deepArrayToObject(res);
};

/**
 * Retrieves the current turn of a game.
 * @param chain - The supported blockchain network.
 * @param provider - The Web3 provider.
 * @param gameId - The ID of the game.
 * @returns A Promise that resolves to the current turn of the game.
 */
export const getCurrentTurn = async (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: string
) => {
  const contract = getContract(chain, provider);
  const currentTurn = await contract.getTurn(gameId);
  return currentTurn;
};

/**
 * Retrieves the game state for a specific game.
 * @param chain - The supported blockchain network.
 * @param provider - The Web3 provider.
 * @param gameId - The ID of the game.
 * @returns A promise that resolves to an object containing the game state.
 */
export const getGameState = async (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: string
) => {
  const contract = getContract(chain, provider);
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
    const isOvetime = values[3];
    const isLastTurn = values[4];
    const isOpen = values[5];
    const createdBy = values[6];
    const gameRank = values[7];
    const players = values[8];
    const canStart = values[9];
    const gamePhase = isFinished
      ? gameStatusEnum["finished"]
      : isOvetime
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
      isOvetime,
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

/**
 * Approves tokens if needed.
 *
 * @param value - The value of tokens to approve.
 * @param chain - The supported chain.
 * @param signer - The JSON-RPC signer.
 * @returns A promise that resolves to the transaction receipt or 0 if no tokens need to be approved.
 */
const approveTokensIfNeeded = async (
  value: BigNumberish,
  chain: SupportedChains,
  signer: ethers.providers.JsonRpcSigner
) => {
  if (ethers.BigNumber.from(value).gt(0)) {
    return getRankifyTokenContract(chain, signer)
      .increaseAllowance(getArtifact(chain).address, value)
      .then((tx) => tx.wait(1));
  } else return 0;
};

export const createGame =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameMaster: string, gameRank: string, gameId?: BigNumberish) => {
    const contract = getContract(chain, signer);
    return contract.getContractState().then(async (reqs) =>
      approveTokensIfNeeded(reqs.BestOfState.gamePrice, chain, signer).then(
        () => {
          if (gameId) {
            return contract["createGame(address,uint256,uint256)"](
              gameMaster,
              gameId,
              gameRank
            );
          } else {
            return contract["createGame(address,uint256)"](
              gameMaster,
              gameRank
            );
          }
        }
      )
    );
  };

/**
 * Joins a game on the specified chain using the provided signer.
 * @param chain - The supported chain on which the game is being joined.
 * @param signer - The JSON-RPC signer used for signing the transaction.
 * @returns A promise that resolves to the transaction receipt once the join transaction is confirmed.
 */
export const joinGame =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string) => {
    const contract = getContract(chain, signer);

    const reqs = await contract.getJoinRequirements(gameId);
    const values = reqs.ethValues;

    const value = values.bet.add(values.burn).add(values.pay);

    return contract
      .joinGame(gameId, { value: value.toString() ?? "0" })
      .then((tx) => tx.wait(1));
  };

/**
 * Starts a game on the specified chain using the provided signer.
 * @param chain The supported chain on which the game will be started.
 * @param signer The JSON-RPC signer used to sign the transaction.
 * @returns A promise that resolves to the result of the startGame transaction.
 */
export const startGame =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string) => {
    const contract = getContract(chain, signer);
    return await contract.startGame(gameId);
  };

/**
 * Cancels a game.
 *
 * @param chain - The supported blockchain network.
 * @param signer - The JSON-RPC signer.
 * @returns A promise that resolves to the result of cancelling the game.
 */
export const cancelGame =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string) => {
    const contract = getContract(chain, signer);
    return await contract.cancelGame(gameId);
  };

/**
 * Leaves a game.
 * @param chain - The blockchain network.
 * @param signer - The signer object.
 * @returns A promise that resolves to the transaction receipt.
 */
export const leaveGame =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string) => {
    const contract = getContract(chain, signer);
    return contract.leaveGame(gameId).then((tx) => tx.wait(1));
  };

/**
 * Opens the registration for a game on the specified chain using the provided signer.
 * @param chain - The supported chain on which the game is being played.
 * @param signer - The JSON-RPC signer used to interact with the blockchain.
 * @returns A promise that resolves to the result of opening the registration.
 */
export const openRegistration =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string) => {
    const contract = getContract(chain, signer);
    return await contract.openRegistration(gameId);
  };

/**
 * Sets the join requirements for a game on the specified chain using the provided signer.
 *
 * @param chain - The supported chain on which the game is being played.
 * @param signer - The JSON-RPC signer used to interact with the contract.
 * @returns A promise that resolves to the result of setting the join requirements.
 */
export const setJoinRequirements =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string, config: LibCoinVending.ConfigPositionStruct) => {
    const contract = getContract(chain, signer);
    return await contract.setJoinRequirements(gameId, config);
  };

interface ErrorOptions {
  cause?: unknown;
}

interface ApiErrorOptions extends ErrorOptions {
  status?: number;
}

class ApiError extends Error {
  status: number | undefined;
  constructor(message: string, options?: ApiErrorOptions) {
    super(message);
    this.status = options?.status;
  }
}

export async function getApiError(response: any) {
  const body = await response.json();
  return new ApiError(body.msg || "server_error", {
    status: body?.status,
  });
}

/**
 * Retrieves the historic turn information for a specific game and turn ID.
 * @param chain - The supported blockchain network.
 * @param provider - The Web3 provider.
 * @returns The historic turn event object.
 * @throws {ApiError} If the game or turn is not found.
 */
export const getHistoricTurn =
  (chain: SupportedChains, provider: ethers.providers.Web3Provider) =>
  async (gameId: BigNumberish, turnId: BigNumberish) => {
    const contract = getContract(chain, provider);
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
    return { ...turnEndedEvents[0] };
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
export const getPreviousTurnStats = async (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: BigNumberish
) => {
  const contract = getContract(chain, provider);
  const currentTurn = await contract.getTurn(gameId);
  if (currentTurn.gt(1)) {
    return getHistoricTurn(chain, provider)(gameId, currentTurn.sub(1));
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
export const getVoting =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: BigNumberish, turnId: BigNumberish) => {
    if (!gameId) throw new Error("gameId not set");
    if (!turnId) throw new Error("turnId not set");
    console.log("getVoting", gameId, turnId);
    const contract = getContract(chain, signer);
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
    console.log("voteEvents", voteEvents, "proposalEvents", proposalEvents);
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
export const getOngoingVoting =
  ({
    chain,
    signer,
  }: {
    chain: SupportedChains;
    signer: ethers.providers.JsonRpcSigner;
  }) =>
  async (gameId: BigNumberish) => {
    return getContract(chain, signer)
      .getTurn(gameId)
      .then((turn) => getVoting(chain, signer)(gameId, turn));
  };

/**
 * Retrieves the ongoing proposals for a specific game on a supported chain.
 *
 * @param chainName - The name of the supported chain.
 * @param provider - The Web3Provider instance.
 * @param gameId - The ID of the game.
 * @returns The ongoing proposals for the specified game.
 */
export const getOngoingProposals = async (
  chainName: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: BigNumberish
) => {
  const contract = getContract(chainName, provider);
  const currentTurn = await contract.getTurn(gameId);
  console.debug("currentTurn", currentTurn.toString());
  //list all events of gameId that ended turnId.
  const filter = contract.filters.TurnEnded(gameId, currentTurn.sub(1));
  const TurnEndedEvents = await contract.queryFilter(filter, 0, "latest");
  const event = contract.interface.parseLog(TurnEndedEvents[0]);
  console.debug("aaaaaa", event);
  const dc = deepArrayToObject(event);
  console.debug("aaaaaa", event, dc);
  return dc.args.newProposals;
};

/**
 * Retrieves the registration deadline for a specific game on a supported blockchain.
 * @param chainName - The name of the blockchain.
 * @param provider - The Web3Provider instance.
 * @param gameId - The ID of the game.
 * @param timeToJoin - Optional. The additional time (in seconds) to join the game.
 * @returns A Promise that resolves to the registration deadline timestamp.
 */
export const getRegistrationDeadline = async (
  chainName: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: BigNumberish,
  timeToJoin?: number
) => {
  const contract = getContract(chainName, provider);
  const filter = contract.filters.RegistrationOpen(gameId);
  return contract.queryFilter(filter, 0, "latest").then((events) =>
    events[0].getBlock().then(async (block) => {
      if (timeToJoin) return block.timestamp + timeToJoin;
      else
        return contract
          .getContractState()
          .then((cs) => block.timestamp + cs.TBGSEttings.timeToJoin.toNumber());
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
const resolveTurnDeadline = async (
  block: ethers.providers.Block,
  contract: RankifyDiamondInstance,
  timePerTurn?: number
) => {
  console.log("getTurnDeadline getTurnDeadline", block, contract, timePerTurn);
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
export const getTurnDeadline = async (
  chainName: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: BigNumberish,
  timePerTurn?: number
) => {
  if (!gameId) throw new Error("gameId not set");
  const contract = getContract(chainName, provider);

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
            resolveTurnDeadline(block, contract, timePerTurn)
          )
      );
  });
};

/**
 * Represents a player in the voting system.
 * ToDo: methods above ^^^^ mostly can be moved to this class
 */
export class Player {
  EIP712name: string;
  EIP712Version: string;
  provider: ethers.providers.Web3Provider;
  verifyingContract: string;
  chainId: string;

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
    chainId,
  }: {
    EIP712name: string;
    EIP712Version: string;
    verifyingContract: string;
    provider: ethers.providers.Web3Provider;
    chainId: string;
  }) {
    this.EIP712Version = EIP712Version;
    this.EIP712name = EIP712name;
    this.provider = provider;
    this.chainId = chainId;
    this.verifyingContract = verifyingContract;
  }
}
