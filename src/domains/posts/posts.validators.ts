import z from "zod";
import { UserLazyResponseSchema } from "../users/users.validators";
import { MediaResponseSchema } from "../media/media.validators";
import { CommentResponseSchema } from "../comments/comments.validators";
import { LikeResponseSchema } from "./likes/likes.validators";

export const PostResponseSchema = z.object({
  publicId: z.uuidv7(),
  user: UserLazyResponseSchema,
  description: z.string().optional(),
  media: MediaResponseSchema.array(),
  comments: CommentResponseSchema.array(),
  createdAt: z.coerce.date(),
  private: z.boolean(),
  views: z.number().nonnegative().default(0),
  likes: LikeResponseSchema.array(),
});
export type PostRes = z.infer<typeof PostResponseSchema>;
