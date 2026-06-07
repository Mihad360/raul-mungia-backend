import express, { NextFunction, Request, Response } from "express";
import { userControllers } from "./user.controller";
import auth from "../../middlewares/auth";
import { upload } from "../../utils/sendImageToCloudinary";

const router = express.Router();

router.get("/", userControllers.getUsers);
router.get("/me", auth("admin", "user"), userControllers.getMe);
router.patch(
  "/edit-profile",
  auth("admin", "user"),
  upload.single("image"),
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    }
    next();
  },
  userControllers.editProfile,
);

export const userRoutes = router;
