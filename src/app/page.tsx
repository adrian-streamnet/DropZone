"use client";
import React, { useState } from "react";
import Blockies from "react-blockies";
import { CONTRACT_ADDRESS } from "@/app/constants";
import contractABI from "@/app/DropZoneFactory.json";
import { initializeClient } from "@/app/utils/publicClient";
import { useAccount, useWriteContract } from "wagmi";

const client = initializeClient();

function Page() {
  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);

  // State to track if the address has claimed
  const [claimed, setClaimed] = useState(false);

  const handleButtonClick = async () => {
    if (!client) {
      setError("Client is not initialized");
      return;
    }
    try {
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        account: address,
        abi: contractABI,
        functionName: "createDropZone",
        args: ["0xAC55F9432d31cfc47B99606f013E70c62748d67E", address],
      });
      console.log(tx);

      // Wait for the transaction receipt
      // const receipt = await client.waitForTransactionReceipt({ hash: tx });

      // Update claimed state on successful transaction
      setClaimed(true);
      alert("Claim successful!");
    } catch (error) {
      console.error("Transaction failed:", error);
      // alert("Claim failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Claim Your Drops
        </h1>

        {/* Table of Addresses */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse bg-gray-700 rounded-lg shadow-lg mb-4">
            <thead>
              <tr className="bg-gray-600">
                <th className="p-3 text-left border-b border-gray-600">
                  Address
                </th>
                <th className="p-3 text-left border-b border-gray-600">
                  Claim
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-600">
                <td className="p-3 flex items-center">
                  {/* Blockies Icon with rounded-full class */}
                  <Blockies
                    seed={address ? address.toLowerCase() : ""}
                    size={10}
                    scale={3}
                    className="mr-2 rounded-full"
                  />
                  {address}
                </td>
                <td className="p-3">
                  <button
                    onClick={handleButtonClick}
                    disabled={claimed} // Disable button if claimed
                    className={`bg-blue-500 text-white px-4 py-2 rounded ${
                      claimed ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {claimed ? "Claimed" : "Claim"}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Page;
