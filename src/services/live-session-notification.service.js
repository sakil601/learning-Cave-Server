import ProductAccess from "../models/ProductAccess.js";

import { createBulkNotifications } from "./notification.service.js";

export async function notifyBatchStudents({
  batchId,
  type,
  title,
  message,
  link = "",
}) {
  const now = new Date();

  const accesses = await ProductAccess.find({
    batch: batchId,
    status: "active",

    $or: [
      {
        expiresAt: null,
      },
      {
        expiresAt: {
          $gt: now,
        },
      },
    ],
  })
    .select("user")
    .lean();

  const userIds = accesses.map((access) => access.user);

  if (!userIds.length) {
    return [];
  }

  return createBulkNotifications({
    userIds,
    type,
    title,
    message,
    link,
  });
}
