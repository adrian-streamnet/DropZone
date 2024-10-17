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

export const Campaign =
  mongoose.models.Campaign || mongoose.model("Campaign", CampaignSchema);
