import z from "zod";
import {
  PostLazyResponseSchema,
  PostLazySelect,
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

// Prisma
export const RepostLazySelect = {
  publicId: true,
  post: { select: PostLazySelect },
};
