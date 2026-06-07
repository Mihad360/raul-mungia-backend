import express from "express";
import auth from "../../middlewares/auth";
import { wishlistControllers } from "./wishlist.controller";

const router = express.Router();

// All wishlist routes require authentication
router.use(auth("user", "admin", "super_admin"));

// Get my wishlist
router.get("/", wishlistControllers.getMyWishlist);

// Check if a product is in my wishlist (for heart icon state on frontend)
router.get("/check/:productId", wishlistControllers.checkInWishlist);

// Add a product to wishlist
router.post("/add/:productId", wishlistControllers.addToWishlist);

// Remove a product from wishlist
router.delete("/remove/:productId", wishlistControllers.removeFromWishlist);

// Clear entire wishlist
router.delete("/clear", wishlistControllers.clearWishlist);

export const wishlistRoutes = router;
