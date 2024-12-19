/**
 * Interface representing the contract addresses for a MAO instance
 * @public
 */
export interface MAOInstances {
  /** Address of the governance token contract */
  govToken: string;
  /** Address of the governance token access manager contract */
  govTokenAccessManager: string;
  /** Address of the ACID instance contract */
  ACIDInstance: string;
  /** Address of the ACID access manager contract */
  ACIDAccessManager: string;
  /** Address of the rank token contract */
  rankToken: string;
}

/**
 * Parse an array of contract addresses into a MAOInstances object
 * @param instances - Array of contract addresses in the order they were deployed
 * @returns MAOInstances object with named contract addresses
 */
export const parseInstantiated = (instances: string[]): MAOInstances => {
  return {
    govToken: instances[0],
    govTokenAccessManager: instances[1],
    ACIDInstance: instances[2],
    ACIDAccessManager: instances[10],
    rankToken: instances[11],
  };
};
