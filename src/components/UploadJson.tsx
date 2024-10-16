"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import Blockies from "react-blockies"; // Import Blockies component
import { CONTRACT_ADDRESS } from "@/app/constants";
import contractABI from "@/app/DropZoneFactory.json";
import { initializeClient } from "@/app/utils/publicClient";
import { useAccount, useWriteContract } from "wagmi";
import DropZone from "@/Dropzone.json";

const client = initializeClient();

interface JsonData {
  [address: string]: string;
}

const UploadJson: React.FC = () => {
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string>(""); // State for token address
  // const [DeployedAddress, setDeployedAddress] = useState<string | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useAccount();

  // Handle dropped files
  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result === "string") {
            const data: JsonData = JSON.parse(result);
            if (
              typeof data === "object" &&
              Object.keys(data).every(
                (key) =>
                  /^0x[a-fA-F0-9]{40}$/.test(key) && !isNaN(Number(data[key]))
              )
            ) {
              setJsonData(data);
              setError(null);
            } else {
              setError(
                "Invalid JSON format. Expected an object with Ethereum addresses as keys and numeric values."
              );
            }
          }
        } catch (err) {
          setError("Invalid JSON file. Please check the format.");
          setJsonData(null);
        }
      };

      reader.readAsText(file);
    }
  };

  const submitinContract = async (tokenAddress: string, merkleRoot: string) => {
    if (!client) {
      setError("Client is not initialized");
      return;
    }
    try {
      console.log("Submitting to contract...");
      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        account: address,
        abi: contractABI,
        functionName: "createDropZone",
        args: [tokenAddress, address],
      });
      console.log("Transaction hash:", tx);

      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      console.log("Transaction receipt:", receipt);

      const DeployedAddress = await receipt.logs[0].address;
      console.log("Deployedddd address", DeployedAddress);

      console.log("updeting root.....");

      const updateRoot = await writeContractAsync({
        address: DeployedAddress,
        account: address,
        abi: DropZone,
        functionName: "updateMerkleRoot",
        args: [merkleRoot, "testHash"],
      });
      console.log("hash", updateRoot);
    } catch (error) {
      console.error("Error submitting to contract:", error);
      setError("Failed to submit to contract");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/json": [".json"], // Correctly specify the accepted MIME type for JSON
    },
    maxFiles: 1,
  });

  const handleSubmit = async () => {
    if (jsonData && tokenAddress) {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/create-tree", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jsonData), // Send the first object in the array
        });

        if (!response.ok) {
          throw new Error("Error creating Merkle tree");
        }

        const data = await response.json();
        console.log("Merkle Root:", data.merkleRoot[0]);

        // Assuming merkleRoot is returned as an array, extract the first element
        const merkleRootValue = data.merkleRoot; // Set the root to display
        setMerkleRoot(merkleRootValue);
        alert("Merkle tree created successfully!");

        // Call the contract submission function after successfully creating the Merkle tree
        await submitinContract(tokenAddress, merkleRootValue);
      } catch (error) {
        console.error("Error submitting data:", error);
        setError("Failed to create Merkle tree");
      } finally {
        setIsLoading(false);
      }
    } else {
      alert("No data to submit or token address is missing!");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Upload JSON File
        </h1>

        {/* Drag-and-Drop Area */}
        <div
          {...getRootProps()}
          className={`cursor-pointer p-12 flex justify-center bg-white border border-dashed border-gray-300 rounded-xl ${
            isDragActive
              ? "bg-gray-100"
              : "dark:bg-neutral-800 dark:border-neutral-600"
          } mb-4`} // Added margin-bottom here
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <span className="inline-flex justify-center items-center size-16 bg-gray-100 text-gray-800 rounded-full dark:bg-neutral-700 dark:text-neutral-200">
              <svg
                className="shrink-0 size-6"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" x2="12" y1="3" y2="15"></line>
              </svg>
            </span>

            <div className="mt-4 flex flex-wrap justify-center text-sm leading-6 text-gray-600">
              <span className="pe-1 font-medium text-gray-800 dark:text-neutral-200">
                {isDragActive
                  ? "Drop the file here..."
                  : "Drop your file here or"}
              </span>
              <span className="bg-white font-semibold text-blue-600 hover:text-blue-700 rounded-lg decoration-2 hover:underline focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:bg-neutral-800 dark:text-blue-500 dark:hover:text-blue-600">
                browse
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-400 dark:text-neutral-400">
              Pick a JSON file.
            </p>
          </div>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {/* Table of Addresses */}
        {jsonData && (
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse bg-gray-700 rounded-lg shadow-lg mb-4">
              <thead>
                <tr className="bg-gray-600">
                  <th className="p-3 text-left border-b border-gray-600">
                    Address
                  </th>
                  <th className="p-3 text-left border-b border-gray-600">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(jsonData).map(([address, amount]) => (
                  <tr key={address} className="border-b border-gray-600">
                    <td className="p-3 flex items-center">
                      {/* Blockies Icon with rounded-full class */}
                      <Blockies
                        seed={address.toLowerCase()}
                        size={10}
                        scale={3}
                        className="mr-2 rounded-full"
                      />
                      {address}
                    </td>
                    <td className="p-3">{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Input for Token Address */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Token Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
            placeholder="Enter token address"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-md transition duration-300 ease-in-out"
        >
          {isLoading ? "Submitting..." : "Submit"}
        </button>

        {/* Display Merkle Root if available */}
        {merkleRoot && (
          <div className="mt-4 text-green-500">Merkle Root: {merkleRoot}</div>
        )}
      </div>
    </div>
  );
};

export default UploadJson;
