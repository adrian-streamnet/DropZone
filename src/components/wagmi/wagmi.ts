import { getDefaultConfig } from "@rainbow-me/rainbowkit";

const bittorrentchainTestnet = {
  id: 1029,
  name: "BitTorrent Chain Donau",
  nativeCurrency: {
    decimals: 18,
    name: "BitTorrent Chain Donau",
    symbol: "BTT",
  },
  rpcUrls: {
    default: { http: ["https://pre-rpc.bittorrentchain.io/"] },
  },
  blockExplorers: {
    default: { name: "bttc scan", url: "https://testscan.bittorrentchain.io/" },
  },
  testnet: true,
};

const bittorrentchain = {
  id: 199,
  name: "BitTorrent Chain Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "BitTorrent Chain Mainnet",
    symbol: "BTT",
  },
  rpcUrls: {
    default: { http: ["https://rpc.bt.io"] },
  },
  blockExplorers: {
    default: { name: "bttc scan", url: "https://bttcscan.com/" },
  },
  testnet: true,
};


export const config = getDefaultConfig({
  appName: "RainbowKit demo",
  projectId: "8a002f09d4fc6fba7c4cd6d06df5e19f",
  chains: [
    bittorrentchain,
    bittorrentchainTestnet,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === "true"
      ? [bittorrentchainTestnet]
      : []),
  ],
  ssr: true,
});
