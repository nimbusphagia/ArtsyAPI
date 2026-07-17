import z from "zod";
import { MediaResponseSchema } from "../../media/media.validators";

export const ProfilePictureSchema = z.object({
  publicId: z.uuidv7(),
  type: "PROFILE_PICTURE",
  media: MediaResponseSchema,
});
export type ProfilePicture = z.infer<typeof ProfilePictureSchema>;
