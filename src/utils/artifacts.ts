import {JsonFragment} from "@ethersproject/abi";

export const chainIds = {
  anvil: 97113,
};

/**
 * Retrieves the Rankify artifact for the specified chain.
 * @param chain The chain identifier.
 * @param artifactName
 * @returns The Rankify artifact containing the ABI and address.
 * @throws Error if the contract deployment is not found.
 */
export const getArtifact = (
    chain: string,
    artifactName: 'Rankify' | 'RankifyInstance' | 'RankToken'
): { abi: JsonFragment[]; address: string } => {
  const deployment = require(`rankify-contracts/deployments/${chain}/${artifactName}.json`);
  const chainId = chainIds[chain];
  const artifact = { chainId, ...deployment };
  if (!artifact) {
    throw new Error("Contract deployment not found");
  }
  return artifact;
};

export const getRankifyArtifact = (
    chain: string
): { abi: JsonFragment[]; address: string } => {
  return getArtifact(chain, 'Rankify');
};

export const getRankifyInstanceArtifact = (
    chain: string
): { abi: JsonFragment[]; address: string } => {
  return getArtifact(chain, 'RankifyInstance');
};

export const getRankArtifact = (
    chain: string
): { abi: JsonFragment[]; address: string } => {
  return getArtifact(chain, 'RankToken');
};

