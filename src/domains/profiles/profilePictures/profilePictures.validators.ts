import z from "zod";
import {
  AssetTypeSchema,
  MediaResponseSchema,
  MediaSelect,
} from "../../media/media.validators";

export const DEFAULT_PICTURE_ID = 1;

export const ProfilePictureResSchema = z.object({
  publicId: z.uuidv7(),
  type: AssetTypeSchema,
  media: MediaResponseSchema.nullable(),
});
export type ProfilePicture = z.infer<typeof ProfilePictureResSchema>;

// Prisma
export const ProfilePictureSelect = {
  publicId: true,
  type: true,
  media: { select: MediaSelect },
};
