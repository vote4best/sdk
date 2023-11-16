import { LibCoinVending } from "vote4best-contracts/types/hardhat-diamond-abi/HardhatDiamondABI.sol/BestOfDiamond";
import { RankToken, BestOfDiamond, Agenda } from "vote4best-contracts/types";
import { BigNumberish, Bytes, BytesLike, ethers, Wallet } from "ethers";
import { JsonFragment } from "@ethersproject/abi";

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

export const getArtifact = (
  chain: string
): { abi: JsonFragment[]; address: string } => {
  const deployment = require(`vote4best-contracts/deployments/${chain}/BestOfGame.json`);
  const chainId = chainIds[chain];
  const artifact = { chainId, ...deployment };
  if (!artifact) throw new Error("Contract deployment not found");
  return artifact;
};

const getRankArtifact = (
  chain: string
): { abi: JsonFragment[]; address: string } => {
  const deployment = require(`vote4best-contracts/deployments/${chain}/RankToken.json`);
  const chainId = chainIds[chain];
  // console.debug("deployments", deployments);
  console.debug("chainId", chainId);
  const artifact = { chainId, ...deployment };
  if (!artifact) throw new Error("Contract deployment not found");
  return artifact;
};

const getAgendaArtifact = (
  chain: string
): { abi: JsonFragment[]; address: string } => {
  const deployment = require(`vote4best-contracts/deployments/${chain}/Agenda.json`);
  const chainId = chainIds[chain];
  // console.debug("deployments", deployments);
  console.debug("chainId", chainId);
  const artifact = { chainId, ...deployment };
  if (!artifact) throw new Error("Contract deployment not found");
  return artifact;
};

export const getContract = (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider | ethers.Signer
) => {
  const artifact = getArtifact(chain);
  console.log("artifact address", artifact.address);
  return new ethers.Contract(
    artifact.address,
    artifact.abi,
    provider
  ) as BestOfDiamond;
};

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

export const getAgendaTokenContract = (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider | ethers.Signer
) => {
  const artifact = getAgendaArtifact(chain);
  const contract = new ethers.Contract(
    artifact.address,
    artifact.abi,
    provider
  ) as Agenda;
  return contract;
};

export const getContractState = async (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider
) => {
  const contract = getContract(chain, provider);
  return contract.getContractState();
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
  const retval = await contract.contractURI();
  return retval;
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
    return await contract.balanceOf(account, tokenId);
  };

export const getProposalScoresList = async (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: string,
  from?: number,
  to?: number
) => {
  const contract = getContract(chain, provider);
  const _from = from ?? 1;
  const _to = to ?? (await contract.getTurn(gameId)).toNumber();
  console.log("getProposalScore result", gameId, _from, _to);
  const proposalScoreFilter = contract.filters.ProposalScore(gameId);
  return contract.queryFilter(proposalScoreFilter, 0, "latest");
};

export const getCurrentTurn = async (
  chain: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: string
) => {
  const contract = getContract(chain, provider);
  const currentTurn = await contract.getTurn(gameId);
  return currentTurn;
};

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

const approveTokensIfNeeded = async (
  value: BigNumberish,
  chain: SupportedChains,
  signer: ethers.providers.JsonRpcSigner
) => {
  if (ethers.BigNumber.from(value).gt(0)) {
    return getAgendaTokenContract(chain, signer)
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

export const startGame =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string) => {
    const contract = getContract(chain, signer);
    return await contract.startGame(gameId);
  };

export const cancelGame =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string) => {
    const contract = getContract(chain, signer);
    return await contract.cancelGame(gameId);
  };

export const checkSignature =
  (chain: SupportedChains, provider: ethers.providers.Web3Provider) =>
  async (message: BytesLike, signature: BytesLike, account: string) => {
    const contract = getContract(chain, provider);
    return await contract.checkSignature(message, signature, account);
  };

export const leaveGame =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string) => {
    const contract = getContract(chain, signer);
    return contract.leaveGame(gameId).then((tx) => tx.wait(1));
  };

export const openRegistration =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: string) => {
    const contract = getContract(chain, signer);
    return await contract.openRegistration(gameId);
  };

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

export const getVoting =
  (chain: SupportedChains, signer: ethers.providers.JsonRpcSigner) =>
  async (gameId: BigNumberish, turnId: BigNumberish) => {
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
    let proposals = [];
    let playersVoted = [];
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
  console.log("getOngoingProposals", event);
  return event.args.newProposals;
};

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

const resolveTurnDeadline = async (
  block: ethers.providers.Block,
  contract: BestOfDiamond,
  timePerTurn?: number
) => {
  if (timePerTurn) return block.timestamp + timePerTurn;
  return contract
    .getContractState()
    .then((cs) => cs.TBGSEttings.timePerTurn.toNumber() + block.timestamp);
};

export const getTurnDeadline = async (
  chainName: SupportedChains,
  provider: ethers.providers.Web3Provider,
  gameId: BigNumberish,
  timePerTurn?: number
) => {
  const contract = getContract(chainName, provider);

  return contract.getTurn(gameId).then(async (ct) => {
    if (ct.eq(0)) return 0;
    const filter = ct.eq(1)
      ? contract.filters.GameStarted(gameId)
      : contract.filters.TurnEnded(gameId, ct);
    return contract
      .queryFilter(filter, 0, "latest")
      .then((evts) =>
        evts[0]
          .getBlock()
          .then((block) => resolveTurnDeadline(block, contract, timePerTurn))
      );
  });
};

export class Player {
  EIP712name: string;
  EIP712Version: string;
  provider: ethers.providers.Web3Provider;
  verifyingContract: string;
  chainId: string;

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
// export const signProposalMessage =
//   (chain: SupportedChains, proposer: ethers.providers.JsonRpcSigner) =>
//   async ({
//     proposal,
//     turn,
//     gameId,
//     salt,
//   }: {
//     proposal: string;
//     turn: string;
//     gameId: string;
//     salt: string;
//   }) => {
//     // ProposalMessage
//     const message: ProposalMessage = {
//       proposal: proposal,
//       turn: turn,
//       gameId: gameId,
//       salt: salt,
//     };
//     const artifact = getArtifact(chain);
//     const domain = {
//       name: artifact.name,
//       version: artifact.version,
//       chainId: artifact.chainId,
//       verifyingContract: artifact.contractAddress,
//     };
//     const s = await proposer._signTypedData(domain, ProposalTypes, {
//       ...message,
//     });
//     return s;
//   };
