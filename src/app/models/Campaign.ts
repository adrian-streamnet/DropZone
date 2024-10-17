import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
  {
    owner: { type: String, required: true },
    merkleRoot: { type: String, required: true },
    campaignAlias: { type: String, required: true },
    underlyingToken: { type: String, required: true },
    deployedContract: { type: String, required: true },
  },
  { timestamps: true }
);

const ParticipantSchema = new mongoose.Schema({
  participant: { type: String, required: true },
  amount: { type: String, required: true },
  claimed: { type: Boolean, default: false },
});

const CampaignSchemaForMerkle = new mongoose.Schema({
  merkleRoot: { type: String, required: true },
  deployedContract: { type: String, required: true },
  campaignAlias: { type: String, required: true },
  participants: [ParticipantSchema], // Array of participants
});

export const MerkleData = mongoose.models.merkleData || mongoose.model("merkleData", CampaignSchemaForMerkle);


export const Campaign =
  mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);
