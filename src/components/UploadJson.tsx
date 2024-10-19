"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import Blockies from "react-blockies";
import { CONTRACT_ADDRESS } from "@/app/constants";
import contractABI from "@/artifacts/DropZoneFactory.json";
import { initializeClient } from "@/app/utils/publicClient";
import { useAccount, useWriteContract } from "wagmi";
import { Address, getContract, keccak256 } from "viem";
import { toast, Toaster } from "react-hot-toast"; // Import react-hot-toast

const client = initializeClient();

interface JsonData {
  [address: string]: string;
}
type HexString = `0x${string}`;

const UploadJson: React.FC = () => {
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string>(""); // State for token address
  const [airDropAlias, setDropAlias] = useState<string>(""); // State for token address
  const [salt, setSalt] = useState<string | null>(null); // State for salt
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

  const submitInContract = async (tokenAddress: string, merkleRoot: string) => {
    if (!client) {
      setError("Client is not initialized");
      toast.error("Client is not initialized."); // Error notification
      return;
    }
    if (!isConnected || !address) {
      setError("Wallet is not connected");
      toast.error("Wallet is not connected."); // Error notification
      return;
    }

    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const generatedSalt = keccak256(currentTime.toString() as HexString);
      setSalt(generatedSalt);
      toast.success("Salt generated successfully!");

      const contract = getContract({
        address: CONTRACT_ADDRESS,
        abi: contractABI,
        client: client,
      });

      const computedAddress = await contract.read.computeAddress([
        tokenAddress,
        address,
        merkleRoot,
        "testHash",
        generatedSalt,
      ]);

      const tx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        account: address,
        abi: contractABI,
        functionName: "deployDropZone",
        args: [tokenAddress, address, merkleRoot, "testHash", generatedSalt],
      });

      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      toast.success("Transaction confirmed!"); // Success notification

      return computedAddress;
    } catch (error: any) {
      setError(
        error?.message || "Failed to submit to contract. Please try again."
      );
      toast.error("Error submitting to contract."); // Error notification
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
      toast.loading("Creating AirDrop.....");

      try {
        const response = await fetch("/api/create-tree", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jsonData),
        });

        if (!response.ok) {
          throw new Error("Error creating Merkle tree");
        }

        const data = await response.json();
        const merkleRootValue = data.merkleRoot[0];
        setMerkleRoot(merkleRootValue);

        const computedAddress = await submitInContract(
          tokenAddress,
          merkleRootValue
        );

        const participants = Object.entries(jsonData).map(
          ([address, amount]) => ({
            participant: address,
            amount,
            claimed: false,
          })
        );

        const secondResponse = await fetch("/api/store-merkle-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            owner: address,
            merkleRoot: merkleRootValue,
            deployedContract: computedAddress,
            campaignAlias: airDropAlias,
            underlyingToken: tokenAddress,
            participants,
          }),
        });

        if (!secondResponse.ok) {
          throw new Error("Error storing Merkle data");
        }

        const secondData = await secondResponse.json();
        toast.success("Merkle data stored successfully!");
      } catch (error: any) {
        setError(error?.message || "Failed to create and store campaign.");
        toast.error("Error submitting data."); // Error notification
      } finally {
        setIsLoading(false);
        toast.dismiss(); // Dismiss loading toast
      }
    } else {
      toast.error("No data or token address is missing.");
    }
  };

  const downloadJSON = () => {
    const jsonData = {
      "0xbFc4A28D8F1003Bec33f4Fdb7024ad6ad1605AA8": "1000000000000000000",
      "0x97861976283e6901b407D1e217B72c4007D9F64D": "2000000000000000000",
    };
    const fileName = "data.json"; // name of the file
    const json = JSON.stringify(jsonData, null, 2); // convert JSON object to string
    const blob = new Blob([json], { type: "application/json" }); // create a blob with the JSON data
    const href = URL.createObjectURL(blob); // create a URL for the blob

    // Create a link and trigger the download
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-6 text-center">
          Upload JSON File
        </h1>
        <div>
          <button onClick={downloadJSON}>Download format JSON?</button>
        </div>

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
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Airdrop Alias
          </label>
          <input
            type="text"
            value={airDropAlias}
            onChange={(e) => setDropAlias(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring focus:ring-blue-500"
            placeholder="e.g: Funding.."
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-md transition duration-300 ease-in-out"
        >
          {isLoading ? "Submitting..." : "Submit"}
        </button>

        {/* Display Merkle Root and Salt if available */}
        {merkleRoot && (
          <div className="mt-4 text-green-500">
            <p>Merkle Root: {merkleRoot}</p>
            {salt && <p>Salt: {salt}</p>}
          </div>
        )}
      </div>
      <Toaster
        toastOptions={{
          // Custom styling for the toasts
          success: {
            style: {
              background: "#1E1E1E", // Matte black background
              color: "#00FF00", // Green text for success
              border: "1px solid #00FF00",
            },
            iconTheme: {
              primary: "#00FF00", // Green icon
              secondary: "#1E1E1E", // Secondary matte black color
            },
          },
          error: {
            style: {
              background: "#1E1E1E", // Matte black background
              color: "#FF0000", // Red text for error
              border: "1px solid #FF0000",
            },
            iconTheme: {
              primary: "#FF0000", // Red icon
              secondary: "#1E1E1E", // Secondary matte black color
            },
          },
          loading: {
            style: {
              background: "#1E1E1E", // Matte black background
              color: "#FFFFFF", // White text for loading
              border: "1px solid #FFFFFF",
            },
            iconTheme: {
              primary: "#FFFFFF", // White icon
              secondary: "#1E1E1E", // Secondary matte black color
            },
          },
          // Default toast styles
          style: {
            background: "#1E1E1E", // Matte black background for all toasts
            borderRadius: "8px",
            padding: "16px",
            color: "#FFFFFF", // White text
          },
        }}
      />
    </div>
  );
};

export default UploadJson;
