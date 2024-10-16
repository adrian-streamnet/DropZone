import { NextResponse } from "next/server";
import { dbConnect } from "@/app/utils/mongodb";
import { Campaign } from "@/app/models/Campaign";

export async function POST(req: Request) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Parse the JSON body
    const body = await req.json();

    const {
      owner,
      merkleRoot,
      campaignAlias,
      underlyingToken,
      deployedContract,
    } = body;

    // Validate required fields
    if (
      !owner ||
      !merkleRoot ||
      !campaignAlias ||
      !underlyingToken ||
      !deployedContract
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create a new campaign record
    const newCampaign = new Campaign({
      owner,
      merkleRoot,
      campaignAlias,
      underlyingToken,
      deployedContract,
    });

    // Save the campaign to the database
    await newCampaign.save();

    // Respond with success
    return NextResponse.json({
      message: "Campaign stored successfully",
      campaign: newCampaign,
    });
  } catch (error) {
    console.error("Error saving campaign:", error);
    return NextResponse.json(
      { error: "Error saving campaign" },
      { status: 500 }
    );
  }
}
