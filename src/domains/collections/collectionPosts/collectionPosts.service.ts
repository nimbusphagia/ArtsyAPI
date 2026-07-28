import {
  NotFoundError,
  UnauthorizedError,
} from "../../../config/errors/errors";
import { prisma } from "../../../config/prisma";
import { ProfileIsNotBlocked } from "../../profiles/profiles.validators";
import {
  ColPostExtraLazy,
  ColPostExtraLazySchema,
  ColPostExtraLazySelect,
  ColPostReq,
} from "./collectionPosts.validators";

// Create
export async function createCollectionPost(
  { postId, collectionId }: ColPostReq,
  currentUserId: string,
): Promise<ColPostExtraLazy> {
  const currentUser = await prisma.user.findFirst({
    where: {
      publicId: currentUserId,
      active: true,
      profile: {
        isNot: null,
      },
    },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const collection = await prisma.collection.findUnique({
    where: {
      ownerId: currentUser.profile!.id,
      publicId: collectionId,
    },
    select: {
      id: true,
      posts: {
        select: { position: true },
        orderBy: { position: "desc" as const },
        take: 1,
      },
    },
  });
  if (!collection) throw new NotFoundError("Collection not found");

  const post = await prisma.post.findUnique({
    where: {
      publicId: postId,
      author: ProfileIsNotBlocked(currentUser.profile!.id),
    },
    select: { id: true },
  });
  if (!post) throw new NotFoundError("Post not found");

  const nextPosition = (collection.posts[0]?.position ?? 0) + 1;

  const colPost = await prisma.collectionPost.create({
    data: {
      collectionId: collection.id,
      postId: post.id,
      position: nextPosition,
    },
    select: ColPostExtraLazySelect,
  });
  return ColPostExtraLazySchema.parse(colPost);
}
// Delete
export async function deleteCollectionPost(
  { collectionId, postId }: ColPostReq,
  currentUserId: string,
): Promise<void> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const collectionPost = await prisma.collectionPost.findFirst({
    where: {
      publicId: postId,
      collection: {
        publicId: collectionId,
        ownerId: currentUser.profile!.id,
      },
    },
    select: { id: true, position: true, collectionId: true },
  });
  if (!collectionPost) throw new NotFoundError("Post not found in collection");

  await prisma.$transaction([
    prisma.collectionPost.delete({ where: { id: collectionPost.id } }),
    prisma.collectionPost.updateMany({
      where: {
        collectionId: collectionPost.collectionId,
        position: { gt: collectionPost.position },
      },
      data: { position: { decrement: 1 } },
    }),
  ]);
}
