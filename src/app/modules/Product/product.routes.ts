import express from "express";
import { productControllers } from "./product.controller";

const router = express.Router();

// Public: get all products (with search, filter, sort, paginate)
router.get("/", productControllers.getAllProducts);

// Public: get products by category
router.get("/category/:categoryId", productControllers.getProductsByCategory);

// Public: get related products for a given product
router.get("/:id/related", productControllers.getRelatedProducts);

// Public: get single product
router.get("/:id", productControllers.getSingleProduct);

export const productRoutes = router;
