#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "module";
import { getMetadataCommand } from "./commands/get-metadata";
import { createFellowshipCommand } from "./commands/create-fellowship";
import { listDistributionsCommand } from "./commands/list-distributions";
import { addDistributionCommand } from "./commands/add-distribution";
import { listInstancesCommand } from "./commands/list-instances";

const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

const program = new Command()
  .name("peeramid")
  .description("CLI for interacting with Peeramid contracts")
  .version(version);

// Add commands
program.addCommand(getMetadataCommand);
program.addCommand(createFellowshipCommand);
program.addCommand(listDistributionsCommand);
program.addCommand(addDistributionCommand);
program.addCommand(listInstancesCommand);

program.parse();
