import {
  type Address,
  type PublicClient,
  type WalletClient,
  getContract as viemGetContract,
  type GetContractReturnType,
  AbiItem,
} from "viem";

import rankifyAbi from "rankify-contracts/abi/src/tokens/Rankify.sol/Rankify";
import instanceAbi from "rankify-contracts/abi/hardhat-diamond-abi/HardhatDiamondABI.sol/RankifyDiamondInstance";
import rankTokenAbi from "rankify-contracts/abi/src/tokens/RankToken.sol/RankToken";
import multipassAbi from "@peeramid-labs/multipass/abi/src/Multipass.sol/Multipass";
import simpleAccessManagerAbi from "@peeramid-labs/eds/abi/src/managers/SimpleAccessManager.sol/SimpleAccessManager";
export type SupportedChains = "anvil" | "localhost";

export const chainIdMapping: { [key in SupportedChains]: string } = {
  anvil: "97113",
  localhost: "42161",
};

export type ArtifactTypes = "Rankify" | "Distributor" | "RankToken" | "Multipass" | "SimpleAccessManager";

export type ArtifactAbi = {
  Rankify: typeof rankifyAbi;
  Distributor: typeof instanceAbi;
  RankToken: typeof rankTokenAbi;
  Multipass: typeof multipassAbi;
  SimpleAccessManager: typeof simpleAccessManagerAbi;
};

/**
 * Retrieves the contract artifact for the specified chain.
 * @param chain The chain identifier.
 * @param artifactName The name of the artifact to retrieve
 * @returns The artifact containing the address and execution args
 * @throws Error if the contract deployment is not found.
 */
export const getArtifact = (
  chain: SupportedChains,
  artifactName: ArtifactTypes,
): { abi: readonly AbiItem[]; address: Address; execute: { args: string[] } } => {
  const artifact =
    artifactName === "Multipass"
      ? require(`@peeramid-labs/multipass/deployments/${chain}/${artifactName}.json`)
      : require(`rankify-contracts/deployments/${chain}/${artifactName}.json`);
  if (!artifact) {
    throw new Error("Contract deployment not found");
  }
  return {
    address: artifact.address as Address,
    execute: artifact.execute,
    abi: artifact.abi,
  };
};

/**
 * Gets a contract instance with the appropriate ABI and address for the given chain
 * @param chain The chain to get the contract for
 * @param artifactName The name of the contract to get
 * @param client The viem client to use (public or wallet)
 * @returns A viem contract instance
 */
export const getContract = <TArtifactName extends ArtifactTypes, TClient extends PublicClient | WalletClient>(
  chain: SupportedChains,
  artifactName: TArtifactName,
  client: TClient,
): GetContractReturnType<ArtifactAbi[TArtifactName], TClient> => {
  const artifact = getArtifact(chain, artifactName);
  return viemGetContract({
    address: artifact.address,
    abi: artifact.abi,
    client,
  }) as GetContractReturnType<ArtifactAbi[TArtifactName], TClient>;
};
