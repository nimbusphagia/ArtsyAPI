import z from "zod";
import * as ProfileValidators from "../profiles/profiles.validators";

export const notificationTypes = [
  "LIKE_POST",
  "LIKE_COMMENT",
  "LIKE_COLLECTION",
  "COMMENT",
  "REPOST",
  "NEW_POST",
  "NEW_COLLECTION",
  "FOLLOW",
] as const;
export const NotificationTypeSchema = z.enum(notificationTypes);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

// Response
export const NotificationResSchema = z.object({
  publicId: z.uuidv7(),
  actor: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  type: NotificationTypeSchema,
  postId: z.uuidv7().nullable(),
  commentId: z.uuidv7().nullable(),
  collectionId: z.uuidv7().nullable(),
  read: z.boolean(),
  createdAt: z.coerce.date(),
});
export type NotificationRes = z.infer<typeof NotificationResSchema>;

export interface NotificationCreateInput {
  recipientId: number;
  actorId: number;
  type: NotificationType;
  postId?: number;
  commentId?: number;
  collectionId?: number;
}

export interface NotificationFanOutInput {
  recipientIds: number[];
  actorId: number;
  type: NotificationType;
  postId?: number;
  collectionId?: number;
}

export const NotificationPageSchema = z.object({
  cursor: z.uuidv7().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type NotificationPage = z.infer<typeof NotificationPageSchema>;

// Prisma
export const NotificationSelect = {
  publicId: true,
  get actor() {
    return { select: ProfileValidators.ProfileLazySelect };
  },
  type: true,
  post: { select: { publicId: true } },
  comment: { select: { publicId: true } },
  collection: { select: { publicId: true } },
  read: true,
  createdAt: true,
} satisfies import("../../generated/prisma/client").Prisma.NotificationSelect;

export function parseNotification(n: any): NotificationRes {
  return NotificationResSchema.parse({
    ...n,
    postId: n.post?.publicId ?? null,
    commentId: n.comment?.publicId ?? null,
    collectionId: n.collection?.publicId ?? null,
  });
}
