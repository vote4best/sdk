import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { Initialized as InitializedEvent } from "../../generated/Multipass/Multipass";
import { Initialized } from "../../generated/schema";

export function handleInitialized(event: InitializedEvent): void {
  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const initialized = new Initialized(id);

  initialized.version = event.params.version;
  initialized.contract = "Multipass";
  initialized.timestamp = event.block.timestamp;
  initialized.blockNumber = event.block.number;
  initialized.transactionHash = event.transaction.hash;

  initialized.save();
}
