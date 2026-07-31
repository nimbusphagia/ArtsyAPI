import z from "zod";
import * as ProfileValidators from "../../profiles/profiles.validators";
import { Prisma } from "../../../generated/prisma/client";

export const MemberResponseSchema = z.object({
  publicId: z.uuidv7(),
  profile: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  isArchived: z.boolean(),
});
export type MemberRes = z.infer<typeof MemberResponseSchema>;

// Prisma

export const MemberLazySelect = {
  publicId: true,
  get profile() {
    return {
      select: ProfileValidators.ProfileLazySelect,
    };
  },
  isArchived: true,
} satisfies Prisma.ChatMemberSelect;
