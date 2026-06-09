import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { adminServices } from "./admin.service";
import { JwtPayload } from "../../interface/global";

const createCategory = catchAsync(async (req, res) => {
  const result = await adminServices.createCategory(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.updateCategory(id as string, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.deleteCategory(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Category deleted successfully",
    data: result,
  });
});

// ─── Product ───────────────────────────────────────

const createProduct = catchAsync(async (req, res) => {
  const files = req.files as {
    mainImage?: Express.Multer.File[];
    images?: Express.Multer.File[];
  };
  const result = await adminServices.createProduct(files, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Product created successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const files = req.files as
    | { mainImage?: Express.Multer.File[]; images?: Express.Multer.File[] }
    | undefined;
  const result = await adminServices.updateProduct(
    id as string,
    files,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product updated successfully",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.deleteProduct(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product deleted successfully",
    data: result,
  });
});

const getAllProductsAdmin = catchAsync(async (req, res) => {
  const result = await adminServices.getAllProductsAdmin(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Products retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

// ─── Coupon ───────────────────────────────────────

const createCoupon = catchAsync(async (req, res) => {
  const result = await adminServices.createCoupon(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Coupon created successfully",
    data: result,
  });
});

const updateCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.updateCoupon(id as string, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupon updated successfully",
    data: result,
  });
});

const deleteCoupon = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.deleteCoupon(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupon deleted successfully",
    data: result,
  });
});

const getAllCouponsAdmin = catchAsync(async (req, res) => {
  const result = await adminServices.getAllCouponsAdmin(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupons retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSingleCouponAdmin = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.getSingleCouponAdmin(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Coupon retrieved successfully",
    data: result,
  });
});

// ─── Blog ───────────────────────────────────────

const createBlog = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File | undefined;
  const result = await adminServices.createBlog(file, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Blog created successfully",
    data: result,
  });
});

const updateBlog = catchAsync(async (req, res) => {
  const { id } = req.params;
  const file = req.file as Express.Multer.File | undefined;
  const result = await adminServices.updateBlog(id as string, file, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Blog updated successfully",
    data: result,
  });
});

const deleteBlog = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.deleteBlog(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Blog deleted successfully",
    data: result,
  });
});

const getAllBlogsAdmin = catchAsync(async (req, res) => {
  const result = await adminServices.getAllBlogsAdmin(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Blogs retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

// ─── Faq ───────────────────────────────────────

const createFaq = catchAsync(async (req, res) => {
  const result = await adminServices.createFaq(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Faq created successfully",
    data: result,
  });
});

const updateFaq = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.updateFaq(id as string, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Faq updated successfully",
    data: result,
  });
});

const deleteFaq = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.deleteFaq(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Faq deleted successfully",
    data: result,
  });
});

const getAllFaqsAdmin = catchAsync(async (req, res) => {
  const result = await adminServices.getAllFaqsAdmin(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Faqs retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

// ─── Certification ───────────────────────────────────────

const createCertification = catchAsync(async (req, res) => {
  const file = req.file as Express.Multer.File | undefined;
  const result = await adminServices.createCertification(file, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Certification created successfully",
    data: result,
  });
});

const updateCertification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const file = req.file as Express.Multer.File | undefined;
  const result = await adminServices.updateCertification(
    id as string,
    file,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Certification updated successfully",
    data: result,
  });
});

const deleteCertification = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.deleteCertification(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Certification deleted successfully",
    data: result,
  });
});

const getAllCertificationsAdmin = catchAsync(async (req, res) => {
  const result = await adminServices.getAllCertificationsAdmin(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Certifications retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

// ─── Disclaimer ───────────────────────────────────────

const createDisclaimer = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await adminServices.createDisclaimer(req.body, user);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Disclaimer created successfully",
    data: result,
  });
});

const updateDisclaimer = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await adminServices.updateDisclaimer(req.body, user);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Disclaimer updated successfully",
    data: result,
  });
});

// ─── Explore Purity ───────────────────────────────────────

const createExplorePurity = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await adminServices.createExplorePurity(req.body, user);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Explore Purity created successfully",
    data: result,
  });
});

const updateExplorePurity = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await adminServices.updateExplorePurity(req.body, user);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Explore Purity updated successfully",
    data: result,
  });
});

// ===== Discount Admin Controllers =====

const createDiscount = catchAsync(async (req, res) => {
  const result = await adminServices.createDiscountInDB(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Discount created successfully",
    data: result,
  });
});

const getAllDiscounts = catchAsync(async (req, res) => {
  const result = await adminServices.getAllDiscountsFromDB(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Discounts retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSingleDiscount = catchAsync(async (req, res) => {
  const result = await adminServices.getSingleDiscountFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Discount retrieved successfully",
    data: result,
  });
});

const updateDiscount = catchAsync(async (req, res) => {
  const result = await adminServices.updateDiscountInDB(
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Discount updated successfully",
    data: result,
  });
});

const deleteDiscount = catchAsync(async (req, res) => {
  const result = await adminServices.deleteDiscountFromDB(
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Discount deleted successfully",
    data: result,
  });
});

// ===== Payment Method Admin Controllers =====

const createPaymentMethod = catchAsync(async (req, res) => {
  const result = await adminServices.createPaymentMethodInDB(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Payment method created successfully",
    data: result,
  });
});

const getAllPaymentMethods = catchAsync(async (req, res) => {
  const result = await adminServices.getAllPaymentMethodsFromDB(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Payment methods retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSinglePaymentMethod = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.getSinglePaymentMethodFromDB(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Payment method retrieved successfully",
    data: result,
  });
});

const updatePaymentMethod = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.updatePaymentMethodInDB(
    id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Payment method updated successfully",
    data: result,
  });
});

const deletePaymentMethod = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServices.deletePaymentMethodFromDB(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Payment method deleted successfully",
    data: result,
  });
});

export const adminControllers = {
  // Category
  createCategory,
  updateCategory,
  deleteCategory,
  // Product
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProductsAdmin,
  // Coupon
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getAllCouponsAdmin,
  getSingleCouponAdmin,
  // Blog
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogsAdmin,
  // Faq
  createFaq,
  updateFaq,
  deleteFaq,
  getAllFaqsAdmin,
  // Certification
  createCertification,
  updateCertification,
  deleteCertification,
  getAllCertificationsAdmin,
  // Disclaimer
  createDisclaimer,
  updateDisclaimer,
  // Explore Purity
  createExplorePurity,
  updateExplorePurity,
  // Discount
  createDiscount,
  getAllDiscounts,
  getSingleDiscount,
  updateDiscount,
  deleteDiscount,
  // Payment Method
  createPaymentMethod,
  getAllPaymentMethods,
  getSinglePaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
};
