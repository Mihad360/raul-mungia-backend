import HttpStatus from "http-status";
import mongoose, { Types } from "mongoose";
import AppError from "../../erros/AppError";
import { JwtPayload } from "../../interface/global";
import { CartModel } from "./cart.model";
import { ProductModel } from "../Product/product.model";
import { couponServices } from "../Coupon/coupon.service";
import { DiscountServices } from "../Discount/discount.service";
import config from "../../config";

/**
 * Helper: case-insensitive size comparison
 */
const normalizeSize = (size: string) => size.toLowerCase().trim();

/**
 * Helper: find a variant within a product by size (case-insensitive)
 */
const findVariant = (
  product: { variants: { size: string; price: number; stock: number }[] },
  size: string,
) => {
  return product.variants.find(
    (v) => normalizeSize(v.size) === normalizeSize(size),
  );
};

/**
 * Get my cart with populated product info
 */
const getMyCart = async (user: JwtPayload) => {
  const userId = new Types.ObjectId(user.user);

  let cart = await CartModel.findOne({ user: userId }).populate({
    path: "items.product",
    match: { isDeleted: false, isActive: true },
    populate: { path: "category", select: "name description" },
  });

  // Auto-create empty cart if missing
  if (!cart) {
    cart = await CartModel.create({ user: userId, items: [] });
  }

  return cart;
};

/**
 * Add item to cart (or increase qty if same product + same size already exists)
 * Uses transaction for stock validation atomicity
 */
const addToCart = async (
  user: JwtPayload,
  payload: { productId: string; size: string; quantity: number },
) => {
  const { productId, size, quantity } = payload;

  // ─── Basic validation ──────────────────────────────────────────────
  if (!Types.ObjectId.isValid(productId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid product id");
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Quantity must be a positive integer",
    );
  }

  if (!size || !size.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Size is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ─── Fetch product within transaction ────────────────────────────
    const product = await ProductModel.findOne({
      _id: new Types.ObjectId(productId),
      isDeleted: false,
      isActive: true,
    }).session(session);

    if (!product) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        "Product not found or unavailable",
      );
    }

    // ─── Validate variant (size + stock) ─────────────────────────────
    const variant = findVariant(product, size);

    if (!variant) {
      const availableSizes = product.variants.map((v) => v.size).join(", ");
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        `Size '${size}' is not available for this product. Available sizes: ${availableSizes}`,
      );
    }

    if (variant.stock <= 0) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        `Size '${variant.size}' is out of stock`,
      );
    }

    const userId = new Types.ObjectId(user.user);
    const productObjectId = new Types.ObjectId(productId);

    // ─── Ensure cart exists ──────────────────────────────────────────
    let cart = await CartModel.findOne({ user: userId }).session(session);
    if (!cart) {
      const created = await CartModel.create([{ user: userId, items: [] }], {
        session,
      });
      cart = created[0];
    }

    // ─── Check if same product + same size already in cart ───────────
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productObjectId.toString() &&
        normalizeSize(item.size) === normalizeSize(size),
    );

    if (existingItem) {
      // Increase quantity
      const newQuantity = existingItem.quantity + quantity;

      if (newQuantity > variant.stock) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          `Cannot add ${quantity} more. Only ${variant.stock - existingItem.quantity} units left for size '${variant.size}'.`,
        );
      }

      await CartModel.findOneAndUpdate(
        { user: userId, "items._id": existingItem._id },
        { $set: { "items.$.quantity": newQuantity } },
        { session },
      );
    } else {
      // Add new cart item
      if (quantity > variant.stock) {
        throw new AppError(
          HttpStatus.BAD_REQUEST,
          `Only ${variant.stock} units available for size '${variant.size}'`,
        );
      }

      await CartModel.findOneAndUpdate(
        { user: userId },
        {
          $push: {
            items: {
              product: productObjectId,
              size: variant.size, // store as it exists in product (normalized casing)
              quantity,
            },
          },
        },
        { session },
      );
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  // ─── Re-fetch with populate after commit ─────────────────────────
  const finalCart = await CartModel.findOne({
    user: new Types.ObjectId(user.user),
  }).populate({
    path: "items.product",
    match: { isDeleted: false, isActive: true },
    populate: { path: "category", select: "name description" },
  });

  return finalCart;
};

/**
 * Update quantity of a specific cart item
 * Uses transaction for stock validation
 */
const updateCartItem = async (
  user: JwtPayload,
  itemId: string,
  payload: { quantity: number },
) => {
  if (!Types.ObjectId.isValid(itemId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid cart item id");
  }

  if (!Number.isInteger(payload.quantity) || payload.quantity < 1) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Quantity must be a positive integer",
    );
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = new Types.ObjectId(user.user);

    const cart = await CartModel.findOne({ user: userId }).session(session);

    if (!cart) {
      throw new AppError(HttpStatus.NOT_FOUND, "Cart not found");
    }

    const item = cart.items.find((i) => i._id?.toString() === itemId);

    if (!item) {
      throw new AppError(HttpStatus.NOT_FOUND, "Cart item not found");
    }

    // ─── Verify product + variant still valid ───────────────────────
    const product = await ProductModel.findOne({
      _id: item.product,
      isDeleted: false,
      isActive: true,
    }).session(session);

    if (!product) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        "Product associated with this item is no longer available",
      );
    }

    const variant = findVariant(product, item.size);

    if (!variant) {
      throw new AppError(
        HttpStatus.NOT_FOUND,
        `Size '${item.size}' is no longer available for this product`,
      );
    }

    if (payload.quantity > variant.stock) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        `Only ${variant.stock} units available for size '${variant.size}'`,
      );
    }

    await CartModel.findOneAndUpdate(
      { user: userId, "items._id": new Types.ObjectId(itemId) },
      { $set: { "items.$.quantity": payload.quantity } },
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  const finalCart = await CartModel.findOne({
    user: new Types.ObjectId(user.user),
  }).populate({
    path: "items.product",
    match: { isDeleted: false, isActive: true },
    populate: { path: "category", select: "name description" },
  });

  return finalCart;
};

/**
 * Remove specific item from cart
 * Uses transaction for safety
 */
const removeCartItem = async (user: JwtPayload, itemId: string) => {
  if (!Types.ObjectId.isValid(itemId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid cart item id");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = new Types.ObjectId(user.user);

    const cart = await CartModel.findOne({ user: userId }).session(session);

    if (!cart) {
      throw new AppError(HttpStatus.NOT_FOUND, "Cart not found");
    }

    const itemExists = cart.items.some((i) => i._id?.toString() === itemId);

    if (!itemExists) {
      throw new AppError(HttpStatus.NOT_FOUND, "Cart item not found");
    }

    await CartModel.findOneAndUpdate(
      { user: userId },
      { $pull: { items: { _id: new Types.ObjectId(itemId) } } },
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  const finalCart = await CartModel.findOne({
    user: new Types.ObjectId(user.user),
  }).populate({
    path: "items.product",
    match: { isDeleted: false, isActive: true },
    populate: { path: "category", select: "name description" },
  });

  return finalCart;
};

/**
 * Clear all items from cart
 */
const clearCart = async (user: JwtPayload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = new Types.ObjectId(user.user);

    const cart = await CartModel.findOne({ user: userId }).session(session);

    if (!cart) {
      throw new AppError(HttpStatus.NOT_FOUND, "Cart not found");
    }

    if (cart.items.length === 0) {
      throw new AppError(HttpStatus.BAD_REQUEST, "Cart is already empty");
    }

    await CartModel.findOneAndUpdate(
      { user: userId },
      { $set: { items: [] } },
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  return await CartModel.findOne({
    user: new Types.ObjectId(user.user),
  });
};

/**
 * Get cart count (for cart icon badge)
 * No transaction needed — pure read
 */
const getCartCount = async (user: JwtPayload) => {
  const userId = new Types.ObjectId(user.user);
  const cart = await CartModel.findOne({ user: userId });

  if (!cart) {
    return { totalItems: 0, totalQuantity: 0 };
  }

  const totalItems = cart.items.length;
  const totalQuantity = cart.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return { totalItems, totalQuantity };
};

/**
 * Get cart with totals — useful for checkout preview
 * Now supports optional coupon code + shipping cost for full breakdown
 *
 * Pricing flow:
 *   subtotal → minus coupon discount → minus bulk discount → plus shipping = total
 */
const getCartSummary = async (
  user: JwtPayload,
  options?: { couponCode?: string; shippingCost?: number },
) => {
  const userId = new Types.ObjectId(user.user);
  const couponCode = options?.couponCode?.trim();
  const shippingCost = Number(options?.shippingCost) || 0;

  const cart = await CartModel.findOne({ user: userId }).populate({
    path: "items.product",
    match: { isDeleted: false, isActive: true },
    populate: { path: "category", select: "name description" },
  });

  // Empty cart shortcut
  if (!cart) {
    return {
      items: [],
      totalItems: 0,
      totalQuantity: 0,
      subtotal: 0,
      appliedCoupon: null,
      couponDiscountAmount: 0,
      subtotalAfterCoupon: 0,
      appliedDiscount: null,
      bulkDiscountAmount: 0,
      subtotalAfterAllDiscounts: 0,
      shippingCost: 0,
      total: 0,
      hasUnavailableItems: false,
      freeShippingEligible: false,
      freeShippingThreshold: config.FREE_SHIPPING_THRESHOLD,
      amountToFreeShipping: config.FREE_SHIPPING_THRESHOLD,
    };
  }

  // ===== Step 1: Calculate base subtotal from cart items =====
  let subtotal = 0;
  let totalQuantity = 0;
  let hasUnavailableItems = false;
  const itemSummaries = [];

  for (const item of cart.items) {
    if (!item.product || typeof item.product === "string") {
      hasUnavailableItems = true;
      itemSummaries.push({
        _id: item._id,
        product: null,
        size: item.size,
        quantity: item.quantity,
        price: 0,
        lineTotal: 0,
        available: false,
      });
      continue;
    }

    const productDoc = item.product as unknown as {
      variants: { size: string; price: number; stock: number }[];
    };

    const variant = findVariant(productDoc, item.size);

    if (!variant) {
      hasUnavailableItems = true;
      itemSummaries.push({
        _id: item._id,
        product: item.product,
        size: item.size,
        quantity: item.quantity,
        price: 0,
        lineTotal: 0,
        available: false,
        reason: "Size no longer available",
      });
      continue;
    }

    if (variant.stock < item.quantity) {
      hasUnavailableItems = true;
      itemSummaries.push({
        _id: item._id,
        product: item.product,
        size: item.size,
        quantity: item.quantity,
        availableStock: variant.stock,
        price: variant.price,
        lineTotal: variant.price * variant.stock,
        available: false,
        reason: `Only ${variant.stock} in stock`,
      });
      continue;
    }

    const lineTotal = variant.price * item.quantity;
    subtotal += lineTotal;
    totalQuantity += item.quantity;

    itemSummaries.push({
      _id: item._id,
      product: item.product,
      size: variant.size,
      quantity: item.quantity,
      price: variant.price,
      lineTotal,
      available: true,
    });
  }

  subtotal = Number(subtotal.toFixed(2));

  // ===== Step 2: Apply Coupon (if provided) =====
  let appliedCoupon = null;
  let couponDiscountAmount = 0;

  if (couponCode && subtotal > 0) {
    const couponValidation = await couponServices.validateCouponForCart(
      couponCode,
      user,
    );

    if (couponValidation.valid && couponValidation.coupon) {
      appliedCoupon = {
        couponId: couponValidation.coupon._id,
        code: couponValidation.coupon.code,
        discountPercent: couponValidation.coupon.discountPercent,
      };
      couponDiscountAmount = Number(
        ((subtotal * couponValidation.coupon.discountPercent) / 100).toFixed(2),
      );
    }
  }

  const subtotalAfterCoupon = Number(
    (subtotal - couponDiscountAmount).toFixed(2),
  );

  // ===== Step 3: Apply Bulk Discount (auto) =====
  const discountCalculation = await DiscountServices.calculateDiscountForItems(
    totalQuantity,
    subtotalAfterCoupon,
  );

  const appliedDiscount = discountCalculation.tierUsed
    ? {
        discountId: discountCalculation.discountId,
        tierUsed: discountCalculation.tierUsed,
        itemsCount: discountCalculation.itemsCount,
        discountPercent: discountCalculation.discountPercent,
      }
    : null;

  const bulkDiscountAmount = discountCalculation.discountAmount;

  const subtotalAfterAllDiscounts = Number(
    (subtotalAfterCoupon - bulkDiscountAmount).toFixed(2),
  );

  // ===== Step 4: Free Shipping Eligibility =====
  // Checked against ORIGINAL subtotal (industry standard, customer-friendly)
  const freeShippingThreshold = config.FREE_SHIPPING_THRESHOLD;
  const freeShippingEligible =
    config.FREE_SHIPPING_ENABLED && subtotal >= freeShippingThreshold;
  const amountToFreeShipping = freeShippingEligible
    ? 0
    : Number((freeShippingThreshold - subtotal).toFixed(2));

  // ===== Step 5: Add shipping cost (if provided) =====
  const total = Number((subtotalAfterAllDiscounts + shippingCost).toFixed(2));

  return {
    items: itemSummaries,
    totalItems: cart.items.length,
    totalQuantity,
    subtotal,
    appliedCoupon,
    couponDiscountAmount,
    subtotalAfterCoupon,
    appliedDiscount,
    bulkDiscountAmount,
    subtotalAfterAllDiscounts,
    shippingCost: Number(shippingCost.toFixed(2)),
    total,
    hasUnavailableItems,
    freeShippingEligible,
    freeShippingThreshold,
    amountToFreeShipping,
  };
};

export const cartServices = {
  getMyCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getCartCount,
  getCartSummary,
};
