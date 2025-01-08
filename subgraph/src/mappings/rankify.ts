import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  Transfer as TransferEvent,
  Approval as ApprovalEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
} from "../../generated/Rankify/Rankify";
import { Transfer, Approval, OwnershipTransferred } from "../../generated/schema";

export function handleTransfer(event: TransferEvent): void {
  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const transfer = new Transfer(id);

  transfer.from = event.params.from;
  transfer.to = event.params.to;
  transfer.value = event.params.value;
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;
  transfer.transactionHash = event.transaction.hash;

  transfer.save();
}

export function handleApproval(event: ApprovalEvent): void {
  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const approval = new Approval(id);

  approval.owner = event.params.owner;
  approval.spender = event.params.spender;
  approval.value = event.params.value;
  approval.timestamp = event.block.timestamp;
  approval.blockNumber = event.block.number;
  approval.transactionHash = event.transaction.hash;

  approval.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  const id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  const transfer = new OwnershipTransferred(id);

  transfer.previousOwner = event.params.previousOwner;
  transfer.newOwner = event.params.newOwner;
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;
  transfer.transactionHash = event.transaction.hash;

  transfer.save();
}
