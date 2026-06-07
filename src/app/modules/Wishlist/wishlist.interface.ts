import { Model, Types } from "mongoose";

export interface IWishlist {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  products: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WishlistInterface extends Model<IWishlist> {
  findOrCreateByUser(userId: string | Types.ObjectId): Promise<IWishlist>;
}
