import { Schema, model } from "mongoose";
import {
  ExplorePurityInterface,
  IExplorePurity,
} from "./explorePurity.interface";

const explorePuritySchema = new Schema<IExplorePurity, ExplorePurityInterface>(
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

export const ExplorePurityModel = model<IExplorePurity, ExplorePurityInterface>(
  "ExplorePurity",
  explorePuritySchema,
);
