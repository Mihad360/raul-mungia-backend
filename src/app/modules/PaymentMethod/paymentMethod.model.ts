import { Schema, model } from "mongoose";
import { IPaymentMethod } from "./paymentMethod.interface";

const paymentMethodSchema = new Schema<IPaymentMethod>(
  {
    type: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isAutomated: {
      type: Boolean,
      required: true,
      default: false,
    },
    handle: {
      type: String,
      trim: true,
      default: "",
    },
    instructionsForCustomer: {
      type: String,
      trim: true,
      default: "",
    },
    displayOrder: {
      type: Number,
      default: 0,
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
  { timestamps: true },
);

// Partial unique index — only one non-deleted record per type
paymentMethodSchema.index(
  { type: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

// Hide deleted from default queries
paymentMethodSchema.pre("find", function () {
  this.where({ isDeleted: { $ne: true } });
});

paymentMethodSchema.pre("findOne", function () {
  this.where({ isDeleted: { $ne: true } });
});

export const PaymentMethodModel = model<IPaymentMethod>(
  "PaymentMethod",
  paymentMethodSchema,
);
