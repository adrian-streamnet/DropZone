import { NextResponse } from "next/server";
import { dbConnect } from "@/app/utils/mongodb";
import { MerkleData } from "@/app/models/Campaign";

export async function POST(req: Request) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Parse the JSON body
    const body = await req.json();

    const { merkleRoot, deployedContract, participants } = body;

    // Validate required fields
    if (
      !merkleRoot ||
      !deployedContract ||
      !participants ||
      !Array.isArray(participants)
    ) {
      return NextResponse.json(
        { error: "Missing required fields or invalid participants list" },
        { status: 400 }
      );
    }

    // Validate participants structure and set claimed to false by default
    const validatedParticipants = participants.map((participant) => {
      if (!participant.participant || !participant.amount) {
        throw new Error("Invalid participant structure");
      }
      return {
        participant: participant.participant,
        amount: participant.amount,
        claimed:
          participant.claimed === undefined ? false : participant.claimed, // Set claimed to false by default
      };
    });

    // Create a new campaign record
    const newCampaign = new MerkleData({
      merkleRoot,
      deployedContract,
      participants: validatedParticipants, // Store participants with claimed status
    });

    // Save the campaign to the database
    await newCampaign.save();

    // Respond with success
    return NextResponse.json({
      message: "MerkleData stored successfully",
      campaign: newCampaign,
    });
  } catch (error) {
    console.error("Error saving campaign:", error);
    return NextResponse.json(
      { error: error || "Error saving campaign" },
      { status: 500 }
    );
  }
}
