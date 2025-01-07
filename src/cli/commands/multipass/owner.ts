import { Command } from "commander";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import { stringToHex, type Address, zeroAddress, type Hash } from "viem";
import MultipassOwner, { type NameQuery, type Record } from "../../../multipass/Owner";
import { createPublic, createWallet } from "../../client";

interface RegisterAnswers {
  name: string;
  id: string;
  domainName: string;
  validUntil: string;
  registrarSignature: string;
  referrerAddress: string;
  referralCode: string;
  wallet: string;
}

interface RenewAnswers {
  name: string;
  id: string;
  domainName: string;
  validUntil: string;
  registrarSignature: string;
  wallet: string;
}

export const ownerCommand = new Command("owner")
  .description("Owner operations for Multipass")
  .option("-r, --rpc <url>", "RPC endpoint URL. If not provided, RPC_URL environment variable will be used")
  .option(
    "-k, --key <privateKey>",
    "Private key for signing transactions. If not provided, PRIVATE_KEY environment variable will be used"
  )
  .option("-w, --wallet <address>", "Wallet address. If not provided, wallet will be derived from private key")
  .addCommand(
    new Command("register")
      .description("Register a new name")
      .option("-n, --name <name>", "Name to register")
      .option("-i, --id <id>", "ID to register")
      .option("-d, --domain <domainName>", "Domain name")
      .option("-v, --valid-until <validUntil>", "Valid until timestamp (in seconds)")
      .option("-s, --signature <registrarSignature>", "Registrar signature")
      .option("-f, --referrer <referrerAddress>", "Referrer address (optional)")
      .option("-c, --code <referralCode>", "Referral code (optional)")
      .action(async (options) => {
        const spinner = ora("Initializing clients...").start();

        try {
          const publicClient = createPublic(options.rpc);
          const walletClient = await createWallet(options.rpc, options.key);
          const chainId = Number(await publicClient.getChainId());

          const multipass = new MultipassOwner({
            chainId,
            walletClient,
            publicClient,
          });

          spinner.stop();

          const answers = await inquirer.prompt<RegisterAnswers>([
            {
              type: "input",
              name: "name",
              message: "Enter name:",
              validate: (input: string) => input.trim() !== "" || "Name cannot be empty",
              when: () => !options.name,
              default: options.name,
            },
            {
              type: "input",
              name: "id",
              message: "Enter ID:",
              validate: (input: string) => input.trim() !== "" || "ID cannot be empty",
              when: () => !options.id,
              default: options.id,
            },
            {
              type: "input",
              name: "domainName",
              message: "Enter domain name:",
              validate: (input: string) => input.trim() !== "" || "Domain name cannot be empty",
              when: () => !options.domain,
              default: options.domain,
            },
            {
              type: "input",
              name: "validUntil",
              message: "Enter valid until timestamp (in seconds):",
              validate: (input: string) => {
                const num = parseInt(input);
                return !isNaN(num) && num > Date.now() / 1000 ? true : "Please enter a valid future timestamp";
              },
              when: () => !options.validUntil,
              default: options.validUntil,
            },
            {
              type: "input",
              name: "registrarSignature",
              message: "Enter registrar signature:",
              validate: (input: string) => input.trim() !== "" || "Signature cannot be empty",
              when: () => !options.signature,
              default: options.signature,
            },
            {
              type: "input",
              name: "referrerAddress",
              message: "Enter referrer address (optional):",
              default: options.referrer || zeroAddress,
              when: () => !options.referrer,
            },
            {
              type: "input",
              name: "referralCode",
              message: "Enter referral code (optional):",
              default: options.code || "0x",
              when: () => !options.code,
            },
            {
              type: "input",
              name: "wallet",
              message: "Enter wallet address:",
              default: options.wallet,
              when: () => !options.wallet,
            },
          ]);

          spinner.start("Registering name...");

          const record: Record = {
            name: stringToHex(answers.name || options.name, { size: 32 }),
            id: stringToHex(answers.id || options.id, { size: 32 }),
            domainName: stringToHex(answers.domainName || options.domain, { size: 32 }),
            validUntil: BigInt(answers.validUntil || options.validUntil),
            nonce: 0n,
            wallet: (answers.wallet || options.wallet) as Address,
          };

          const referrer: NameQuery | undefined =
            (answers.referrerAddress || options.referrer) !== zeroAddress
              ? {
                  name: "0x" as `0x${string}`,
                  id: "0x" as `0x${string}`,
                  wallet: (answers.referrerAddress || options.referrer) as Address,
                  domainName: stringToHex(answers.domainName || options.domain, { size: 32 }),
                  targetDomain: "0x" as `0x${string}`,
                }
              : undefined;

          const tx = await multipass.register({
            record,
            registrarSignature: (answers.registrarSignature || options.signature) as `0x${string}`,
            referrer,
            referralCode: (answers.referralCode || options.code) as `0x${string}`,
          });

          spinner.succeed("Name registered successfully!");
          console.log(chalk.green("Transaction hash:"), tx);
        } catch (error) {
          spinner.fail("Registration failed");
          console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command("renew")
      .description("Renew a record")
      .option("-n, --name <name>", "Name to renew")
      .option("-i, --id <id>", "ID to renew")
      .option("-d, --domain <domainName>", "Domain name")
      .option("-v, --valid-until <validUntil>", "Valid until timestamp (in seconds)")
      .option("-s, --signature <registrarSignature>", "Registrar signature")
      .option("-w, --wallet <address>", "Wallet address")
      .action(async (options) => {
        const spinner = ora("Initializing clients...").start();

        try {
          const publicClient = createPublic(options.rpc);
          const walletClient = await createWallet(options.rpc, options.key);
          const chainId = Number(await publicClient.getChainId());

          const multipass = new MultipassOwner({
            chainId,
            walletClient,
            publicClient,
          });

          spinner.stop();

          const answers = await inquirer.prompt<RenewAnswers>([
            {
              type: "input",
              name: "name",
              message: "Enter name:",
              validate: (input: string) => input.trim() !== "" || "Name cannot be empty",
              when: () => !options.name,
              default: options.name,
            },
            {
              type: "input",
              name: "id",
              message: "Enter ID:",
              validate: (input: string) => input.trim() !== "" || "ID cannot be empty",
              when: () => !options.id,
              default: options.id,
            },
            {
              type: "input",
              name: "domainName",
              message: "Enter domain name:",
              validate: (input: string) => input.trim() !== "" || "Domain name cannot be empty",
              when: () => !options.domain,
              default: options.domain,
            },
            {
              type: "input",
              name: "validUntil",
              message: "Enter valid until timestamp (in seconds):",
              validate: (input: string) => {
                const num = parseInt(input);
                return !isNaN(num) && num > Date.now() / 1000 ? true : "Please enter a valid future timestamp";
              },
              when: () => !options.validUntil,
              default: options.validUntil,
            },
            {
              type: "input",
              name: "registrarSignature",
              message: "Enter registrar signature:",
              validate: (input: string) => input.trim() !== "" || "Signature cannot be empty",
              when: () => !options.signature,
              default: options.signature,
            },
            {
              type: "input",
              name: "wallet",
              message: "Enter wallet address:",
              default: options.wallet,
              when: () => !options.wallet,
            },
          ]);

          spinner.start("Renewing record...");

          const query: NameQuery = {
            name: stringToHex(answers.name || options.name, { size: 32 }),
            id: stringToHex(answers.id || options.id, { size: 32 }),
            domainName: stringToHex(answers.domainName || options.domain, { size: 32 }),
            targetDomain: "0x" as `0x${string}`,
            wallet: zeroAddress,
          };

          const record: Record = {
            name: stringToHex(answers.name || options.name, { size: 32 }),
            id: stringToHex(answers.id || options.id, { size: 32 }),
            domainName: stringToHex(answers.domainName || options.domain, { size: 32 }),
            validUntil: BigInt(answers.validUntil || options.validUntil),
            nonce: 1n,
            wallet: (answers.wallet || options.wallet) as Address,
          };

          const tx = await multipass.renewRecord({
            query,
            record,
            registrarSignature: (answers.registrarSignature || options.signature) as `0x${string}`,
          });

          spinner.succeed("Record renewed successfully!");
          console.log(chalk.green("Transaction hash:"), tx);
        } catch (error) {
          spinner.fail("Renewal failed");
          console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
          process.exit(1);
        }
      })
  ) // Add to src/cli/commands/multipass/owner.ts

  .addCommand(
    new Command("events")
      .description("Query Multipass events")
      .addCommand(
        new Command("registrations")
          .description("Get all registration events")
          .option("-f, --from-block <block>", "Starting block number")
          .action(async (options) => {
            const spinner = ora("Initializing clients...").start();
            try {
              const publicClient = createPublic(options.rpc);
              const walletClient = await createWallet(options.rpc, options.key);
              const chainId = Number(await publicClient.getChainId());

              const multipass = new MultipassOwner({
                chainId,
                walletClient,
                publicClient,
              });

              spinner.text = "Fetching registration events...";
              const events = await multipass.getRegistrations(options.fromBlock ? BigInt(options.fromBlock) : 1n);

              spinner.succeed("Events retrieved successfully!");
              console.log("\nRegistration Events:");
              events.forEach((event, index) => {
                console.log(chalk.blue(`\nEvent #${index + 1}:`));
                console.log(chalk.green("Domain Name:"), event.domainName);
                console.log(chalk.green("Record:"));
                console.log("  Wallet:", event.record.wallet);
                console.log("  Name:", event.record.name);
                console.log("  ID:", event.record.id);
                console.log("  Nonce:", event.record.nonce.toString());
                console.log("  Valid Until:", new Date(Number(event.record.validUntil) * 1000).toLocaleString());
              });
            } catch (error) {
              spinner.fail("Failed to fetch events");
              console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
              process.exit(1);
            }
          })
      )
      .addCommand(
        new Command("renewals")
          .description("Get all renewal events")
          .option("-f, --from-block <block>", "Starting block number")
          .action(async (options) => {
            const spinner = ora("Initializing clients...").start();
            try {
              const publicClient = createPublic(options.rpc);
              const walletClient = await createWallet(options.rpc, options.key);
              const chainId = Number(await publicClient.getChainId());

              const multipass = new MultipassOwner({
                chainId,
                walletClient,
                publicClient,
              });

              spinner.text = "Fetching renewal events...";
              const events = await multipass.getRenewals(options.fromBlock ? BigInt(options.fromBlock) : 1n);

              spinner.succeed("Events retrieved successfully!");
              console.log("\nRenewal Events:");
              events.forEach((event, index) => {
                console.log(chalk.blue(`\nEvent #${index + 1}:`));
                console.log(chalk.green("Wallet:"), event.wallet);
                console.log(chalk.green("Domain Name:"), event.domainName);
                console.log(chalk.green("ID:"), event.id);
                console.log(chalk.green("Record:"));
                console.log("  Name:", event.record.name);
                console.log("  Nonce:", event.record.nonce.toString());
                console.log("  Valid Until:", new Date(Number(event.record.validUntil) * 1000).toLocaleString());
              });
            } catch (error) {
              spinner.fail("Failed to fetch events");
              console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
              process.exit(1);
            }
          })
      )
      .addCommand(
        new Command("referrals")
          .description("Get all referral events")
          .option("-f, --from-block <block>", "Starting block number")
          .action(async (options) => {
            const spinner = ora("Initializing clients...").start();
            try {
              const publicClient = createPublic(options.rpc);
              const walletClient = await createWallet(options.rpc, options.key);
              const chainId = Number(await publicClient.getChainId());

              const multipass = new MultipassOwner({
                chainId,
                walletClient,
                publicClient,
              });

              spinner.text = "Fetching referral events...";
              const events = await multipass.getReferrals(options.fromBlock ? BigInt(options.fromBlock) : 1n);

              spinner.succeed("Events retrieved successfully!");
              console.log("\nReferral Events:");
              events.forEach((event, index) => {
                console.log(chalk.blue(`\nEvent #${index + 1}:`));
                console.log(chalk.green("Domain Name:"), event.domainName);
                console.log(chalk.green("Referrer:"));
                console.log("  Wallet:", event.referrer.wallet);
                console.log("  Name:", event.referrer.name);
                console.log("  ID:", event.referrer.id);
                console.log(chalk.green("New Record:"));
                console.log("  Wallet:", event.newRecord.wallet);
                console.log("  Name:", event.newRecord.name);
                console.log("  ID:", event.newRecord.id);
                console.log("  Valid Until:", new Date(Number(event.newRecord.validUntil) * 1000).toLocaleString());
              });
            } catch (error) {
              spinner.fail("Failed to fetch events");
              console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`));
              process.exit(1);
            }
          })
      )
  );
