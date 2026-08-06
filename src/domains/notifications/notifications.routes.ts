import { Router } from "express";
import {
  listNotifications,
  readNotification,
} from "./notifications.controller";

const router = Router();

router.get("/", listNotifications);
router.patch("/:notificationId/read", readNotification);

export default router;
