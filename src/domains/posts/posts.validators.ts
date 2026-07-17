import z from "zod";
import { MediaResponseSchema } from "../media/media.validators";
import { CommentResponseSchema } from "../comments/comments.validators";
import { LikeResponseSchema } from "./likes/likes.validators";
import { ProfileLazyResponseSchema } from "../profiles/profiles.validators";

const PostBasicSchema = z.object({
  publicId: z.uuidv7(),
  author: ProfileLazyResponseSchema,
  description: z.string().optional(),
  createdAt: z.coerce.date(),
  private: z.boolean(),
  views: z.number().nonnegative(),
});
// Posts with relations
export const PostResponseSchema = PostBasicSchema.extend({
  media: MediaResponseSchema.array(),
  comments: CommentResponseSchema.array(),
  likes: LikeResponseSchema.array(),
});
export type PostRes = z.infer<typeof PostResponseSchema>;

// Posts without relations
export const PostLazyResponseSchema = PostBasicSchema.extend({
  thumbnails: z.url().array(),
  stats: z.object({
    comments: z.number().nonnegative(),
    likes: z.number().nonnegative(),
  }),
  createdAt: z.coerce.date(),
});
export type PostLazyRes = z.infer<typeof PostLazyResponseSchema>;
