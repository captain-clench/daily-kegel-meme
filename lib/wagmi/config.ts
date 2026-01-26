import { http, createConfig } from "wagmi";
import { bsc, bscTestnet, hardhat } from "wagmi/chains";

export const config = createConfig({
  chains: [bsc, bscTestnet, hardhat],
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http('https://bnb-testnet.api.onfinality.io/public'),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
});

// active chain is bsc testnet when DEV env
export const activeChain = process.env.NODE_ENV === "development" ? bscTestnet : bsc;

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
