import { Router } from "express";
import { paymentMethodControllers } from "./paymentMethod.controller";

const router = Router();

router.get("/active", paymentMethodControllers.getActivePaymentMethods);

export const paymentMethodRoutes = router;
