import z from "zod";
import { LikeResponseSchema } from "../likes/likes.validators";
import { ProfileLazyResponseSchema } from "../../profiles/profiles.validators";

export const CommentResponseSchema = z.object({
  publicId: z.uuidv7(),
  author: ProfileLazyResponseSchema,
  text: z.string(),
  createdAt: z.coerce.date(),
  likes: LikeResponseSchema.array(),
});
export type CommentRes = z.infer<typeof CommentResponseSchema>;
