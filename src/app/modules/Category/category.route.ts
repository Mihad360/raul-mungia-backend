import express from "express";
import { categoryControllers } from "./category.controller";

const router = express.Router();

// Public: get all categories (for shop page filter, homepage tabs)
router.get("/", categoryControllers.getAllCategories);

// Public: get single category
router.get("/:id", categoryControllers.getSingleCategory);

export const categoryRoutes = router;
