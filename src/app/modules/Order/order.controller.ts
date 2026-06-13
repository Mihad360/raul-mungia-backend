import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { orderServices } from "./order.service";
import { JwtPayload } from "../../interface/global";

const placeOrder = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await orderServices.placeOrderInDB(user, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.CREATED,
    success: true,
    message: "Order placed successfully",
    data: result,
  });
});

const getMyOrders = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await orderServices.getMyOrdersFromDB(user, req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Orders retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getMyLatestOrder = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await orderServices.getMyLatestOrderFromDB(user);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: result ? "Latest order retrieved successfully" : "No orders found",
    data: result,
  });
});

const getMySingleOrder = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { id } = req.params;
  const result = await orderServices.getMySingleOrderFromDB(user, id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Order retrieved successfully",
    data: result,
  });
});

const cancelMyOrder = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { id } = req.params;
  const { reason } = req.body;

  const result = await orderServices.cancelMyOrderInDB(
    user,
    id as string,
    reason,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Order cancelled successfully",
    data: result,
  });
});

export const orderControllers = {
  placeOrder,
  getMyOrders,
  getMyLatestOrder,
  getMySingleOrder,
  cancelMyOrder,
};
