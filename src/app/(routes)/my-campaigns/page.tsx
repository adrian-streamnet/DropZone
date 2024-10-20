"use client";

import React, { useEffect, useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import contractABI from "@/artifacts/DropZone.json";
import ERC20ABI from "@/artifacts/ERC20.json";
import { Address, getContract } from "viem";
import { initializeClient } from "@/app/utils/publicClient";
import toast, { Toaster } from "react-hot-toast";
import Loader from "@/components/Loader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faKey,
  faCoins,
  faFileContract,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";

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
        setCampaigns(data?.enrichedCampaigns); // Set the fetched campaigns
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
  const truncateAddress = (address: string) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  };

  const renderSkeletons = () => (
    <>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="p-6 bg-gray-800 rounded-3xl shadow-lg animate-pulse"
        >
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-gray-700 rounded w-full"></div>
        </div>
      ))}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-900 text-white p-8">
      <h1 className="text-5xl font-extrabold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
        Campaigns
      </h1>
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loadingCampaigns ? (
          renderSkeletons()
        ) : campaigns?.length > 0 ? (
          campaigns.map((campaign, index) => {
            return (
              <div
                key={campaign._id}
                className="p-8 bg-gray-800 rounded-3xl shadow-lg transition-transform transform hover:scale-105 hover:shadow-2xl hover:bg-gray-700 overflow-hidden"
              >
                <h2 className="text-2xl font-bold text-gray-100 mb-4 text-center">
                  {campaign.campaignAlias}
                </h2>
                <div className="text-sm text-gray-400 space-y-3 mb-6">
                  <p>
                    <FontAwesomeIcon
                      icon={faUser}
                      className="mr-2 text-blue-500"
                    />
                    <strong className="text-gray-300">Owner:</strong>{" "}
                    {truncateAddress(campaign.owner)}
                  </p>
                  <p>
                    <FontAwesomeIcon
                      icon={faKey}
                      className="mr-2 text-green-500"
                    />
                    <strong className="text-gray-300">Merkle Root:</strong>{" "}
                    <span className="block break-all">
                      {campaign.merkleRoot}
                    </span>
                  </p>
                  <p>
                    <FontAwesomeIcon
                      icon={faCoins}
                      className="mr-2 text-yellow-500"
                    />
                    <strong className="text-gray-300">Underlying Token:</strong>{" "}
                    {truncateAddress(campaign.underlyingToken)}
                  </p>
                  <p>
                    <FontAwesomeIcon
                      icon={faFileContract}
                      className="mr-2 text-purple-500"
                    />
                    <strong className="text-gray-300">
                      Deployed Contract:
                    </strong>{" "}
                    {truncateAddress(campaign.deployedContract)}
                  </p>
                  <p>
                    <FontAwesomeIcon
                      icon={faCalendarAlt}
                      className="mr-2 text-red-500"
                    />
                    <strong className="text-gray-300">Created At:</strong>{" "}
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
                  className={`w-full bg-gradient-to-r from-blue-500 to-green-400 text-gray-100 font-medium py-2 px-4 rounded-2xl transition-all shadow ${
                    loadingAirdropIndex === index
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:from-blue-600 hover:to-green-500 hover:bg-blue-700 hover:text-white"
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
          <p className="text-gray-400 text-left">
            No campaigns found. Looks like you haven't created any airdrop
            campaigns yet!
            <br />
            <a
              href="/create-campaign" // Adjust this link based on your routing
              className="text-blue-500 font-semibold hover:underline cursor-pointer"
            >
              Go to the Create Campaign
            </a>{" "}
            to get started.
          </p>
        )}
      </div>
    </div>
  );
};

export default Page;
