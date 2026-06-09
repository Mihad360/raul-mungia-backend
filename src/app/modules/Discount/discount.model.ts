import { Schema, model } from "mongoose";
import { IDiscount, IDiscountTier } from "./discount.interface";

const discountTierSchema = new Schema<IDiscountTier>(
  {
    minQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    maxQuantity: {
      type: Number,
      default: null,
      // null means unlimited (e.g., 10+ items)
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
  },
  { _id: false }
);

const discountSchema = new Schema<IDiscount>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    tiers: {
      type: [discountTierSchema],
      required: true,
      validate: {
        validator: (tiers: IDiscountTier[]) => tiers.length > 0,
        message: "At least one tier is required",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hide deleted from default queries
discountSchema.pre("find", function () {
  this.where({ isDeleted: { $ne: true } });
});

discountSchema.pre("findOne", function () {
  this.where({ isDeleted: { $ne: true } });
});

export const Discount = model<IDiscount>("Discount", discountSchema);