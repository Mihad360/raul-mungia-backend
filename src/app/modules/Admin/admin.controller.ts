import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { adminServices } from "./admin.service";

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
};
