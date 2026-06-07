import HttpStatus from "http-status";
import { ClientSession, Types } from "mongoose";
import { UserModel } from "../User/user.model";
import {
  INotification,
  SendNotificationPayload,
} from "./notification.interface";
import { connectedUsers, io } from "../../utils/socket";
import { sendPushNotifications } from "../../utils/firebase/notification";
import AppError from "../../erros/AppError";
import { NotificationModel } from "./notification.model";

// ─── Map each type to its specific socket event name ─────────────────────────
const getSocketEvent = (
  type: INotification["type"],
  recipientId: string,
): string => {
  const eventMap: Record<INotification["type"], string> = {
    // Customer-side — order lifecycle
    order_placed: `order_placed-${recipientId}`,
    order_confirmed: `order_confirmed-${recipientId}`,
    order_processing: `order_processing-${recipientId}`,
    order_shipped: `order_shipped-${recipientId}`,
    order_completed: `order_completed-${recipientId}`,
    order_cancelled: `order_cancelled-${recipientId}`,
    // Customer-side — payment lifecycle
    payment_captured: `payment_captured-${recipientId}`,
    payment_failed: `payment_failed-${recipientId}`,
    payment_refunded: `payment_refunded-${recipientId}`,
    // Customer-side — misc
    coupon_applied: `coupon_applied-${recipientId}`,
    welcome: `welcome-${recipientId}`,
    // Admin-side — user & business events
    user_registration: `user_registration-${recipientId}`,
    new_order: `new_order-${recipientId}`,
    order_cancelled_by_user: `order_cancelled_by_user-${recipientId}`,
    payment_received: `payment_received-${recipientId}`,
    payment_refund_requested: `payment_refund_requested-${recipientId}`,
    low_stock: `low_stock-${recipientId}`,
    out_of_stock: `out_of_stock-${recipientId}`,
    new_contact_message: `new_contact_message-${recipientId}`,
    newsletter_signup: `newsletter_signup-${recipientId}`,
    // Generic / system
    message: `new_message-${recipientId}`,
    system_announcement: `system_announcement-${recipientId}`,
  };

  return eventMap[type] || `notification-${recipientId}`;
};

// ─── Core: save + socket + push ──────────────────────────────────────────────
export const sendNotification = async (
  payload: SendNotificationPayload,
  session?: ClientSession,
) => {
  const { recipientId, senderId, type, title, message, data } = payload;
  const recipientIdStr = recipientId.toString();

  // 1. Save to DB (transaction-aware)
  await createNotification(
    {
      recipient: new Types.ObjectId(recipientIdStr),
      sender: senderId ? new Types.ObjectId(senderId.toString()) : null,
      type,
      title,
      message,
      data: data || {},
    },
    session,
  );

  // 2. Socket.IO — emit specific event
  const connectedUser = connectedUsers.get(recipientIdStr);
  if (connectedUser && io) {
    const socketEvent = getSocketEvent(type, recipientIdStr);
    io.to(connectedUser.socketID).emit(socketEvent, {
      type,
      title,
      message,
      data: data || {},
    });
  }

  // 3. Firebase — push notification
  try {
    const user = await UserModel.findById(recipientIdStr).select("fcmToken");
    if (user?.fcmToken && user.fcmToken.length > 0) {
      await sendPushNotifications(user.fcmToken, title, message);
    }
  } catch (err) {
    console.log("Push notification failed:", err);
  }
};

// ─── DB-only creation (transaction-aware) ────────────────────────────────────
export const createNotification = async (
  payload: INotification,
  session?: ClientSession,
) => {
  try {
    if (!payload) {
      throw new AppError(HttpStatus.NOT_FOUND, "Notification payload missing");
    }

    const sendNot = await NotificationModel.create([payload], { session });

    if (!sendNot || sendNot.length === 0) {
      throw new AppError(
        HttpStatus.BAD_REQUEST,
        "Notification creation failed",
      );
    }

    return sendNot[0];
  } catch (error) {
    console.error("Error creating notification:", error);
    if (error instanceof AppError) throw error;
    throw new AppError(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "Notification creation failed",
    );
  }
};

// ─── Helper: notify all admins (transaction-aware) ───────────────────────────
export const notifyAdmins = async (
  payload: {
    senderId?: Types.ObjectId | string;
    type: INotification["type"];
    title: string;
    message: string;
    data?: Record<string, unknown>;
  },
  session?: ClientSession,
) => {
  const admins = await UserModel.find({
    role: { $in: ["admin", "super_admin"] },
    isVerified: true,
    isDeleted: false,
  })
    .select("_id")
    .session(session ?? null);

  await Promise.all(
    admins.map((admin) =>
      sendNotification(
        {
          recipientId: admin._id as Types.ObjectId,
          senderId: payload.senderId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data,
        },
        session,
      ),
    ),
  );
};

// ─── Helper: notify a single customer (transaction-aware) ────────────────────
export const notifyCustomer = async (
  payload: SendNotificationPayload,
  session?: ClientSession,
) => {
  await sendNotification(payload, session);
};
