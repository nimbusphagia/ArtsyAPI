import io from "../../config/socket";
import { UnauthorizedError } from "../../config/errors/errors";
import { prisma } from "../../config/prisma";
import {
  NotificationSelect,
  parseNotification,
  type NotificationRes,
} from "./notifications.validators";
import type {
  NotificationCreateInput,
  NotificationFanOutInput,
  NotificationPage,
} from "./notifications.validators";

export async function createNotification(
  input: NotificationCreateInput,
): Promise<void> {
  if (input.recipientId === input.actorId) return;

  try {
    const notification = await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        postId: input.postId ?? null,
        commentId: input.commentId ?? null,
        collectionId: input.collectionId ?? null,
      },
      select: NotificationSelect,
    });

    io.to(`profile:${input.recipientId}`).emit(
      "notification:new",
      parseNotification(notification),
    );
  } catch (err) {
    console.error(`Failed to create ${input.type} notification:`, err);
  }
}
const FANOUT_CHUNK_SIZE = 1000;

export async function createFollowerNotifications(
  input: NotificationFanOutInput,
): Promise<void> {
  const rows = input.recipientIds.map((recipientId) => ({
    recipientId,
    actorId: input.actorId,
    type: input.type,
    postId: input.postId ?? null,
    collectionId: input.collectionId ?? null,
  }));

  for (let i = 0; i < rows.length; i += FANOUT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + FANOUT_CHUNK_SIZE);
    try {
      await prisma.notification.createMany({ data: chunk });
      for (const row of chunk) {
        io.to(`profile:${row.recipientId}`).emit("notification:new:lite", {
          type: row.type,
          actorId: input.actorId,
        });
      }
    } catch (err) {
      console.error(
        `Failed to create ${input.type} fan-out notifications for chunk ${i}-${i + chunk.length}:`,
        err,
      );
    }
  }
}
export async function getNotifications(
  currentUserId: string,
  opts: NotificationPage,
): Promise<NotificationRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const notifications = await prisma.notification.findMany({
    where: { recipientId: currentUser.profile!.id },
    select: NotificationSelect,
    orderBy: { createdAt: "desc" },
    take: opts.limit,
    ...(opts.cursor && {
      cursor: { publicId: opts.cursor },
      skip: 1,
    }),
  });

  return notifications.map(parseNotification);
}

export async function markNotificationRead(
  notificationId: string,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  await prisma.notification.update({
    where: { publicId: notificationId, recipientId: currentUser.profile!.id },
    data: { read: true },
  });
}
