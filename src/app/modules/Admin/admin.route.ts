import express, { NextFunction, Request, Response } from "express";
import auth from "../../middlewares/auth";
import { upload } from "../../utils/sendImageToCloudinary";
import { adminControllers } from "./admin.controller";

const router = express.Router();

// All admin routes require admin or super_admin role
router.use(auth("admin", "super_admin"));

// Parses `data` JSON string from multipart/form-data body
const parseFormDataJson = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.data) {
    req.body = JSON.parse(req.body.data);
  }
  next();
};

// Product upload config (main image + gallery images)
const productUpload = upload.fields([
  { name: "mainImage", maxCount: 1 },
  { name: "images", maxCount: 10 },
]);

/* =====================================================================
 * Category Routes
 * ===================================================================== */

router.post("/category/create", adminControllers.createCategory);
router.patch("/category/:id", adminControllers.updateCategory);
router.delete("/category/:id", adminControllers.deleteCategory);

/* =====================================================================
 * Product Routes
 * ===================================================================== */

router.get("/product", adminControllers.getAllProductsAdmin);

router.post(
  "/product/create",
  productUpload,
  parseFormDataJson,
  adminControllers.createProduct,
);

router.patch(
  "/product/:id",
  productUpload,
  parseFormDataJson,
  adminControllers.updateProduct,
);

router.delete("/product/:id", adminControllers.deleteProduct);

/* =====================================================================
 * Coupon Routes
 * ===================================================================== */

router.get("/coupons", adminControllers.getAllCouponsAdmin);
router.get("/coupon/:id", adminControllers.getSingleCouponAdmin);
router.post("/coupon/create", adminControllers.createCoupon);
router.patch("/coupon/update/:id", adminControllers.updateCoupon);
router.delete("/coupon/:id", adminControllers.deleteCoupon);

/* =====================================================================
 * Export
 * ===================================================================== */

export const adminRoutes = router;
