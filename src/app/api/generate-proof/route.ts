import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/app/utils/mongodb";
import { MerkleData } from "@/app/models/Campaign";
import { MerkleTree } from "merkletreejs";
import {keccak256} from "viem";
import { encodePacked } from "viem";

// Utility function to validate Ethereum address format
function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// POST request handler to generate proof
export async function POST(request: NextRequest) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Parse request body for merkleRoot, participant, and amount
    const { merkleRoot, participant, amount } = await request.json();

    // Validate inputs
    if (!merkleRoot || !isValidAddress(participant) || !amount) {
      return NextResponse.json(
        { error: "Invalid merkleRoot, participant, or amount" },
        { status: 400 }
      );
    }

    // Fetch the campaign data from MongoDB using the merkleRoot
    const campaignData = await MerkleData.findOne({ merkleRoot });

    if (!campaignData) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Recreate the participants object (address -> amount)
    const participantsData = campaignData.participants.reduce(
      (acc: Record<string, string>, p: { participant: string; amount: string }) => {
        acc[p.participant] = p.amount;
        return acc;
      },
      {}
    );

    // Check if the provided participant exists in the campaign data
    if (!participantsData[participant]) {
      return NextResponse.json(
        { error: "Participant not found in campaign" },
        { status: 404 }
      );
    }

    // Create leaf nodes by hashing each address and amount
    const leafNodes = Object.entries(participantsData).map(([address, cap]) => {
      const capBigInt = BigInt(cap as any);
      const packed = encodePacked(["address", "uint256"], [address as `0x${string}`, capBigInt]);
      return keccak256(packed);
    });

    // Create the Merkle tree
    const merkleTree = new MerkleTree(leafNodes, keccak256, {
      sortLeaves: true,
      sortPairs: true,
    });

    // Create the leaf for the specific participant and amount
    const capBigInt = BigInt(amount);
    const leaf = keccak256(
      encodePacked(["address", "uint256"], [participant as `0x${string}`, capBigInt])
    );

    // Generate the Merkle proof for the participant
    const proof = merkleTree.getHexProof(leaf);

    // Return the proof as JSON
    return NextResponse.json({
      participant,
      amount,
      proof,
    });
  } catch (error) {
    console.error("Error generating Merkle proof:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Error generating Merkle proof" },
      { status: 500 }
    );
  }
}
