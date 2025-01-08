import { Command } from "commander";
import { listCommand } from "./list";
import { addCommand } from "./add";

export const distributionsCommand = new Command("distributions")
  .description("Manage distributions")
  .addCommand(listCommand)
  .addCommand(addCommand);
