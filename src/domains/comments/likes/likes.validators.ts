import z from "zod";
import { UserLazyResponseSchema } from "../../users/users.validators";

export const LikeResponseSchema = z.object({
  user: UserLazyResponseSchema,
  createdAt: z.coerce.date(),
});
export type LikeRes = z.infer<typeof LikeResponseSchema>;
