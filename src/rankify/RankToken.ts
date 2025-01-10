import { Address, PublicClient, getContract } from "viem";
import RankTokenAbi from "../abis/RankToken";
import { FellowshipMetadata, SUBMISSION_TYPES, CONTENT_STORAGE } from "../types";
import { handleRPCError } from "../utils";

export default class RankTokenClient {
  chainId: number;
  publicClient: PublicClient;
  rankTokenAddress: Address;

  constructor({ address, chainId, publicClient }: { address: Address; chainId: number; publicClient: PublicClient }) {
    this.chainId = chainId;
    this.publicClient = publicClient;
    this.rankTokenAddress = address;
  }

  getRankTokenURI = async () => {
    try {
      const rankToken = getContract({
        address: this.rankTokenAddress,
        abi: RankTokenAbi,
        client: this.publicClient,
      });
      return rankToken.read.contractURI();
    } catch (e) {
      throw await handleRPCError(e);
    }
  };

  // Type guard for FellowshipMetadata
  isFellowshipMetadata(data: unknown): data is FellowshipMetadata {
    if (!data || typeof data !== "object") return false;

    const metadata = data as Record<string, unknown>;

    // Check required fields
    if (typeof metadata.name !== "string") return false;
    if (typeof metadata.description !== "string") return false;
    if (typeof metadata.image !== "string") return false;

    // Check optional fields if present
    if (metadata.banner_image !== undefined && typeof metadata.banner_image !== "string") return false;
    if (metadata.featured_image !== undefined && typeof metadata.featured_image !== "string") return false;
    if (metadata.external_link !== undefined && typeof metadata.external_link !== "string") return false;

    // Check collaborators if present
    if (metadata.collaborators !== undefined) {
      if (!Array.isArray(metadata.collaborators)) return false;
      if (!metadata.collaborators.every((addr) => typeof addr === "string")) return false;
    }

    // Check submissions
    if (!Array.isArray(metadata.submissions)) return false;

    return metadata.submissions.every((submission) => {
      if (!submission || typeof submission !== "object") return false;
      const r = submission as Record<string, unknown>;

      // Check submission fields
      const submissionType = r.type as string;
      const storageType = r.store_at as string | undefined;

      if (!Object.values(SUBMISSION_TYPES).includes(submissionType as SUBMISSION_TYPES)) return false;
      if (typeof r.rules !== "object" || r.rules === null) return false;
      if (storageType !== undefined && !Object.values(CONTENT_STORAGE).includes(storageType as CONTENT_STORAGE))
        return false;

      return true;
    });
  }

  getMetadata = async (ipfsGateway: string): Promise<FellowshipMetadata> => {
    try {
      const uri = await this.getRankTokenURI();

      // Handle different URI formats
      const processedUri = uri.startsWith("ipfs://")
        ? uri.replace("ipfs://", `${ipfsGateway}`)
        : uri.startsWith("ar://")
          ? `https://arweave.net/${uri.slice(5)}`
          : uri;
      console.log("fetching from", processedUri);
      const response = await fetch(processedUri);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData: unknown = await response.json();

      if (typeof rawData !== "object" || rawData === null) {
        throw new Error("Invalid response: expected JSON object");
      }

      if (!this.isFellowshipMetadata(rawData)) {
        throw new Error("Invalid metadata format");
      }

      return rawData;
    } catch (error) {
      console.error("Error fetching metadata:", error);
      throw error;
    }
  };

  getRankTokenBalance = async (tokenId: bigint, account: Address) => {
    try {
      const rankToken = getContract({
        address: this.rankTokenAddress,
        abi: RankTokenAbi,
        client: this.publicClient,
      });
      return rankToken.read.balanceOf([account, tokenId]);
    } catch (e) {
      throw await handleRPCError(e);
    }
  };
}
