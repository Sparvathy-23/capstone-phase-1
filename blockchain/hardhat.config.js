require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { SEPOLIA_RPC_URL, AMOY_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, POLYGONSCAN_API_KEY } = process.env;

// Hardhat needs *some* 32-byte key to boot even if you only ever use
// the local in-memory network - this dummy key is never used for a
// real deployment, it just stops `require` from crashing when
// PRIVATE_KEY is blank in your local .env.
const DUMMY_KEY = "0x" + "11".repeat(32);

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Ethereum testnet - get a free RPC URL from Infura or Alchemy,
    // and free test ETH from a Sepolia faucet.
    sepolia: {
      url: SEPOLIA_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [DUMMY_KEY],
    },
    // Polygon's current public testnet (Mumbai was deprecated) -
    // get a free RPC URL from Alchemy/Infura and free test MATIC
    // from a Polygon Amoy faucet.
    amoy: {
      url: AMOY_RPC_URL || "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [DUMMY_KEY],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY || "",
      polygonAmoy: POLYGONSCAN_API_KEY || "",
    },
  },
};
