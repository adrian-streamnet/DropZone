// src/app/api/get-proof/route.ts

import { NextRequest, NextResponse } from "next/server";
import { MerkleTree } from "merkletreejs";

let storedTree: MerkleTree | null = null;

export async function POST(request: NextRequest) {
  console.log("Received a POST request for get-proof");

  try {
    const { leaf } = await request.json();

    if (!leaf) {
      return NextResponse.json({ error: "Leaf is required" }, { status: 400 });
    }

    if (!storedTree) {
      return NextResponse.json(
        { error: "Merkle tree not found" },
        { status: 404 }
      );
    }

    const proof = storedTree.getHexProof(leaf);

    return NextResponse.json({
      message: "Proof generated successfully",
      proof,
    });
  } catch (error) {
    console.error("Error generating proof:", error);
    return NextResponse.json(
      { error: "Error generating proof" },
      { status: 500 }
    );
  }
}
