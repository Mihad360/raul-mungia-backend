import { Model, Types } from "mongoose";

export interface ICartItem {
  _id?: Types.ObjectId;
  product: Types.ObjectId;
  size: string;
  quantity: number;
}

export interface ICart {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  items: ICartItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartInterface extends Model<ICart> {
  findOrCreateByUser(userId: string | Types.ObjectId): Promise<ICart>;
}
