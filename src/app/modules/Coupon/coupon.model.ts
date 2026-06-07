import { Schema, model, Types } from "mongoose";
import { CouponInterface, ICoupon } from "./coupon.interface";

const couponSchema = new Schema<ICoupon, CouponInterface>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Partial unique index on code:
 * Only one NON-DELETED coupon can have a given code at any time.
 * Once a coupon is soft-deleted (isDeleted: true), admin can reuse the same code.
 */
couponSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

// Index for the "available coupons" query
couponSchema.index({ expiryDate: 1, isActive: 1, isDeleted: 1 });

// ─── Statics ──────────────────────────────────────────────────────────
couponSchema.statics.isCouponExistByCode = async function (code: string) {
  return this.findOne({
    code: code.toUpperCase().trim(),
    isDeleted: false,
  });
};

couponSchema.statics.isCouponExistById = async function (
  id: string | Types.ObjectId,
) {
  if (!Types.ObjectId.isValid(id)) return null;
  return this.findOne({ _id: id, isDeleted: false });
};

export const CouponModel = model<ICoupon, CouponInterface>(
  "Coupon",
  couponSchema,
);
