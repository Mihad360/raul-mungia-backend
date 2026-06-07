import { Schema, model, Types } from "mongoose";
import { IWishlist, WishlistInterface } from "./wishlist.interface";

const wishlistSchema = new Schema<IWishlist, WishlistInterface>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index for fast user lookup
wishlistSchema.index({ user: 1 });

// Statics
wishlistSchema.statics.findOrCreateByUser = async function (
  userId: string | Types.ObjectId,
) {
  const userObjectId = new Types.ObjectId(userId);
  let wishlist = await this.findOne({ user: userObjectId });
  if (!wishlist) {
    wishlist = await this.create({ user: userObjectId, products: [] });
  }
  return wishlist;
};

export const WishlistModel = model<IWishlist, WishlistInterface>(
  "Wishlist",
  wishlistSchema,
);
