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
      participants, 
    } = body;

    // Validate required fields
    if (
      !owner ||
      !merkleRoot ||
      !campaignAlias ||
      !underlyingToken ||
      !deployedContract ||
      !participants ||
      !Array.isArray(participants) || // Check if participants is an array
      participants.length === 0 // Ensure participants list is not empty
    ) {
      return NextResponse.json(
        { error: "Missing required fields or invalid participants list" },
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
      participants, // Store the participants array
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
