import {
  RankToken,
  RankifyDiamondInstance,
  MultipassDiamond,
} from "rankify-contracts/types";
import { JsonFragment } from "@ethersproject/abi";
import { Rankify } from "rankify-contracts/types";
export type SupportedChains = "anvil" | "localhost";

export type ArtifactTypes =
  | "Rankify"
  | "RankifyInstance"
  | "RankToken"
  | "Multipass";
/**
 * Retrieves the Rankify artifact for the specified chain.
 * @param chain The chain identifier.
 * @param artifactName
 * @returns The Rankify artifact containing the ABI and address.
 * @throws Error if the contract deployment is not found.
 */
export const getArtifact = (
  chain: SupportedChains,
  artifactName: ArtifactTypes
): { abi: JsonFragment[]; address: string } => {
  const artifact = require(`rankify-contracts/deployments/${chain}/${artifactName}.json`);

  if (!artifact) {
    throw new Error("Contract deployment not found");
  }
  return artifact;
};
export type ArtifactContractInterfaces = {
  Rankify: Rankify;
  RankToken: RankToken;
  RankifyInstance: RankifyDiamondInstance;
  Multipass: MultipassDiamond;
};
