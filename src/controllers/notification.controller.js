import Notification from "../models/Notification.js";

import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";

export const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    user: req.user._id,
  })
    .sort({
      createdAt: -1,
    })
    .lean();

  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    isRead: false,
  });

  res.json({
    success: true,
    data: {
      unreadCount,
      notifications,
    },
  });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.notificationId,
      user: req.user._id,
    },
    {
      $set: {
        isRead: true,
      },
    },
    {
      new: true,
    },
  );

  if (!notification) {
    throw new ApiError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Notification not found.",
    );
  }

  res.json({
    success: true,
    message: "Notification marked as read.",
    data: notification,
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    {
      user: req.user._id,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
      },
    },
  );

  res.json({
    success: true,
    message: "All notifications marked as read.",
  });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({
    _id: req.params.notificationId,
    user: req.user._id,
  });

  if (!notification) {
    throw new ApiError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Notification not found.",
    );
  }

  res.json({
    success: true,
    message: "Notification deleted.",
  });
});
