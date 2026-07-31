import z from "zod";
import { Prisma } from "../../../generated/prisma/client";
import * as ProfileValidators from "../../profiles/profiles.validators";
import * as PostValidators from "../../posts/posts.validators";
import * as CollectionValidators from "../../collections/collections.validators";

// Type
export const MessageTypeSchema = z.enum([
  "TEXT",
  "POST",
  "COLLECTION",
  "EVENT",
]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

export const MessageBasicSchema = z.object({
  publicId: z.uuidv7(),
  owner: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  text: z.string().optional(),
  type: MessageTypeSchema,
  createdAt: z.coerce.date(),
  active: z.boolean(),
});

// Lazy
export type MessageLazyRes = z.infer<typeof MessageBasicSchema>;

// Message
export const MessageResponseSchema = MessageBasicSchema.extend({
  replyTo: MessageBasicSchema,
  post: z.lazy(() => PostValidators.PostLazyResponseSchema.optional()),
  collection: z.lazy(() =>
    CollectionValidators.CollectionLazyResponseSchema.optional(),
  ),
});
export type MessageRes = z.infer<typeof MessageResponseSchema>;

// Prisma
export const MessageLazySelect = {
  publicId: true,
  get owner() {
    return {
      select: ProfileValidators.ProfileLazySelect,
    };
  },
  text: true,
  type: true,
  createdAt: true,
  active: true,
} satisfies Prisma.MessageSelect;

export const MessageSelect = {
  publicId: true,
  get owner() {
    return {
      select: ProfileValidators.ProfileLazySelect,
    };
  },
  text: true,
  type: true,
  createdAt: true,
  active: true,
  replyTo: { select: MessageLazySelect },
  get post() {
    return {
      select: PostValidators.PostLazySelect,
    };
  },
  get collection() {
    return {
      select: CollectionValidators.CollectionLazySelect,
    };
  },
} satisfies Prisma.MessageSelect;
