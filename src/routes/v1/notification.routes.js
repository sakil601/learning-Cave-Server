import { Router } from "express";

import { requireAuth } from "../../middlewares/auth.middleware.js";

import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../../controllers/notification.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getMyNotifications);

router.patch("/read-all", markAllNotificationsRead);

router.patch("/:notificationId/read", markNotificationRead);

router.delete("/:notificationId", deleteNotification);

export default router;
