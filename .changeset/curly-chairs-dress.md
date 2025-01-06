---
"@peeramid-labs/sdk": major
---

Added CLI interface for interacting with Peeramid contracts, providing commands for managing distributions, fellowships, and instances. Enhanced distribution management with named distributions and CodeIndex integration.

BREAKING CHANGES:
- Changed DistributorClient.getInstances return type to include version and instance metadata
- Modified RankTokenClient.getMetadata to require IPFS gateway parameter
- Moved parseInstantiated utility from types to utils package
- Updated distributor contract interface to DAODistributor
