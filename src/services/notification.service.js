import Notification from "../models/Notification.js";

export async function createNotification({
  userId,
  type,
  title,
  message = "",
  link = "",
}) {
  return Notification.create({
    user: userId,
    type,
    title,
    message,
    link,
    isRead: false,
  });
}

export async function createBulkNotifications({
  userIds,
  type,
  title,
  message = "",
  link = "",
}) {
  const uniqueUserIds = [...new Set(userIds.map((id) => String(id)))];

  if (!uniqueUserIds.length) {
    return [];
  }

  return Notification.insertMany(
    uniqueUserIds.map((userId) => ({
      user: userId,
      type,
      title,
      message,
      link,
      isRead: false,
    })),
  );
}
