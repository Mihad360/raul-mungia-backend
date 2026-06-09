import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { JwtPayload } from "../../interface/global";
import { cartServices } from "./cart.service";

const getMyCart = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await cartServices.getMyCart(user);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Cart retrieved successfully",
    data: result,
  });
});

const getCartSummary = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { couponCode, shippingCost } = req.query;

  const result = await cartServices.getCartSummary(user, {
    couponCode: couponCode as string,
    shippingCost: shippingCost ? Number(shippingCost) : 0,
  });

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Cart summary retrieved successfully",
    data: result,
  });
});

const getCartCount = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await cartServices.getCartCount(user);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Cart count retrieved successfully",
    data: result,
  });
});

const addToCart = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await cartServices.addToCart(user, req.body);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product added to cart successfully",
    data: result,
  });
});

const updateCartItem = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { itemId } = req.params;
  const result = await cartServices.updateCartItem(
    user,
    itemId as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Cart item updated successfully",
    data: result,
  });
});

const removeCartItem = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { itemId } = req.params;
  const result = await cartServices.removeCartItem(user, itemId as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Cart item removed successfully",
    data: result,
  });
});

const clearCart = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await cartServices.clearCart(user);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Cart cleared successfully",
    data: result,
  });
});

export const cartControllers = {
  getMyCart,
  getCartSummary,
  getCartCount,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
};
