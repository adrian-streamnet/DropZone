import { NextResponse } from "next/server";
import { dbConnect } from "@/app/utils/mongodb";
import { MerkleData } from "@/app/models/Campaign";

// GET request handler
export async function GET(req: Request) {
  try {
    // Connect to MongoDB
    await dbConnect();

    // Extract the participant address from the query parameters
    const { searchParams } = new URL(req.url);
    const participantAddress = searchParams.get("participant");

    if (!participantAddress) {
      return NextResponse.json(
        { error: "Participant address is required" },
        { status: 400 }
      );
    }

    // Query the database for participants with the provided address
    const campaignData = await MerkleData.find({
      "participants.participant": participantAddress,
    });

    // Filter relevant data for the response
    const result = campaignData
      .map((campaign) => {
        const unclaimedParticipants = campaign.participants.filter(
          (p: any) => p.participant === participantAddress && !p.claimed
        );

        // Skip the campaign if no unclaimed participants are found
        if (unclaimedParticipants.length === 0) {
          return null;
        }

        return {
          deployedContract: campaign.deployedContract,
          merkleRoot: campaign.merkleRoot,
          airDropAlias: campaign.campaignAlias,
          participant: unclaimedParticipants, // Only unclaimed participants
        };
      })
      .filter((campaign) => campaign !== null); // Remove campaigns that were skipped

    // Return the result
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error querying campaign data:", error);
    return NextResponse.json(
      { error: error || "Error querying campaign data" },
      { status: 500 }
    );
  }
}
