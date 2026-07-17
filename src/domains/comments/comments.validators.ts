import z from "zod";
import { LikeResponseSchema } from "./likes/likes.validators";
import { UserLazyResponseSchema } from "../users/users.validators";

export const CommentResponseSchema = z.object({
  publicId: z.uuidv7(),
  user: UserLazyResponseSchema,
  text: z.string(),
  createdAt: z.coerce.date(),
  likes: LikeResponseSchema.array(),
});
export type CommentRes = z.infer<typeof CommentResponseSchema>;
