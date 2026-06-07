import express from "express";
import auth from "../../middlewares/auth";
import { couponControllers } from "./coupon.controller";

const router = express.Router();

// Public: list available active coupons (e.g., for "Available Offers" UI)
router.get("/available", couponControllers.getAvailableCoupons);

// User: validate a coupon at checkout
router.post(
  "/validate",
  auth("user", "admin", "super_admin"),
  couponControllers.validateCoupon,
);

export const couponRoutes = router;
