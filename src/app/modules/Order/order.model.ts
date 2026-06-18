import { Schema, model } from "mongoose";
import {
  IOrder,
  IOrderItem,
  IShippingAddress,
  IAppliedCoupon,
  IAppliedDiscount,
  IOrderPaymentMethod,
  TOrderStatus,
  TPaymentStatus,
} from "./order.interface";

const ORDER_STATUSES: TOrderStatus[] = [
  "pending",
  "awaiting_payment",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

const PAYMENT_STATUSES: TPaymentStatus[] = [
  "pending",
  "awaiting_confirmation",
  "paid",
  "failed",
  "refunded",
];

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    productCode: { type: String, required: true },
    mainImage: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceAtPurchase: { type: Number, required: true, min: 0 },
    weight: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    apartment: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true, default: "US" },
  },
  { _id: false },
);

const appliedCouponSchema = new Schema<IAppliedCoupon>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    code: { type: String, required: true },
    discountPercent: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
  },
  { _id: false },
);

const appliedDiscountSchema = new Schema<IAppliedDiscount>(
  {
    discountId: {
      type: Schema.Types.ObjectId,
      ref: "Discount",
      required: true,
    },
    tierUsed: {
      minQuantity: { type: Number, required: true },
      maxQuantity: { type: Number, default: null },
      discountPercent: { type: Number, required: true },
    },
    itemsCount: { type: Number, required: true },
    discountPercent: { type: Number, required: true },
    discountAmount: { type: Number, required: true },
  },
  { _id: false },
);

const orderPaymentMethodSchema = new Schema<IOrderPaymentMethod>(
  {
    paymentMethodId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    type: { type: String, required: true },
    displayName: { type: String, required: true },
    isAutomated: { type: Boolean, required: true },
    handle: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length > 0,
        message: "Order must have at least one item",
      },
    },
    totalQuantity: { type: Number, required: true, min: 1 },

    subtotal: { type: Number, required: true, min: 0 },
    appliedCoupon: { type: appliedCouponSchema, default: null },
    couponDiscountAmount: { type: Number, default: 0, min: 0 },
    appliedDiscount: { type: appliedDiscountSchema, default: null },
    bulkDiscountAmount: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 }, // existing
    actualShippingCost: { type: Number, default: 0, min: 0 }, // NEW — real FedEx cost
    freeShippingApplied: { type: Boolean, default: false }, // NEW
    freeShippingSavings: { type: Number, default: 0, min: 0 }, // NEW — what Raul covered
    total: { type: Number, required: true, min: 0 }, // existing

    shippingAddress: { type: shippingAddressSchema, required: true },

    paymentMethod: { type: orderPaymentMethodSchema, required: true },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
      index: true,
    },
    latestTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },
    paidAt: { type: Date },

    shippingMethod: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    shippingLabelUrl: { type: String, default: "" },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, default: "" },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
    refundedAt: { type: Date },

    customerNote: { type: String, default: "" },
    adminNote: { type: String, default: "" },

    stockDecremented: { type: Boolean, default: false },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Hide deleted from default queries
orderSchema.pre("find", function () {
  this.where({ isDeleted: { $ne: true } });
});

orderSchema.pre("findOne", function () {
  this.where({ isDeleted: { $ne: true } });
});

export const OrderModel = model<IOrder>("Order", orderSchema);
