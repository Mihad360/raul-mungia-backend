import express from "express";
import auth from "../../middlewares/auth";
import { cartControllers } from "./cart.controller";

const router = express.Router();

// All cart routes require authentication
router.use(auth("user", "admin", "super_admin"));

// Get my cart (populated, simple)
router.get("/", cartControllers.getMyCart);

// Get cart summary (with totals, stock checks) — for checkout preview
router.get("/summary", cartControllers.getCartSummary);

// Get cart count (for cart icon badge)
router.get("/count", cartControllers.getCartCount);

// Add product to cart
router.post("/add", cartControllers.addToCart);

// Update quantity of a specific cart item
router.patch("/item/:itemId", cartControllers.updateCartItem);

// Remove specific item from cart
router.delete("/item/:itemId", cartControllers.removeCartItem);

// Clear entire cart
router.delete("/clear", cartControllers.clearCart);

export const cartRoutes = router;
