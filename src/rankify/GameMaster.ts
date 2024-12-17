import { Address, WalletClient, PublicClient, keccak256, encodePacked, Hex } from "viem";
import { IRankifyInstanceAbi, RankifyDiamondInstanceAbi } from "../abis";
import InstanceBase from "./InstanceBase";

/**
 * GameMaster class for managing game state and cryptographic operations in Rankify
 * Extends InstanceBase to provide game master specific functionality
 * @public
 */
export class GameMaster extends InstanceBase {
  EIP712name: string;
  EIP712Version: string;
  walletClient: WalletClient;
  encryptionCallback: (data: string) => Promise<string>;
  decryptionCallback: (data: string) => Promise<string>;
  randomnessCallback: () => Promise<number>;
  turnSaltCallback: ({ gameId, turn }: { gameId: bigint; turn: bigint }) => Promise<Hex>;

  /**
   * Creates a new GameMaster instance
   * @param EIP712name - Name for EIP712 signing
   * @param EIP712Version - Version for EIP712 signing
   * @param instanceAddress - Address of the Rankify game instance
   * @param walletClient - Viem wallet client for transactions
   * @param publicClient - Viem public client for reading state
   * @param chainId - Chain ID of the network
   * @param encryptionCallback - Callback function for encrypting data
   * @param decryptionCallback - Callback function for decrypting data
   * @param randomnessCallback - Callback function for generating random numbers
   * @param turnSaltCallback - Callback function for generating turn salts
   */
  constructor({
    EIP712name,
    EIP712Version,
    instanceAddress,
    walletClient,
    publicClient,
    chainId,
    encryptionCallback,
    decryptionCallback,
    randomnessCallback,
    turnSaltCallback,
  }: {
    EIP712name: string;
    EIP712Version: string;
    instanceAddress: Address;
    walletClient: WalletClient;
    publicClient: PublicClient;
    chainId: number;
    encryptionCallback: (data: string) => Promise<string>;
    decryptionCallback: (data: string) => Promise<string>;
    randomnessCallback: () => Promise<number>;
    turnSaltCallback: ({ gameId, turn }: { gameId: bigint; turn: bigint }) => Promise<Hex>;
  }) {
    super({ publicClient, chainId, instanceAddress });
    this.EIP712Version = EIP712Version;
    this.EIP712name = EIP712name;
    this.walletClient = walletClient;
    this.encryptionCallback = encryptionCallback;
    this.decryptionCallback = decryptionCallback;
    this.randomnessCallback = randomnessCallback;
    this.turnSaltCallback = turnSaltCallback;
  }

  /**
   * Decrypts proposals for a specific game turn
   * @param gameId - ID of the game
   * @param turn - Turn number
   * @param proposer - Optional proposer address to filter proposals
   * @returns Array of decrypted proposals with proposer addresses
   */
  decryptProposals = async (gameId: bigint, turn: bigint, proposer?: Address) => {
    const evts = await this.publicClient.getContractEvents({
      abi: RankifyDiamondInstanceAbi,
      address: this.instanceAddress,
      eventName: "ProposalSubmitted",
      args: { gameId: gameId, turn: turn, proposer: proposer },
    });

    const proposals = await Promise.all(
      evts.map(async (log) => ({
        proposer: log.args.proposer,
        proposal: await this.decryptionCallback(log.args.proposalEncryptedByGM),
      }))
    );

    return proposals;
  };

  /**
   * Shuffles an array using cryptographically secure randomness
   * @param array - Array to shuffle
   * @returns Shuffled array
   */
  shuffle = async <T>(array: T[]): Promise<T[]> => {
    const randomness = await this.randomnessCallback();
    let currentIndex = array.length,
      randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex > 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(randomness * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
  };

  /**
   * Generates a salt for a specific game turn
   * @param gameId - ID of the game
   * @param turn - Turn number
   * @returns Generated salt as Hex
   */
  getTurnSalt = async ({ gameId, turn }: { gameId: bigint; turn: bigint }) => {
    return this.turnSaltCallback({ gameId, turn }).then((salt) =>
      keccak256(encodePacked(["bytes32", "uint256", "uint256"], [salt, gameId, turn]))
    );
  };

  /**
   * Generates a salt for a specific player in a game turn
   * @param gameId - ID of the game
   * @param turn - Turn number
   * @param proposer - Address of the proposer
   * @returns Generated salt as Hex
   */
  getTurnPlayersSalt = async ({ gameId, turn, proposer }: { gameId: bigint; turn: bigint; proposer: Address }) => {
    return this.getTurnSalt({ gameId, turn }).then((salt) =>
      keccak256(encodePacked(["address", "bytes32"], [proposer, salt]))
    );
  };

  /**
   * Finds the index of a player's ongoing proposal
   * @param gameId - ID of the game
   * @param player - Address of the player
   * @returns Index of the player's proposal, -1 if not found
   */
  findPlayerOngoingProposalIndex = async (gameId: bigint, player: Address) => {
    const ongoingProposals = await this.getOngoingProposals(gameId);
    const currentTurn = await this.publicClient.readContract({
      address: this.instanceAddress,
      abi: IRankifyInstanceAbi,
      functionName: "getTurn",
      args: [gameId],
    });
    if (currentTurn == 0n) {
      console.error("No proposals in turn 0");
      return -1;
    }

    const turn = currentTurn - 1n;
    const playersProposal = await this.decryptProposals(gameId, turn, player).then((ps) =>
      ps.length > 0 ? ps[0].proposal : undefined
    );
    console.log(
      "finding players ongoing proposal",
      playersProposal,
      ongoingProposals?.findIndex((p) => p === playersProposal)
    );
    return playersProposal ? ongoingProposals.findIndex((p) => p === playersProposal) : -1;
  };

  /**
   * Submits a vote for proposals
   * @param gameId - ID of the game
   * @param vote - Array of vote values
   * @param voter - Address of the voter
   * @returns Transaction hash
   */
  submitVote = async (gameId: bigint, vote: bigint[], voter: Address) => {
    if (!gameId) throw new Error("No gameId");
    if (!vote) throw new Error("No votesHidden");
    if (!voter) throw new Error("No voter");
    const proposerIdx = await this.findPlayerOngoingProposalIndex(gameId, voter);
    if (proposerIdx != -1 && vote[proposerIdx] !== 0n) throw new Error("You cannot vote for your own proposal");
    const votesHidden = await this.encryptionCallback(JSON.stringify(vote));
    if (!this.walletClient.account.address) throw new Error("No account address found");
    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.instanceAddress,
      abi: RankifyDiamondInstanceAbi,
      functionName: "submitVote",
      args: [gameId, votesHidden, voter],
    });
    return this.walletClient.writeContract(request);
  };

  /**
   * Gets the hidden proposer hash for a specific game turn
   * @param gameId - ID of the game
   * @param turn - Turn number
   * @param proposer - Address of the proposer
   * @returns Hidden proposer hash
   */
  proposerHidden = ({ gameId, turn, proposer }: { gameId: bigint; turn: bigint; proposer: Address }) => {
    return this.getTurnPlayersSalt({ gameId, turn, proposer }).then((salt) =>
      keccak256(encodePacked(["address", "bytes32"], [proposer, salt]))
    );
  };

  /**
   * Submits a proposal to the game
   * @param gameId - ID of the game
   * @param commitmentHash - Hash of the proposal commitment
   * @param encryptedProposal - Encrypted proposal data
   * @param proposer - Address of the proposer
   * @returns Transaction hash
   */
  submitProposal = async ({
    gameId,
    commitmentHash,
    proposal,
    proposer,
  }: {
    gameId: bigint;
    commitmentHash: Hex;
    proposal: string;
    proposer: Address;
  }) => {
    // let proposalData: GetAbiItemParameters<typeof RankifyDiamondInstanceAbi, "submitProposal">["args"];
    // proposalData[0].
    const encryptedProposal = await this.encryptionCallback(proposal);
    console.log("submitting proposal tx..", gameId, commitmentHash, proposal, proposer);

    const { request } = await this.publicClient.simulateContract({
      account: this.walletClient.account,
      address: this.instanceAddress,
      abi: RankifyDiamondInstanceAbi,
      functionName: "submitProposal",
      args: [{ gameId, commitmentHash, encryptedProposal, proposer }],
    });
    return this.walletClient.writeContract(request);
  };

  /**
   * Decrypts votes for a specific game turn
   * @param gameId - ID of the game
   * @param turn - Turn number
   * @returns Array of decrypted votes with player addresses
   */
  decryptTurnVotes = async (gameId: bigint, turn: bigint) => {
    const evts = await this.publicClient.getContractEvents({
      address: this.instanceAddress,
      abi: RankifyDiamondInstanceAbi,
      eventName: "VoteSubmitted",
      args: { gameId, turn },
    });

    const votes = Promise.all(
      evts.map(async (event) => {
        const decryptedVote = await this.decryptionCallback(event.args.votesHidden);
        return {
          player: event.args.player,
          votes: JSON.parse(decryptedVote) as bigint[],
        };
      })
    );

    return votes;
  };

  /**
   * Decrypts all votes for the current game turn
   * @param gameId - ID of the game
   * @returns Array of decrypted votes with player addresses
   */
  decryptVotes = async (gameId: bigint) => {
    const currentTurn = await this.publicClient.readContract({
      address: this.instanceAddress,
      abi: IRankifyInstanceAbi,
      functionName: "getTurn",
      args: [gameId],
    });
    if (currentTurn == 0n) {
      console.error("No proposals in turn 0");
      return -1;
    }
    return this.decryptTurnVotes(gameId, currentTurn);
  };

  /**
   * Checks if the current turn can be ended
   * @param gameId - ID of the game
   * @returns Boolean indicating if turn can be ended
   */
  canEndTurn = async (gameId: bigint) => {
    return this.publicClient.readContract({
      address: this.instanceAddress,
      abi: IRankifyInstanceAbi,
      functionName: "canEndTurn",
      args: [gameId],
    });
  };

  /**
   * Gets the current turn number
   * @param gameId - ID of the game
   * @returns Current turn number
   */
  currentTurn = async (gameId: bigint) => {
    return this.publicClient.readContract({
      address: this.instanceAddress,
      abi: IRankifyInstanceAbi,
      functionName: "getTurn",
      args: [gameId],
    });
  };

  /**
   * Gets the list of players in the game
   * @param gameId - ID of the game
   * @returns Array of player addresses
   */
  getPlayers = async (gameId: bigint) => {
    return this.publicClient.readContract({
      address: this.instanceAddress,
      abi: IRankifyInstanceAbi,
      functionName: "getPlayers",
      args: [gameId],
    });
  };

  /**
   * Ends the current turn and processes votes
   * @param gameId - ID of the game
   * @returns Transaction hash
   */
  endTurn = async (gameId: bigint) => {
    const turn = await this.publicClient.readContract({
      address: this.instanceAddress,
      abi: RankifyDiamondInstanceAbi,
      functionName: "getTurn",
      args: [gameId],
    });

    const players = await this.publicClient.readContract({
      address: this.instanceAddress,
      abi: RankifyDiamondInstanceAbi,
      functionName: "getPlayers",
      args: [gameId],
    });

    const oldProposals: {
      proposer: Address;
      proposal: string;
    }[] = [];
    const proposerIndices: bigint[] = [];
    let votes: { player: Address; votes: bigint[] }[] = [];
    //Proposals sequence is directly corresponding to proposers sequence
    if (turn != 1n) {
      // const filter = this.contract.filters.TurnEnded(gameId, turn - 1);
      const endedEvents = await this.publicClient.getContractEvents({
        address: this.instanceAddress,
        abi: RankifyDiamondInstanceAbi,
        eventName: "TurnEnded",
        args: { gameId, turn: turn - 1n },
      });
      const evt = endedEvents[0];
      if (endedEvents.length > 1) throw new Error("Multiple turns ended");
      const args = evt.args;
      const decryptedProposals = await this.decryptProposals(gameId, turn - 1n);
      args.newProposals.forEach((proposal, idx) => {
        oldProposals[idx] = {
          proposer: decryptedProposals.find((p) => p.proposal === proposal).proposer,
          proposal: proposal,
        };
      });
      votes = await this.decryptTurnVotes(gameId, turn).then((voteSubmissions) => {
        const orderedVotes: { player: Address; votes: bigint[] }[] = [];
        console.log("votes", voteSubmissions);
        players.forEach((player, playerIdx) => {
          const vote = voteSubmissions.find((v) => v.player === player);
          if (vote) orderedVotes[playerIdx] = vote;
          else
            orderedVotes[playerIdx] = {
              player,
              votes: new Array(players.length).fill(0n) as bigint[],
            };
        });
        return orderedVotes;
      });
    }

    const newProposals = await this.decryptProposals(gameId, turn);
    players.forEach((player) => {
      let proposerIdx = oldProposals.findIndex((p) => player === p.proposer);
      if (proposerIdx === -1) proposerIdx = players.length; //Did not propose
      proposerIndices.push(BigInt(proposerIdx));
    });
    const tableData = players.map((player, idx) => ({
      player,
      proposerIndex: proposerIndices[idx],
      proposer: oldProposals[Number(proposerIndices[idx])].proposer,
    }));
    console.table(tableData);
    const shuffled = await this.shuffle(newProposals.map((x) => x.proposal));
    console.log(votes.map((v) => v.votes));

    const { request } = await this.publicClient.simulateContract({
      abi: RankifyDiamondInstanceAbi,
      account: this.walletClient.account,
      address: this.instanceAddress,
      functionName: "endTurn",
      args: [gameId, votes.map((v) => v.votes), shuffled, proposerIndices],
    });
    return this.walletClient.writeContract(request);
  };
}
