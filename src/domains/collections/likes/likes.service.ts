import {
  NotFoundError,
  UnauthorizedError,
} from "../../../config/errors/errors";
import { prisma } from "../../../config/prisma";
import { createNotification } from "../../notifications/notifications.service";
import { ProfileIsNotBlocked } from "../../profiles/profiles.validators";
import {
  LikeLazySelect,
  LikeLazyRes,
  LikeReq,
  parseLikeLazy,
  LikeSelect,
  parseLike,
  LikeRes,
} from "./likes.validators";

// Like a collection
export async function createCollectionLike(
  { collectionId }: LikeReq,
  currentUserId: string,
): Promise<LikeLazyRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");
  const currentProfileId = currentUser.profile!.id;

  const collection = await prisma.collection.findUnique({
    where: {
      publicId: collectionId,
      owner: ProfileIsNotBlocked(currentProfileId),
      private: false,
    },
    select: { id: true, ownerId: true },
  });
  if (!collection) throw new NotFoundError("Collection not found");
  const like = await prisma.collectionLike.create({
    data: {
      collectionId: collection.id,
      ownerId: currentProfileId,
    },
    select: LikeLazySelect,
  });
  await createNotification({
    recipientId: collection.ownerId,
    actorId: currentProfileId,
    type: "LIKE_COLLECTION",
    collectionId: collection.id,
  });
  return parseLikeLazy(like);
}

// Dislike a collection
export async function deleteCollectionLike(
  { collectionId }: LikeReq,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const collection = await prisma.collection.findUnique({
    where: {
      publicId: collectionId,
      owner: ProfileIsNotBlocked(currentUser.profile!.id),
      private: false,
    },
    select: { id: true },
  });
  if (!collection) throw new NotFoundError("Collection not found");
  await prisma.collectionLike.delete({
    where: {
      ownerId_collectionId: {
        collectionId: collection.id,
        ownerId: currentUser.profile!.id,
      },
    },
    select: LikeLazySelect,
  });
}

// List likes from collection
export async function getLikesByCollection(
  { collectionId }: LikeReq,
  currentUserId: string,
): Promise<LikeRes[]> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const collection = await prisma.collection.findUnique({
    where: {
      publicId: collectionId,
      owner: ProfileIsNotBlocked(currentUser.profile!.id),
      OR: [{ ownerId: currentUser.profile!.id }, { private: false }],
    },
    select: { likes: { select: LikeSelect } },
  });
  if (!collection) throw new NotFoundError("Collection not found");
  return collection.likes.map((like) => parseLike(like));
}
