import z from "zod";
import { ProfileLazyResponseSchema } from "../../profiles/profiles.validators";

export const MemberResponseSchema = z.object({
  publicId: z.uuidv7(),
  profile: ProfileLazyResponseSchema,
  isArchived: z.boolean(),
});
export type MemberRes = z.infer<typeof MemberResponseSchema>;
