import { NextResponse } from "next/server";
import { dbConnect } from "@/app/utils/mongodb";
import { MerkleData } from "@/app/models/Campaign";

export async function GET(req: Request) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Extract query parameters from the request URL
    const { searchParams } = new URL(req.url);
    const ownerAddress = searchParams.get('ownerAddress');
    const chainId = searchParams.get('chainId');

    // Validate ownerAddress
    if (!ownerAddress) {
      return NextResponse.json(
        { error: "Owner address is required" },
        { status: 400 }
      );
    }

    // Validate chainId (optional but recommended)
    if (!chainId) {
      return NextResponse.json(
        { error: "Chain ID is required" },
        { status: 400 }
      );
    }
    if (isNaN(Number(chainId))) {
      return NextResponse.json(
        { error: "Invalid Chain ID" },
        { status: 400 }
      );
    }

    // Find campaigns by ownerAddress and chainId
    const campaigns = await MerkleData.find({
      owner: ownerAddress,
      chainId: Number(chainId), // Ensure chainId is stored as a number in the database
    }).lean();

    // Check if any campaigns were found
    if (campaigns.length === 0) {
      return NextResponse.json(
        { message: "No campaigns found for this owner and chain ID" },
        { status: 404 }
      );
    }

    const enrichedCampaigns = campaigns.map((campaign) => {
      const totalAmount = campaign.participants.reduce(
        (sum: bigint, participant: any) => {
          return sum + BigInt(participant.amount); // Use BigInt to sum large amounts
        },
        BigInt(0) // Start with BigInt(0)
      );

      return {
        ...campaign, // Spread campaign fields
        totalAmount: totalAmount.toString(), // Convert BigInt back to string for consistency
      };
    });

    // Return the found campaigns
    return NextResponse.json({
      enrichedCampaigns,
    });
  } catch (error) {
    console.error("Error retrieving campaigns:", error);
    return NextResponse.json(
      { error: "Error retrieving campaigns" },
      { status: 500 }
    );
  }
}
