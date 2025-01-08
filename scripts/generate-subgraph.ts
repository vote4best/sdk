import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import type { AbiItem } from "viem";

type ContractConfig = {
  name: string;
  abiPath: string;
  startBlock: number;
};

const CONTRACTS: ContractConfig[] = [
  { name: "Rankify", abiPath: "../src/abis/Rankify.ts", startBlock: 0 },
  { name: "Multipass", abiPath: "../src/abis/Multipass.ts", startBlock: 0 },
  { name: "SimpleAccessManager", abiPath: "../src/abis/SimpleAccessManager.ts", startBlock: 0 },
  { name: "DAODistributor", abiPath: "../src/abis/DAODistributor.ts", startBlock: 0 },
  { name: "CodeIndex", abiPath: "../src/abis/CodeIndex.ts", startBlock: 0 },
];

function generateSchema(events: Record<string, AbiItem[]>): string {
  let schema = "";

  for (const [contractName, contractEvents] of Object.entries(events)) {
    for (const event of contractEvents) {
      if (!event.name) continue;

      schema += `type ${event.name} @entity {\n`;
      schema += "  id: ID!\n";

      // Add event parameters
      for (const input of event.inputs || []) {
        const fieldName = input.name;
        let fieldType = "String";

        // Map Solidity types to GraphQL types
        if (input.type.includes("uint") || input.type.includes("int")) {
          fieldType = "BigInt";
        } else if (input.type === "address" || input.type === "bytes32" || input.type.includes("bytes")) {
          fieldType = "Bytes";
        } else if (input.type === "bool") {
          fieldType = "Boolean";
        }

        schema += `  ${fieldName}: ${fieldType}${input.indexed ? "!" : ""}\n`;
      }

      // Add common fields
      schema += "  timestamp: BigInt!\n";
      schema += "  blockNumber: BigInt!\n";
      schema += "  transactionHash: Bytes!\n";
      schema += "}\n\n";
    }
  }

  return schema;
}

function generateSubgraphYaml(events: Record<string, AbiItem[]>): string {
  let yaml = `specVersion: 0.0.5
description: Peeramid SDK Subgraph
schema:
  file: ./schema.graphql
dataSources:\n`;

  for (const [contractName, contractEvents] of Object.entries(events)) {
    const contract = CONTRACTS.find((c) => c.name === contractName);
    if (!contract) continue;

    yaml += `  - kind: ethereum/contract
    name: ${contractName}
    network: anvil
    source:
      abi: ${contractName}
      startBlock: ${contract.startBlock}
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:\n`;

    // Add entities
    for (const event of contractEvents) {
      if (event.name) {
        yaml += `        - ${event.name}\n`;
      }
    }

    yaml += `      abis:
        - name: ${contractName}
          file: ${contract.abiPath}
      eventHandlers:\n`;

    // Add event handlers
    for (const event of contractEvents) {
      if (!event.name) continue;

      const params = event.inputs?.map((input) => `${input.indexed ? "indexed " : ""}${input.type}`).join(",");

      yaml += `        - event: ${event.name}(${params})
          handler: handle${event.name}\n`;
    }

    yaml += `      file: ./src/mappings/${contractName.toLowerCase()}.ts\n\n`;
  }

  return yaml;
}

function generateOperations(events: Record<string, AbiItem[]>): string {
  let operations = `import { gql } from 'graphql-tag';\n\n`;

  for (const [contractName, contractEvents] of Object.entries(events)) {
    for (const event of contractEvents) {
      if (!event.name) continue;

      const queryName = `GET_${event.name.toUpperCase()}_EVENTS`;
      operations += `export const ${queryName} = gql\`
  query ${event.name}Events($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    ${event.name.toLowerCase()}s(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
${event.inputs?.map((input) => `      ${input.name}`).join("\n")}
      timestamp
      blockNumber
      transactionHash
    }
  }
\`;\n\n`;
    }
  }

  return operations;
}

function generateClient(events: Record<string, AbiItem[]>): string {
  let client = `import { createClient } from 'graphql-request';
import type { Variables } from 'graphql-request';\n\n`;

  // Import all operations
  client += "import {\n";
  for (const [contractName, contractEvents] of Object.entries(events)) {
    for (const event of contractEvents) {
      if (!event.name) continue;
      client += `  GET_${event.name.toUpperCase()}_EVENTS,\n`;
    }
  }
  client += "} from './operations';\n\n";

  client += `export type SubgraphConfig = {
  url: string;
  headers?: Record<string, string>;
};\n\n`;

  client += `export class SubgraphClient {
  private client: ReturnType<typeof createClient>;

  constructor(config: SubgraphConfig) {
    this.client = createClient({
      url: config.url,
      headers: config.headers
    });
  }\n\n`;

  // Generate methods for each event type
  for (const [contractName, contractEvents] of Object.entries(events)) {
    for (const event of contractEvents) {
      if (!event.name) continue;

      const methodName = `get${event.name}Events`;
      client += `  async ${methodName}(variables: Variables) {
    return this.client.request(GET_${event.name.toUpperCase()}_EVENTS, variables);
  }\n\n`;
    }
  }

  client += "}\n";
  return client;
}

async function main() {
  const events: Record<string, AbiItem[]> = {};

  // Read ABIs and collect events
  for (const contract of CONTRACTS) {
    const abiPath = join(__dirname, contract.abiPath);
    const abiContent = readFileSync(abiPath, "utf-8");
    const abi = eval(abiContent.replace("export default", "module.exports ="));
    events[contract.name] = abi.filter((item: AbiItem) => item.type === "event");
  }

  // Create output directories
  mkdirSync("./subgraph/src/mappings", { recursive: true });
  mkdirSync("./src/graphql", { recursive: true });

  // Generate files
  writeFileSync("./subgraph/schema.graphql", generateSchema(events));
  writeFileSync("./subgraph/subgraph.yaml", generateSubgraphYaml(events));
  writeFileSync("./src/graphql/operations.ts", generateOperations(events));
  writeFileSync("./src/graphql/client.ts", generateClient(events));
}

main().catch(console.error);
