export const CONTRACT_ADDRESS = "0xDac4321f549bbB57501117Aa98F1185F2e0dd165";
export const CONTRACT_ADDRESSES: { [key: number]: string } = {
  199: "0xCE134e4165c6398c52ccD1a1aF344207FA29C921", // mainnet
  1029: "0xDac4321f549bbB57501117Aa98F1185F2e0dd165", // Donau
};
export const getContractAddress = (chainId: number): string | undefined => {
  return CONTRACT_ADDRESSES[chainId];
};
