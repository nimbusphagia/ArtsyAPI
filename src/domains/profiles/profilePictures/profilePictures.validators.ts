import z from "zod";
import { MediaResponseSchema, MediaSelect } from "../../media/media.validators";

export const ProfilePictureResSchema = z.object({
  publicId: z.uuidv7(),
  type: "PROFILE_PICTURE",
  media: MediaResponseSchema.nullable(),
});
export type ProfilePicture = z.infer<typeof ProfilePictureResSchema>;

// Prisma
export const ProfilePictureSelect = {
  publicId: true,
  type: true,
  media: { select: MediaSelect },
};
