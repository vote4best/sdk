import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import MultipassBase from "../../../multipass/MultipassBase";
import { createPublic } from "../../client";

export const queryCommand = new Command("query")
  .description("Query Multipass information")
  .option("-r, --rpc <url>", "RPC endpoint URL. If not provided, RPC_URL environment variable will be used")
  .action(async (options) => {
    const spinner = ora("Initializing client...").start();

    try {
      const publicClient = createPublic(options.rpc);
      const chainId = Number(await publicClient.getChainId());

      const multipass = new MultipassBase({
        chainId,
        publicClient,
      });

      spinner.text = "Please select query type...";
      spinner.stop();

      const { queryType } = await inquirer.prompt([
        {
          type: "list",
          name: "queryType",
          message: "Select query type:",
          choices: [
            { name: "Query by Address", value: "address" },
            { name: "Query by ID", value: "id" },
            { name: "Query by Username", value: "username" },
            { name: "Query by Username and ID", value: "usernameAndId" },
            { name: "Query by Full Details", value: "fullDetails" },
          ],
        },
      ]);

      let query;
      switch (queryType) {
        case "address": {
          const { address, domainName, targetDomain } = await inquirer.prompt([
            {
              type: "input",
              name: "address",
              message: "Enter wallet address:",
              validate: (input: string) => input.trim() !== "" || "Address cannot be empty",
            },
            {
              type: "input",
              name: "domainName",
              message: "Enter domain name:",
              validate: (input: string) => input.trim() !== "" || "Domain name cannot be empty",
            },
            {
              type: "input",
              name: "targetDomain",
              message: "Enter target domain (optional):",
            },
          ]);
          query = multipass.formQueryByAddress({ address, domainName, targetDomain });
          break;
        }
        case "id": {
          const { id, domainName, targetDomain } = await inquirer.prompt([
            {
              type: "input",
              name: "id",
              message: "Enter ID:",
              validate: (input: string) => input.trim() !== "" || "ID cannot be empty",
            },
            {
              type: "input",
              name: "domainName",
              message: "Enter domain name:",
              validate: (input: string) => input.trim() !== "" || "Domain name cannot be empty",
            },
            {
              type: "input",
              name: "targetDomain",
              message: "Enter target domain (optional):",
            },
          ]);
          query = multipass.formQueryById({ id, domainName, targetDomain });
          break;
        }
        case "username": {
          const { username, domainName, targetDomain } = await inquirer.prompt([
            {
              type: "input",
              name: "username",
              message: "Enter username:",
              validate: (input: string) => input.trim() !== "" || "Username cannot be empty",
            },
            {
              type: "input",
              name: "domainName",
              message: "Enter domain name:",
              validate: (input: string) => input.trim() !== "" || "Domain name cannot be empty",
            },
            {
              type: "input",
              name: "targetDomain",
              message: "Enter target domain (optional):",
            },
          ]);
          query = multipass.formQueryByUsername({ username, domainName, targetDomain });
          break;
        }
        case "usernameAndId": {
          const { username, id, domainName, targetDomain } = await inquirer.prompt([
            {
              type: "input",
              name: "username",
              message: "Enter username:",
              validate: (input: string) => input.trim() !== "" || "Username cannot be empty",
            },
            {
              type: "input",
              name: "id",
              message: "Enter ID:",
              validate: (input: string) => input.trim() !== "" || "ID cannot be empty",
            },
            {
              type: "input",
              name: "domainName",
              message: "Enter domain name:",
              validate: (input: string) => input.trim() !== "" || "Domain name cannot be empty",
            },
            {
              type: "input",
              name: "targetDomain",
              message: "Enter target domain (optional):",
            },
          ]);
          query = multipass.formQueryByUsernameAndId({ username, id, domainName, targetDomain });
          break;
        }
        case "fullDetails": {
          const { username, id, address, domainName, targetDomain } = await inquirer.prompt([
            {
              type: "input",
              name: "username",
              message: "Enter username:",
              validate: (input: string) => input.trim() !== "" || "Username cannot be empty",
            },
            {
              type: "input",
              name: "id",
              message: "Enter ID:",
              validate: (input: string) => input.trim() !== "" || "ID cannot be empty",
            },
            {
              type: "input",
              name: "address",
              message: "Enter wallet address:",
              validate: (input: string) => input.trim() !== "" || "Address cannot be empty",
            },
            {
              type: "input",
              name: "domainName",
              message: "Enter domain name:",
              validate: (input: string) => input.trim() !== "" || "Domain name cannot be empty",
            },
            {
              type: "input",
              name: "targetDomain",
              message: "Enter target domain (optional):",
            },
          ]);
          query = multipass.formQueryByFullDetails({ username, id, address, domainName, targetDomain });
          break;
        }
      }

      spinner.succeed("Query formed successfully!");

      if (!query) {
        throw new Error("Failed to form query");
      }

      console.log("\nQuery Details:");
      console.log(chalk.green("Name:"), query.name);
      console.log(chalk.green("ID:"), query.id);
      console.log(chalk.green("Wallet:"), query.wallet);
      console.log(chalk.green("Domain Name:"), query.domainName);
      console.log(chalk.green("Target Domain:"), query.targetDomain);
    } catch (error) {
      spinner.fail("Query formation failed");
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });
