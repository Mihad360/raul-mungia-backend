import mongoose, { Types } from "mongoose";
import HttpStatus from "http-status";
import AppError from "../../erros/AppError";
import { JwtPayload } from "../../interface/global";

import { OrderModel } from "../Order/order.model";
import { TOrderStatus, TPaymentStatus } from "../Order/order.interface";
import {
  decrementStockForItems,
  restoreStockForItems,
} from "../Order/order.utils";

import { TransactionModel } from "../Transaction/transaction.model";
import {
  ITransaction,
} from "../Transaction/transaction.interface";

import {
  notifyAdmins,
  notifyCustomer,
} from "../Notification/notification.utils";
import QueryBuilder from "../../../builder/QueryBuilder";
import { fedexClient } from "../../utils/fedex/fedex.client";

/* ============================================================
 * ORDER ADMIN OPERATIONS
 * ============================================================ */

/**
 * Get all orders — admin view (paginated, searchable, filterable)
 */
const getAllOrdersFromDB = async (query: Record<string, unknown>) => {
  const orderQuery = new QueryBuilder(
    OrderModel.find({ isDeleted: false }).populate({
      path: "user",
      select: "name email phone",
    }),
    query,
  )
    .search(["orderNumber"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await orderQuery.countTotal();
  const result = await orderQuery.modelQuery;

  return { meta, result };
};

/**
 * Get single order — admin view
 */
const getSingleOrderForAdminFromDB = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  const order = await OrderModel.findOne({ _id: id, isDeleted: false })
    .populate({
      path: "user",
      select: "name email phone",
    })
    .populate({
      path: "items.product",
      select: "name productCode mainImage",
    });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  // Also fetch related transactions
  const transactions = await TransactionModel.find({
    order: order._id,
    isDeleted: false,
  }).sort({ createdAt: -1 });

  return { order, transactions };
};

/**
 * Confirm manual payment for an order
 * - Creates a Transaction record (type: payment)
 * - Decrements stock
 * - Updates order: paymentStatus → paid, status → processing
 * - Notifies customer
 */
interface IConfirmPaymentPayload {
  amount?: number; // Defaults to order.total
  senderHandle?: string; // Customer's Venmo/CashApp/Zelle handle
  customerReference?: string; // Order number they included
  proofImageUrl?: string; // Optional proof screenshot
  adminNotes?: string;
  gatewayTransactionId?: string; // For automated payments (Bankful)
}

const confirmManualPaymentInDB = async (
  admin: JwtPayload,
  orderId: string,
  payload: IConfirmPaymentPayload,
) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  const adminId = new Types.ObjectId(admin.user);
  const order = await OrderModel.findOne({ _id: orderId, isDeleted: false });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  // Validate payment can be confirmed
  if (order.paymentStatus === "paid") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "This order's payment is already confirmed",
    );
  }

  if (order.paymentStatus === "refunded") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "This order has been refunded — cannot confirm payment",
    );
  }

  if (order.status === "cancelled") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Cannot confirm payment for cancelled order",
    );
  }

  const session = await mongoose.startSession();
  let updatedOrder;
  let createdTransaction;

  try {
    session.startTransaction();

    // Create payment transaction
    const transactionData: Partial<ITransaction> = {
      order: order._id,
      user: order.user,
      type: "payment",
      status: "completed",
      amount: payload.amount || order.total,

      paymentMethodType: order.paymentMethod.type,
      paymentMethodDisplayName: order.paymentMethod.displayName,
      isAutomated: order.paymentMethod.isAutomated,

      // Bankful fields (will be empty for manual payments)
      gatewayTransactionId: payload.gatewayTransactionId || "",

      // Manual payment fields
      senderHandle: payload.senderHandle || "",
      customerReference: payload.customerReference || order.orderNumber,
      proofImageUrl: payload.proofImageUrl || "",
      confirmedBy: adminId,
      confirmedAt: new Date(),

      adminNotes: payload.adminNotes || "",
    };

    const txnArr = await TransactionModel.create([transactionData], {
      session,
    });
    createdTransaction = txnArr[0];

    // Decrement stock (only if not already decremented)
    if (!order.stockDecremented) {
      await decrementStockForItems(order.items, session);
    }

    // Update order
    updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      {
        $set: {
          paymentStatus: "paid" as TPaymentStatus,
          status: "processing" as TOrderStatus,
          latestTransactionId: createdTransaction._id,
          paidAt: new Date(),
          stockDecremented: true,
        },
      },
      { new: true, session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  // Notify customer (non-critical)
  try {
    await notifyCustomer({
      recipientId: order.user,
      type: "payment_captured",
      title: "Payment Confirmed",
      message: `Payment confirmed for order ${order.orderNumber}. Your order is now being processed and will ship soon.`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        transactionId: createdTransaction._id,
      },
    });

    await notifyAdmins({
      type: "payment_received",
      title: "Payment Recorded",
      message: `Payment of $${(payload.amount || order.total).toFixed(2)} confirmed for order ${order.orderNumber}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        transactionId: createdTransaction._id,
      },
    });
  } catch (notifError) {
    console.error("Notification error (non-critical):", notifError);
  }

  return { order: updatedOrder, transaction: createdTransaction };
};

/**
 * Cancel order by admin
 * Works for any status except already cancelled/refunded
 * If stock was decremented (payment was confirmed), restores stock
 */
interface ICancelOrderPayload {
  reason: string;
}

const cancelOrderByAdminInDB = async (
  admin: JwtPayload,
  orderId: string,
  payload: ICancelOrderPayload,
) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  if (!payload.reason || !payload.reason.trim()) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Cancellation reason is required",
    );
  }

  const adminId = new Types.ObjectId(admin.user);
  const order = await OrderModel.findOne({ _id: orderId, isDeleted: false });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  if (order.status === "cancelled") {
    throw new AppError(HttpStatus.BAD_REQUEST, "Order is already cancelled");
  }

  if (order.status === "refunded") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Order is refunded — use refund flow instead",
    );
  }

  if (order.status === "delivered") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Cannot cancel delivered order — use refund flow",
    );
  }

  const session = await mongoose.startSession();
  let updatedOrder;

  try {
    session.startTransaction();

    // Restore stock if it was decremented
    if (order.stockDecremented) {
      await restoreStockForItems(order.items, session);
    }

    updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: "cancelled" as TOrderStatus,
          cancelledAt: new Date(),
          cancellationReason: payload.reason,
          cancelledBy: adminId,
          stockDecremented: false,
        },
      },
      { new: true, session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  // Notify customer
  try {
    await notifyCustomer({
      recipientId: order.user,
      type: "order_cancelled",
      title: "Order Cancelled",
      message: `Your order ${order.orderNumber} has been cancelled by our team. Reason: ${payload.reason}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        wasPaid: order.paymentStatus === "paid",
      },
    });
  } catch (e) {
    console.error("Notification error (non-critical):", e);
  }

  return updatedOrder;
};

/**
 * Process refund for an order
 * - Admin has already manually returned money outside the system
 * - This records the refund in the system
 * - Creates refund Transaction record
 * - Restores stock if it was decremented
 * - Updates order: paymentStatus → refunded, status → refunded
 */
interface IProcessRefundPayload {
  amount: number;
  refundedToHandle?: string; // Where money was sent back (Venmo/etc.)
  refundReference?: string; // Transaction ID from Venmo, etc.
  refundReason: string;
  adminNotes?: string;
}

const processRefundInDB = async (
  admin: JwtPayload,
  orderId: string,
  payload: IProcessRefundPayload,
) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  if (!payload.amount || payload.amount <= 0) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Refund amount must be greater than zero",
    );
  }

  if (!payload.refundReason || !payload.refundReason.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Refund reason is required");
  }

  const adminId = new Types.ObjectId(admin.user);
  const order = await OrderModel.findOne({ _id: orderId, isDeleted: false });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  if (order.paymentStatus !== "paid") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Cannot refund order that hasn't been paid",
    );
  }

  if (order.status === "refunded") {
    throw new AppError(HttpStatus.BAD_REQUEST, "Order is already refunded");
  }

  if (payload.amount > order.total) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      `Refund amount ($${payload.amount}) cannot exceed order total ($${order.total})`,
    );
  }

  const session = await mongoose.startSession();
  let updatedOrder;
  let createdTransaction;

  try {
    session.startTransaction();

    // Create refund transaction
    const transactionData: Partial<ITransaction> = {
      order: order._id,
      user: order.user,
      type: "refund",
      status: "completed",
      amount: payload.amount,

      paymentMethodType: order.paymentMethod.type,
      paymentMethodDisplayName: order.paymentMethod.displayName,
      isAutomated: order.paymentMethod.isAutomated,

      // Refund fields
      refundedToHandle: payload.refundedToHandle || "",
      refundReference: payload.refundReference || "",
      refundReason: payload.refundReason,
      processedBy: adminId,
      processedAt: new Date(),

      adminNotes: payload.adminNotes || "",
    };

    const txnArr = await TransactionModel.create([transactionData], {
      session,
    });
    createdTransaction = txnArr[0];

    // Restore stock if it was decremented
    if (order.stockDecremented) {
      await restoreStockForItems(order.items, session);
    }

    // Update order
    updatedOrder = await OrderModel.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: "refunded" as TOrderStatus,
          paymentStatus: "refunded" as TPaymentStatus,
          latestTransactionId: createdTransaction._id,
          refundedAt: new Date(),
          stockDecremented: false,
        },
      },
      { new: true, session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  // Notify customer
  try {
    await notifyCustomer({
      recipientId: order.user,
      type: "payment_refunded",
      title: "Refund Processed",
      message: `A refund of $${payload.amount.toFixed(2)} has been processed for your order ${order.orderNumber}. Please allow some time for the funds to reflect in your account.`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        refundAmount: payload.amount,
        transactionId: createdTransaction._id,
      },
    });
  } catch (e) {
    console.error("Notification error (non-critical):", e);
  }

  return { order: updatedOrder, transaction: createdTransaction };
};

/**
 * Mark order as shipped
 * Phase 1: Admin manually enters tracking number + label URL
 * Phase 2 (FedEx): Will be replaced with FedEx Ship API call that auto-generates these
 */
interface IMarkShippedPayload {
  trackingNumber: string;
  shippingLabelUrl?: string;
  shippingMethod?: string; // Can update if needed
}

const markOrderAsShippedInDB = async (
  orderId: string,
  payload: IMarkShippedPayload,
) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  if (!payload.trackingNumber || !payload.trackingNumber.trim()) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Tracking number is required");
  }

  const order = await OrderModel.findOne({ _id: orderId, isDeleted: false });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  if (order.paymentStatus !== "paid") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Cannot ship order with unpaid status. Confirm payment first.",
    );
  }

  if (order.status !== "processing") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      `Cannot ship order in "${order.status}" status. Order must be in "processing" status.`,
    );
  }

  const updateData: Record<string, unknown> = {
    status: "shipped" as TOrderStatus,
    trackingNumber: payload.trackingNumber,
    shippedAt: new Date(),
  };

  if (payload.shippingLabelUrl) {
    updateData.shippingLabelUrl = payload.shippingLabelUrl;
  }

  if (payload.shippingMethod) {
    updateData.shippingMethod = payload.shippingMethod;
  }

  const updatedOrder = await OrderModel.findByIdAndUpdate(
    orderId,
    { $set: updateData },
    { new: true },
  );

  // Notify customer
  try {
    await notifyCustomer({
      recipientId: order.user,
      type: "order_shipped",
      title: "Your Order Has Shipped!",
      message: `Order ${order.orderNumber} has been shipped. Tracking number: ${payload.trackingNumber}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: payload.trackingNumber,
      },
    });
  } catch (e) {
    console.error("Notification error (non-critical):", e);
  }

  return updatedOrder;
};

/**
 * Mark order as delivered
 * Phase 1: Admin manually marks
 * Phase 2: Could be automated via FedEx tracking webhooks
 */
const markOrderAsDeliveredInDB = async (orderId: string) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  const order = await OrderModel.findOne({ _id: orderId, isDeleted: false });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  if (order.status !== "shipped") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      `Cannot mark as delivered. Order is in "${order.status}" status. Must be in "shipped" status.`,
    );
  }

  const updatedOrder = await OrderModel.findByIdAndUpdate(
    orderId,
    {
      $set: {
        status: "delivered" as TOrderStatus,
        deliveredAt: new Date(),
      },
    },
    { new: true },
  );

  // Notify customer
  try {
    await notifyCustomer({
      recipientId: order.user,
      type: "order_completed",
      title: "Order Delivered",
      message: `Your order ${order.orderNumber} has been delivered. Thank you for shopping with us!`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
      },
    });
  } catch (e) {
    console.error("Notification error (non-critical):", e);
  }

  return updatedOrder;
};

/**
 * Update admin note on an order
 */
const updateOrderAdminNoteInDB = async (orderId: string, adminNote: string) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  const updatedOrder = await OrderModel.findOneAndUpdate(
    { _id: orderId, isDeleted: false },
    { $set: { adminNote: adminNote || "" } },
    { new: true },
  );

  if (!updatedOrder) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  return updatedOrder;
};

/* ============================================================
 * TRANSACTION ADMIN OPERATIONS
 * ============================================================ */

/**
 * Get all transactions — admin view (paginated, searchable, filterable)
 */
const getAllTransactionsFromDB = async (query: Record<string, unknown>) => {
  const transactionQuery = new QueryBuilder(
    TransactionModel.find({ isDeleted: false })
      .populate({
        path: "order",
        select: "orderNumber total status",
      })
      .populate({
        path: "user",
        select: "name email",
      }),
    query,
  )
    .search(["paymentMethodType", "gatewayTransactionId", "customerReference"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await transactionQuery.countTotal();
  const result = await transactionQuery.modelQuery;

  return { meta, result };
};

/**
 * Get single transaction — admin view
 */
const getSingleTransactionForAdminFromDB = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid transaction ID");
  }

  const transaction = await TransactionModel.findOne({
    _id: id,
    isDeleted: false,
  })
    .populate({
      path: "order",
      select: "orderNumber total status items shippingAddress",
    })
    .populate({
      path: "user",
      select: "name email phone",
    })
    .populate({
      path: "confirmedBy",
      select: "name email",
    })
    .populate({
      path: "processedBy",
      select: "name email",
    });

  if (!transaction) {
    throw new AppError(HttpStatus.NOT_FOUND, "Transaction not found");
  }

  return transaction;
};

/* ============================================================
 * FEDEX INTEGRATION — Shipping Label Generation & Tracking Sync
 * ============================================================ */

/**
 * Generate FedEx shipping label for an order
 * - Calls FedEx Ship API with order details
 * - Receives tracking number + label PDF URL
 * - Updates order: status → shipped, fills tracking info
 * - Notifies customer with tracking link
 *
 * Replaces manual tracking entry — admin just clicks "Generate Label"
 */
const generateShippingLabelInDB = async (orderId: string) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  const order = await OrderModel.findOne({ _id: orderId, isDeleted: false });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  if (order.paymentStatus !== "paid") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Cannot ship order with unpaid status. Confirm payment first.",
    );
  }

  if (order.status !== "processing") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      `Cannot generate label. Order is in "${order.status}" status. Must be in "processing" status.`,
    );
  }

  if (order.trackingNumber) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      `Order already has a tracking number: ${order.trackingNumber}. Use manual update if you need to change it.`,
    );
  }

  // Calculate total package weight from order items
  const totalWeight = order.items.reduce(
    (sum, item) => sum + item.weight * item.quantity,
    0,
  );

  // Determine FedEx service type
  // shippingMethod can be like "FEDEX_GROUND" already, or fallback to ground
  const serviceType = order.shippingMethod || "FEDEX_GROUND";

  // Validate service type is a recognized FedEx service
  const validServiceTypes = [
    "FIRST_OVERNIGHT",
    "PRIORITY_OVERNIGHT",
    "STANDARD_OVERNIGHT",
    "FEDEX_2_DAY_AM",
    "FEDEX_2_DAY",
    "FEDEX_EXPRESS_SAVER",
    "FEDEX_GROUND",
  ];

  if (!validServiceTypes.includes(serviceType)) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      `Invalid shipping method "${serviceType}". Update order shipping method first.`,
    );
  }

  // Call FedEx Ship API
  let shipmentResult;
  try {
    shipmentResult = await fedexClient.createShipment({
      recipientName: order.shippingAddress.fullName,
      recipientPhone: order.shippingAddress.phone,
      recipientEmail: order.shippingAddress.email,
      recipientAddress: {
        streetLines: [
          order.shippingAddress.street,
          order.shippingAddress.apartment || "",
        ].filter((line) => line.trim() !== ""),
        city: order.shippingAddress.city,
        stateOrProvinceCode: order.shippingAddress.state,
        postalCode: order.shippingAddress.postalCode,
        countryCode: order.shippingAddress.country,
      },
      serviceType,
      packageWeight: totalWeight,
      customerReference: order.orderNumber,
    });
  } catch (error) {
    // FedEx error — log and surface friendly message
    console.error("FedEx Ship API failed:", error);
    if (error instanceof AppError) throw error;
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Failed to generate shipping label. Try again or use manual entry as backup.",
    );
  }

  // Update order with shipment details
  const updatedOrder = await OrderModel.findByIdAndUpdate(
    orderId,
    {
      $set: {
        status: "shipped" as TOrderStatus,
        trackingNumber: shipmentResult.trackingNumber,
        shippingLabelUrl: shipmentResult.labelUrl,
        shippedAt: new Date(),
      },
    },
    { new: true },
  );

  // Notify customer
  try {
    await notifyCustomer({
      recipientId: order.user,
      type: "order_shipped",
      title: "Your Order Has Shipped!",
      message: `Order ${order.orderNumber} has been shipped via ${shipmentResult.serviceType}. Tracking number: ${shipmentResult.trackingNumber}`,
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: shipmentResult.trackingNumber,
        labelUrl: shipmentResult.labelUrl,
        serviceType: shipmentResult.serviceType,
      },
    });
  } catch (e) {
    console.error("Notification error (non-critical):", e);
  }

  return {
    order: updatedOrder,
    shipment: shipmentResult,
  };
};

/**
 * Refresh tracking info for a shipped order
 * - Calls FedEx Tracking API
 * - Returns current status + events
 * - Optionally auto-marks order as delivered if status indicates it
 */
const refreshTrackingInfoInDB = async (orderId: string) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  const order = await OrderModel.findOne({ _id: orderId, isDeleted: false });

  if (!order) {
    throw new AppError(HttpStatus.NOT_FOUND, "Order not found");
  }

  if (!order.trackingNumber) {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      "Order has no tracking number. Generate shipping label first.",
    );
  }

  if (order.status === "cancelled" || order.status === "refunded") {
    throw new AppError(
      HttpStatus.BAD_REQUEST,
      `Cannot track ${order.status} order.`,
    );
  }

  // Fetch tracking from FedEx
  let trackingResult;
  try {
    trackingResult = await fedexClient.trackShipment(order.trackingNumber);
  } catch (error) {
    console.error("FedEx Tracking API failed:", error);
    if (error instanceof AppError) throw error;
    throw new AppError(
      HttpStatus.SERVICE_UNAVAILABLE,
      "Unable to fetch tracking info. Please try again.",
    );
  }

  // Auto-update to "delivered" if FedEx confirms delivery
  // FedEx delivered status codes: "DL", "DELIVERED"
  const deliveredCodes = ["DL", "DELIVERED"];
  let updatedOrder = order;

  if (
    deliveredCodes.includes(trackingResult.status.toUpperCase()) &&
    order.status === "shipped"
  ) {
    updatedOrder = (await OrderModel.findByIdAndUpdate(
      orderId,
      {
        $set: {
          status: "delivered" as TOrderStatus,
          deliveredAt: new Date(),
        },
      },
      { new: true },
    )) as typeof order;

    // Notify customer of delivery
    try {
      await notifyCustomer({
        recipientId: order.user,
        type: "order_completed",
        title: "Order Delivered",
        message: `Your order ${order.orderNumber} has been delivered. Thank you for shopping with us!`,
        data: {
          orderId: order._id,
          orderNumber: order.orderNumber,
        },
      });
    } catch (e) {
      console.error("Notification error (non-critical):", e);
    }
  }

  return {
    order: updatedOrder,
    tracking: trackingResult,
  };
};

export const adminServicesV2 = {
  // Order admin
  getAllOrdersFromDB,
  getSingleOrderForAdminFromDB,
  confirmManualPaymentInDB,
  cancelOrderByAdminInDB,
  processRefundInDB,
  markOrderAsShippedInDB,
  markOrderAsDeliveredInDB,
  updateOrderAdminNoteInDB,

  // FedEx (NEW)
  generateShippingLabelInDB,
  refreshTrackingInfoInDB,
  // Transaction admin
  getAllTransactionsFromDB,
  getSingleTransactionForAdminFromDB,
};
