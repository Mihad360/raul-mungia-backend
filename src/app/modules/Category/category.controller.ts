import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { categoryServices } from "./category.service";

const getAllCategories = catchAsync(async (req, res) => {
  const result = await categoryServices.getAllCategories(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Categories retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSingleCategory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await categoryServices.getSingleCategory(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Category retrieved successfully",
    data: result,
  });
});

export const categoryControllers = {
  getAllCategories,
  getSingleCategory,
};
