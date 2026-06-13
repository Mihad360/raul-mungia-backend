import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { shippingServices } from "./shipping.service";
import { JwtPayload } from "../../interface/global";

const getShippingRates = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await shippingServices.getShippingRatesFromFedEx(
    user,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Shipping rates retrieved successfully",
    data: result,
  });
});

const validateShippingAddress = catchAsync(async (req, res) => {
  const result = await shippingServices.validateShippingAddress(req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Address validation completed",
    data: result,
  });
});

const trackShipment = catchAsync(async (req, res) => {
  const { trackingNumber } = req.params;
  const result = await shippingServices.trackShipmentFromFedEx(
    trackingNumber as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Tracking information retrieved successfully",
    data: result,
  });
});

export const shippingControllers = {
  getShippingRates,
  validateShippingAddress,
  trackShipment,
};
