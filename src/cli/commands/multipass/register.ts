import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import Multipass from "../../../multipass/Registrar";
import { createPublic, createWallet } from "../../client";

type RegistrationAnswers = {
  username: string;
  id: string;
  domainName: string;
  validUntil: number;
};

export const registerCommand = new Command("register")
  .description("Register a new user in Multipass")
  .option("-r, --rpc <url>", "RPC endpoint URL. If not provided, RPC_URL environment variable will be used")
  .option(
    "-k, --key <privateKey>",
    "Private key for signing transactions. If not provided, PRIVATE_KEY environment variable will be used"
  )
  .option("-v, --verifier <address>", "Address of the verifier contract")
  .action(async (options) => {
    const spinner = ora("Initializing clients...").start();

    try {
      const publicClient = createPublic(options.rpc);
      const walletClient = await createWallet(options.rpc, options.key);
      const chainId = Number(await publicClient.getChainId());

      const multipass = new Multipass({
        chainId,
        walletClient,
      });

      spinner.text = "Please provide registration details...";
      spinner.stop();

      const answers = await inquirer.prompt<RegistrationAnswers>([
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
          name: "validUntil",
          message: "Enter valid until timestamp (in seconds):",
          default: String(Math.floor(Date.now() / 1000 + 365 * 24 * 60 * 60)), // Default to 1 year
          validate: (input: string) => {
            const num = parseInt(input);
            return !isNaN(num) && num > Date.now() / 1000 ? true : "Please enter a valid future timestamp";
          },
          filter: (input: string) => parseInt(input),
        },
      ]);

      if (!options.verifier) {
        throw new Error("Verifier address is required");
      }

      spinner.start("Preparing registration message...");

      const message = multipass.getRegistrarMessage({
        username: answers.username,
        id: answers.id,
        domainName: answers.domainName,
        validUntil: answers.validUntil,
      });

      spinner.text = "Signing registration message...";
      const signature = await multipass.signRegistrarMessage(message, options.verifier);

      spinner.succeed("Registration message signed successfully!");

      console.log("\nRegistration Details:");
      console.log(chalk.green("Username:"), answers.username);
      console.log(chalk.green("ID:"), answers.id);
      console.log(chalk.green("Domain Name:"), answers.domainName);
      console.log(chalk.green("Valid Until:"), new Date(answers.validUntil * 1000).toLocaleString());
      console.log(chalk.green("Signature:"), signature);

      // Generate dapp URL if needed
      const dappUrl = multipass.getDappURL(
        message,
        signature,
        process.env.DAPP_URL || "https://app.multipass.example",
        options.verifier
      );
      console.log(chalk.blue("\nDapp URL:"), dappUrl);
    } catch (error) {
      spinner.fail("Registration failed");
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
      process.exit(1);
    }
  });
