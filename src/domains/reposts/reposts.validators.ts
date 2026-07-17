import z from "zod";
import { PostResponseSchema } from "../posts/posts.validators";

export const RepostResponseSchema = z.object({
  publicId: z.uuidv7(),
  post: PostResponseSchema,
});
export type RepostRes = z.infer<typeof RepostResponseSchema>;
