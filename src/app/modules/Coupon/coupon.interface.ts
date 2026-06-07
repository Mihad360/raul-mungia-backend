import { Model, Types } from "mongoose";

export interface ICoupon {
  _id?: Types.ObjectId;
  code: string;
  discountPercent: number;
  expiryDate: Date;
  isActive?: boolean;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CouponInterface extends Model<ICoupon> {
  isCouponExistByCode(code: string): Promise<ICoupon | null>;
  isCouponExistById(id: string | Types.ObjectId): Promise<ICoupon | null>;
}
