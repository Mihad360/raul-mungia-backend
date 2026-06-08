import express from "express";
import { certificationControllers } from "./certificate.controller";

const router = express.Router();

router.get("/", certificationControllers.getAllCertifications);
router.get("/:id", certificationControllers.getSingleCertification);

export const certificationRoutes = router;
