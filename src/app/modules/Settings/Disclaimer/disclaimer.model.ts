import { Schema, model } from "mongoose";
import { DisclaimerInterface, IDisclaimer } from "./disclaimer.interface";

const disclaimerSchema = new Schema<IDisclaimer, DisclaimerInterface>(
  {
    description: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const DisclaimerModel = model<IDisclaimer, DisclaimerInterface>(
  "Disclaimer",
  disclaimerSchema,
);
