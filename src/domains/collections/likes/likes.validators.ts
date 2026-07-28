import { Prisma } from "../../../generated/prisma/client";
import z from "zod";
import * as ProfileValidators from "../../profiles/profiles.validators";

export const LikeResponseSchema = z.object({
  owner: z.lazy(() => ProfileValidators.ProfileLazyResponseSchema),
  createdAt: z.coerce.date(),
});
export type LikeRes = z.infer<typeof LikeResponseSchema>;

// Lazy
export const LikeLazyResponseSchema = z.object({
  publicId: z.uuidv7(),
  collectionId: z.uuidv7(),
  ownerId: z.uuidv7(),
  createdAt: z.coerce.date(),
});
export type LikeLazyRes = z.infer<typeof LikeLazyResponseSchema>;

export const LikeRequestSchema = z.object({
  collectionId: z.uuidv7(),
});
export type LikeReq = z.infer<typeof LikeRequestSchema>;

// Prisma
export const LikeLazySelect = {
  publicId: true,
  owner: { select: { publicId: true } },
  collection: { select: { publicId: true } },
  createdAt: true,
} satisfies Prisma.CollectionLikeSelect;

type LikeLazyRaw = Prisma.CollectionLikeGetPayload<{
  select: typeof LikeLazySelect;
}>;

export const LikeSelect = {
  publicId: true,
  get owner() {
    return { select: ProfileValidators.ProfileLazySelect };
  },
  createdAt: true,
} satisfies Prisma.CollectionLikeSelect;

type LikeRaw = Prisma.CollectionLikeGetPayload<{
  select: typeof LikeSelect;
}>;

// Parse and map
export function parseLikeLazy(like: LikeLazyRaw) {
  return LikeLazyResponseSchema.parse({
    ...like,
    ownerId: like.owner.publicId,
    collectionId: like.collection.publicId,
  });
}

export function parseLike(like: LikeRaw) {
  return LikeResponseSchema.parse(like);
}
