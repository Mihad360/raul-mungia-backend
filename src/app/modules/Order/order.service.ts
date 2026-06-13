import mongoose, { Types } from "mongoose";
import HttpStatus from "http-status";
import { OrderModel } from "./order.model";
import {
  IOrder,
  IOrderItem,
  IShippingAddress,
  TOrderStatus,
} from "./order.interface";
import { CartModel } from "../Cart/cart.model";
import { PaymentMethodModel } from "../PaymentMethod/paymentMethod.model";
import { cartServices } from "../Cart/cart.service";
import { generateOrderNumber } from "./order.utils";
import AppError from "../../erros/AppError";
import { JwtPayload } from "../../interface/global";
import {
  notifyAdmins,
  notifyCustomer,
} from "../Notification/notification.utils";

interface IPlaceOrderPayload {
  shippingAddress: IShippingAddress;
  paymentMethodId: string;
  shippingMethod?: string;
  shippingCost?: number;
  couponCode?: string;
  customerNote?: string;
}

/**
 * Place a new order — converts user's cart to an order
 * Uses transactions for safety (creates order + clears cart atomically)
 *
 * Note: Stock is NOT decremented here.
 * It's decremented when payment is confirmed (via Transaction module).
 */
const placeOrderInDB = async (
  user: JwtPayload,
  payload: IPlaceOrderPayload,
) => {
  const userId = new Types.ObjectId(user.user);

  // Validate payment method ID
  if (!Types.ObjectId.isValid(payload.paymentMethodId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid payment method ID");
  }

  // Validate shipping address
  if (!payload.shippingAddress) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Shipping address is required");
  }

  const requiredAddressFields: (keyof IShippingAddress)[] = [
    "fullName",
    "email",
    "phone",
    "street",
    "city",
    "state",
    "postalCode",
    "country",
  ];

  for (const field of requiredAddressFields) {
    if (!payload.shippingAddress[field]) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        `Shipping address ${field} is required`,
      );
    }
  }

  // Fetch payment method
  const paymentMethod = await PaymentMethodModel.findOne({
    _id: payload.paymentMethodId,
    isActive: true,
    isDeleted: false,
  });

  if (!paymentMethod) {
    throw new AppError(
      HttpStatus.NOT_FOUND,
      "Selected payment method is not available",
    );
  }

  // Get full cart summary
  const cartSummary = await cartServices.getCartSummary(user, {
    couponCode: payload.couponCode,
    shippingCost: payload.shippingCost || 0,
  });

  if (cartSummary.items.length === 0) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Your cart is empty");
  }

  if (cartSummary.hasUnavailableItems) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Some items in your cart are no longer available. Please review your cart.",
    );
  }

  const availableItems = cartSummary.items.filter((item) => item.available);

  if (availableItems.length === 0) {
    throw new AppError(HttpStatus.BAD_REQUEST, "No available items in cart");
  }

  // Build order items with full snapshots
  const orderItems: IOrderItem[] = [];

  for (const cartItem of availableItems) {
    const productDoc = cartItem.product as unknown as {
      _id: Types.ObjectId;
      title: string;
      productCode: string;
      mainImage: string;
      variants: {
        size: string;
        price: number;
        stock: number;
        weight: number;
      }[];
    };

    const variant = productDoc.variants.find(
      (v) => v.size.toLowerCase() === cartItem.size.toLowerCase(),
    );

    if (!variant) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        `Size ${cartItem.size} no longer available for ${productDoc.title}`,
      );
    }

    orderItems.push({
      product: productDoc._id,
      productName: productDoc.title,
      productCode: productDoc.productCode,
      mainImage: productDoc.mainImage,
      size: variant.size,
      quantity: cartItem.quantity,
      priceAtPurchase: variant.price,
      weight: variant.weight,
      lineTotal: cartItem.lineTotal,
    });
  }
  console.log(orderItems);
  // Determine initial statuses based on payment method
  const initialOrderStatus: TOrderStatus = paymentMethod.isAutomated
    ? "pending"
    : "awaiting_payment";

  const initialPaymentStatus = paymentMethod.isAutomated
    ? "pending"
    : "awaiting_confirmation";

  // Generate unique order number
  const orderNumber = await generateOrderNumber();

  // Build order document
  const orderData: Partial<IOrder> = {
    orderNumber,
    user: userId,
    items: orderItems,
    totalQuantity: cartSummary.totalQuantity,

    subtotal: cartSummary.subtotal,
    appliedCoupon: cartSummary.appliedCoupon
      ? {
          couponId: cartSummary.appliedCoupon.couponId as Types.ObjectId,
          code: cartSummary.appliedCoupon.code,
          discountPercent: cartSummary.appliedCoupon.discountPercent,
          discountAmount: cartSummary.couponDiscountAmount,
        }
      : null,
    couponDiscountAmount: cartSummary.couponDiscountAmount,
    appliedDiscount: cartSummary.appliedDiscount
      ? {
          discountId: cartSummary.appliedDiscount.discountId as Types.ObjectId,
          tierUsed: cartSummary.appliedDiscount.tierUsed,
          itemsCount: cartSummary.appliedDiscount.itemsCount,
          discountPercent: cartSummary.appliedDiscount.discountPercent,
          discountAmount: cartSummary.bulkDiscountAmount,
        }
      : null,
    bulkDiscountAmount: cartSummary.bulkDiscountAmount,
    shippingCost: cartSummary.shippingCost,
    total: cartSummary.total,

    shippingAddress: payload.shippingAddress,

    paymentMethod: {
      paymentMethodId: paymentMethod._id!,
      type: paymentMethod.type,
      displayName: paymentMethod.displayName,
      isAutomated: paymentMethod.isAutomated,
      handle: paymentMethod.handle || "",
    },
    paymentStatus: initialPaymentStatus,
    latestTransactionId: null,

    shippingMethod: payload.shippingMethod || "",

    status: initialOrderStatus,
    customerNote: payload.customerNote || "",
    stockDecremented: false,
  };

  // Create order with transaction (and clear cart)
  const session = await mongoose.startSession();
  let createdOrder;

  try {
    session.startTransaction();

    const orderArr = await OrderModel.create([orderData], { session });
    createdOrder = orderArr[0];

    // Clear the user's cart
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

  // Send notifications (outside transaction — non-critical)
  try {
    // Notify all admins about new order
    await notifyAdmins({
      type: "new_order",
      title: "New Order Received",
      message: `Order ${createdOrder.orderNumber} placed. Payment method: ${createdOrder.paymentMethod.displayName}. Total: $${createdOrder.total.toFixed(2)}`,
      data: {
        orderId: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
        total: createdOrder.total,
        isAutomatedPayment: paymentMethod.isAutomated,
      },
    });

    // Notify the customer about their order
    await notifyCustomer({
      recipientId: userId,
      type: "order_placed",
      title: paymentMethod.isAutomated
        ? "Order Placed Successfully"
        : "Order Placed — Awaiting Payment",
      message: paymentMethod.isAutomated
        ? `Your order ${createdOrder.orderNumber} has been placed. Total: $${createdOrder.total.toFixed(2)}. We'll send you an update once payment is confirmed.`
        : `Your order ${createdOrder.orderNumber} is awaiting payment via ${createdOrder.paymentMethod.displayName}. Please send $${createdOrder.total.toFixed(2)} to ${createdOrder.paymentMethod.handle} and include your order number in the note. Your order will ship after payment confirmation.`,
      data: {
        orderId: createdOrder._id,
        orderNumber: createdOrder.orderNumber,
      },
    });
  } catch (notifError) {
    console.error("Notification error (non-critical):", notifError);
  }

  return createdOrder;
};

/**
 * Get my orders — paginated list for logged-in customer
 */
const getMyOrdersFromDB = async (
  user: JwtPayload,
  query: Record<string, unknown>,
) => {
  const userId = new Types.ObjectId(user.user);
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const status = query.status as string | undefined;

  const filter: Record<string, unknown> = {
    user: userId,
    isDeleted: false,
  };

  if (status) {
    filter.status = status;
  }

  const total = await OrderModel.countDocuments(filter);
  const totalPage = Math.ceil(total / limit);

  const result = await OrderModel.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
    result,
  };
};

/**
 * Get single order — must belong to user
 */
const getMySingleOrderFromDB = async (user: JwtPayload, orderId: string) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  const order = await OrderModel.findOne({
    _id: orderId,
    user: new Types.ObjectId(user.user),
    isDeleted: false,
  });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

/**
 * Customer cancels their own order
 * Only allowed if status is "pending" or "awaiting_payment"
 */
const cancelMyOrderInDB = async (
  user: JwtPayload,
  orderId: string,
  reason?: string,
) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  const userId = new Types.ObjectId(user.user);

  const order = await OrderModel.findOne({
    _id: orderId,
    user: userId,
    isDeleted: false,
  });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  const cancellableStatuses: TOrderStatus[] = ["pending", "awaiting_payment"];
  if (!cancellableStatuses.includes(order.status)) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      `Cannot cancel order in "${order.status}" status. Please contact support if you need to cancel.`,
    );
  }

  order.status = "cancelled";
  order.cancelledAt = new Date();
  order.cancellationReason = reason || "Cancelled by customer";
  order.cancelledBy = userId;
  await order.save();

  try {
    // Notify admins that customer cancelled
    await notifyAdmins({
      type: "order_cancelled_by_user",
      title: "Order Cancelled by Customer",
      message: `Order ${order.orderNumber} was cancelled by the customer. Reason: ${order.cancellationReason}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
      },
    });
  } catch (e) {
    console.error("Notification error (non-critical):", e);
  }

  return order;
};

/**
 * Get my latest order — useful for "thank you" page after checkout
 */
const getMyLatestOrderFromDB = async (user: JwtPayload) => {
  const userId = new Types.ObjectId(user.user);

  const order = await OrderModel.findOne({
    user: userId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  return order;
};

export const orderServices = {
  placeOrderInDB,
  getMyOrdersFromDB,
  getMySingleOrderFromDB,
  cancelMyOrderInDB,
  getMyLatestOrderFromDB,
};
