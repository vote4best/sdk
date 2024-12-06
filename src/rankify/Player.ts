import {
  type Address,
  type PublicClient,
  type WalletClient,
  type Hex,
  parseEventLogs,
  GetAbiItemParameters,
} from "viem";
import { getContract, SupportedChains } from "../utils/artifacts";
import instanceAbi from "rankify-contracts/abi/hardhat-diamond-abi/HardhatDiamondABI.sol/RankifyDiamondInstance";
import InstanceBase from "./InstanceBase";

export type NewGameParams = {
  minGameTime: bigint;
  maxGameTime: bigint;
  maxPlayers: number;
  minPlayers: number;
  timePerTurn: bigint;
  timeToJoin: bigint;
  gameMaster: Hex;
  joinRequirements: {
    contractAddresses: readonly Hex[];
    contractIds: readonly bigint[];
    contractTypes: readonly number[];
    ethValues: {
      have: bigint;
      lock: bigint;
      burn: bigint;
      pay: bigint;
      bet: bigint;
    }[];
  };
};

export default class RankifyPlayer extends InstanceBase {
  walletClient: WalletClient;
  account: Address;

  constructor({
    publicClient,
    walletClient,
    chain,
    instanceAddress,
    account,
  }: {
    publicClient: PublicClient;
    walletClient: WalletClient;
    chain: SupportedChains;
    instanceAddress: Address;
    account: Address;
  }) {
    super({
      publicClient,
      chain,
      instanceAddress,
    });
    this.walletClient = walletClient;
    this.account = account;
  }

  approveTokensIfNeeded = async (value: bigint) => {
    const tokenContract = getContract(this.chain, "Rankify", this.walletClient);
    if (this.walletClient.account?.address) throw new Error("Account not found");
    if (value > 0n) {
      const { request } = await this.publicClient.simulateContract({
        address: tokenContract.address,
        abi: tokenContract.abi,
        functionName: "approve",
        args: [this.instanceAddress, value],
        account: this.walletClient.account?.address,
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });
    }
  };

  createGame = async (newGameParams: GetAbiItemParameters<typeof instanceAbi, "createGame">["args"]) => {
    if (!newGameParams) throw new Error("newGameParams is required");
    const price = await this.publicClient.readContract({
      address: this.instanceAddress,
      abi: instanceAbi,
      functionName: "estimateGamePrice",
      args: [newGameParams[0].minGameTime],
    });

    await this.approveTokensIfNeeded(price as bigint);
    if (!this.walletClient.account?.address) throw new Error("Account not found");
    const { request } = await this.publicClient.simulateContract({
      address: this.instanceAddress,
      abi: instanceAbi,
      functionName: "createGame",
      args: [newGameParams[0]],
      account: this.walletClient.account?.address,
    });

    const hash = await this.walletClient.writeContract(request);
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    const gameCreatedEvent = parseEventLogs({
      abi: instanceAbi,
      logs: receipt.logs,
      eventName: "gameCreated",
    })[0];

    if (!gameCreatedEvent) {
      throw new Error("Failed to create game: gameCreated event not found");
    }

    return {
      gameId: gameCreatedEvent.args.gameId as bigint,
      receipt,
    };
  };

  joinGame = async (gameId: bigint) => {
    const reqs = (await this.publicClient.readContract({
      address: this.instanceAddress,
      abi: instanceAbi,
      functionName: "getJoinRequirements",
      args: [gameId],
    })) as { ethValues: { have: bigint; lock: bigint; burn: bigint; pay: bigint; bet: bigint } };

    const values = reqs.ethValues;
    const value = values.bet + values.burn + values.pay;
    if (this.walletClient.account?.address) throw new Error("Account not found");
    const { request } = await this.publicClient.simulateContract({
      address: this.instanceAddress,
      abi: instanceAbi,
      functionName: "joinGame",
      args: [gameId],
      value,
      account: this.walletClient.account?.address,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  };

  startGame = async (gameId: bigint) => {
    if (!this.walletClient.account?.address) throw new Error("Account not found");
    const { request } = await this.publicClient.simulateContract({
      address: this.instanceAddress,
      abi: instanceAbi,
      functionName: "startGame",
      args: [gameId],
      account: this.walletClient.account?.address,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  };

  cancelGame = async (gameId: bigint) => {
    if (!this.walletClient.account?.address) throw new Error("Account not found");
    const { request } = await this.publicClient.simulateContract({
      address: this.instanceAddress,
      abi: instanceAbi,
      functionName: "cancelGame",
      args: [gameId],
      account: this.walletClient.account?.address,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  };

  leaveGame = async (gameId: bigint) => {
    if (!this.walletClient.account?.address) throw new Error("Account not found");
    const { request } = await this.publicClient.simulateContract({
      address: this.instanceAddress,
      abi: instanceAbi,
      functionName: "leaveGame",
      args: [gameId],
      account: this.walletClient.account?.address,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  };

  openRegistration = async (gameId: bigint) => {
    if (!this.walletClient.account?.address) throw new Error("Account not found");
    const { request } = await this.publicClient.simulateContract({
      address: this.instanceAddress,
      abi: instanceAbi,
      functionName: "openRegistration",
      args: [gameId],
      account: this.walletClient.account?.address,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  };

  setJoinRequirements = async (params: GetAbiItemParameters<typeof instanceAbi, "setJoinRequirements">["args"]) => {
    if (!this.walletClient.account?.address) throw new Error("Account not found");
    if (!params) throw new Error("params is required");
    const { request } = await this.publicClient.simulateContract({
      address: this.instanceAddress,
      abi: instanceAbi,
      functionName: "setJoinRequirements",
      args: params,
      account: this.walletClient.account?.address,
    });

    const hash = await this.walletClient.writeContract(request);
    return this.publicClient.waitForTransactionReceipt({ hash });
  };
}
