import { Router } from "express";
import { transactionControllers } from "./transaction.controller";
import auth from "../../middlewares/auth";

const router = Router();

// All transaction routes require authentication
router.use(auth("user", "admin", "super_admin"));

router.get("/my-transactions", transactionControllers.getMyTransactions);

router.get(
  "/my-transactions/:id",
  transactionControllers.getMySingleTransaction,
);

router.get(
  "/by-order/:orderId",
  transactionControllers.getMyTransactionsByOrder,
);

export const transactionRoutes = router;
