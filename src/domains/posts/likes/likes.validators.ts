import z from "zod";
import { ProfileLazyResponseSchema } from "../../profiles/profiles.validators";

export const LikeResponseSchema = z.object({
  owner: ProfileLazyResponseSchema,
  createdAt: z.coerce.date(),
});
export type LikeRes = z.infer<typeof LikeResponseSchema>;
