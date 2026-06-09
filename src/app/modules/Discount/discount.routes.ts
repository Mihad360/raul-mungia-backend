import { Router } from "express";
import { DiscountControllers } from "./discount.controller";
import auth from "../../middlewares/auth";

const router = Router();

router.get("/active", DiscountControllers.getActiveDiscount);
router.post("/calculate", auth("user"), DiscountControllers.calculateDiscount);

export const DiscountRoutes = router;
