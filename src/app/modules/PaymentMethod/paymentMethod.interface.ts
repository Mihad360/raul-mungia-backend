import { Types } from "mongoose";

export interface IPaymentMethod {
  _id?: Types.ObjectId;
  type: string;
  displayName: string;
  description?: string;
  isAutomated: boolean;
  handle?: string;
  instructionsForCustomer?: string;
  displayOrder: number;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Snapshot saved in Order document
export interface IAppliedPaymentMethod {
  paymentMethodId: Types.ObjectId;
  type: string;
  displayName: string;
  isAutomated: boolean;
  handle?: string;
}
