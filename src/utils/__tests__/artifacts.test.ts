import { describe, it, expect, jest } from "@jest/globals";
import { type PublicClient, type Address } from "viem";
import { findContractDeploymentBlock } from "../artifacts";

describe("artifacts", () => {
  describe("findContractDeploymentBlock", () => {
    const mockAddress = "0x1234567890123456789012345678901234567890" as Address;

    const mockPublicClient = {
      getBlockNumber: jest.fn(() => Promise.resolve(1000n)),
      getCode: jest.fn(({ blockNumber }) => Promise.resolve(blockNumber >= 100n ? "0x1234" : "0x")),
    } as unknown as PublicClient;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should find the first block where contract was deployed", async () => {
      const result = await findContractDeploymentBlock(mockPublicClient, mockAddress);
      expect(result).toBe(100n);
      expect(mockPublicClient.getCode).toHaveBeenCalled();
    });

    it("should handle custom start and end blocks", async () => {
      const result = await findContractDeploymentBlock(mockPublicClient, mockAddress, 50n, 150n);
      expect(result).toBe(100n);
      expect(mockPublicClient.getBlockNumber).not.toHaveBeenCalled();
    });

    it("should return 0 if contract not found", async () => {
      const mockClientNoContract = {
        getBlockNumber: jest.fn(() => Promise.resolve(1000n)),
        getCode: jest.fn(() => Promise.resolve("0x")),
      } as unknown as PublicClient;

      const result = await findContractDeploymentBlock(mockClientNoContract, mockAddress);
      expect(result).toBe(0n);
    });

    it("should handle contract deployed at block 0", async () => {
      const mockClientBlock0 = {
        getBlockNumber: jest.fn(() => Promise.resolve(1000n)),
        getCode: jest.fn(() => Promise.resolve("0x1234")),
      } as unknown as PublicClient;

      const result = await findContractDeploymentBlock(mockClientBlock0, mockAddress);
      expect(result).toBe(0n);
    });
  });
});
