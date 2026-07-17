import z from "zod";
import { UserLazyResponseSchema } from "../users/users.validators";
import { MediaResponseSchema } from "../media/media.validators";
import { CommentResponseSchema } from "../comments/comments.validators";
import { LikeResponseSchema } from "./likes/likes.validators";

// Posts with relations
export const PostResponseSchema = z.object({
  publicId: z.uuidv7(),
  user: UserLazyResponseSchema,
  description: z.string().optional(),
  media: MediaResponseSchema.array(),
  comments: CommentResponseSchema.array(),
  createdAt: z.coerce.date(),
  private: z.boolean(),
  views: z.number().nonnegative(),
  likes: LikeResponseSchema.array(),
});
export type PostRes = z.infer<typeof PostResponseSchema>;

// Posts without relations
export const PostLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  user: UserLazyResponseSchema,
  description: z.string().optional(),
  media: MediaResponseSchema.array(),
  stats: z.object({
    comments: z.number().nonnegative(),
    likes: z.number().nonnegative(),
  }),
  createdAt: z.coerce.date(),
  private: z.boolean(),
  views: z.number().nonnegative().default(0),
});
export type PostLazyRes = z.infer<typeof PostLazyResponseSchema>;
