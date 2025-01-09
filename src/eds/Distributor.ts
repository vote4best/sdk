import { type Address, stringToHex, getContract, Hex, PublicClient, getAddress } from "viem";
import DistributorAbi from "../abis/Distributor";

export class DistributorClient {
  publicClient: PublicClient;
  address: Address;

  constructor({ address, publicClient }: { address: Address; publicClient: PublicClient }) {
    this.address = getAddress(address, publicClient?.chain?.id);
    this.publicClient = publicClient;
  }

  async getDistributions() {
    const contract = getContract({
      address: getAddress(this.address),
      abi: DistributorAbi,
      client: this.publicClient,
    });
    return contract.read.getDistributions();
  }

  async getInstances(
    distributorsId: Hex,
    fromBlock: bigint = 1n
  ): Promise<{ newInstanceId: bigint; version: bigint; addresses: Address[] }[]> {
    const contract = getContract({
      address: this.address,
      abi: DistributorAbi,
      client: this.publicClient,
    });
    if (!this.publicClient.chain?.id) throw new Error("Chain ID is not set");

    const events = await contract.getEvents.Instantiated(
      {
        distributionId: distributorsId,
      },
      { toBlock: "latest", fromBlock }
    );

    return events.map((log) => {
      if (!log.args.version)
        throw new Error(`No version found for distributor ${distributorsId} and instance ${log.args.newInstanceId}`);
      if (!log.args.instances)
        throw new Error(`No instances found for distributor ${distributorsId} and instance ${log.args.newInstanceId}`);
      if (!log.args.newInstanceId)
        throw new Error(`No instanceId found for distributor ${distributorsId} and instance ${log.args.newInstanceId}`);
      return {
        newInstanceId: log.args.newInstanceId,
        addresses: log.args.instances as Address[],
        version: log.args.version,
      };
    });
  }

  async getInstance(distributorsId: Hex, instanceId: bigint): Promise<Address[]> {
    const contract = getContract({
      address: this.address,
      abi: DistributorAbi,
      client: this.publicClient,
    });

    const events = await contract.getEvents.Instantiated(
      {
        distributionId: distributorsId,
        newInstanceId: instanceId,
      },
      { toBlock: "latest", fromBlock: 1n } //ToDo: Parametrize this
    );

    if (events.length > 1) {
      throw new Error(`Multiple instances found for distributor ${distributorsId} and instance ${instanceId}`);
    }
    if (events.length === 0) {
      throw new Error(`No instances found for distributor ${distributorsId} and instance ${instanceId}`);
    }

    return events[0].args.instances as Address[];
  }

  async getNamedDistributionInstances({ namedDistribution }: { namedDistribution: string }): Promise<Address[][]> {
    const id = stringToHex(namedDistribution, { size: 32 });
    return this.getInstances(id).then((instances) => instances.map((i) => i.addresses));
  }

  async getNamedDistributionInstance(namedDistribution: string, instanceId: bigint): Promise<Address[]> {
    const id = stringToHex(namedDistribution, { size: 32 });
    return this.getInstance(id, instanceId);
  }
}
