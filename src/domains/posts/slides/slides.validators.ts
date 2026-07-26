import z from "zod";
import {
  MediaLazyResponseSchema,
  MediaResponseSchema,
  MediaSelect,
} from "../../media/media.validators";

export const PostSlideLazySchema = z.object({
  publicId: z.uuidv7(),
  media: MediaLazyResponseSchema,
  position: z.number().nonnegative(),
});
export type PostSlideLazy = z.infer<typeof PostSlideLazySchema>;

export const PostSlideResponseSchema = z.object({
  publicId: z.uuidv7(),
  media: MediaResponseSchema,
  position: z.number().nonnegative(),
});
export type PostSlideRes = z.infer<typeof PostSlideResponseSchema>;

// Prisma
export const PostSlideSelect = {
  publicId: true,
  media: { select: MediaSelect },
  position: true,
};
