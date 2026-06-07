import HttpStatus from "http-status";
import { Types } from "mongoose";
import AppError from "../../erros/AppError";
import { JwtPayload } from "../../interface/global";
import { WishlistModel } from "./wishlist.model";
import { ProductModel } from "../Product/product.model";

const getMyWishlist = async (user: JwtPayload) => {
  const userId = new Types.ObjectId(user.user);

  let wishlist = await WishlistModel.findOne({ user: userId }).populate({
    path: "products",
    match: { isDeleted: false, isActive: true },
    populate: { path: "category", select: "name description" },
  });

  // Auto-create empty wishlist if it doesn't exist
  if (!wishlist) {
    wishlist = await WishlistModel.create({ user: userId, products: [] });
  }

  return wishlist;
};

const addToWishlist = async (user: JwtPayload, productId: string) => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid product id");
  }

  // Validate product exists and is active
  const product = await ProductModel.findOne({
    _id: productId,
    isDeleted: false,
    isActive: true,
  });

  if (!product) {
    throw new AppError(HttpStatus.NOT_FOUND, "Product not found");
  }

  const userId = new Types.ObjectId(user.user);
  const productObjectId = new Types.ObjectId(productId);

  // Ensure wishlist exists (create if missing)
  await WishlistModel.findOrCreateByUser(userId);

  // Add product with $addToSet to prevent duplicates
  const updated = await WishlistModel.findOneAndUpdate(
    { user: userId },
    { $addToSet: { products: productObjectId } },
    { new: true },
  ).populate({
    path: "products",
    match: { isDeleted: false, isActive: true },
    populate: { path: "category", select: "name description" },
  });

  if (!updated) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Failed to add product to wishlist",
    );
  }

  return updated;
};

const removeFromWishlist = async (user: JwtPayload, productId: string) => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid product id");
  }

  const userId = new Types.ObjectId(user.user);
  const productObjectId = new Types.ObjectId(productId);

  const wishlist = await WishlistModel.findOne({ user: userId });

  if (!wishlist) {
    throw new AppError(HttpStatus.NOT_FOUND, "Wishlist not found");
  }

  // Check if product is actually in wishlist
  const isInWishlist = wishlist.products.some(
    (p) => p.toString() === productObjectId.toString(),
  );

  if (!isInWishlist) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Product is not in your wishlist",
    );
  }

  // Remove with $pull
  const updated = await WishlistModel.findOneAndUpdate(
    { user: userId },
    { $pull: { products: productObjectId } },
    { new: true },
  ).populate({
    path: "products",
    match: { isDeleted: false, isActive: true },
    populate: { path: "category", select: "name description" },
  });

  if (!updated) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Failed to remove product from wishlist",
    );
  }

  return updated;
};

const clearWishlist = async (user: JwtPayload) => {
  const userId = new Types.ObjectId(user.user);

  const wishlist = await WishlistModel.findOne({ user: userId });

  if (!wishlist) {
    throw new AppError(HttpStatus.NOT_FOUND, "Wishlist not found");
  }

  if (wishlist.products.length === 0) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Wishlist is already empty");
  }

  const updated = await WishlistModel.findOneAndUpdate(
    { user: userId },
    { $set: { products: [] } },
    { new: true },
  );

  return updated;
};

const checkInWishlist = async (user: JwtPayload, productId: string) => {
  if (!Types.ObjectId.isValid(productId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid product id");
  }

  const userId = new Types.ObjectId(user.user);
  const productObjectId = new Types.ObjectId(productId);

  const wishlist = await WishlistModel.findOne({
    user: userId,
    products: productObjectId,
  });

  return { inWishlist: !!wishlist };
};

export const wishlistServices = {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkInWishlist,
};
