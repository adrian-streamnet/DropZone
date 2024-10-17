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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <h1 className="text-2xl mb-6">Campaigns</h1>
      <div className="w-full max-w-4xl">
        {campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <div
              key={campaign._id}
              className="p-4 mb-4 border border-gray-700 rounded-lg bg-gray-800"
            >
              <h2 className="text-xl mb-2">{campaign.campaignAlias}</h2>
              <p>
                <strong>Owner:</strong> {campaign.owner}
              </p>
              <p>
                <strong>Merkle Root:</strong> {campaign.merkleRoot}
              </p>
              <p>
                <strong>Underlying Token:</strong> {campaign.underlyingToken}
              </p>
              <p>
                <strong>Deployed Contract:</strong> {campaign.deployedContract}
              </p>
              <p>
                <strong>Created At:</strong>{" "}
                {new Date(campaign.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Updated At:</strong>{" "}
                {new Date(campaign.updatedAt).toLocaleString()}
              </p>
              <button
                onClick={() =>
                  fundAirdrop(
                    campaign.deployedContract as Address,
                    campaign.underlyingToken as Address
                  )
                }
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Fund Airdrop
              </button>
            </div>
          ))
        ) : (
          <p>Loading campaigns...</p>
        )}
      </div>
    </div>
  );
};

export default Page;
