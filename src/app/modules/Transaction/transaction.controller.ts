import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { transactionServices } from "./transaction.service";
import { JwtPayload } from "../../interface/global";

const getMyTransactions = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const result = await transactionServices.getMyTransactionsFromDB(
    user,
    req.query,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Transactions retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getMySingleTransaction = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { id } = req.params;
  const result = await transactionServices.getMySingleTransactionFromDB(
    user,
    id as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Transaction retrieved successfully",
    data: result,
  });
});

const getMyTransactionsByOrder = catchAsync(async (req, res) => {
  const user = req.user as JwtPayload;
  const { orderId } = req.params;
  const result = await transactionServices.getMyTransactionsByOrderFromDB(
    user,
    orderId as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Transactions retrieved successfully",
    data: result,
  });
});

export const transactionControllers = {
  getMyTransactions,
  getMySingleTransaction,
  getMyTransactionsByOrder,
};
