import { Command } from "commander";
import { listCommand } from "./list";

export const instancesCommand = new Command("instances").description("Manage instances").addCommand(listCommand);
