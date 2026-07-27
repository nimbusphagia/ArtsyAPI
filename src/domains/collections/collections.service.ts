import { NotFoundError, UnauthorizedError } from "../../config/errors/errors";
import { prisma } from "../../config/prisma";
import { ProfileIsNotBlocked } from "../profiles/profiles.validators";
import {
  CollectionCreateReq,
  CollectionRes,
  CollectionResponseSchema,
  CollectionSelect,
} from "./collections.validators";

export async function createCollection(
  data: CollectionCreateReq,
  currentUserId: string,
): Promise<CollectionRes> {
  const currentUser = await prisma.user.findFirst({
    where: { publicId: currentUserId, active: true, profile: { isNot: null } },
    select: { profile: { select: { id: true } } },
  });
  if (!currentUser) throw new UnauthorizedError("Unauthorized action");

  const { name, description, posts } = data;

  const foundPosts = await prisma.post.findMany({
    where: {
      private: false,
      author: ProfileIsNotBlocked(currentUser.profile!.id),
      publicId: {
        in: posts.map((p) => p.publicId),
      },
    },
    select: { id: true, publicId: true },
  });

  const idByPublicId = new Map(foundPosts.map((p) => [p.publicId, p.id]));

  const missing = posts.filter((p) => !idByPublicId.has(p.publicId));
  if (missing.length > 0) {
    throw new NotFoundError(
      `Post(s) not found: ${missing.map((p) => p.publicId).join(", ")}`,
    );
  }
  const collectionPostsData = posts.map((p) => ({
    postId: idByPublicId.get(p.publicId)!,
    position: p.position,
  }));

  const rawCollection = await prisma.collection.create({
    data: {
      name,
      ...(description && { description }),
      ownerId: currentUser.profile!.id,
      posts: {
        createMany: {
          data: collectionPostsData,
        },
      },
    },
    select: CollectionSelect,
  });

  const parsedCollection = CollectionResponseSchema.parse({
    ...rawCollection,
    likes: rawCollection._count.likes,
    posts: rawCollection.posts.map((colPost) => {
      return {
        ...colPost,
        post: {
          ...colPost.post,
          stats: colPost.post._count,
        },
      };
    }),
  });
  return parsedCollection;
}
