import { ethers, BigNumberish } from "ethers";
import RankifyBase from "./rankify/RankifyInstanceBase";
import { SupportedChains, getArtifact } from "./utils/artifacts";

export default class RankToken {
  provider: ethers.providers.JsonRpcProvider;
  chain: SupportedChains;

  constructor({ provider, chain }: { provider: ethers.providers.JsonRpcProvider; chain: SupportedChains }) {
    this.provider = provider;
    this.chain = chain;
  }
}
