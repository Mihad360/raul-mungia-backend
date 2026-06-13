import mongoose from "mongoose";
import { OrderModel } from "./order.model";
import { ProductModel } from "../Product/product.model";
import { IOrderItem } from "./order.interface";

/**
 * Generates a unique sequential order number like ORD-000001, ORD-000002, etc.
 */
export const generateOrderNumber = async (): Promise<string> => {
  const lastOrder = await OrderModel.findOne({})
    .sort({ createdAt: -1 })
    .select("orderNumber")
    .lean();

  let nextNum = 1;

  if (lastOrder?.orderNumber) {
    const numPart = lastOrder.orderNumber.split("-")[1];
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      nextNum = parsed + 1;
    }
  }

  return `ORD-${String(nextNum).padStart(6, "0")}`;
};

/**
 * Decrement stock for ordered items
 * Uses transaction session for safety
 */
export const decrementStockForItems = async (
  items: IOrderItem[],
  session: mongoose.ClientSession,
): Promise<void> => {
  for (const item of items) {
    const result = await ProductModel.updateOne(
      {
        _id: item.product,
        "variants.size": item.size,
        "variants.stock": { $gte: item.quantity },
      },
      {
        $inc: { "variants.$.stock": -item.quantity },
      },
      { session },
    );

    if (result.modifiedCount === 0) {
      throw new Error(
        `Failed to decrement stock for ${item.productName} (${item.size}). Insufficient stock or product not found.`,
      );
    }
  }
};

/**
 * Restore stock for ordered items (used on cancel/refund)
 */
export const restoreStockForItems = async (
  items: IOrderItem[],
  session?: mongoose.ClientSession,
): Promise<void> => {
  for (const item of items) {
    await ProductModel.updateOne(
      {
        _id: item.product,
        "variants.size": item.size,
      },
      {
        $inc: { "variants.$.stock": item.quantity },
      },
      session ? { session } : {},
    );
  }
};
