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

export const ClientMessageTypeSchema = z.enum(["TEXT", "POST", "COLLECTION"]);

// Lazy
export const MessageBasicSchema = z.object({
  publicId: z.uuidv7(),
  owner: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  text: z.string().optional(),
  type: MessageTypeSchema,
  createdAt: z.coerce.date(),
  active: z.boolean(),
});

export type MessageLazyRes = z.infer<typeof MessageBasicSchema>;

// With relations
export const MessageResponseSchema = MessageBasicSchema.extend({
  replyTo: MessageBasicSchema,
  post: z.lazy(() => PostValidators.PostLazyResponseSchema.optional()),
  collection: z.lazy(() =>
    CollectionValidators.CollectionLazyResponseSchema.optional(),
  ),
});
export type MessageRes = z.infer<typeof MessageResponseSchema>;

// Create
const MessageCreateTextSchema = z.object({
  chatId: z.uuidv7(),
  type: z.literal("TEXT"),
  text: z.string().min(1),
});
const MessageCreatePostSchema = z.object({
  chatId: z.uuidv7(),
  type: z.literal("POST"),
  postId: z.uuidv7(),
});

const MessageCreateCollectionSchema = z.object({
  chatId: z.uuidv7(),
  type: z.literal("COLLECTION"),
  collectionId: z.uuidv7(),
});

export const MessageCreateSchema = z.discriminatedUnion("type", [
  MessageCreateTextSchema,
  MessageCreatePostSchema,
  MessageCreateCollectionSchema,
]);

export type MessageCreateReq = z.infer<typeof MessageCreateSchema>;

// Reply
export const ReplyRequestSchema = z.object({
  chatId: z.uuidv7(),
  replyToId: z.uuidv7(),
  text: z.string().min(1),
});
export type ReplyReq = z.infer<typeof ReplyRequestSchema>;

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

// Parse and map
type MessageRaw = Prisma.MessageGetPayload<{ select: typeof MessageSelect }>;
type MessageLazyRaw = Prisma.MessageGetPayload<{
  select: typeof MessageLazySelect;
}>;

export function parseMessage(m: MessageRaw) {
  return MessageResponseSchema.parse({
    ...m,
    post: { ...m.post, stats: m.post?._count },
    collection: { ...m.collection, likes: m.collection?._count.likes },
  });
}
export function parseMessageLazy(m: MessageLazyRaw) {
  return MessageBasicSchema.parse({
    ...m,
  });
}
