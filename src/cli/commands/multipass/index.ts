import { Command } from "commander";
import { registerCommand } from "./register";
import { queryCommand } from "./query";
import { ownerCommand } from "./owner";

export const multipassCommand = new Command("multipass")
  .description("Manage Multipass operations")
  .addCommand(registerCommand)
  .addCommand(queryCommand)
  .addCommand(ownerCommand);
