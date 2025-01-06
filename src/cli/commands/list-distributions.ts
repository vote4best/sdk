import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { MAODistributorClient } from "../../rankify/MAODistributor";
import { createPublic } from "../client";
import { hexToString } from "viem";

export const listDistributionsCommand = new Command("list-distributions")
  .description("List all existing distributions")
  .option("-r, --rpc <url>", "RPC endpoint URL. If not provided, RPC_URL environment variable will be used")
  .action(async (options) => {
    const spinner = ora("Initializing client...").start();

    try {
      const publicClient = createPublic(options.rpc);
      const chainId = Number(await publicClient.getChainId());

      const maoDistributor = new MAODistributorClient(chainId, {
        publicClient,
      });

      spinner.text = "Fetching distributions...";

      const distributionHexes = await maoDistributor.getDistributions();

      if (distributionHexes.length === 0) {
        spinner.info("No distributions found");
        return;
      }

      spinner.succeed(`Found ${distributionHexes.length} distribution(s)`);

      console.log("\nDistributions:");
      for (let i = 0; i < distributionHexes.length; i++) {
        const hex = distributionHexes[i];

        const name = hexToString(hex).replace(/\0/g, ""); // Remove null bytes
        console.log(chalk.blue(`\nDistribution #${i + 1}:`));
        console.log(chalk.green(`Name: ${name}`));
      }
    } catch (error) {
      spinner.fail("Failed to list distributions");
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });
