import "dotenv/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

const isProduction = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: isProduction
    ? {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }
    : {
        version: "0.8.28",
      },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    bscTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://bnb-testnet.api.onfinality.io/public",
      accounts: [configVariable("BSC_TESTNET_PRIVATE_KEY")],
    },
    bsc: {
      type: "http",
      chainType: "l1",
      url: "https://bsc-dataseed.binance.org/",
      accounts: [configVariable("BSC_PRIVATE_KEY")],
    },
  },
});
