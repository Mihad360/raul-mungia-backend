import HttpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { adminServicesV2 } from "./admin.service.v2";
import { JwtPayload } from "../../interface/global";

/* ===== Order Admin Controllers ===== */

const getAllOrders = catchAsync(async (req, res) => {
  const result = await adminServicesV2.getAllOrdersFromDB(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Orders retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSingleOrderForAdmin = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServicesV2.getSingleOrderForAdminFromDB(
    id as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Order retrieved successfully",
    data: result,
  });
});

const confirmManualPayment = catchAsync(async (req, res) => {
  const admin = req.user as JwtPayload;
  const { id } = req.params;

  const result = await adminServicesV2.confirmManualPaymentInDB(
    admin,
    id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Payment confirmed successfully",
    data: result,
  });
});

const cancelOrderByAdmin = catchAsync(async (req, res) => {
  const admin = req.user as JwtPayload;
  const { id } = req.params;

  const result = await adminServicesV2.cancelOrderByAdminInDB(
    admin,
    id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Order cancelled successfully",
    data: result,
  });
});

const processRefund = catchAsync(async (req, res) => {
  const admin = req.user as JwtPayload;
  const { id } = req.params;

  const result = await adminServicesV2.processRefundInDB(
    admin,
    id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Refund processed successfully",
    data: result,
  });
});

const markOrderAsShipped = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServicesV2.markOrderAsShippedInDB(
    id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Order marked as shipped",
    data: result,
  });
});

const markOrderAsDelivered = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServicesV2.markOrderAsDeliveredInDB(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Order marked as delivered",
    data: result,
  });
});

const updateOrderAdminNote = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { adminNote } = req.body;

  const result = await adminServicesV2.updateOrderAdminNoteInDB(
    id as string,
    adminNote,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Admin note updated successfully",
    data: result,
  });
});

/* ===== Transaction Admin Controllers ===== */

const getAllTransactions = catchAsync(async (req, res) => {
  const result = await adminServicesV2.getAllTransactionsFromDB(req.query);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Transactions retrieved successfully",
    meta: result.meta,
    data: result.result,
  });
});

const getSingleTransactionForAdmin = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServicesV2.getSingleTransactionForAdminFromDB(
    id as string,
  );

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Transaction retrieved successfully",
    data: result,
  });
});

/* ===== FedEx Shipping Admin Controllers ===== */

const generateShippingLabel = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServicesV2.generateShippingLabelInDB(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Shipping label generated successfully",
    data: result,
  });
});

const refreshTrackingInfo = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await adminServicesV2.refreshTrackingInfoInDB(id as string);

  sendResponse(res, {
    statusCode: HttpStatus.OK,
    success: true,
    message: "Tracking information refreshed",
    data: result,
  });
});

export const adminControllersV2 = {
  // Order
  getAllOrders,
  getSingleOrderForAdmin,
  confirmManualPayment,
  cancelOrderByAdmin,
  processRefund,
  markOrderAsShipped,
  markOrderAsDelivered,
  updateOrderAdminNote,

  // FedEx (NEW)
  generateShippingLabel,
  refreshTrackingInfo,

  // Transaction
  getAllTransactions,
  getSingleTransactionForAdmin,
};
