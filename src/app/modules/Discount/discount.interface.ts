import { Types } from "mongoose";

export interface IDiscountTier {
  minQuantity: number; // Minimum items to qualify
  maxQuantity: number | null; // null = unlimited (e.g., 10+)
  discountPercent: number; // 0-100
}

export interface IDiscount {
  _id?: Types.ObjectId;
  name: string;
  description?: string;
  tiers: IDiscountTier[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// What gets returned when calculating discount for a cart
export interface IDiscountCalculation {
  discountId: Types.ObjectId | null;
  tierUsed: IDiscountTier | null;
  itemsCount: number;
  discountPercent: number;
  discountAmount: number; // Will be calculated against subtotal
}

// Snapshot saved in Order document
export interface IAppliedDiscount {
  discountId: Types.ObjectId;
  tierUsed: IDiscountTier;
  itemsCount: number;
  discountPercent: number;
  discountAmount: number;
}
