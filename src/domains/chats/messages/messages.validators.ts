import z from "zod";
import { ProfileLazyResponseSchema } from "../../profiles/profiles.validators";
import { PostLazyResponseSchema } from "../../posts/posts.validators";
import { CollectionLazyResponseSchema } from "../../collections/collections.validators";

// Type
export const MessageTypeSchema = z.enum([
  "TEXT",
  "POST",
  "COLLECTION",
  "EVENT",
]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

const MessageBasicSchema = z.object({
  publicId: z.uuidv7(),
  owner: ProfileLazyResponseSchema,
  text: z.string().optional(),
  type: MessageTypeSchema,
  createdAt: z.coerce.date(),
  active: z.boolean(),
  post: PostLazyResponseSchema.optional(),
  collection: CollectionLazyResponseSchema.optional(),
});
// Message
export const MessageResponseSchema = z.object({
  publicId: z.uuidv7(),
  owner: ProfileLazyResponseSchema,
  text: z.string().optional(),
  type: MessageTypeSchema,
  createdAt: z.coerce.date(),
  replyTo: MessageBasicSchema,
  active: z.boolean(),
  post: PostLazyResponseSchema.optional(),
  collection: CollectionLazyResponseSchema.optional(),
});
export type MessageRes = z.infer<typeof MessageResponseSchema>;
