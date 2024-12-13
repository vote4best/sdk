import { type Address, type WalletClient, type Hex, TypedDataDomain } from "viem";
import { getArtifact } from "../utils";
import type { RegisterMessage } from "../types";
import MultipassBase from "./MultipassBase";

export type NameQuery = {
  name: Hex;
  id: Hex;
  wallet: Address;
  domainName: Hex;
  targetDomain: Hex;
};

export default class Multipass extends MultipassBase {
  private name: string;
  private version: string;
  private walletClient: WalletClient;

  constructor({ chainId, walletClient }: { chainId: number; walletClient: WalletClient }) {
    super({ chainId });
    const artifact = getArtifact(chainId, "Multipass");
    this.name = artifact.execute.args[0];
    this.version = artifact.execute.args[1];
    this.walletClient = walletClient;
  }

  public signRegistrarMessage = async (message: RegisterMessage, verifierAddress: Address) => {
    if (!this.walletClient.account?.address) throw new Error("No account found");

    const domain: TypedDataDomain = {
      name: this.name,
      version: this.version,
      chainId: this.chainId,
      verifyingContract: verifierAddress,
    };

    const types = {
      registerName: [
        { type: "bytes32", name: "name" },
        { type: "bytes32", name: "id" },
        { type: "bytes32", name: "domainName" },
        { type: "uint256", name: "validUntil" },
        { type: "uint96", name: "nonce" },
      ],
    } as const;

    return this.walletClient.signTypedData({
      account: this.walletClient.account.address,
      domain: domain,
      types,
      primaryType: "registerName",
      message: { ...message },
    });
  };
}
