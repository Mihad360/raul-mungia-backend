import { Router } from "express";
import { shippingControllers } from "./shipping.controller";
import auth from "../../middlewares/auth";

const router = Router();

// All shipping routes require authentication
// (Per our design decision: Q5 — auth required even for tracking)
router.use(auth("user", "admin", "super_admin"));

router.post("/rates", shippingControllers.getShippingRates);
router.post("/validate-address", shippingControllers.validateShippingAddress);
router.get("/track/:trackingNumber", shippingControllers.trackShipment);

export const shippingRoutes = router;
