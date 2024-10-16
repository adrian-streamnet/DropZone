import mongoose, { Schema, model, models } from "mongoose";

interface ICampaign {
  owner: string;
  merkleRoot: string;
  campaignAlias: string;
  underlyingToken: string;
  deployedContract: string;
}

const campaignSchema = new Schema<ICampaign>({
  owner: { type: String, required: true },
  merkleRoot: { type: String, required: true },
  campaignAlias: { type: String, required: true },
  underlyingToken: { type: String, required: true },
  deployedContract: { type: String, required: true },
});

export const Campaign =
  models.Campaign || model<ICampaign>("Campaign", campaignSchema);
