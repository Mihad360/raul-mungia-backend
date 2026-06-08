import express from "express";
import { disclaimerControllers } from "./disclaimer.controller";

const router = express.Router();

router.get("/", disclaimerControllers.getDisclaimer);

export const disclaimerRoutes = router;
