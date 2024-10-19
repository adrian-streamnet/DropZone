// src/app/api/create-tree/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { encodePacked } from "viem";

// Utility function to validate Ethereum address format
function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function POST(request: NextRequest) {
  console.log("Received a POST request for create-tree");

  try {
    const airdropData = await request.json();
    console.log(airdropData);
    if (!airdropData || typeof airdropData !== "object") {
      return NextResponse.json(
        { error: "Invalid airdrop data" },
        { status: 400 }
      );
    }

    // Create leaf nodes by hashing each address and cap as key-value pairs
    const leafNodes = Object.entries(airdropData).map(([address, cap]) => {
      // Validate address format
      if (!isValidAddress(address)) {
        throw new Error(`Invalid Ethereum address: ${address}`);
      }

      if (typeof cap !== "string" && typeof cap !== "number") {
        throw new Error(`Invalid cap value type: ${typeof cap}`);
      }

      const capBigInt = BigInt(cap); // Cast to bigint
      const packed = encodePacked(
        ["address", "uint256"],
        [address as `0x${string}`, capBigInt]
      );
      return keccak256(packed);
    });

    // Create the Merkle tree
    const merkleTree = new MerkleTree(leafNodes, keccak256, {
      sortLeaves: true,
      sortPairs: true,
    });

    const merkleRoot = merkleTree.getRoot().toString("hex");

    return NextResponse.json({
      message: "Merkle tree created successfully",
      merkleRoot: [`0x${merkleRoot}`], 
    });
  } catch (error) {
    console.error("Error creating Merkle tree:", error);
    return NextResponse.json(
      { error: "Error creating Merkle tree" },
      { status: 500 }
    );
  }
}
