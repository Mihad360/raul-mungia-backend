import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { paymentMethodServices } from "./paymentMethod.service";

const getActivePaymentMethods = catchAsync(async (req, res) => {
  const result = await paymentMethodServices.getActivePaymentMethodsFromDB();

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Active payment methods retrieved successfully",
    data: result,
  });
});

export const paymentMethodControllers = {
  getActivePaymentMethods,
};
