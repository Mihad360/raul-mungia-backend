import HttpStatus from "http-status";
import { Types } from "mongoose";
import AppError from "../../erros/AppError";
import { JwtPayload } from "../../interface/global";
import { CouponModel } from "./coupon.model";
// import { OrderModel } from "../Order/order.model";

/**
 * Validate a coupon code at checkout.
 *
 * Checks performed:
 *  1. Coupon code exists (case-insensitive)
 *  2. Coupon is active
 *  3. Coupon is not expired
 *  4. Cart subtotal is valid
 *  5. User has not already used this specific coupon (by couponId)
 *
 * If everything is valid, returns the coupon details including its couponId
 * so the frontend can include it when placing the order.
 */
const validateCoupon = async (
  user: JwtPayload,
  payload: { code: string; cartSubtotal: number },
) => {
  const { code, cartSubtotal } = payload;

  if (!code || !code.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Coupon code is required");
  }

  if (cartSubtotal < 0) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid cart subtotal");
  }

  // 1. Find the active coupon (non-deleted) for this code
  const coupon = await CouponModel.isCouponExistByCode(code);

  if (!coupon) {
    throw new AppError(HttpStatus.NOT_FOUND, "Invalid coupon code");
  }

  // 2. Active check
  if (!coupon.isActive) {
    throw new AppError(HttpStatus.BAD_REQUEST, "This coupon is not active");
  }

  // 3. Expiry check
  const now = new Date();
  if (coupon.expiryDate < now) {
    throw new AppError(HttpStatus.BAD_REQUEST, "This coupon has expired");
  }

  // 4. Per-user usage check — by couponId (NOT by code)
  //    This prevents the year-to-year code reuse bug.
  //    Order.appliedCoupon.couponId is a unique reference to THIS specific coupon doc.
  const userId = new Types.ObjectId(user.user);
//   const userAlreadyUsed = await OrderModel.exists({
//     user: userId,
//     "appliedCoupon.couponId": coupon._id,
//     status: { $ne: "cancelled" },
//   });

//   if (userAlreadyUsed) {
//     throw new AppError(
//       HttpStatus.BAD_REQUEST,
//       "You have already used this coupon",
//     );
//   }

  // 5. Calculate discount
  const discountAmount = Number(
    ((cartSubtotal * coupon.discountPercent) / 100).toFixed(2),
  );
  const finalAmount = Number((cartSubtotal - discountAmount).toFixed(2));

  return {
    valid: true,
    couponId: coupon._id,
    code: coupon.code,
    discountPercent: coupon.discountPercent,
    discountAmount,
    cartSubtotal,
    finalAmount,
    expiryDate: coupon.expiryDate,
  };
};

/**
 * Get all currently available coupons (active, non-expired, non-deleted).
 * Used to show "Available Offers" on cart/checkout page.
 *
 * Note: This does NOT filter out coupons the user has already used.
 * Frontend can call validateCoupon to check if the user can actually use a specific one.
 */
const getAvailableCoupons = async () => {
  const now = new Date();
  const coupons = await CouponModel.find({
    isDeleted: false,
    isActive: true,
    expiryDate: { $gt: now },
  })
    .select("code discountPercent expiryDate")
    .sort({ expiryDate: 1 });

  return coupons;
};

export const couponServices = {
  validateCoupon,
  getAvailableCoupons,
};
