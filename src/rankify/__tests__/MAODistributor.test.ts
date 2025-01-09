import { describe, expect, test, jest } from "@jest/globals";
import { MAODistributorClient } from "../MAODistributor";
import { createPublicClient, getContract, type TransactionReceipt, type Hash } from "viem";
import { Address, type Log } from "viem";
import { MAODistributionAbi } from "../../abis/MAODistribution.js";
import { MOCK_ADDRESSES, MOCK_HASHES, MOCK_CHAIN } from "../../__tests__/utils.js";

// Mock viem
jest.mock("viem", () => ({
  ...(jest.requireActual("viem") as object),
  getContract: jest.fn(),
  createPublicClient: jest.fn(),
  http: jest.fn(),
}));

// Mock data
const mockHash = MOCK_HASHES.TRANSACTION;
const mockWriteContract = jest.fn();
const mockWaitForTransactionReceipt = jest.fn();
