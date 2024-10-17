import { NextResponse } from "next/server";
import { dbConnect } from "@/app/utils/mongodb";
import { Campaign } from "@/app/models/Campaign";

export async function DELETE(req: Request) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Parse the JSON body
    const body = await req.json();

    const { deployedContract, participantAddress } = body;

    // Validate required fields
    if (!deployedContract || !participantAddress) {
      return NextResponse.json(
        { error: "Missing deployedContract or participantAddress" },
        { status: 400 }
      );
    }

    // Find the campaign using deployedContract and remove the participant from the array
    const updatedCampaign = await Campaign.findOneAndUpdate(
      { deployedContract },
      { $pull: { participants: participantAddress } }, // Use $pull to remove the participant from the array
      { new: true } // Return the updated document
    );

    // If no campaign is found
    if (!updatedCampaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Respond with success
    return NextResponse.json({
      message: "Participant removed successfully",
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error("Error removing participant:", error);
    return NextResponse.json(
      { error: "Error removing participant" },
      { status: 500 }
    );
  }
}
