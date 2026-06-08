import express from "express";
import { blogControllers } from "./blog.controller";

const router = express.Router();

router.get("/", blogControllers.getAllBlogs);
router.get("/:id", blogControllers.getSingleBlog);

export const blogRoutes = router;
