// src/app/api/gen-leaf/route.ts

import { NextRequest, NextResponse } from "next/server";
import { encodePacked } from "viem";
import keccak256 from "keccak256";

// Utility function to validate Ethereum address format
function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function POST(request: NextRequest) {
  console.log("Received a POST request for gen-leaf");

  try {
    const { address, amount } = await request.json();

    // Validate address format
    if (!isValidAddress(address)) {
      return NextResponse.json(
        { error: "Invalid Ethereum address" },
        { status: 400 }
      );
    }

    const packed = keccak256(
      encodePacked(["address", "uint256"], [address as `0x${string}`, amount])
    );

    return NextResponse.json({
      leaf: packed.toString("hex"),
    });
  } catch (error) {
    console.error("Error generating leaf:", error);
    return NextResponse.json(
      { error: "Error generating leaf" },
      { status: 500 }
    );
  }
}
