import z from "zod";
import {
  PostLazyResponseSchema,
  PostResponseSchema,
} from "../posts.validators";

// With relations
export const RepostResponseSchema = z.object({
  publicId: z.uuidv7(),
  post: PostResponseSchema,
});
export type RepostRes = z.infer<typeof RepostResponseSchema>;

// Lazy
export const RepostLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  post: PostLazyResponseSchema,
});
export type RepostLazyRes = z.infer<typeof RepostLazyResponseSchema>;
