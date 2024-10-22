"use client";
import React, { useState, useEffect } from "react";
import Blockies from "react-blockies";
import { useAccount, useWriteContract, useContractRead } from "wagmi";
import toast, { Toaster } from "react-hot-toast";
import Loader from "@/components/Loader";
import SkeletonLoader from "@/components/Skeleton/Skeleton"; // Import the SkeletonLoader
import contractABI from "@/artifacts/DropZone.json";
import ERC20ABI from "@/artifacts/ERC20.json"; // Add ERC20 ABI
import { initializeClient } from "@/app/utils/publicClient";
import { Abi, Address } from "viem"; // Import relevant types from Viem or ethers.js based on the client you're using

const client = initializeClient();

function Page() {
  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [claimData, setClaimData] = useState<any[]>([]);
  const [claimedItems, setClaimedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokenSymbols, setTokenSymbols] = useState<Record<string, string>>({});

  // Function to fetch the symbol for each token
  const fetchTokenSymbol = async (
    underlyingToken: Address
  ): Promise<string | null> => {
    try {
      const symbol = await client?.readContract({
        address: underlyingToken,
        abi: ERC20ABI.abi as Abi, // Ensure correct ABI typing
        functionName: "symbol",
      });

      if (typeof symbol === "string") {
        return symbol;
      } else {
        throw new Error("Unexpected symbol type");
      }
    } catch (error) {
      console.error("Error fetching token symbol:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchClaimableData = async () => {
      try {
        setIsLoading(true);
        if (!address) return;

        const response = await fetch(
          `/api/get-claimable-data?participant=${address}`
        );
        const data = await response.json();
        setClaimData(data);

        // Fetch symbols for each underlyingToken and update the state
        const symbols = await Promise.all(
          data.map(async (item: any) => {
            const symbol = await fetchTokenSymbol(item.underlyingToken);
            return { [item.underlyingToken]: symbol || "N/A" };
          })
        );

        // Merge symbols into an object for quick lookup
        setTokenSymbols(Object.assign({}, ...symbols));
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
    if (!address) {
      toast.error("Please connect your wallet");
      setError("Client or address is not initialized");
      return;
    }

    setLoading(index.toString());
    try {
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
      const merkleProof = proof || [];

      if (merkleProof.length === 0) {
        toast.error("Error generating merkle proof");
        throw new Error("Invalid Merkle proof");
      }

      const claimTx = await writeContractAsync({
        address: contractAddress as `0x${string}`,
        account: address as `0x${string}`,
        abi: contractABI.abi,
        functionName: "claimTokens",
        args: [address as `0x${string}`, amount, merkleProof],
      });

      console.log(claimTx);

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
        toast.error("Failed to claim");
        throw new Error("Failed to claim");
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
            <p>Fetching your drops, hold tight...</p>
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
              {isLoading ? (
                // Show skeleton loaders while data is loading
                Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonLoader key={index} />
                ))
              ) : claimData.length > 0 ? (
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
                      {Number(item.participant[0]?.amount) / 1e18}{" "}
                      {tokenSymbols[item.underlyingToken] || "Token"}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() =>
                          handleClaim(
                            item.deployedContract,
                            item.merkleRoot,
                            item.participant[0]?.amount,
                            index
                          )
                        }
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex justify-center items-center"
                        disabled={loading === index.toString()}
                      >
                        {loading === index.toString() ? (
                          <Loader size={20} className="mr-2" />
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
