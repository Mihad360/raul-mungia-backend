import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { DiscountServices } from "./discount.service";

const getActiveDiscount = catchAsync(async (_req: Request, res: Response) => {
  const result = await DiscountServices.getActiveDiscountFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result
      ? "Active discount retrieved successfully"
      : "No active discount available",
    data: result,
  });
});

const calculateDiscount = catchAsync(async (req: Request, res: Response) => {
  const { itemsCount, subtotal } = req.body;

  const result = await DiscountServices.calculateDiscountForItems(
    Number(itemsCount) || 0,
    Number(subtotal) || 0
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Discount calculated successfully",
    data: result,
  });
});

export const DiscountControllers = {
  getActiveDiscount,
  calculateDiscount,
};