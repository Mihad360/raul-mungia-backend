import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { productServices } from "./product.service";

const getAllProducts = catchAsync(async (req, res) => {
  const result = await productServices.getAllProducts(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Products retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSingleProduct = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await productServices.getSingleProduct(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product retrieved successfully",
    data: result,
  });
});

const getRelatedProducts = catchAsync(async (req, res) => {
  const { id } = req.params;
  const limit = req.query.limit ? Number(req.query.limit) : 4;
  const result = await productServices.getRelatedProducts(id as string, limit);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Related products retrieved successfully",
    data: result,
  });
});

const getProductsByCategory = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  const result = await productServices.getProductsByCategory(
    categoryId as string,
    req.query,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Products by category retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

export const productControllers = {
  getAllProducts,
  getSingleProduct,
  getRelatedProducts,
  getProductsByCategory,
};
