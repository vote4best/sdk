import { ethers, BigNumberish } from "ethers";
import RankifyBase from "./RankifyBase";
import { SupportedChains, getArtifact } from "./utils/artifacts";
import { LibCoinVending } from "rankify-contracts/types/hardhat-diamond-abi/HardhatDiamondABI.sol/RankifyDiamondInstance";

export default class RankifyPlayer extends RankifyBase {
  signer: ethers.providers.JsonRpcSigner;
  constructor({
    signer,
    chain,
  }: {
    signer: ethers.providers.JsonRpcSigner;

    chain: SupportedChains;
  }) {
    super({
      provider: signer.provider,
      chain,
    });
    this.signer = signer;
  }
  /**
   * Approves tokens if needed.
   *
   * @param value - The value of tokens to approve.
   * @param chain - The supported chain.
   * @param signer - The JSON-RPC signer.
   * @returns A promise that resolves to the transaction receipt or 0 if no tokens need to be approved.
   */
  approveTokensIfNeeded = async (value: BigNumberish) => {
    if (ethers.BigNumber.from(value).gt(0)) {
      return this.getContract("Rankify")
        .increaseAllowance(getArtifact(this.chain, "RankifyInstance").address, value)
        .then((tx) => tx.wait(1));
    } else return 0;
  };

  createGame = async (gameMaster: string, gameRank: string, gameId?: BigNumberish) => {
    const contract = this.getContract("RankifyInstance").connect(this.signer);
    return contract.getContractState().then(async (reqs) =>
      this.approveTokensIfNeeded(reqs.BestOfState.gamePrice).then(() => {
        if (gameId) {
          return contract["createGame(address,uint256,uint256)"](gameMaster, gameId, gameRank);
        } else {
          return contract["createGame(address,uint256)"](gameMaster, gameRank);
        }
      })
    );
  };

  /**
   * Joins a game on the specified chain using the provided signer.
   * @param chain - The supported chain on which the game is being joined.
   * @param signer - The JSON-RPC signer used for signing the transaction.
   * @returns A promise that resolves to the transaction receipt once the join transaction is confirmed.
   */
  joinGame = async (gameId: string) => {
    const contract = this.getContract("RankifyInstance");

    const reqs = await contract.getJoinRequirements(gameId);
    const values = reqs.ethValues;

    const value = values.bet.add(values.burn).add(values.pay);

    return contract.joinGame(gameId, { value: value.toString() ?? "0" }).then((tx) => tx.wait(1));
  };

  /**
   * Starts a game on the specified chain using the provided signer.
   * @param chain The supported chain on which the game will be started.
   * @param signer The JSON-RPC signer used to sign the transaction.
   * @returns A promise that resolves to the result of the startGame transaction.
   */
  startGame = async (gameId: string) => {
    const contract = this.getContract("RankifyInstance");
    return await contract.startGame(gameId);
  };

  /**
   * Cancels a game.
   *
   * @param chain - The supported blockchain network.
   * @param signer - The JSON-RPC signer.
   * @returns A promise that resolves to the result of cancelling the game.
   */
  cancelGame = async (gameId: string) => {
    const contract = this.getContract("RankifyInstance");
    return await contract.cancelGame(gameId);
  };

  /**
   * Leaves a game.
   * @param chain - The blockchain network.
   * @param signer - The signer object.
   * @returns A promise that resolves to the transaction receipt.
   */
  leaveGame = async (gameId: string) => {
    const contract = this.getContract("RankifyInstance");
    return contract.leaveGame(gameId).then((tx) => tx.wait(1));
  };

  /**
   * Opens the registration for a game on the specified chain using the provided signer.
   * @param chain - The supported chain on which the game is being played.
   * @param signer - The JSON-RPC signer used to interact with the blockchain.
   * @returns A promise that resolves to the result of opening the registration.
   */
  openRegistration = async (gameId: string) => {
    const contract = this.getContract("RankifyInstance");
    return await contract.openRegistration(gameId);
  };

  /**
   * Sets the join requirements for a game on the specified chain using the provided signer.
   *
   * @param chain - The supported chain on which the game is being played.
   * @param signer - The JSON-RPC signer used to interact with the contract.
   * @returns A promise that resolves to the result of setting the join requirements.
   */
  setJoinRequirements = async (gameId: string, config: LibCoinVending.ConfigPositionStruct) => {
    const contract = this.getContract("RankifyInstance");
    return await contract.setJoinRequirements(gameId, config);
  };
}
