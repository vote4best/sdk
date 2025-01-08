import { Command } from "commander";
import { domainCommand } from "./domain";
import contractCommand from "./contract";
import domainsCommand from "./domains";
// import { ownerCommand } from "./owner";
// import stateCommand from "./state";

export const multipassCommand = new Command("multipass")
  .description("Manage Multipass operations")
  .addCommand(domainCommand)
  .addCommand(contractCommand)
  .addCommand(domainsCommand);
// .addCommand(ownerCommand)
// .addCommand(stateCommand);
