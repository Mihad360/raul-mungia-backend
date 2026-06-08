import express from "express";
import { explorePurityControllers } from "./explorePurity.controller";

const router = express.Router();

router.get("/", explorePurityControllers.getExplorePurity);

export const explorePurityRoutes = router;
