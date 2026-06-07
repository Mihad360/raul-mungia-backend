import { Types } from "mongoose";

export type NotificationType =
  // Customer-side — order lifecycle
  | "order_placed"
  | "order_confirmed"
  | "order_processing"
  | "order_shipped"
  | "order_completed"
  | "order_cancelled"
  // Customer-side — payment lifecycle
  | "payment_captured"
  | "payment_failed"
  | "payment_refunded"
  // Customer-side — misc
  | "coupon_applied"
  | "welcome"
  // Admin-side — user & business events
  | "user_registration"
  | "new_order"
  | "order_cancelled_by_user"
  | "payment_received"
  | "payment_refund_requested"
  | "low_stock"
  | "out_of_stock"
  | "new_contact_message"
  | "newsletter_signup"
  // Generic / system
  | "message"
  | "system_announcement";

export interface INotification {
  _id?: Types.ObjectId;
  sender?: Types.ObjectId | null;
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>; // extra info: orderId, productId, paymentId, couponCode, etc.
  isRead?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SendNotificationPayload {
  recipientId: Types.ObjectId | string;
  senderId?: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}
