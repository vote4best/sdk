import { Chain, createPublicClient, createWalletClient, Hex, http, WalletClient } from "viem";
import { chainToPath } from "../utils/chainMapping";
import { privateKeyToAccount } from "viem/accounts";

export const createPublic = (rpcUrl?: string) => {
  const endpoint = rpcUrl || process.env.RPC_URL;
  if (!endpoint) {
    throw new Error("RPC URL is required. Either pass it as a parameter or set RPC_URL environment variable");
  }

  // Create a temporary client to get chain ID
  return createPublicClient({
    transport: http(endpoint),
  });
};

export const createWallet = async (rpcUrl?: string, key?: string): Promise<WalletClient> => {
  const endpoint = rpcUrl || process.env.RPC_URL;
  if (!endpoint) {
    throw new Error("RPC URL is required. Either pass it as a parameter or set RPC_URL environment variable");
  }
  const signerKey = key || process.env.PRIVATE_KEY;
  if (!signerKey) {
    throw new Error("Private key is required. Either pass it as a parameter or set PRIVATE_KEY environment variable");
  }
  const walletClient = createWalletClient({
    transport: http(endpoint),
    key: signerKey,
  });
  const chainId = await walletClient.getChainId();
  const chain: Chain = {
    id: chainId,
    name: chainToPath[chainId.toString()],
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [endpoint],
      },
      public: {
        http: [endpoint],
      },
    },
  };

  return createWalletClient({
    transport: http(endpoint),
    key: signerKey,
    account: privateKeyToAccount(signerKey as Hex),
    chain,
  });
};
