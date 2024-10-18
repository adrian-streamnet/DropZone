import { NextResponse } from "next/server";
import { dbConnect } from "@/app/utils/mongodb";
import { MerkleData } from "@/app/models/Campaign";

// GET request handler
export async function GET(req: Request) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Extract the merkleRoot from the query parameters
    const { searchParams } = new URL(req.url);
    const merkleRoot = searchParams.get("merkleRoot");

    if (!merkleRoot) {
      return NextResponse.json(
        { error: "Merkle root is required" },
        { status: 400 }
      );
    }

    // Query the database for the campaign with the provided merkleRoot
    const campaignData = await MerkleData.findOne({ merkleRoot });

    if (!campaignData) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Create an object where addresses are keys and amounts are values
    const result = campaignData.participants.reduce(
      (
        acc: Record<string, string>,
        participant: { participant: string | number; amount: string }
      ) => {
        acc[participant.participant] = participant.amount;
        return acc;
      },
      {}
    );

    // Return the result as an object
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error querying campaign data:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Error querying campaign data" },
      { status: 500 }
    );
  }
}
