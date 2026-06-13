import { Schema, model } from "mongoose";
import {
  ITransaction,
  TTransactionType,
  TTransactionStatus,
} from "./transaction.interface";

const TRANSACTION_TYPES: TTransactionType[] = ["payment", "refund"];
const TRANSACTION_STATUSES: TTransactionStatus[] = [
  "pending",
  "completed",
  "failed",
];

const transactionSchema = new Schema<ITransaction>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      default: "pending",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethodType: {
      type: String,
      required: true,
    },
    paymentMethodDisplayName: {
      type: String,
      required: true,
    },
    isAutomated: {
      type: Boolean,
      required: true,
    },

    // Automated payment fields (Bankful)
    gatewayTransactionId: { type: String, default: "" },
    gatewayResponse: { type: Schema.Types.Mixed, default: null },

    // Manual P2P payment fields
    senderHandle: { type: String, default: "" },
    customerReference: { type: String, default: "" },
    proofImageUrl: { type: String, default: "" },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "User" },
    confirmedAt: { type: Date },

    // Refund fields
    refundedToHandle: { type: String, default: "" },
    refundReference: { type: String, default: "" },
    refundReason: { type: String, default: "" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date },

    adminNotes: { type: String, default: "" },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Hide deleted from default queries
transactionSchema.pre("find", function () {
  this.where({ isDeleted: { $ne: true } });
});

transactionSchema.pre("findOne", function () {
  this.where({ isDeleted: { $ne: true } });
});

export const TransactionModel = model<ITransaction>(
  "Transaction",
  transactionSchema,
);
