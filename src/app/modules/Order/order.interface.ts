import { Types } from "mongoose";

export type TOrderStatus =
  | "pending" // Just created, automated payment in progress
  | "awaiting_payment" // Manual payment — waiting for customer to send
  | "processing" // Payment confirmed, preparing to ship
  | "shipped" // Label generated, package sent
  | "delivered" // Confirmed delivered
  | "cancelled" // Cancelled (by customer or admin)
  | "refunded"; // Refund processed

export type TPaymentStatus =
  | "pending" // Awaiting automated processing
  | "awaiting_confirmation" // Manual payment — admin needs to confirm
  | "paid" // Payment confirmed
  | "failed" // Payment failed
  | "refunded"; // Refund issued

export interface IOrderItem {
  product: Types.ObjectId;
  productName: string;
  productCode: string;
  mainImage: string;
  size: string;
  quantity: number;
  priceAtPurchase: number;
  weight: number;
  lineTotal: number;
}

export interface IShippingAddress {
  fullName: string;
  email: string;
  phone: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IAppliedCoupon {
  couponId: Types.ObjectId;
  code: string;
  discountPercent: number;
  discountAmount: number;
}

export interface IAppliedDiscount {
  discountId: Types.ObjectId;
  tierUsed: {
    minQuantity: number;
    maxQuantity: number | null;
    discountPercent: number;
  };
  itemsCount: number;
  discountPercent: number;
  discountAmount: number;
}

export interface IOrderPaymentMethod {
  paymentMethodId: Types.ObjectId;
  type: string;
  displayName: string;
  isAutomated: boolean;
  handle?: string;
}

export interface IOrder {
  _id?: Types.ObjectId;
  orderNumber: string;
  user: Types.ObjectId;

  items: IOrderItem[];
  totalQuantity: number;

  // Pricing breakdown (all stored as snapshot)
  subtotal: number;
  appliedCoupon: IAppliedCoupon | null;
  couponDiscountAmount: number;
  appliedDiscount: IAppliedDiscount | null;
  bulkDiscountAmount: number;
  shippingCost: number;
  total: number;

  // Customer info
  shippingAddress: IShippingAddress;

  // Payment (high-level only — details in Transaction module)
  paymentMethod: IOrderPaymentMethod;
  paymentStatus: TPaymentStatus;
  latestTransactionId?: Types.ObjectId | null; // Reference to latest Transaction record
  paidAt?: Date;

  // Shipping (FedEx fills these in Phase 2)
  shippingMethod?: string;
  trackingNumber?: string;
  shippingLabelUrl?: string;
  shippedAt?: Date;
  deliveredAt?: Date;

  // Status workflow
  status: TOrderStatus;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: Types.ObjectId;
  refundedAt?: Date;

  customerNote?: string;
  adminNote?: string;

  // Track if stock was decremented (so we know whether to restore on cancel/refund)
  stockDecremented: boolean;

  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
