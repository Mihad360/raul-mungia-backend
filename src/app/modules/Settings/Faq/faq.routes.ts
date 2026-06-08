import express from "express";
import { faqControllers } from "./faq.controller";

const router = express.Router();

router.get("/", faqControllers.getAllFaqs);
router.get("/:id", faqControllers.getSingleFaq);

export const faqRoutes = router;
