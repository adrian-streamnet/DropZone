"use client";

import React, { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import contractABI from "@/artifacts/DropZone.json";
import ERC20ABI from "@/artifacts/ERC20.json";
import { Address, getContract } from "viem";
import { initializeClient } from "@/app/utils/publicClient";

const client = initializeClient();

// Define the campaign type for better TypeScript support
interface Campaign {
  _id: string;
  owner: string;
  merkleRoot: string;
  campaignAlias: string;
  underlyingToken: string;
  deployedContract: string;
  createdAt: string;
  updatedAt: string;
}

const Page: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!address) return; // If the wallet is not connected, don't fetch
      try {
        const response = await fetch(
          `http://localhost:3000/api/get-campaigns/?ownerAddress=${address}`
        );
        const data = await response.json();
        setCampaigns(data.campaigns); // Set the fetched campaigns
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      }
    };

    if (isConnected) {
      fetchCampaigns();
    }
  }, [address, isConnected]);

  const fundAirdrop = async (
    deployedContract: Address,
    underlyingToken: Address
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
      if ((balance as bigint) <= 1000000) {
        alert("balance karwao pehla");
        return;
      }
      console.log("Allowance: ", allowance);
      if ((allowance as number) < 1000000) {
        const approveTx = await writeContractAsync({
          address: underlyingToken,
          account: address,
          abi: ERC20ABI.abi,
          functionName: "approve",
          args: [deployedContract, 1000000],
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
        args: [1000000, address],
      });
      const fundReceipt = await client?.waitForTransactionReceipt({
        hash: fundTx,
      });
      console.log("funded:", fundReceipt);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-8">Campaigns</h1>
      <div className="w-full max-w-6xl">
        {campaigns.length > 0 ? (
          campaigns.map((campaign) => (
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
                  <span className="block break-all">{campaign.merkleRoot}</span>
                </p>
                <p className="text-sm">
                  <strong className="text-gray-400">Underlying Token:</strong>
                  {campaign.underlyingToken}
                </p>
                <p className="text-sm">
                  <strong className="text-gray-400">Deployed Contract:</strong>
                  {campaign.deployedContract}
                </p>
                <p className="text-sm col-span-2">
                  <strong className="text-gray-400">Created At:</strong>
                  {new Date(campaign.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() =>
                  fundAirdrop(
                    campaign.deployedContract as Address,
                    campaign.underlyingToken as Address
                  )
                }
                className="mt-4 w-full bg-gradient-to-r from-blue-500 to-green-400 text-white px-6 py-3 rounded-lg shadow hover:from-blue-600 hover:to-green-500 transition-all"
              >
                Fund Airdrop
              </button>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center">Loading campaigns...</p>
        )}
      </div>
    </div>
  );
};

export default Page;
