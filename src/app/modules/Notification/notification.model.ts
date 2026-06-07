import { model, Schema } from "mongoose";
import { INotification } from "./notification.interface";

const notificationSchema = new Schema<INotification>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        // Customer-side — order lifecycle
        "order_placed",
        "order_confirmed",
        "order_processing",
        "order_shipped",
        "order_completed",
        "order_cancelled",
        // Customer-side — payment lifecycle
        "payment_captured",
        "payment_failed",
        "payment_refunded",
        // Customer-side — misc
        "coupon_applied",
        "welcome",
        // Admin-side — user & business events
        "user_registration",
        "new_order",
        "order_cancelled_by_user",
        "payment_received",
        "payment_refund_requested",
        "low_stock",
        "out_of_stock",
        "new_contact_message",
        "newsletter_signup",
        // Generic / system
        "message",
        "system_announcement",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export const NotificationModel = model<INotification>(
  "Notification",
  notificationSchema,
);
