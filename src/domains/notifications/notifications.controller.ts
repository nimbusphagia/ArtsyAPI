import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../config/errors/errors";
import {
  getNotifications,
  markNotificationRead,
} from "./notifications.service";
import { NotificationPageSchema } from "./notifications.validators";
import { publicIdSchema } from "../../config/utils/validationUtils";

export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const { cursor, limit } = NotificationPageSchema.parse(req.query);
    const notifications = await getNotifications(currentUserId, {
      cursor,
      limit,
    });
    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function readNotification(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const currentUserId = req.user?.publicId;
    if (!currentUserId) throw new UnauthorizedError();
    const notificationId = publicIdSchema.parse(req.params.notificationId);
    await markNotificationRead(notificationId, currentUserId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
