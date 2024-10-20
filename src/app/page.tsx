"use client";
import React, { useState, useEffect } from "react";
import Blockies from "react-blockies";
import { CONTRACT_ADDRESS } from "@/app/constants";
import contractABI from "@/artifacts/DropZone.json";
import { initializeClient } from "@/app/utils/publicClient";
import { useAccount, useWriteContract } from "wagmi";
import toast, { Toaster } from "react-hot-toast";
import Loader from "@/components/Loader";

const client = initializeClient();

function Page() {
  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<any[]>([]);
  const [claimedItems, setClaimedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchClaimableData = async () => {
      try {
        setIsLoading(true);

        if (!address) return;
        const response = await fetch(
          `/api/get-claimable-data?participant=${address}`
        );
        const data = await response.json();
        console.log(data);
        setClaimData(data);
      } catch (error) {
        console.error("Error fetching claimable data:", error);
        setError("Error fetching claimable data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClaimableData();
  }, [address]);

  const handleClaim = async (
    contractAddress: string,
    merkleRoot: string,
    amount: string,
    index: number
  ) => {
    console.log(contractAddress);
    console.log(merkleRoot);
    console.log(amount);
    if (!client || !address) {
      toast.error("Please connect your wallet");
      setError("Client or address is not initialized");
      return;
    }

    setLoading(index.toString());
    try {
      // Call the generate-proof API with the correct JSON payload
      const proofResponse = await fetch("/api/generate-proof", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merkleRoot,
          participant: address,
          amount,
        }),
      });

      if (!proofResponse.ok) {
        toast.error("Failed to generate proof");
        throw new Error("Failed to generate proof");
      }

      const { proof } = await proofResponse.json();

      // Ensure that the proof is an array
      const merkleProof = proof || [];

      if (merkleProof.length === 0) {
        toast.error("error generating merkle proof");
        throw new Error("Invalid Merkle proof");
      }

      // Call the claimTokens function from the contract
      const claimTx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        account: address as `0x${string}`,
        abi: contractABI.abi,
        functionName: "claimTokens",
        args: [address as `0x${string}`, amount, merkleProof],
      });

      console.log(claimTx);

      // Wait for the transaction to be confirmed
      const claimReceipt = await client?.waitForTransactionReceipt({
        hash: claimTx,
      });

      const claimTrue = await fetch("/api/claim-participant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractAddress: contractAddress,
          participant: address,
        }),
      });

      if (!claimTrue.ok) {
        toast.error("Failed to generate proof");
        throw new Error("Failed to generate proof");
      }

      console.log("Claim successful:", claimReceipt);
      toast.success("Claim successful :)");
    } catch (error) {
      toast.error("Contract not funded yet");
      console.error("Transaction failed:", error);
      toast.error("Transaction failed, Please try again :(");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <Toaster />
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Claim Your Drops
        </h1>
        {isLoading && (
          <div className="flex justify-center mb-4">
            <h1> fetching your drops, hold tight...</h1>
          </div>
        )}

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
                      {Number(item.participant[0]?.amount) / 1e18} BTT
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          handleClaim(
                            item.deployedContract,
                            item.merkleRoot, // Assuming you have the merkleRoot in the claimData
                            item.participant[0]?.amount, // Assuming amount is in participant array
                            index // Pass index to identify the loading button
                          )
                        }
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex justify-center items-center"
                        disabled={loading === index.toString()} // Disable button while loading
                      >
                        {loading === index.toString() ? (
                          <Loader size={20} className="mr-2" /> // Use the Loader component
                        ) : (
                          "Claim"
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3 text-center" colSpan={3}>
                    {isLoading ? "Loading..." : "No claimable data available."}
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
