// pages/api/claim-participant.ts
import { MerkleData } from "@/app/models/Campaign";
import { NextResponse } from "next/server";
import { dbConnect } from "@/app/utils/mongodb";


export async function POST(req: Request, res: NextResponse) {
    const body = await req.json();
    const { contractAddress, participant } = body;

    if (!contractAddress || !participant) {
      return NextResponse.json(
        { error: "Contract address and participant are required." },
        { status: 400 }
      );
    }
    
    try {
      // Connect to the database
      await dbConnect();

      // Find the campaign by contract address and update the claimed state for the participant
      const result = await MerkleData.updateOne(
        {
          deployedContract: contractAddress,
          "participants.participant": participant,
        },
        {
          $set: { "participants.$.claimed": true },
        }
      );

      if (result.modifiedCount === 0) {
        return NextResponse.json(
            { message: "Participant not found or already claimed." },
            { status: 404 }
          );
      }

    return NextResponse.json({
        message: "Claim status updated successfully."
    });
    } catch (error) {
      console.error("Error updating claim status:", error);
      return NextResponse.json(
        { error: "Error updating claim status" },
        { status: 500 }
      );
    }
  
}
