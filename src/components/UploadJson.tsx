"use client";

import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import Blockies from "react-blockies";
import { CONTRACT_ADDRESS } from "@/app/constants";
import contractABI from "@/artifacts/DropZoneFactory.json";
import { initializeClient } from "@/app/utils/publicClient";
import { useAccount, useWriteContract } from "wagmi";
import { Address, formatEther, getContract, keccak256 } from "viem";
import toast, { Toaster } from "react-hot-toast";
import Loader from "@/components/Loader";
import { Abi } from "viem"; // Import Abi type from Viem
import ERC20ABI from "@/artifacts/ERC20.json";

const client = initializeClient();

interface JsonData {
  [address: string]: string;
}
type HexString = `0x${string}`;

const UploadJson: React.FC = () => {
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalTokens, setTotalTokens] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [computedAddress, setComputedAddress] = useState<string | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string>(""); // State for token address
  const [airDropAlias, setDropAlias] = useState<string>(""); // State for token address
  const [salt, setSalt] = useState<string | null>(null); // State for salt

  const { writeContractAsync } = useWriteContract();
  const { address, isConnected } = useAccount();
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null); // Update useState to allow 'null'

  const fetchTokenSymbol = async (
    tokenAddress: Address
  ): Promise<string | null> => {
    try {
      const symbol = await client?.readContract({
        address: tokenAddress,
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
    const getSymbol = async () => {
      if (tokenAddress) {
        const symbol = await fetchTokenSymbol(tokenAddress as Address);
        setTokenSymbol(symbol);
      }
    };

    getSymbol();
  }, [tokenAddress]);

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
              const total = Object.values(data).reduce((acc, amount) => {
                // Convert amount to BigInt before summing
                return acc + BigInt(amount);
              }, BigInt(0));

              setTotalTokens(total);
              setError(null);
            } else {
              setError(
                "Invalid JSON format. Expected an object with  addresses as keys and numeric values."
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

      setComputedAddress(computedAddress as HexString);
      console.log("Computed Address:", computedAddress);

      // Deploy the DropZone contract with the required parameters
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
        console.log("Merkle Data stored:", secondData);
        console.log("Merkle data stored successfully!");
        console.log("Campaign deployed and stored successfully!");
        toast.success("Campaign deployed :)");
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
      <Toaster />
      <div className="bg-gray-800 p-6 rounded-3xl shadow-lg w-full max-w-3xl">
        <h1 className="text-2xl font-bold mb-6 text-center ios-large-title">
          Upload JSON File
        </h1>

        <p className="mb-2">
          Upload your JSON file containing participant addresses and their
          respective token amounts.
        </p>
        <p className="mb-4">
          If you&apos;re unsure about the format, click the button below to
          download a sample JSON structure that you can edit.
        </p>
        <div className="mb-4">
          <button
            onClick={downloadJSON}
            className="text-white rounded-full  flex items-center gap-2 bg-blue-600 px-4 py-2 hover:bg-blue-700"
          >
            Download format JSON
            {/* <FontAwesomeIcon
              icon={faDownload}
              className="text-white text-sm"
              size="3x"
            /> */}
          </button>
        </div>

        {/* Drag-and-Drop Area */}
        <div
          {...getRootProps()}
          className={`cursor-pointer p-12 flex justify-center bg-gray-700 border-2 border-dashed border-gray-600 rounded-3xl ${
            isDragActive ? "bg-gray-600" : ""
          } mb-4`}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <span className="inline-flex justify-center items-center size-16 bg-gray-600 text-gray-200 rounded-full">
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

            <div className="mt-4 flex flex-wrap justify-center text-sm leading-6 text-gray-300">
              <span className="pe-1 font-medium">
                {isDragActive
                  ? "Drop the file here..."
                  : "Drop your file here or"}
              </span>
              <span className="font-semibold text-blue-400 hover:text-blue-300 rounded-lg decoration-2 hover:underline focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-offset-2">
                browse
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-400">Pick a JSON file.</p>
          </div>
        </div>

        {error && (
          <div className="text-red-500 mb-4 rounded-xl bg-red-900 bg-opacity-20 p-3">
            {error}
          </div>
        )}

        {/* Table of Addresses */}
        {jsonData && (
          <div className="overflow-x-auto rounded-2xl mb-4">
            <table className="w-full table-auto border-collapse bg-gray-700 shadow-lg">
              <thead>
                <tr className="bg-gray-600">
                  <th className="p-3 text-left border-b border-gray-500 rounded-tl-2xl">
                    Address
                  </th>
                  <th className="p-3 text-left border-b border-gray-500 rounded-tr-2xl">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(jsonData).map(
                  ([address, amount], index, array) => (
                    <tr
                      key={address}
                      className={`border-b border-gray-600 ${
                        index === array.length - 1 ? "rounded-b-2xl" : ""
                      }`}
                    >
                      <td className="p-3 flex items-center">
                        <Blockies
                          seed={address.toLowerCase()}
                          size={10}
                          scale={3}
                          className="mr-2 rounded-full"
                        />
                        {address}
                      </td>
                      <td className="p-3">
                        {formatEther(BigInt(amount))} {tokenSymbol || "Token"}
                      </td>
                    </tr>
                  )
                )}
                <tr className="bg-gray-600 font-bold">
                  <td className=" px-4 py-2">Total Tokens</td>
                  <td className=" px-4 py-2">
                    {formatEther(BigInt(totalTokens))} {tokenSymbol} {""}Tokens
                  </td>
                </tr>
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
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g: Funding.."
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 p-4 rounded-2xl transition duration-300 ease-in-out text-lg font-semibold"
        >
          {isLoading ? (
            <div className="flex items-center justify-center w-full">
              <Loader size={20} className="mr-2" />
            </div>
          ) : (
            "Submit"
          )}
        </button>

        {merkleRoot && (
          <div className="mt-6 p-4 bg-gray-700 border border-gray-600 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-blue-300 mb-2">
              Verification Details
            </h3>
            <div className="space-y-2">
              <div className="text-gray-200">
                <span className="font-medium mr-2 text-blue-200">
                  Merkle Root:
                </span>
                <span className="font-mono bg-gray-600 px-3 py-2 rounded-xl break-all mt-1 inline-block">
                  {merkleRoot}
                </span>
              </div>
              {salt && (
                <div className="text-gray-200">
                  <span className="font-medium mr-2 text-blue-200">Salt:</span>
                  <span className="font-mono bg-gray-600 px-3 py-2 rounded-xl break-all mt-1 inline-block">
                    {salt}
                  </span>
                </div>
              )}
              {computedAddress && (
                <div className="text-gray-200">
                  <span className="font-medium mr-2 text-blue-200">
                    Computed Address:
                  </span>
                  <span className="font-mono bg-gray-600 px-3 py-2 rounded-xl break-all mt-1 inline-block">
                    {computedAddress}
                  </span>
                </div>
              )}
            </div>
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
