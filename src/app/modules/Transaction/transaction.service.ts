import { Types } from "mongoose";
import HttpStatus from "http-status";
import { TransactionModel } from "./transaction.model";
import AppError from "../../erros/AppError";
import { JwtPayload } from "../../interface/global";

/**
 * Get my transactions — paginated list for logged-in customer
 * Shows payment + refund history
 */
const getMyTransactionsFromDB = async (
  user: JwtPayload,
  query: Record<string, unknown>,
) => {
  const userId = new Types.ObjectId(user.user);
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const type = query.type as string | undefined;
  const status = query.status as string | undefined;

  const filter: Record<string, unknown> = {
    user: userId,
    isDeleted: false,
  };

  if (type) filter.type = type;
  if (status) filter.status = status;

  const total = await TransactionModel.countDocuments(filter);
  const totalPage = Math.ceil(total / limit);

  const result = await TransactionModel.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate({
      path: "order",
      select: "orderNumber total status",
    })
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
 * Get single transaction — must belong to user
 */
const getMySingleTransactionFromDB = async (
  user: JwtPayload,
  transactionId: string,
) => {
  if (!Types.ObjectId.isValid(transactionId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid transaction ID");
  }

  const transaction = await TransactionModel.findOne({
    _id: transactionId,
    user: new Types.ObjectId(user.user),
    isDeleted: false,
  }).populate({
    path: "order",
    select: "orderNumber total status items shippingAddress",
  });

  if (!transaction) {
    throw new AppError(HttpStatus.NOT_FOUND, "Transaction not found");
  }

  return transaction;
};

/**
 * Get all transactions for a specific order — must belong to user
 */
const getMyTransactionsByOrderFromDB = async (
  user: JwtPayload,
  orderId: string,
) => {
  if (!Types.ObjectId.isValid(orderId)) {
    throw new AppError(HttpStatus.BAD_REQUEST, "Invalid order ID");
  }

  const result = await TransactionModel.find({
    order: new Types.ObjectId(orderId),
    user: new Types.ObjectId(user.user),
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  return result;
};

export const transactionServices = {
  getMyTransactionsFromDB,
  getMySingleTransactionFromDB,
  getMyTransactionsByOrderFromDB,
};
