import { Router } from "express";
import { orderControllers } from "./order.controller";
import auth from "../../middlewares/auth";

const router = Router();

// All order routes require authentication
router.use(auth("user", "admin", "super_admin"));

router.post("/place", orderControllers.placeOrder);
router.get("/my-orders", orderControllers.getMyOrders);
router.get("/my-orders/latest", orderControllers.getMyLatestOrder);
router.get("/my-orders/:id", orderControllers.getMySingleOrder);
router.patch("/my-orders/:id/cancel", orderControllers.cancelMyOrder);

export const orderRoutes = router;
