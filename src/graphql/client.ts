import { createClient } from "graphql-request";
import type { Variables } from "graphql-request";
import {
  GET_TRANSFERS,
  GET_RECORDS,
  GET_DOMAINS,
  GET_DOMAIN_ACTIVITIES,
  GET_ADMIN_CHANGES,
  GET_ROLE_CHANGES,
} from "./operations";

export type SubgraphConfig = {
  url: string;
  headers?: Record<string, string>;
};

export class SubgraphClient {
  private client: ReturnType<typeof createClient>;

  constructor(config: SubgraphConfig) {
    this.client = createClient({
      url: config.url,
      headers: config.headers,
    });
  }

  async getTransfers(variables: Variables) {
    return this.client.request(GET_TRANSFERS, variables);
  }

  async getRecords(variables: Variables) {
    return this.client.request(GET_RECORDS, variables);
  }

  async getDomains(variables: Variables) {
    return this.client.request(GET_DOMAINS, variables);
  }

  async getDomainActivities(variables: { domainName: string; first: number; skip: number }) {
    return this.client.request(GET_DOMAIN_ACTIVITIES, variables);
  }

  async getAdminChanges(variables: Variables) {
    return this.client.request(GET_ADMIN_CHANGES, variables);
  }

  async getRoleChanges(variables: Variables) {
    return this.client.request(GET_ROLE_CHANGES, variables);
  }

  // Helper method to get all domain-related information
  async getDomainDetails(domainName: string) {
    const [domainInfo, activities] = await Promise.all([
      this.getDomains({
        first: 1,
        skip: 0,
        where: { name: domainName },
      }),
      this.getDomainActivities({
        domainName,
        first: 100,
        skip: 0,
      }),
    ]);

    return {
      ...domainInfo.domains[0],
      activities,
    };
  }
}
