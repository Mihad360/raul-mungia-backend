import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { JwtPayload } from "../../interface/global";
import { wishlistServices } from "./wishlist.service";

const getMyWishlist = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await wishlistServices.getMyWishlist(user);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Wishlist retrieved successfully",
    data: result,
  });
});

const addToWishlist = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { productId } = req.params;
  const result = await wishlistServices.addToWishlist(
    user,
    productId as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product added to wishlist successfully",
    data: result,
  });
});

const removeFromWishlist = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { productId } = req.params;
  const result = await wishlistServices.removeFromWishlist(
    user,
    productId as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Product removed from wishlist successfully",
    data: result,
  });
});

const clearWishlist = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await wishlistServices.clearWishlist(user);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Wishlist cleared successfully",
    data: result,
  });
});

const checkInWishlist = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { productId } = req.params;
  const result = await wishlistServices.checkInWishlist(
    user,
    productId as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Wishlist check completed",
    data: result,
  });
});

export const wishlistControllers = {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkInWishlist,
};
