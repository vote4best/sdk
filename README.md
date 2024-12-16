# SDK

This is SDK for use with Rankify game. You can ease interaction with smart contracts.

## Prerequisites

Before setting up the local development environment, ensure you have the following installed:

1. **Node.js and pnpm**
   ```bash
   # Using homebrew
   brew install node
   npm install -g pnpm
   ```

2. **Foundry (for Anvil)**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

3. **tmux**
   ```bash
   # Using homebrew
   brew install tmux
   ```

## Local Development Setup

To set up your local development environment:

1. Create your environment file:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` to set your local repository paths.

2. Set the required environment variables:
   ```bash
   export RANKIFY_CONTRACTS_PATH="/path/to/rankify/contracts"
   export EDS_PATH="/path/to/eds"
   export MULTIPASS_PATH="/path/to/multipass"
   ```

3. Make the setup script executable:
   ```bash
   chmod +x scripts/setup-local-dev.sh
   ```

4. Run the setup script:
   ```bash
   source .env && ./scripts/setup-local-dev.sh
   ```

This will:
- Start a local Anvil development network in a tmux session (or use existing one if running)
- Install dependencies for all repositories
- Run local deployment scripts (`playbook/utils/deploy-to-local-anvil.sh`) in each repository
- Set up local pnpm links between packages

The script uses a fixed mnemonic for consistent addresses across runs.

### Managing Anvil

- View Anvil logs: `tmux attach -t anvil`
- Detach from logs: Press `Ctrl+B` then `D`
- Stop Anvil: `tmux kill-session -t anvil`
