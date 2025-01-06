#!/usr/bin/env node

import { Command } from "commander";
import { fellowshipsCommand } from "./commands/fellowship";
import { distributionsCommand } from "./commands/distributions";
import { instancesCommand } from "./commands/instances";

const { version } = require("../../package.json");

const program = new Command()
  .name("peeramid")
  .description("CLI for interacting with Peeramid contracts")
  .version(version);

// Add commands
program.addCommand(fellowshipsCommand);
program.addCommand(distributionsCommand);
program.addCommand(instancesCommand);

program.parse();
