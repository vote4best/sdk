import { gql } from "graphql-tag";

export const GET_TRANSFERS = gql`
  query GetTransfers($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    transfers(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      from
      to
      value
      timestamp
      blockNumber
      transactionHash
    }
  }
`;

export const GET_RECORDS = gql`
  query GetRecords($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    records(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      wallet
      name
      recordId
      nonce
      domainName
      validUntil
      timestamp
      blockNumber
      transactionHash
    }
  }
`;

export const GET_DOMAINS = gql`
  query GetDomains($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    domains(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      name
      isActive
      fee
      renewalFee
      referrerReward
      referralDiscount
      records {
        id
        wallet
        name
      }
      timestamp
      blockNumber
      transactionHash
    }
  }
`;

export const GET_DOMAIN_ACTIVITIES = gql`
  query GetDomainActivities($domainName: Bytes!, $first: Int!, $skip: Int!) {
    domainActivateds(first: $first, skip: $skip, where: { domainName: $domainName }) {
      id
      domainName
      timestamp
      blockNumber
      transactionHash
    }
    domainDeactivateds(first: $first, skip: $skip, where: { domainName: $domainName }) {
      id
      domainName
      timestamp
      blockNumber
      transactionHash
    }
    domainFeeChangeds(first: $first, skip: $skip, where: { domainName: $domainName }) {
      id
      domainName
      newFee
      timestamp
      blockNumber
      transactionHash
    }
    referralProgramChangeds(first: $first, skip: $skip, where: { domainName: $domainName }) {
      id
      domainName
      reward
      discount
      timestamp
      blockNumber
      transactionHash
    }
  }
`;

export const GET_ADMIN_CHANGES = gql`
  query GetAdminChanges($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    defaultAdminChanges(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      newDelay
      effectSchedule
      newAdmin
      acceptSchedule
      isCanceled
      timestamp
      blockNumber
      transactionHash
    }
  }
`;

export const GET_ROLE_CHANGES = gql`
  query GetRoleChanges($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    roleGranteds(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      role
      account
      sender
      timestamp
      blockNumber
      transactionHash
    }
    roleRevokeds(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      role
      account
      sender
      timestamp
      blockNumber
      transactionHash
    }
    roleAdminChangeds(first: $first, skip: $skip, orderBy: $orderBy, orderDirection: $orderDirection) {
      id
      role
      previousAdminRole
      newAdminRole
      timestamp
      blockNumber
      transactionHash
    }
  }
`;
