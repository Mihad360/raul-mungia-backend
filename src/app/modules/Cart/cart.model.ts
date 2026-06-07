import { Schema, model, Types } from "mongoose";
import { CartInterface, ICart, ICartItem } from "./cart.interface";

const cartItemSchema = new Schema<ICartItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    size: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: true },
);

const cartSchema = new Schema<ICart, CartInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

cartSchema.index({ user: 1 });

// Static: find or create cart for a user
cartSchema.statics.findOrCreateByUser = async function (
  userId: string | Types.ObjectId,
) {
  const userObjectId = new Types.ObjectId(userId);
  let cart = await this.findOne({ user: userObjectId });
  if (!cart) {
    cart = await this.create({ user: userObjectId, items: [] });
  }
  return cart;
};

export const CartModel = model<ICart, CartInterface>("Cart", cartSchema);
