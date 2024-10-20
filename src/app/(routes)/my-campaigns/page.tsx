"use client";

import React, { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import contractABI from "@/artifacts/DropZone.json";
import ERC20ABI from "@/artifacts/ERC20.json";
import { Address, getContract } from "viem";
import { initializeClient } from "@/app/utils/publicClient";
import toast, { Toaster } from "react-hot-toast";
import Loader from "@/components/Loader";

const client = initializeClient();

// Define the campaign type for better TypeScript support
interface Campaign {
  _id: string;
  owner: string;
  merkleRoot: string;
  campaignAlias: string;
  underlyingToken: string;
  deployedContract: string;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
}

const Page: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loadingCampaigns, setLoadingCampaigns] = useState<boolean>(false); // Loading state for campaigns
  const [loadingAirdropIndex, setLoadingAirdropIndex] = useState<number | null>(
    null
  ); // Track which campaign is currently loading

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!address) return; // If the wallet is not connected, don't fetch
      setLoadingCampaigns(true); // Set loading to true before fetching
      try {
        const response = await fetch(
          `/api/get-campaigns/?ownerAddress=${address}`
        );
        const data = await response.json();
        console.log("Data", data.enrichedCampaigns);
        setCampaigns(data.enrichedCampaigns); // Set the fetched campaigns
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      } finally {
        setLoadingCampaigns(false); // Set loading to false after fetching
      }
    };

    if (isConnected) {
      fetchCampaigns();
    }
  }, [address, isConnected]);

  const fundAirdrop = async (
    deployedContract: Address,
    underlyingToken: Address,
    totalAmount: string, // Accept totalAmount as a parameter
    index: number // Pass the index to identify which campaign is loading
  ) => {
    console.log(deployedContract, underlyingToken);
    try {
      if (!client) {
        return;
      }
      const contract = getContract({
        address: underlyingToken,
        abi: ERC20ABI.abi,
        client: client,
      });

      // Get the computed address from the contract
      const allowance = await contract.read.allowance([
        address,
        deployedContract,
      ]);
      const balance = await contract.read.balanceOf([address]);
      console.log(balance);
      if ((balance as bigint) <= BigInt(totalAmount)) {
        alert("Insufficient balance");
        return;
      }
      const contractBalance = await contract.read.balanceOf([deployedContract]);
      if ((contractBalance as bigint) >= BigInt(totalAmount)) {
        alert("Contract has enough balance!");
        return;
      }
      console.log("Allowance: ", allowance);
      if ((allowance as number) < BigInt(totalAmount)) {
        const approveTx = await writeContractAsync({
          address: underlyingToken,
          account: address,
          abi: ERC20ABI.abi,
          functionName: "approve",
          args: [deployedContract, BigInt(totalAmount)],
        });
        console.log(approveTx);
        const approveReceipt = await client?.waitForTransactionReceipt({
          hash: approveTx,
        });
        console.log("approved:", approveReceipt);
      }

      const fundTx = await writeContractAsync({
        address: deployedContract,
        account: address,
        abi: contractABI.abi,
        functionName: "fundAirdrop",
        args: [BigInt(totalAmount), address],
      });
      const fundReceipt = await client?.waitForTransactionReceipt({
        hash: fundTx,
      });
      console.log("funded:", fundReceipt);
      toast.success("Contract funded successfully");
    } catch (error) {
      console.log(error);
    } finally {
      setLoadingAirdropIndex(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
      <Toaster />
      <h1 className="text-3xl font-bold mb-8">Campaigns</h1>
      <div className="w-full max-w-6xl">
        {loadingCampaigns ? (
          <p className="text-gray-400 text-center">Loading campaigns...</p>
        ) : campaigns.length > 0 ? (
          campaigns.map((campaign, index) => {
            return (
              <div
                key={campaign._id}
                className="p-6 mb-6 border border-gray-700 rounded-lg bg-gray-800 shadow-lg transform transition-transform hover:scale-102"
              >
                <h2 className="text-2xl font-semibold text-blue-400 mb-3">
                  {campaign.campaignAlias}
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <p className="text-sm">
                    <strong className="text-gray-400">Owner:</strong>{" "}
                    {campaign.owner}
                  </p>
                  <p className="text-sm col-span-2">
                    <strong className="text-gray-400">Merkle Root:</strong>
                    <span className="block break-all">
                      {campaign.merkleRoot}
                    </span>
                  </p>
                  <p className="text-sm">
                    <strong className="text-gray-400">Underlying Token:</strong>
                    {campaign.underlyingToken}
                  </p>
                  <p className="text-sm">
                    <strong className="text-gray-400">
                      Deployed Contract:
                    </strong>
                    {campaign.deployedContract}
                  </p>
                  <p className="text-sm col-span-2">
                    <strong className="text-gray-400">Created At:</strong>
                    {new Date(campaign.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    setLoadingAirdropIndex(index); // Set loading for the clicked campaign
                    await fundAirdrop(
                      campaign.deployedContract as Address,
                      campaign.underlyingToken as Address,
                      campaign.totalAmount as string,
                      index
                    );
                  }}
                  className={`mt-4 w-full bg-gradient-to-r from-blue-500 to-green-400 text-white px-6 py-3 rounded-lg shadow transition-all ${
                    loadingAirdropIndex === index
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:from-blue-600 hover:to-green-500"
                  }`}
                  disabled={loadingAirdropIndex === index} // Disable the button while loading
                >
                  {loadingAirdropIndex === index ? (
                    <div className="flex items-center justify-center w-full">
                      <Loader size={20} className="mr-2" />
                    </div>
                  ) : (
                    "Fund Airdrop"
                  )}
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 text-center">No campaigns found.</p>
        )}
      </div>
    </div>
  );
};

export default Page;
