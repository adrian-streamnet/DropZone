import { NextResponse } from "next/server";
import { dbConnect } from "@/app/utils/mongodb";
import { Campaign } from "@/app/models/Campaign";

export async function GET(req: Request) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Extract query parameters from the request URL
    const { searchParams } = new URL(req.url);
    const ownerAddress = searchParams.get('ownerAddress');

    // Validate ownerAddress
    if (!ownerAddress) {
      return NextResponse.json(
        { error: "Owner address is required" },
        { status: 400 }
      );
    }

    // Find campaigns by ownerAddress
    const campaigns = await Campaign.find({ owner: ownerAddress });

    // Check if any campaigns were found
    if (campaigns.length == 0) {
      return NextResponse.json(
        { message: "No campaigns found for this owner" },
        { status: 404 }
      );
    }

    // Return the found campaigns
    return NextResponse.json({
      message: "Campaigns retrieved successfully",
      campaigns,
    });
  } catch (error) {
    console.error("Error retrieving campaigns:", error);
    return NextResponse.json(
      { error: "Error retrieving campaigns" },
      { status: 500 }
    );
  }
}