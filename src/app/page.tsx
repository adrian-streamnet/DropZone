"use client";
import React, { useState, useEffect } from "react";
import Blockies from "react-blockies";
import { CONTRACT_ADDRESS } from "@/app/constants";
import contractABI from "@/artifacts/DropZoneFactory.json";
import { initializeClient } from "@/app/utils/publicClient";
import { useAccount, useWriteContract } from "wagmi";

const client = initializeClient();

function Page() {
  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<any[]>([]);
  const [claimedItems, setClaimedItems] = useState<string[]>([]);

  useEffect(() => {
    const fetchClaimableData = async () => {
      try {
        if (!address) return;
        const response = await fetch(
          `/api/get-claimable-data?participant=${address}`
        );
        const data = await response.json();
        console.log(data);
        setClaimData(data); // Setting the claimable data
      } catch (error) {
        console.error("Error fetching claimable data:", error);
        setError("Error fetching claimable data");
      }
    };

    fetchClaimableData();
  }, [address]);

  const handleClaim = async (
    contractAddress: string,
    participantAddress: string
  ) => {
    if (!client || !address) {
      setError("Client or address is not initialized");
      return;
    }
    try {
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS, // Replace with the correct contract
        account: address,
        abi: contractABI,
        functionName: "createDropZone", // Adjust the function name if needed
        args: [contractAddress, participantAddress],
      });

      console.log(tx);
      setClaimedItems((prev) => [...prev, contractAddress]);
      alert("Claim successful!");
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Claim failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Claim Your Drops
        </h1>

        {/* Table of Claimable Data */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse bg-gray-700 rounded-lg shadow-lg mb-4">
            <thead>
              <tr className="bg-gray-600">
                <th className="p-3 text-left border-b border-gray-600">
                  AirDrop campaign
                </th>
                <th className="p-3 text-left border-b border-gray-600">
                  Amount
                </th>
                <th className="p-3 text-left border-b border-gray-600">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {claimData.length > 0 ? (
                claimData.map((item, index) => (
                  <tr key={index} className="border-b border-gray-600">
                    <td className="p-3 flex items-center">
                      <Blockies
                        seed={item.airDropAlias}
                        size={10}
                        scale={3}
                        className="mr-2 rounded-full"
                      />
                      {item.airDropAlias ? item.airDropAlias : "Drop Zone"}
                    </td>
                    <td className="p-3">
                      {Number(item.participant[0]?.amount) / 1e18} ETH
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          handleClaim(
                            item.deployedContract,
                            item.participant[0]?.participant
                          )
                        }
                        disabled={
                          claimedItems.includes(item.deployedContract) ||
                          item.participant[0]?.claimed
                        }
                        className={`bg-blue-500 text-white px-4 py-2 rounded ${
                          claimedItems.includes(item.deployedContract) ||
                          item.participant[0]?.claimed
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        {claimedItems.includes(item.deployedContract) ||
                        item.participant[0]?.claimed
                          ? "Claimed"
                          : "Claim"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3 text-center" colSpan={3}>
                    No claimable data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {error && <p className="text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
}

export default Page;
