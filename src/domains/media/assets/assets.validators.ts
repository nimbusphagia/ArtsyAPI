import z from "zod";
import { MediaResponseSchema, MediaSelect } from "../media.validators";

export const AssetTypes = [
  "DEFAULT_PROFILE_PICTURE",
  "DEFAULT_PROFILE_BANNER",
  "PROFILE_PICTURE",
  "PROFILE_BANNER",
] as const;
export const AssetTypeSchema = z.enum(AssetTypes);
export type AssetType = z.infer<typeof AssetTypeSchema>;

// Response
export const AssetResSchema = z.object({
  publicId: z.uuidv7(),
  type: AssetTypeSchema,
  media: MediaResponseSchema.nullable(),
});
export type AssetRes = z.infer<typeof AssetResSchema>;

// Prisma
export const AssetSelect = {
  publicId: true,
  type: true,
  media: { select: MediaSelect },
};
