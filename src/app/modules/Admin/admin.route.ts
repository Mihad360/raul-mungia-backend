import express, { NextFunction, Request, Response } from "express";
import auth from "../../middlewares/auth";
import { upload } from "../../utils/sendImageToCloudinary";
import { adminControllers } from "./admin.controller";
import { adminControllersV2 } from "./admin.controller.v2";

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
 * Blog Routes
 * ===================================================================== */

const blogUpload = upload.single("image");

router.get("/blogs", adminControllers.getAllBlogsAdmin);

router.post(
  "/blog/create",
  blogUpload,
  parseFormDataJson,
  adminControllers.createBlog,
);

router.patch(
  "/blog/:id",
  blogUpload,
  parseFormDataJson,
  adminControllers.updateBlog,
);

router.delete("/blog/:id", adminControllers.deleteBlog);

/* =====================================================================
 * Faq Routes
 * ===================================================================== */

router.get("/faqs", adminControllers.getAllFaqsAdmin);
router.post("/faq/create", adminControllers.createFaq);
router.patch("/faq/:id", adminControllers.updateFaq);
router.delete("/faq/:id", adminControllers.deleteFaq);

/* =====================================================================
 * Certification Routes
 * ===================================================================== */

const certificationUpload = upload.single("image");

router.get("/certificates", adminControllers.getAllCertificationsAdmin);

router.post(
  "/certificate/create",
  certificationUpload,
  parseFormDataJson,
  adminControllers.createCertification,
);

router.patch(
  "/certificate/:id",
  certificationUpload,
  parseFormDataJson,
  adminControllers.updateCertification,
);

router.delete("/certificate/:id", adminControllers.deleteCertification);

/* =====================================================================
 * Disclaimer Routes
 * ===================================================================== */

router.post("/disclaimer/create", adminControllers.createDisclaimer);
router.patch("/disclaimer/update", adminControllers.updateDisclaimer);

/* =====================================================================
 * Explore Purity Routes
 * ===================================================================== */

router.post("/explore-purity/create", adminControllers.createExplorePurity);
router.patch("/explore-purity/update", adminControllers.updateExplorePurity);

/* ===================== Discount ===================== */
router.get("/discounts", adminControllers.getAllDiscounts);
router.get("/discount/:id", adminControllers.getSingleDiscount);
router.post("/discount/create", adminControllers.createDiscount);
router.patch("/discount/:id", adminControllers.updateDiscount);
router.delete("/discount/:id", adminControllers.deleteDiscount);

/* ===================== Payment Method ===================== */
router.get("/payment-methods", adminControllers.getAllPaymentMethods);
router.get("/payment-method/:id", adminControllers.getSinglePaymentMethod);
router.post("/payment-method/create", adminControllers.createPaymentMethod);
router.patch("/payment-method/:id", adminControllers.updatePaymentMethod);
router.delete("/payment-method/:id", adminControllers.deletePaymentMethod);

/* ===================== Order ===================== */
router.get("/orders", adminControllersV2.getAllOrders);
router.get("/order/:id", adminControllersV2.getSingleOrderForAdmin);
router.patch(
  "/order/:id/confirm-payment",
  adminControllersV2.confirmManualPayment,
);
router.patch("/order/:id/cancel", adminControllersV2.cancelOrderByAdmin);
router.patch("/order/:id/refund", adminControllersV2.processRefund);
router.patch("/order/:id/ship", adminControllersV2.markOrderAsShipped);
router.patch(
  "/order/:id/generate-label",
  adminControllersV2.generateShippingLabel,
); // ← NEW (FedEx auto)
router.patch(
  "/order/:id/refresh-tracking",
  adminControllersV2.refreshTrackingInfo,
);
router.patch("/order/:id/deliver", adminControllersV2.markOrderAsDelivered);
router.patch("/order/:id/admin-note", adminControllersV2.updateOrderAdminNote);

/* ===================== Transaction ===================== */
router.get("/transactions", adminControllersV2.getAllTransactions);
router.get("/transaction/:id", adminControllersV2.getSingleTransactionForAdmin);

export const adminRoutes = router;
