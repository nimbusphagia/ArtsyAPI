import z from "zod";
import { MediaResponseSchema, MediaSelect } from "../media/media.validators";
import * as CommentValidators from "./comments/comments.validators";
import * as LikeValidators from "./likes/likes.validators";
import * as ProfileValidators from "../profiles/profiles.validators";

const PostBasicSchema = z.object({
  publicId: z.uuidv7(),
  author: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  description: z.string().optional(),
  createdAt: z.coerce.date(),
  private: z.boolean(),
  views: z.number().nonnegative(),
});

// With relations
export const PostResponseSchema = PostBasicSchema.extend({
  media: MediaResponseSchema.array(),
  comments: z.lazy(() => CommentValidators.CommentResponseSchema.array()),
  likes: z.lazy(() => LikeValidators.LikeResponseSchema.array()),
});
export type PostRes = z.infer<typeof PostResponseSchema>;

// Lazy
export const PostLazyResponseSchema = PostBasicSchema.extend({
  thumbnails: z.url().array(),
  stats: z.object({
    comments: z.number().nonnegative(),
    likes: z.number().nonnegative(),
  }),
});
export type PostLazyRes = z.infer<typeof PostLazyResponseSchema>;

// Prisma
export const PostLazySelect = {
  publicId: true,
  createdAt: true,
  private: true,
  views: true,
  media: { select: MediaSelect },
  _count: {
    select: {
      comments: true,
      likes: true,
    },
  },
};
