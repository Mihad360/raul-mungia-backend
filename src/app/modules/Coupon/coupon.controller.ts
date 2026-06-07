import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { JwtPayload } from "../../interface/global";
import { couponServices } from "./coupon.service";

const validateCoupon = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await couponServices.validateCoupon(user, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupon is valid",
    data: result,
  });
});

const getAvailableCoupons = catchAsync(async (req, res) => {
  const result = await couponServices.getAvailableCoupons();

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Available coupons retrieved successfully",
    data: result,
  });
});

export const couponControllers = {
  validateCoupon,
  getAvailableCoupons,
};
