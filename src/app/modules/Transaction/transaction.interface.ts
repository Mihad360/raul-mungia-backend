import { Types } from "mongoose";

export type TTransactionType = "payment" | "refund";

export type TTransactionStatus =
  | "pending" // Created but not yet completed
  | "completed" // Successfully completed
  | "failed"; // Failed (e.g., Bankful charge failed)

export interface ITransaction {
  _id?: Types.ObjectId;

  // Core info
  order: Types.ObjectId;
  user: Types.ObjectId;
  type: TTransactionType;
  status: TTransactionStatus;
  amount: number;

  // Payment method info (snapshot from order)
  paymentMethodType: string; // "venmo", "echeck", "crypto", etc.
  paymentMethodDisplayName: string; // "Venmo", "Bank Transfer", etc.
  isAutomated: boolean; // Was it Bankful or manual?

  // For automated payments (Bankful — Phase 2)
  gatewayTransactionId?: string; // External transaction ID from Bankful
  gatewayResponse?: Record<string, unknown>; // Raw response from Bankful

  // For manual P2P payments (Venmo/CashApp/Zelle)
  senderHandle?: string; // Customer's username they sent from
  customerReference?: string; // Order number / reference they included
  proofImageUrl?: string; // Optional screenshot
  confirmedBy?: Types.ObjectId; // Admin who confirmed
  confirmedAt?: Date;

  // For refunds
  refundedToHandle?: string; // Where the money was sent back
  refundReference?: string; // Refund transaction reference (Venmo txn ID, etc.)
  refundReason?: string;
  processedBy?: Types.ObjectId; // Admin who processed the refund
  processedAt?: Date;

  // Notes
  adminNotes?: string;

  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
