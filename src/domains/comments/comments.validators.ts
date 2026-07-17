import z from "zod";
import { LikeResponseSchema } from "./likes/likes.validators";

export const CommentResponseSchema = z.object({
  text: z.string(),
  createdAt: z.coerce.date(),
  likes: LikeResponseSchema.array(),
});
export type CommentRes = z.infer<typeof CommentResponseSchema>;
